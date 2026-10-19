<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * audit_log writer: every change, failed sign-in and sensitive read. Call it inside the change's transaction so the
 * audit row commits or rolls back with it. Never put passwords, tokens, codes or full emails in the diff.
 */
class AuditService
{
    /** @param  array<string, mixed>|null  $diff */
    public function log(string $action, string $entity, ?int $entityId = null, ?int $actorId = null, ?array $diff = null): void
    {
        $request = request();
        DB::table('audit_log')->insert([
            'actor_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'diff' => $diff === null ? null : json_encode($diff),
            'ip' => mb_substr((string) $request->ip(), 0, 64) ?: null,
            'request_id' => $request->attributes->get('request_id'),
        ]);
    }

    /** "maria.delacruz@udmalumni.edu" -> "ma***@udmalumni.edu", for logs and audit diffs. */
    public static function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($local, 0, 2).'***'.($domain !== '' ? "@{$domain}" : '');
    }
}
