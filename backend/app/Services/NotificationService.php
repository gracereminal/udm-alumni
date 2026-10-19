<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Bell notifications: one notification row per recipient, written in the same transaction as the change that causes
 * it. Recipients are resolved here from role and college_id, never sent by the client.
 */
class NotificationService
{
    /** @return list<int> */
    public function adminIds(): array
    {
        return $this->activeUsers(fn ($q) => $q->where('role', 'admin'));
    }

    /** @return list<int> */
    public function deptIds(?int $collegeId): array
    {
        return $collegeId === null ? [] : $this->activeUsers(fn ($q) => $q->where('role', 'dept')->where('college_id', $collegeId));
    }

    /**
     * Every active alumni account (event announcements).
     *
     * @return list<int>
     */
    public function allAlumniIds(): array
    {
        return $this->activeUsers(fn ($q) => $q->where('role', 'alumni'));
    }

    /**
     * Active accounts registered for an event (changes and cancellations).
     *
     * @return list<int>
     */
    public function eventRegistrantIds(int $eventId): array
    {
        return $this->activeUsers(fn ($q) => $q->whereIn('user_id', fn ($s) => $s->select('a.user_id')->from('event_registration as r')
            ->join('alumnus as a', 'a.alumni_id', '=', 'r.alumni_id')->where('r.event_id', $eventId)->whereNull('r.cancelled_at')->whereNotNull('a.user_id')));
    }

    /**
     * @param  list<int>  $userIds
     * @param  string  $link  a client screen id (e.g. "records")
     * @param  string|null  $dedupeKey  same key + user = created once (milestones)
     * @return int the rows created (a repeated dedupe key creates none)
     */
    public function notify(array $userIds, string $type, string $title, string $message, string $link, ?string $dedupeKey = null): int
    {
        $created = 0;
        foreach (array_unique($userIds) as $userId) {
            $created += DB::affectingStatement(
                'INSERT INTO notification (user_id, type, title, message, link_url, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT (user_id, dedupe_key) DO NOTHING',
                [$userId, $type, mb_substr($title, 0, 160), mb_substr($message, 0, 255), $link, $dedupeKey],
            );
        }

        return $created;
    }

    /** @return list<int> */
    private function activeUsers(callable $filter): array
    {
        $q = DB::table('user_account')->where('account_status', 'active');
        $filter($q);

        return $q->orderBy('user_id')->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }
}
