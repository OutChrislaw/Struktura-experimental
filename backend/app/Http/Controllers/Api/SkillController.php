<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SkillController extends Controller
{
    public function index(): JsonResponse
    {
        $skills = DB::table('skill')
            ->leftJoin('laborer_skills', 'laborer_skills.skill_id', '=', 'skill.skill_id')
            ->select(
                'skill.skill_id',
                'skill.skill_name',
                'skill.description',
                DB::raw('COUNT(laborer_skills.laborer_skill_id) as laborer_count')
            )
            ->groupBy('skill.skill_id', 'skill.skill_name', 'skill.description')
            ->orderBy('skill.skill_name')
            ->get();

        return response()->json(['data' => $skills]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'skill_name' => ['required', 'string', 'max:100', 'unique:skill,skill_name'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $id = DB::table('skill')->insertGetId([
            'skill_name' => $data['skill_name'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Skill created successfully.',
            'data' => DB::table('skill')->where('skill_id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $skill): JsonResponse
    {
        $data = $request->validate([
            'skill_name' => [
                'required', 'string', 'max:100',
                Rule::unique('skill', 'skill_name')->ignore($skill, 'skill_id'),
            ],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        DB::table('skill')->where('skill_id', $skill)->update([
            'skill_name' => $data['skill_name'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Skill updated successfully.',
            'data' => DB::table('skill')->where('skill_id', $skill)->first(),
        ]);
    }

    public function destroy(int $skill): JsonResponse
    {
        $inUse = DB::table('laborer_skills')->where('skill_id', $skill)->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'This skill is assigned to laborers and cannot be deleted.',
            ], 422);
        }

        DB::table('skill')->where('skill_id', $skill)->delete();

        return response()->json(['message' => 'Skill deleted successfully.']);
    }
}