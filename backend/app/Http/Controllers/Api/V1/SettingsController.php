<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AuditService;
use App\Services\SettingsService;
use App\Support\Lists;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** /settings (app_setting tunables) and /audit (audit_log), role:admin. */
class SettingsController extends Controller
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly AuditService $audit,
    ) {}

    /** GET /settings */
    public function show(): JsonResponse
    {
        return response()->json($this->settings->all());
    }

    /** PUT /settings { coverage_target, employment_target, outreach_interval_days, … } (only the keys sent change) */
    public function update(Request $request): JsonResponse
    {
        $b = $request->validate([
            'employment_target' => 'sometimes|numeric|between:0,100',
            'coverage_target' => 'sometimes|numeric|between:0,100',
            'outreach_interval_days' => 'sometimes|integer|between:1,365',
            'employment_rate_excludes_further_studies' => 'sometimes|boolean',
            'notification_retention_days' => 'sometimes|integer|between:7,3650',
            'new_registration_days' => 'sometimes|integer|between:1,90',
        ]);
        $user = $request->user();
        DB::transaction(function () use ($b, $user) {
            $this->settings->put($b, $user instanceof UserAccount ? $user->user_id : null);
            $this->audit->log('settings_update', 'app_setting', null, null, $b);
        });

        return response()->json($this->settings->all());
    }

    /** GET /audit?entity&entity_id&actor_id&action&page&per_page */
    public function audit(Request $request): JsonResponse
    {
        $f = $request->validate([
            'entity' => 'nullable|string|max:40', 'entity_id' => 'nullable|integer|min:1', 'actor_id' => 'nullable|integer|min:1', 'action' => 'nullable|string|max:60',
        ]);
        [$page, $per] = Lists::paging($request, 50);
        $q = DB::table('audit_log as l')->leftJoin('user_account as u', 'u.user_id', '=', 'l.actor_id')
            ->when($f['entity'] ?? null, fn ($q, $v) => $q->where('l.entity', $v))
            ->when($f['entity_id'] ?? null, fn ($q, $v) => $q->where('l.entity_id', $v))
            ->when($f['actor_id'] ?? null, fn ($q, $v) => $q->where('l.actor_id', $v))
            ->when($f['action'] ?? null, fn ($q, $v) => $q->where('l.action', $v));
        $total = (clone $q)->count();
        $rows = $q->orderByDesc('l.created_at')->orderByDesc('l.log_id')->forPage($page, $per)
            ->get(['l.log_id as id', 'l.entity', 'l.entity_id as entityId', 'l.action', 'l.diff', 'l.ip', 'l.request_id as requestId', 'l.created_at as createdAt', DB::raw("COALESCE(u.display_name, 'System') AS actor")])
            ->map(fn ($r) => ['diff' => $r->diff === null ? null : json_decode((string) $r->diff, true)] + (array) $r);

        return response()->json(Lists::out($rows, $total, $page, $per));
    }
}
