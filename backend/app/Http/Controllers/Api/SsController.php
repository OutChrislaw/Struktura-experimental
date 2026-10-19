<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SsController extends Controller
{
    /**
     * Project ids visible to the signed-in supervisor (all for Admin).
     *
     * @return array<int, int>
     */
    private function projectIds(Request $request): array
    {
        $user = $request->user();
        $query = DB::table('projects');

        if ($user->role?->role_name !== Role::ADMIN) {
            $query->where('site_supervisor_id', $user->user_id);
        }

        return array_map('intval', $query->pluck('project_id')->all());
    }

    /**
     * Current database date (keeps the API and MySQL on the same day).
     */
    private function today(): Carbon
    {
        return Carbon::parse(DB::selectOne('SELECT CURDATE() AS d')->d);
    }

    private function primaryProject(array $ids): ?object
    {
        if (empty($ids)) {
            return null;
        }

        return DB::table('projects as p')
            ->leftJoin('users as sup', 'sup.user_id', '=', 'p.site_supervisor_id')
            ->leftJoin('users as pm', 'pm.user_id', '=', 'p.user_id')
            ->whereIn('p.project_id', $ids)
            ->orderBy('p.project_id')
            ->select(
                'p.project_id',
                'p.project_name',
                'p.client_name',
                'p.location',
                'p.latitude',
                'p.longitude',
                'p.start_date',
                'p.end_date',
                'p.deadline',
                'p.status',
                'sup.id_number as supervisor_number',
                'sup.first_name as supervisor_first',
                'sup.last_name as supervisor_last',
                'pm.first_name as manager_first',
                'pm.last_name as manager_last'
            )
            ->first();
    }
    private function currentPhase(array $ids): ?string
    {
        if (empty($ids)) {
            return null;
        }

        $phase = DB::table('project_phases')
            ->whereIn('project_id', $ids)
            ->where('status', 'In Progress')
            ->orderBy('project_id')
            ->orderBy('sequence_no')
            ->select('project_name', 'description')
            ->first();

        return $phase ? ($phase->project_name ?? $phase->description) : null;
    }

    /**
     * Site banner payload used by every SS screen.
     */
    private function sitePayload(array $ids): ?array
    {
        $project = $this->primaryProject($ids);

        if (! $project) {
            return null;
        }

        return [
            'project_id' => (int) $project->project_id,
            'code' => 'PRJ-'.str_pad((string) $project->project_id, 4, '0', STR_PAD_LEFT),
            'project' => $project->project_name,
            'location' => $project->location,
            'client' => $project->client_name,
            'supervisor' => trim(($project->supervisor_first ?? '').' '.($project->supervisor_last ?? '')),
            'supervisor_id' => $project->supervisor_number,
            'manager' => trim(($project->manager_first ?? '').' '.($project->manager_last ?? '')),
            'status' => $project->status,
            'startDate' => $project->start_date,
            'endDate' => $project->end_date ?? $project->deadline,
            'deadline' => $project->deadline,
            'currentPhase' => $this->currentPhase($ids),
            'coordinates' => [
                'lat' => $project->latitude !== null ? (float) $project->latitude : null,
                'lng' => $project->longitude !== null ? (float) $project->longitude : null,
            ],
        ];
    }
    /**
     * Phases with progress derived from completed site tasks.
     *
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function phasesPayload(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $phases = DB::table('project_phases')
            ->whereIn('project_id', $ids)
            ->orderBy('project_id')
            ->orderBy('sequence_no')
            ->select(
                'phase_id',
                'project_id',
                'project_name',
                'description',
                'sequence_no',
                'planned_start',
                'planned_end',
                'status',
                'required_skill_id'
            )
            ->get();

        $counts = DB::table('site_task')
            ->whereIn('project_id', $ids)
            ->select(
                'phase_id',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done")
            )
            ->groupBy('phase_id')
            ->get()
            ->keyBy('phase_id');

        return $phases->map(function ($phase) use ($counts) {
            $row = $counts->get($phase->phase_id);
            $total = (int) ($row->total ?? 0);
            $done = (int) ($row->done ?? 0);

            if ($phase->status === 'Completed') {
                $progress = 100;
            } elseif ($phase->status === 'Not Started') {
                $progress = 0;
            } else {
                $progress = $total > 0 ? (int) round(($done / $total) * 100) : 0;
            }

            return [
                'phase_id' => (int) $phase->phase_id,
                'id' => 'PH-'.str_pad((string) $phase->phase_id, 2, '0', STR_PAD_LEFT),
                'project_id' => (int) $phase->project_id,
                'name' => $phase->project_name ?? $phase->description ?? 'Phase '.$phase->phase_id,
                'description' => $phase->description,
                'sequence' => (int) ($phase->sequence_no ?? 0),
                'progress' => $progress,
                'status' => $phase->status,
                'plannedStart' => $phase->planned_start,
                'plannedEnd' => $phase->planned_end,
                'required_skill_id' => $phase->required_skill_id !== null ? (int) $phase->required_skill_id : null,
            ];
        })->values()->all();
    }
    /**
     * @param  array<int, int>  $ids
     * @return array<int, int>
     */
    private function phaseIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return array_map('intval', DB::table('project_phases')->whereIn('project_id', $ids)->pluck('phase_id')->all());
    }

    /**
     * Workers assigned to any phase of the supervisor's projects.
     *
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function workersPayload(array $ids): array
    {
        $phaseIds = $this->phaseIds($ids);

        if (empty($phaseIds)) {
            return [];
        }

        $laborers = DB::table('laborer as l')
            ->join('workforce_assignment as wa', 'wa.laborer_id', '=', 'l.laborer_id')
            ->whereIn('wa.phase_id', $phaseIds)
            ->select('l.laborer_id', 'l.first_name', 'l.last_name', 'l.hourly_rate', 'l.employment_status', 'l.contact_number')
            ->distinct()
            ->orderBy('l.laborer_id')
            ->get();

        $skills = DB::table('laborer_skills as ls')
            ->join('skill as s', 's.skill_id', '=', 'ls.skill_id')
            ->whereIn('ls.laborer_id', $laborers->pluck('laborer_id')->all())
            ->orderBy('ls.laborer_skill_id')
            ->select('ls.laborer_id', 's.skill_name')
            ->get()
            ->groupBy('laborer_id');

        return $laborers->map(function ($row) use ($skills) {
            $skillRows = $skills->get($row->laborer_id);

            return [
                'id' => 'LAB-'.str_pad((string) $row->laborer_id, 4, '0', STR_PAD_LEFT),
                'laborer_id' => (int) $row->laborer_id,
                'name' => trim($row->first_name.' '.$row->last_name),
                'skill' => $skillRows && $skillRows->isNotEmpty() ? $skillRows->first()->skill_name : 'Unassigned',
                'skills' => $skillRows ? $skillRows->pluck('skill_name')->values()->all() : [],
                'status' => $row->employment_status,
                'contact' => $row->contact_number,
                'rate' => (float) $row->hourly_rate,
            ];
        })->values()->all();
    }
    /**
     * Active assignments on the supervisor's phases (used by the labor form).
     *
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function assignmentsPayload(array $ids): array
    {
        $phaseIds = $this->phaseIds($ids);

        if (empty($phaseIds)) {
            return [];
        }

        return DB::table('workforce_assignment as wa')
            ->join('laborer as l', 'l.laborer_id', '=', 'wa.laborer_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('wa.phase_id', $phaseIds)
            ->where('wa.status', 'Active')
            ->orderBy('wa.assignment_id')
            ->select(
                'wa.assignment_id',
                'wa.laborer_id',
                'wa.status',
                'wa.hourly_rate_ovveride',
                'wa.role_on_task',
                'l.first_name',
                'l.last_name',
                'l.hourly_rate',
                'ph.phase_id',
                'ph.project_name as phase_name',
                'ph.project_id'
            )
            ->get()
            ->map(function ($row) {
                $rate = $row->hourly_rate_ovveride !== null ? (float) $row->hourly_rate_ovveride : (float) $row->hourly_rate;

                return [
                    'assignment_id' => (int) $row->assignment_id,
                    'laborer_id' => (int) $row->laborer_id,
                    'worker' => trim($row->first_name.' '.$row->last_name),
                    'phase_id' => (int) $row->phase_id,
                    'phase' => $row->phase_name,
                    'role_on_task' => $row->role_on_task,
                    'rate' => $rate,
                    'status' => $row->status,
                ];
            })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function materialsPayload(): array
    {
        return DB::table('materials')
            ->orderBy('material_name')
            ->get()
            ->map(fn ($row) => [
                'material_id' => (int) $row->material_id,
                'name' => $row->material_name,
                'unit' => $row->unit_of_measure,
                'unit_cost' => (float) $row->unit_cost,
                'stock' => (int) $row->stock_quantity,
            ])->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function equipmentPayload(): array
    {
        return DB::table('equipment')
            ->orderBy('equipment_name')
            ->get()
            ->map(fn ($row) => [
                'equipment_id' => (int) $row->equipment_id,
                'name' => $row->equipment_name,
                'type' => $row->equipment_type,
                'rate' => (float) $row->hourly_rental_rate,
                'status' => $row->equipment_status,
            ])->values()->all();
    }
    /**
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function laborLogsPayload(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return DB::table('labor_hour_log as lhl')
            ->join('workforce_assignment as wa', 'wa.assignment_id', '=', 'lhl.assignment_id')
            ->join('laborer as l', 'l.laborer_id', '=', 'wa.laborer_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->orderByDesc('lhl.log_date')
            ->orderByDesc('lhl.log_id')
            ->limit(60)
            ->select(
                'lhl.log_id',
                'lhl.log_date',
                'lhl.regular_hours',
                'lhl.overtime_hours',
                'lhl.computed_cost',
                'l.first_name',
                'l.last_name',
                'ph.project_name as phase_name'
            )
            ->get()
            ->map(fn ($row) => [
                'id' => 'LL-'.str_pad((string) $row->log_id, 4, '0', STR_PAD_LEFT),
                'log_id' => (int) $row->log_id,
                'date' => $row->log_date,
                'worker' => trim($row->first_name.' '.$row->last_name),
                'regular' => (float) $row->regular_hours,
                'overtime' => (float) $row->overtime_hours,
                'total' => (float) $row->regular_hours + (float) $row->overtime_hours,
                'cost' => (float) $row->computed_cost,
                'phase' => $row->phase_name,
                'status' => 'Submitted',
            ])->values()->all();
    }

    /**
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function materialLogsPayload(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return DB::table('material_usage as mu')
            ->join('materials as m', 'm.material_id', '=', 'mu.material_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'mu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->orderByDesc('mu.usage_date')
            ->orderByDesc('mu.material_usage_id')
            ->limit(60)
            ->select(
                'mu.material_usage_id',
                'mu.usage_date',
                'mu.quantity_used',
                'mu.computed_cost',
                'm.material_name',
                'm.unit_of_measure',
                'ph.project_name as phase_name'
            )
            ->get()
            ->map(fn ($row) => [
                'id' => 'ML-'.str_pad((string) $row->material_usage_id, 4, '0', STR_PAD_LEFT),
                'usage_id' => (int) $row->material_usage_id,
                'date' => $row->usage_date,
                'material' => $row->material_name,
                'quantity' => (float) $row->quantity_used,
                'unit' => $row->unit_of_measure,
                'cost' => (float) $row->computed_cost,
                'phase' => $row->phase_name,
                'status' => 'Submitted',
            ])->values()->all();
    }

    /**
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function equipmentLogsPayload(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return DB::table('equipment_usage as eu')
            ->join('equipment as e', 'e.equipment_id', '=', 'eu.equipment_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'eu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->orderByDesc('eu.usage_date')
            ->orderByDesc('eu.equipment_usage_id')
            ->limit(60)
            ->select(
                'eu.equipment_usage_id',
                'eu.usage_date',
                'eu.hours_used',
                'eu.computed_cost',
                'e.equipment_name',
                'ph.project_name as phase_name'
            )
            ->get()
            ->map(fn ($row) => [
                'id' => 'EL-'.str_pad((string) $row->equipment_usage_id, 4, '0', STR_PAD_LEFT),
                'usage_id' => (int) $row->equipment_usage_id,
                'date' => $row->usage_date,
                'equipment' => $row->equipment_name,
                'hours' => (float) $row->hours_used,
                'cost' => (float) $row->computed_cost,
                'phase' => $row->phase_name,
                'status' => 'Submitted',
            ])->values()->all();
    }
    /**
     * Turn per-day rows (d / v) into a padded 7-day series.
     */
    private function fillSeries($rows): array
    {
        $today = $this->today();
        $map = collect($rows)->keyBy('d');
        $series = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i);
            $key = $date->toDateString();
            $series[] = [
                'label' => $date->format('M j'),
                'date' => $key,
                'value' => (float) ($map[$key]->v ?? 0),
            ];
        }

        return $series;
    }

    private function laborSeries(array $ids): array
    {
        if (empty($ids)) {
            return $this->fillSeries(collect());
        }

        $rows = DB::table('labor_hour_log as lhl')
            ->join('workforce_assignment as wa', 'wa.assignment_id', '=', 'lhl.assignment_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('lhl.log_date', '>=', $this->today()->subDays(6)->toDateString())
            ->groupBy('lhl.log_date')
            ->select('lhl.log_date as d', DB::raw('SUM(lhl.regular_hours + lhl.overtime_hours) as v'))
            ->get();

        return $this->fillSeries($rows);
    }

    private function materialSeries(array $ids): array
    {
        if (empty($ids)) {
            return $this->fillSeries(collect());
        }

        $rows = DB::table('material_usage as mu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'mu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('mu.usage_date', '>=', $this->today()->subDays(6)->toDateString())
            ->groupBy('mu.usage_date')
            ->select('mu.usage_date as d', DB::raw('COUNT(*) as v'))
            ->get();

        return $this->fillSeries($rows);
    }

    private function equipmentSeries(array $ids): array
    {
        if (empty($ids)) {
            return $this->fillSeries(collect());
        }

        $rows = DB::table('equipment_usage as eu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'eu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('eu.usage_date', '>=', $this->today()->subDays(6)->toDateString())
            ->groupBy('eu.usage_date')
            ->select('eu.usage_date as d', DB::raw('SUM(eu.hours_used) as v'))
            ->get();

        return $this->fillSeries($rows);
    }

    /**
     * Daily roll-up of labor / material / equipment activity.
     *
     * @param  array<int, int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function submissionsPayload(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $start = $this->today()->subDays(6)->toDateString();

        $labor = DB::table('labor_hour_log as lhl')
            ->join('workforce_assignment as wa', 'wa.assignment_id', '=', 'lhl.assignment_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('lhl.log_date', '>=', $start)
            ->groupBy('lhl.log_date')
            ->select('lhl.log_date as d', DB::raw('SUM(lhl.regular_hours + lhl.overtime_hours) as v'))
            ->get()
            ->keyBy('d');

        $materials = DB::table('material_usage as mu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'mu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('mu.usage_date', '>=', $start)
            ->groupBy('mu.usage_date')
            ->select('mu.usage_date as d', DB::raw('COUNT(*) as v'))
            ->get()
            ->keyBy('d');

        $equipment = DB::table('equipment_usage as eu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'eu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('eu.usage_date', '>=', $start)
            ->groupBy('eu.usage_date')
            ->select('eu.usage_date as d', DB::raw('SUM(eu.hours_used) as v'))
            ->get()
            ->keyBy('d');

        return collect($labor->keys())
            ->merge($materials->keys())
            ->merge($equipment->keys())
            ->unique()
            ->sortDesc()
            ->values()
            ->map(fn ($day) => [
                'date' => $day,
                'labor' => (float) ($labor[$day]->v ?? 0),
                'materials' => (int) ($materials[$day]->v ?? 0),
                'equipment' => (float) ($equipment[$day]->v ?? 0),
                'status' => 'Submitted',
            ])
            ->all();
    }
    public function dashboard(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $phases = $this->phasesPayload($ids);
        $today = $this->today()->toDateString();

        $laborToday = empty($ids) ? 0.0 : (float) DB::table('labor_hour_log as lhl')
            ->join('workforce_assignment as wa', 'wa.assignment_id', '=', 'lhl.assignment_id')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('lhl.log_date', $today)
            ->sum(DB::raw('lhl.regular_hours + lhl.overtime_hours'));

        $materialToday = empty($ids) ? 0 : DB::table('material_usage as mu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'mu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('mu.usage_date', $today)
            ->count();

        $equipmentToday = empty($ids) ? 0.0 : (float) DB::table('equipment_usage as eu')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'eu.phase_id')
            ->whereIn('ph.project_id', $ids)
            ->where('eu.usage_date', $today)
            ->sum('eu.hours_used');

        return response()->json([
            'server_date' => $today,
            'site' => $this->sitePayload($ids),
            'metrics' => [
                'labor_hours_today' => round($laborToday, 2),
                'material_entries_today' => $materialToday,
                'equipment_hours_today' => round($equipmentToday, 2),
                'active_phases' => count(array_filter($phases, fn ($phase) => $phase['status'] === 'In Progress')),
                'total_phases' => count($phases),
            ],
            'labor_series' => $this->laborSeries($ids),
            'phases' => $phases,
            'submissions' => $this->submissionsPayload($ids),
        ]);
    }

    public function site(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $phases = $this->phasesPayload($ids);
        $project = $this->primaryProject($ids);
        $workers = $this->workersPayload($ids);

        $phaseCount = count($phases);
        $completed = count(array_filter($phases, fn ($phase) => $phase['status'] === 'Completed'));
        $overall = $phaseCount > 0 ? (int) round(array_sum(array_column($phases, 'progress')) / $phaseCount) : 0;

        $daysRemaining = 0;
        if ($project && $project->end_date) {
            $daysRemaining = max(0, (int) round($this->today()->diffInDays(Carbon::parse($project->end_date), false)));
        }

        return response()->json([
            'server_date' => $this->today()->toDateString(),
            'site' => $this->sitePayload($ids),
            'metrics' => [
                'overall_progress' => $overall,
                'completed_phases' => $completed,
                'total_phases' => $phaseCount,
                'days_remaining' => $daysRemaining,
                'active_workers' => count(array_filter($workers, fn ($worker) => $worker['status'] === 'Active')),
                'total_workers' => count($workers),
            ],
            'phases' => $phases,
        ]);
    }

    public function siteInfo(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);

        return response()->json([
            'server_date' => $this->today()->toDateString(),
            'site' => $this->sitePayload($ids),
            'phases' => $this->phasesPayload($ids),
        ]);
    }
    public function schedule(Request $request): JsonResponse
    {
        $scope = (string) $request->query('scope', 'today');

        if (! in_array($scope, ['today', 'week', 'all'], true)) {
            $scope = 'today';
        }

        $ids = $this->projectIds($request);
        $today = $this->today();

        $query = DB::table('site_task as t')
            ->leftJoin('project_phases as ph', 'ph.phase_id', '=', 't.phase_id')
            ->leftJoin('laborer as l', 'l.laborer_id', '=', 't.assigned_laborer_id')
            ->leftJoin('projects as p', 'p.project_id', '=', 't.project_id')
            ->whereIn('t.project_id', $ids)
            ->select(
                't.task_id',
                't.project_id',
                't.phase_id',
                't.title',
                't.task_date',
                't.start_time',
                't.status',
                'p.project_name',
                'ph.project_name as phase_name',
                'l.first_name',
                'l.last_name'
            );

        if ($scope === 'today') {
            $query->whereDate('t.task_date', $today->toDateString());
        } elseif ($scope === 'week') {
            $query->whereBetween('t.task_date', [
                $today->copy()->startOfWeek()->toDateString(),
                $today->copy()->endOfWeek()->toDateString(),
            ]);
        }

        $tasks = $query
            ->orderBy('t.task_date')
            ->orderBy('t.start_time')
            ->orderBy('t.task_id')
            ->get()
            ->map(fn ($row) => [
                'id' => 'TSK-'.$row->task_id,
                'task_id' => (int) $row->task_id,
                'date' => $row->task_date,
                'time' => $row->start_time ? substr((string) $row->start_time, 0, 5) : '',
                'title' => $row->title,
                'phase' => $row->phase_name ?? '—',
                'assignee' => trim(($row->first_name ?? '').' '.($row->last_name ?? '')) ?: 'Unassigned',
                'status' => $row->status,
                'project' => $row->project_name,
                'project_id' => (int) $row->project_id,
            ])->values()->all();

        return response()->json([
            'scope' => $scope,
            'server_date' => $today->toDateString(),
            'data' => $tasks,
            'counts' => [
                'total' => count($tasks),
                'done' => count(array_filter($tasks, fn ($task) => $task['status'] === 'Done')),
                'in_progress' => count(array_filter($tasks, fn ($task) => $task['status'] === 'In Progress')),
                'pending' => count(array_filter($tasks, fn ($task) => $task['status'] === 'Pending')),
            ],
        ]);
    }

    public function logHours(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $today = $this->today()->toDateString();
        $logs = $this->laborLogsPayload($ids);
        $workers = $this->workersPayload($ids);
        $todayLogs = array_filter($logs, fn ($log) => $log['date'] === $today);

        return response()->json([
            'server_date' => $today,
            'assignments' => $this->assignmentsPayload($ids),
            'workers' => $workers,
            'logs' => $logs,
            'series' => $this->laborSeries($ids),
            'metrics' => [
                'hours_today' => round(array_sum(array_column($todayLogs, 'total')), 2),
                'logs_today' => count($todayLogs),
                'crew' => count(array_filter($workers, fn ($worker) => $worker['status'] === 'Active')),
                'total_logs' => count($logs),
            ],
        ]);
    }
    public function materials(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $today = $this->today()->toDateString();
        $logs = $this->materialLogsPayload($ids);
        $todayLogs = array_filter($logs, fn ($log) => $log['date'] === $today);

        return response()->json([
            'server_date' => $today,
            'materials' => $this->materialsPayload(),
            'phases' => $this->phasesPayload($ids),
            'logs' => $logs,
            'series' => $this->materialSeries($ids),
            'metrics' => [
                'entries_today' => count($todayLogs),
                'distinct_today' => count(array_unique(array_column($todayLogs, 'material'))),
                'total_logs' => count($logs),
            ],
        ]);
    }

    public function equipment(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $today = $this->today()->toDateString();
        $logs = $this->equipmentLogsPayload($ids);
        $todayLogs = array_filter($logs, fn ($log) => $log['date'] === $today);

        return response()->json([
            'server_date' => $today,
            'equipment' => $this->equipmentPayload(),
            'phases' => $this->phasesPayload($ids),
            'logs' => $logs,
            'series' => $this->equipmentSeries($ids),
            'metrics' => [
                'hours_today' => round(array_sum(array_column($todayLogs, 'hours')), 2),
                'logs_today' => count($todayLogs),
                'machines_today' => count(array_unique(array_column($todayLogs, 'equipment'))),
                'total_logs' => count($logs),
            ],
        ]);
    }

    public function workers(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $workers = $this->workersPayload($ids);

        return response()->json([
            'data' => $workers,
            'metrics' => [
                'total' => count($workers),
                'active' => count(array_filter($workers, fn ($worker) => $worker['status'] === 'Active')),
                'inactive' => count(array_filter($workers, fn ($worker) => $worker['status'] !== 'Active')),
                'skills' => count(array_unique(array_column($workers, 'skill'))),
            ],
        ]);
    }

    public function phases(Request $request): JsonResponse
    {
        $ids = $this->projectIds($request);
        $phases = $this->phasesPayload($ids);
        $count = count($phases);

        return response()->json([
            'data' => $phases,
            'metrics' => [
                'total' => $count,
                'completed' => count(array_filter($phases, fn ($phase) => $phase['status'] === 'Completed')),
                'in_progress' => count(array_filter($phases, fn ($phase) => $phase['status'] === 'In Progress')),
                'average_progress' => $count > 0 ? (int) round(array_sum(array_column($phases, 'progress')) / $count) : 0,
            ],
        ]);
    }
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        $ids = $this->projectIds($request);

        $empty = [
            'query' => $query,
            'workers' => [],
            'phases' => [],
            'tasks' => [],
            'materials' => [],
            'equipment' => [],
        ];

        if ($query === '' || empty($ids)) {
            return response()->json($empty);
        }

        $needle = mb_strtolower($query);
        $match = function (array $values) use ($needle): bool {
            foreach ($values as $value) {
                if ($value !== null && str_contains(mb_strtolower((string) $value), $needle)) {
                    return true;
                }
            }

            return false;
        };

        $workers = array_values(array_filter(
            $this->workersPayload($ids),
            fn ($row) => $match([$row['id'], $row['name'], $row['skill'], $row['status'], $row['contact']])
        ));

        $phases = array_values(array_filter(
            $this->phasesPayload($ids),
            fn ($row) => $match([$row['id'], $row['name'], $row['status']])
        ));

        $materials = array_values(array_filter(
            $this->materialLogsPayload($ids),
            fn ($row) => $match([$row['date'], $row['material'], $row['unit'], $row['phase'], $row['status']])
        ));

        $equipment = array_values(array_filter(
            $this->equipmentLogsPayload($ids),
            fn ($row) => $match([$row['date'], $row['equipment'], $row['phase'], $row['status']])
        ));

        $tasks = DB::table('site_task as t')
            ->leftJoin('project_phases as ph', 'ph.phase_id', '=', 't.phase_id')
            ->leftJoin('laborer as l', 'l.laborer_id', '=', 't.assigned_laborer_id')
            ->whereIn('t.project_id', $ids)
            ->orderByDesc('t.task_date')
            ->orderByDesc('t.task_id')
            ->limit(100)
            ->select(
                't.task_id',
                't.task_date',
                't.start_time',
                't.title',
                't.status',
                'ph.project_name as phase_name',
                'l.first_name',
                'l.last_name'
            )
            ->get()
            ->map(fn ($row) => [
                'id' => 'TSK-'.$row->task_id,
                'task_id' => (int) $row->task_id,
                'date' => $row->task_date,
                'time' => $row->start_time ? substr((string) $row->start_time, 0, 5) : '',
                'title' => $row->title,
                'phase' => $row->phase_name ?? '—',
                'assignee' => trim(($row->first_name ?? '').' '.($row->last_name ?? '')) ?: 'Unassigned',
                'status' => $row->status,
            ])
            ->filter(fn ($row) => $match([$row['date'], $row['title'], $row['phase'], $row['assignee'], $row['status']]))
            ->values()
            ->all();

        return response()->json([
            'query' => $query,
            'workers' => $workers,
            'phases' => $phases,
            'tasks' => $tasks,
            'materials' => $materials,
            'equipment' => $equipment,
        ]);
    }
    public function storeLaborLog(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assignment_id' => ['required', 'integer'],
            'log_date' => ['required', 'date', 'before_or_equal:today'],
            'regular_hours' => ['required', 'numeric', 'min:0', 'max:24'],
            'overtime_hours' => ['nullable', 'numeric', 'min:0', 'max:12'],
        ]);

        $ids = $this->projectIds($request);

        $assignment = DB::table('workforce_assignment as wa')
            ->join('project_phases as ph', 'ph.phase_id', '=', 'wa.phase_id')
            ->join('laborer as l', 'l.laborer_id', '=', 'wa.laborer_id')
            ->whereIn('ph.project_id', $ids)
            ->where('wa.assignment_id', $data['assignment_id'])
            ->select(
                'wa.assignment_id',
                'wa.hourly_rate_ovveride',
                'l.hourly_rate',
                'l.first_name',
                'l.last_name',
                'ph.project_id'
            )
            ->first();

        if (! $assignment) {
            return response()->json(['message' => 'That assignment does not belong to your site.'], 403);
        }

        $regular = (float) $data['regular_hours'];
        $overtime = (float) ($data['overtime_hours'] ?? 0);

        if ($regular + $overtime <= 0) {
            return response()->json(['message' => 'Enter at least one hour.'], 422);
        }

        $rate = $assignment->hourly_rate_ovveride !== null
            ? (float) $assignment->hourly_rate_ovveride
            : (float) $assignment->hourly_rate;

        $cost = round($regular * $rate + $overtime * $rate * 1.25, 2);

        $logId = DB::transaction(function () use ($data, $regular, $overtime, $cost, $assignment, $request) {
            $id = DB::table('labor_hour_log')->insertGetId([
                'assignment_id' => $assignment->assignment_id,
                'log_date' => $data['log_date'],
                'regular_hours' => $regular,
                'overtime_hours' => $overtime,
                'computed_cost' => $cost,
                'created_by' => $request->user()->user_id,
                'created_at' => now(),
            ]);

            DB::table('projects')
                ->where('project_id', $assignment->project_id)
                ->decrement('remaining_budget', $cost);

            return $id;
        });

        return response()->json([
            'message' => 'Labor hours saved.',
            'data' => [
                'log_id' => $logId,
                'worker' => trim($assignment->first_name.' '.$assignment->last_name),
                'regular_hours' => $regular,
                'overtime_hours' => $overtime,
                'computed_cost' => $cost,
            ],
        ], 201);
    }
    public function storeMaterialUsage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'material_id' => ['required', 'integer', 'exists:materials,material_id'],
            'phase_id' => ['required', 'integer'],
            'usage_date' => ['required', 'date', 'before_or_equal:today'],
            'quantity_used' => ['required', 'numeric', 'min:0.01', 'max:100000'],
        ]);

        $ids = $this->projectIds($request);

        $phase = DB::table('project_phases')
            ->whereIn('project_id', $ids)
            ->where('phase_id', $data['phase_id'])
            ->first();

        if (! $phase) {
            return response()->json(['message' => 'That phase does not belong to your site.'], 403);
        }

        $material = DB::table('materials')->where('material_id', $data['material_id'])->first();

        if (! $material) {
            return response()->json(['message' => 'Unknown material.'], 422);
        }

        $quantity = (float) $data['quantity_used'];
        $cost = round($quantity * (float) $material->unit_cost, 2);
        $units = max(0, (int) round($quantity));

        $usageId = DB::transaction(function () use ($data, $quantity, $cost, $units, $phase, $material, $request) {
            $id = DB::table('material_usage')->insertGetId([
                'material_id' => $material->material_id,
                'phase_id' => $phase->phase_id,
                'usage_date' => $data['usage_date'],
                'quantity_used' => $quantity,
                'computed_cost' => $cost,
                'created_by' => $request->user()->user_id,
                'created_at' => now(),
                'updated_by' => $request->user()->user_id,
                'updated_at' => now(),
            ]);

            if ($units > 0) {
                DB::table('materials')
                    ->where('material_id', $material->material_id)
                    ->update(['stock_quantity' => DB::raw('GREATEST(0, stock_quantity - '.$units.')')]);
            }

            DB::table('projects')
                ->where('project_id', $phase->project_id)
                ->decrement('remaining_budget', $cost);

            return $id;
        });

        return response()->json([
            'message' => 'Material usage saved.',
            'data' => [
                'material_usage_id' => $usageId,
                'material' => $material->material_name,
                'quantity_used' => $quantity,
                'unit' => $material->unit_of_measure,
                'computed_cost' => $cost,
            ],
        ], 201);
    }
    public function storeEquipmentUsage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment_id' => ['required', 'integer', 'exists:equipment,equipment_id'],
            'phase_id' => ['required', 'integer'],
            'usage_date' => ['required', 'date', 'before_or_equal:today'],
            'hours_used' => ['required', 'numeric', 'min:0.01', 'max:24'],
        ]);

        $ids = $this->projectIds($request);

        $phase = DB::table('project_phases')
            ->whereIn('project_id', $ids)
            ->where('phase_id', $data['phase_id'])
            ->first();

        if (! $phase) {
            return response()->json(['message' => 'That phase does not belong to your site.'], 403);
        }

        $equipment = DB::table('equipment')->where('equipment_id', $data['equipment_id'])->first();

        if (! $equipment) {
            return response()->json(['message' => 'Unknown equipment.'], 422);
        }

        $hours = (float) $data['hours_used'];
        $cost = round($hours * (float) $equipment->hourly_rental_rate, 2);

        $usageId = DB::transaction(function () use ($data, $hours, $cost, $phase, $equipment, $request) {
            $id = DB::table('equipment_usage')->insertGetId([
                'equipment_id' => $equipment->equipment_id,
                'phase_id' => $phase->phase_id,
                'usage_date' => $data['usage_date'],
                'hours_used' => $hours,
                'computed_cost' => $cost,
                'created_by' => $request->user()->user_id,
                'created_at' => now(),
                'updated_by' => $request->user()->user_id,
                'updated_at' => now(),
            ]);

            DB::table('projects')
                ->where('project_id', $phase->project_id)
                ->decrement('remaining_budget', $cost);

            return $id;
        });

        return response()->json([
            'message' => 'Equipment usage saved.',
            'data' => [
                'equipment_usage_id' => $usageId,
                'equipment' => $equipment->equipment_name,
                'hours_used' => $hours,
                'computed_cost' => $cost,
            ],
        ], 201);
    }
}
