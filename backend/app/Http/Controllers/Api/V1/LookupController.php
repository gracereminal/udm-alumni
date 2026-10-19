<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use App\Support\Vocab;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * GET /lookups (public): the college/program catalog (the only source of their names and codes, sync rule 4), skills,
 * the active survey cycle, the public targets and the form enums (label → code).
 */
class LookupController extends Controller
{
    public function __invoke(SettingsService $settings): JsonResponse
    {
        $programs = collect(DB::select(
            'SELECT program_id AS id, college_id, code, abbr, name, degree_level AS "degreeLevel" FROM program WHERE is_active ORDER BY name',
        ))->groupBy('college_id');

        $colleges = collect(DB::select('SELECT college_id AS id, code, name FROM college ORDER BY sort_order, name'))
            ->map(fn ($c) => [
                'id' => $c->id, 'code' => $c->code, 'name' => $c->name,
                'programs' => ($programs[$c->id] ?? collect())->map(fn ($p) => [
                    'id' => $p->id, 'code' => $p->code, 'abbr' => $p->abbr, 'name' => $p->name, 'degreeLevel' => $p->degreeLevel,
                ])->values(),
            ]);

        $cycle = DB::selectOne('SELECT cycle_id AS id, name, status, opens_at AS "opensAt", closes_at AS "closesAt" FROM v_active_cycle');
        $s = $settings->all();

        return response()->json([
            'colleges' => $colleges,
            'skills' => DB::select('SELECT skill_id AS id, name, category FROM skill ORDER BY name'),
            'cycle' => $cycle,
            'targets' => ['coverage' => $s['coverage_target'], 'employment' => $s['employment_target']],
            'enums' => [
                'sex' => Vocab::SEX,
                'civilStatus' => Vocab::CIVIL_STATUS,
                'pwdType' => Vocab::PWD_TYPE,
                'jobStatus' => Vocab::JOB_STATUS,
                'orgType' => Vocab::ORG_TYPE,
                'placeOfWork' => Vocab::PLACE_OF_WORK,
                'timeToJob' => Vocab::TIME_TO_JOB,
                'employmentType' => Vocab::EMPLOYMENT_TYPE,
            ],
        ])->header('Cache-Control', 'public, max-age=300');
    }
}
