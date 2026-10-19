<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PmController extends Controller
{
    /**
     * Project ids visible to the current user (all for Admin, own for Project Manager).
     *
     * @return array<int, int>
     */
    private function projectIds(Request $request): array
    {
        $user = $request->user();
        $query = DB::table('projects');

        if ($user->role?->role_name !== Role::ADMIN) {
            $query->where('user_id', $user->user_id);
        }

        return array_map('intval', $query->pluck('project_id')->all());
    }

    private function projectsFor(Request $request)
    {
        $ids = $this->projectIds($request);

        if (empty($ids)) {
            return collect();
        }

        return DB::table('projects as p')
            ->leftJoin('users as u', 'u.user_id', '=', 'p.user_id')
            ->whereIn('p.project_id', $ids)
            ->select(
                'p.project_id',
                'p.project_name',
                'p.client_name',
                'p.location',
                'p.start_date',
                'p.end_date',
                'p.deadline',
                'p.status',
                'p.approved_budget',
                'p.remaining_budget',
                'u.id_number as manager_id',
                'u.first_name as manager_first_name',
                'u.last_name as manager_last_name',
                DB::raw('(SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.project_id) as phase_count'),
                DB::raw('(SELECT COUNT(*) FROM project_phases ph2 WHERE ph2.project_id = p.project_id AND ph2.status = "Completed") as completed_phases'),
                DB::raw('(SELECT COUNT(DISTINCT wa.laborer_id) FROM workforce_assignment wa JOIN project_phases ph3 ON ph3.phase_id = wa.phase_id WHERE ph3.project_id = p.project_id) as worker_count')
            )
            ->orderBy('p.project_id')
            ->get()
            ->map(function ($row) {
                $phaseCount = (int) $row->phase_count;
                $progress = $phaseCount > 0 ? (int) round(((int) $row->completed_phases / $phaseCount) * 100) : 0;
                $approved = (float) $row->approved_budget;
                $remaining = (float) $row->remaining_budget;
                $spent = $approved - $remaining;

                return [
                    'project_id' => (int) $row->project_id,
                    'code' => 'PRJ-'.str_pad((string) $row->project_id, 4, '0', STR_PAD_LEFT),
                    'project_name' => $row->project_name,
                    'client_name' => $row->client_name,
                    'location' => $row->location,
                    'start_date' => $row->start_date,
                    'end_date' => $row->end_date,
                    'deadline' => $row->deadline,
                    'status' => $row->status,
                    'approved_budget' => $approved,
                    'remaining_budget' => $remaining,
                    'spent_budget' => round($spent, 2),
                    'utilization' => $approved > 0 ? (int) round(($spent / $approved) * 100) : 0,
                    'phase_count' => $phaseCount,
                    'worker_count' => (int) $row->worker_count,
                    'progress' => $progress,
                    'manager_id' => $row->manager_id,
                    'manager_name' => trim(($row->manager_first_name ?? '').' '.($row->manager_last_name ?? '')),
                ];
            });
    }

    public function dashboard(Request $request): JsonResponse
    {
        $projects = $this->projectsFor($request);
        $ids = $projects->pluck('project_id')->all();

        $approved = (float) $projects->sum('approved_budget');
        $remaining = (float) $projects->sum('remaining_budget');
        $spent = $approved - $remaining;

        $labor = $this->costSum('labor', $ids);
        $materials = $this->costSum('materials', $ids);
        $equipment = $this->costSum('equipment', $ids);

        return response()->json([
            'metrics' => [
                'projects' => $projects->count(),
                'active_projects' => $projects->where('status', '!=', 'Completed')->count(),
                'completed_projects' => $projects->where('status', 'Completed')->count(),
                'assigned_workers' => $this->assignedWorkerCount($ids),
                'open_phases' => $this->openPhaseCount($ids),
                'approved_budget' => $approved,
                'remaining_budget' => $remaining,
                'utilization' => $approved > 0 ? (int) round(($spent / $approved) * 100) : 0,
            ],
            'costs' => [
                'labor' => $labor,
                'materials' => $materials,
                'equipment' => $equipment,
                'total' => $labor + $materials + $equipment,
            ],
            'deadlines' => $projects->sortBy('deadline')->take(5)->values(),
            'projects' => $projects->values(),
        ]);
    }

    public function projects(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->projectsFor($request)->values()]);
    }    public function phases(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);

        if (empty($ids)) {
            return response()->json(['data' => []]);
        }

        $phases = DB::table('project_phases as ph')
            ->join('projects as p', 'p.project_id', '=', 'ph.project_id')
            ->leftJoin('skill as s', 's.skill_id', '=', 'ph.required_skill_id')
            ->whereIn('ph.project_id', $ids)
            ->select(
                'ph.phase_id',
                'ph.project_id',
                'p.project_name as project',
                'ph.project_name',
                'ph.description',
                'ph.sequence_no',
                'ph.project_cost',
                'ph.planned_start',
                'ph.planned_end',
                'ph.status',
                'ph.required_skill_id',
                's.skill_name as required_skill'
            )
            ->orderBy('ph.project_id')
            ->orderBy('ph.sequence_no')
            ->get()
            ->map(fn ($row) => [
                'phase_id' => (int) $row->phase_id,
                'project_id' => (int) $row->project_id,
                'project' => $row->project,
                'phase_name' => $row->project_name,
                'description' => $row->description,
                'sequence_no' => $row->sequence_no,
                'project_cost' => (float) $row->project_cost,
                'planned_start' => $row->planned_start,
                'planned_end' => $row->planned_end,
                'status' => $row->status,
                'required_skill_id' => $row->required_skill_id,
                'required_skill' => $row->required_skill,
            ]);

        return response()->json(['data' => $phases]);
    }

    public function storePhase(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);

        $data = $request->validate([
            'project_id' => ['required', 'integer'],
            'phase_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'sequence_no' => ['nullable', 'integer', 'min:1'],
            'project_cost' => ['nullable', 'numeric', 'min:0'],
            'planned_start' => ['nullable', 'date'],
            'planned_end' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['Not Started', 'In Progress', 'Completed'])],
            'required_skill_id' => ['nullable', 'integer', Rule::exists('skill', 'skill_id')],
        ]);

        if (! in_array((int) $data['project_id'], $ids, true)) {
            return response()->json(['message' => 'You cannot add phases to that project.'], 403);
        }

        $phaseId = DB::table('project_phases')->insertGetId([
            'project_id' => $data['project_id'],
            'project_name' => $data['phase_name'],
            'description' => $data['description'] ?? null,
            'sequence_no' => $data['sequence_no'] ?? null,
            'project_cost' => $data['project_cost'] ?? null,
            'planned_start' => $data['planned_start'] ?? null,
            'planned_end' => $data['planned_end'] ?? null,
            'status' => $data['status'] ?? 'Not Started',
            'required_skill_id' => $data['required_skill_id'] ?? null,
            'created_by' => $request->user()->user_id,
            'created_at' => now(),
            'updated_by' => $request->user()->user_id,
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Phase created successfully.',
            'data' => DB::table('project_phases')->where('phase_id', $phaseId)->first(),
        ], 201);
    }

    private function costSum(string $type, array $ids): float
    {
        if (empty($ids)) {
            return 0.0;
        }

        if ($type === 'labor') {
            return (float) DB::table('labor_hour_log as lhl')
                ->join('workforce_assignment as wa', 'wa.assignment_id', '=', 'lhl.assignment_id')
                ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
                ->whereIn('ph.project_id', $ids)
                ->sum('lhl.computed_cost');
        }

        if ($type === 'materials') {
            return (float) DB::table('material_usage as mu')
                ->join('project_phases as ph', 'ph.phase_id', '=', 'mu.phase_id')
                ->whereIn('ph.project_id', $ids)
                ->sum('mu.computed_cost');
        }

        return (float) DB::table('equipment_usage as eu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'eu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->sum('eu.computed_cost');
    }

    private function assignedWorkerCount(array $ids): int
    {
        if (empty($ids)) {
            return 0;
        }

        return (int) DB::table('workforce_assignment as wa')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('wa.status', 'Active')
            ->distinct('wa.laborer_id')
            ->count('wa.laborer_id');
    }

    private function openPhaseCount(array $ids): int
    {
        if (empty($ids)) {
            return 0;
        }

        return (int) DB::table('project_phases')
            ->whereIn('project_id', $ids)
            ->where('status', '!=', 'Completed')
            ->count();
    }    public function workforce(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);

        $available = DB::table('laborer as l')
            ->leftJoin('workforce_assignment as wa', function ($join) {
                $join->on('wa.laborer_id', '=', 'l.laborer_id')->where('wa.status', '=', 'Active');
            })
            ->whereNull('wa.assignment_id')
            ->where('l.employment_status', 'Active')
            ->select('l.laborer_id', 'l.first_name', 'l.last_name', 'l.hourly_rate', 'l.employment_status')
            ->orderBy('l.last_name')
            ->get();

        $assigned = empty($ids) ? collect() : DB::table('workforce_assignment as wa')
            ->join('laborer as l', 'l.laborer_id', '=', 'wa.laborer_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->join('projects as p', 'p.project_id', '=', 'ph.project_id')
            ->whereIn('ph.project_id', $ids)
            ->where('wa.status', 'Active')
            ->select(
                'wa.assignment_id',
                'l.laborer_id',
                'l.first_name',
                'l.last_name',
                'l.hourly_rate',
                'p.project_name as project',
                'ph.project_name as phase',
                'wa.role_on_task',
                'wa.status'
            )
            ->orderBy('l.last_name')
            ->get();

        $skills = DB::table('laborer_skills as ls')
            ->join('skill as s', 's.skill_id', '=', 'ls.skill_id')
            ->select('ls.laborer_id', 's.skill_name')
            ->get()
            ->groupBy('laborer_id')
            ->map(fn ($rows) => $rows->pluck('skill_name')->all());

        return response()->json([
            'available' => $available,
            'assigned' => $assigned,
            'skills' => $skills,
        ]);
    }

    public function skillMatch(Request $request): JsonResponse
    {
        $phaseId = (int) $request->query('phase_id');
        $ids = $this->projectIds($request);
        $phase = DB::table('project_phases')->where('phase_id', $phaseId)->first();

        if (! $phase || ! in_array((int) $phase->project_id, $ids, true)) {
            return response()->json(['message' => 'Phase not found.'], 404);
        }

        if (! $phase->required_skill_id) {
            return response()->json(['phase' => $phase, 'required_skill' => null, 'data' => []]);
        }

        $skillName = DB::table('skill')->where('skill_id', $phase->required_skill_id)->value('skill_name');

        $laborers = DB::table('laborer as l')
            ->join('laborer_skills as ls', 'ls.laborer_id', '=', 'l.laborer_id')
            ->where('ls.skill_id', $phase->required_skill_id)
            ->where('l.employment_status', 'Active')
            ->select('l.laborer_id', 'l.first_name', 'l.last_name', 'l.hourly_rate', 'l.employment_status')
            ->distinct()
            ->orderBy('l.last_name')
            ->get();

        return response()->json([
            'phase' => $phase,
            'required_skill' => $skillName,
            'data' => $laborers,
        ]);
    }

    public function materials(): JsonResponse
    {
        $materials = DB::table('materials as m')
            ->leftJoin('materials_suppliers as ms', 'ms.material_id', '=', 'm.material_id')
            ->leftJoin('suppliers as s', 's.supplier_id', '=', 'ms.supplier_id')
            ->select(
                'm.material_id',
                'm.material_name',
                'm.unit_of_measure',
                'm.unit_cost',
                'm.stock_quantity',
                DB::raw('MIN(s.supplier_name) as supplier_name')
            )
            ->groupBy('m.material_id', 'm.material_name', 'm.unit_of_measure', 'm.unit_cost', 'm.stock_quantity')
            ->orderBy('m.material_name')
            ->get();

        return response()->json(['data' => $materials]);
    }

    public function equipment(): JsonResponse
    {
        $equipment = DB::table('equipment as e')
            ->select(
                'e.equipment_id',
                'e.equipment_name',
                'e.equipment_type',
                'e.hourly_rental_rate',
                'e.equipment_status',
                DB::raw('(SELECT p.project_name FROM equipment_usage eu JOIN project_phases ph ON ph.phase_id = eu.phase_id JOIN projects p ON p.project_id = ph.project_id WHERE eu.equipment_id = e.equipment_id ORDER BY eu.usage_date DESC LIMIT 1) as assigned_project')
            )
            ->orderBy('e.equipment_name')
            ->get();

        return response()->json(['data' => $equipment]);
    }    public function assignments(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);

        if (empty($ids)) {
            return response()->json(['data' => []]);
        }

        $assignments = DB::table('workforce_assignment as wa')
            ->join('laborer as l', 'l.laborer_id', '=', 'wa.laborer_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->join('projects as p', 'p.project_id', '=', 'ph.project_id')
            ->whereIn('ph.project_id', $ids)
            ->select(
                'wa.assignment_id',
                'l.first_name',
                'l.last_name',
                'p.project_name as project',
                'ph.project_name as phase',
                'wa.role_on_task',
                'wa.status',
                'wa.assigned_at',
                'wa.released_at',
                'wa.hourly_rate_ovveride'
            )
            ->orderByDesc('wa.assignment_id')
            ->get();

        return response()->json(['data' => $assignments]);
    }

    public function budgets(Request $request): JsonResponse
    {
        $data = $this->projectsFor($request)
            ->map(fn ($project) => [
                'project_id' => $project['project_id'],
                'project' => $project['project_name'],
                'approved' => $project['approved_budget'],
                'spent' => $project['spent_budget'],
                'remaining' => $project['remaining_budget'],
                'utilization' => $project['utilization'],
            ])
            ->values();

        return response()->json(['data' => $data]);
    }

    public function costReport(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $labor = $this->costSum('labor', $ids);
        $materials = $this->costSum('materials', $ids);
        $equipment = $this->costSum('equipment', $ids);
        $actual = $labor + $materials + $equipment;

        $approved = (float) DB::table('projects')->whereIn('project_id', $ids)->sum('approved_budget');
        $remaining = (float) DB::table('projects')->whereIn('project_id', $ids)->sum('remaining_budget');

        return response()->json([
            'categories' => [
                ['category' => 'Labor', 'actual' => $labor],
                ['category' => 'Materials', 'actual' => $materials],
                ['category' => 'Equipment', 'actual' => $equipment],
            ],
            'totals' => [
                'approved' => $approved,
                'actual' => $actual,
                'remaining' => $remaining,
                'variance' => $approved - $actual,
                'utilization' => $approved > 0 ? (int) round(($actual / $approved) * 100) : 0,
            ],
        ]);
    }

    public function balance(Request $request): JsonResponse
    {
        $data = $this->projectsFor($request)
            ->map(fn ($project) => [
                'project_id' => $project['project_id'],
                'project' => $project['project_name'],
                'approved' => $project['approved_budget'],
                'spent' => $project['spent_budget'],
                'remaining' => $project['remaining_budget'],
                'utilization' => $project['utilization'],
            ])
            ->values();

        return response()->json(['data' => $data]);
    }

    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));
        $ids = $this->projectIds($request);

        if ($term === '' || empty($ids)) {
            return response()->json(['projects' => [], 'phases' => [], 'laborers' => []]);
        }

        $like = '%'.$term.'%';

        $projects = DB::table('projects')
            ->whereIn('project_id', $ids)
            ->where(function ($query) use ($like) {
                $query->where('project_name', 'like', $like)
                    ->orWhere('client_name', 'like', $like)
                    ->orWhere('location', 'like', $like);
            })
            ->get(['project_id', 'project_name', 'client_name', 'location', 'status']);

        $phases = DB::table('project_phases as ph')
            ->join('projects as p', 'p.project_id', '=', 'ph.project_id')
            ->whereIn('ph.project_id', $ids)
            ->where(function ($query) use ($like) {
                $query->where('ph.project_name', 'like', $like)
                    ->orWhere('p.project_name', 'like', $like)
                    ->orWhere('ph.description', 'like', $like);
            })
            ->get(['ph.phase_id', 'ph.project_id', 'p.project_name as project', 'ph.project_name', 'ph.status']);

        $laborers = DB::table('laborer as l')
            ->where(function ($query) use ($like) {
                $query->where('l.first_name', 'like', $like)
                    ->orWhere('l.last_name', 'like', $like);
            })
            ->limit(20)
            ->get(['l.laborer_id', 'l.first_name', 'l.last_name', 'l.hourly_rate', 'l.employment_status']);

        return response()->json([
            'projects' => $projects,
            'phases' => $phases,
            'laborers' => $laborers,
        ]);
    }
}