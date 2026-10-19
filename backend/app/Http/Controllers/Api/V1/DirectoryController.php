<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Services\StorageService;
use App\Support\Lists;
use App\Support\Mobile;
use App\Support\Vocab;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Alumni directory for the search overlay, contact modal and alumni card (any signed-in user). Reads v_directory only:
 * opted-in alumni, visible links, and email / mobile only when the alumnus turned them on.
 */
class DirectoryController extends Controller
{
    private const EMPLOYMENT = ['employed' => 'Employed', 'self_employed' => 'Self-employed', 'further_studies' => 'Further studies', 'not_employed' => 'Not employed'];

    /** GET /directory?q&batch&page&per_page */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => 'nullable|string|max:100', 'batch' => 'nullable|integer|between:1950,2100']);
        [$page, $per] = Lists::paging($request, 50);
        $where = [];
        $params = [];
        if (! empty($f['q'])) {
            $where[] = '(name ILIKE ? OR degree ILIKE ? OR title ILIKE ? OR company ILIKE ? OR skills::text ILIKE ?)';
            array_push($params, ...array_fill(0, 5, Lists::like($f['q'])));
        }
        if (! empty($f['batch'])) {
            $where[] = 'batch = ?';
            $params[] = (int) $f['batch'];
        }
        $w = $where === [] ? '' : 'WHERE '.implode(' AND ', $where);
        $total = (int) DB::selectOne("SELECT count(*) AS n FROM v_directory {$w}", $params)->n;
        $rows = DB::select("SELECT * FROM v_directory {$w} ORDER BY name, alumni_id LIMIT ? OFFSET ?", [...$params, $per, ($page - 1) * $per]);

        return response()->json(Lists::out(array_map(self::card(...), $rows), $total, $page, $per));
    }

    /** GET /directory/:id */
    public function show(int $id): JsonResponse
    {
        $r = DB::selectOne('SELECT * FROM v_directory WHERE alumni_id = ?', [$id]) ?? throw ApiException::notFound('This alumnus is not listed in the directory.');

        return response()->json(self::card($r));
    }

    /** @return array<string, mixed> */
    private static function card(object $r): array
    {
        $skills = (array) json_decode((string) $r->skills, true);
        $contacts = (array) json_decode((string) $r->links, true);
        if ($r->email !== null) {
            $contacts['email'] = $r->email;
        }
        if ($r->mobile !== null) {
            $contacts['mobile'] = Mobile::display($r->mobile);
        }

        return [
            'id' => (int) $r->alumni_id,
            'name' => $r->name,
            'studentId' => $r->student_no ?? $r->membership_id,
            'degree' => $r->degree ?? '—',
            'program' => $r->program_name ?? $r->degree ?? '',
            'batch' => (int) $r->batch,
            'title' => $r->title ?? '',
            'company' => $r->company ?? '',
            'status' => self::EMPLOYMENT[$r->employment_status] ?? '',
            'skills' => array_slice($skills, 0, 3),
            'more' => max(0, count($skills) - 3),
            'allSkills' => $skills,
            'photoUrl' => StorageService::publicUrl($r->photo_url),
            'profile' => [
                'industry' => $r->industry ?? '',
                'bio' => $r->bio ?? '',
                'since' => $r->since === null ? '' : (string) $r->since,
                'firstJob' => Vocab::label(Vocab::TIME_TO_JOB, $r->time_to_job_bucket),
                'related' => match ($r->course_relevance) {
                    'related' => 'Yes',
                    'not_related' => 'No',
                    default => '',
                },
                'contacts' => (object) $contacts,
            ],
        ];
    }
}
