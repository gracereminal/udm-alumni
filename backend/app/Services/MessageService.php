<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use App\Support\Scope;
use Illuminate\Support\Facades\DB;

/**
 * In-portal Messages (the client's floating Messages widget). One-to-one threads only, so alumni never reach each other:
 *   office  — an alumnus and the Alumni Relations Office (every admin shares the office side)
 *   college — an alumnus and the staff of the alumnus' college (dept users, scoped by Scope)
 *   admin   — a college staff account and the Alumni Relations Office
 * A message is "mine" when its sender_role is the viewer's role, so the office (or a college) reads as one party.
 */
class MessageService
{
    private const THREADS = <<<'SQL'
        SELECT t.thread_id, t.channel, t.alumni_id, t.staff_user_id, t.created_at, t.last_message_at,
               a.first_name, a.last_name, a.year_graduated, a.course_other, p.abbr AS program_abbr,
               COALESCE(p.college_id, a.declared_college_id) AS alumni_college_id, ac.code AS alumni_college_code,
               su.display_name AS staff_name, sc.code AS staff_college_code,
               lm.body AS last_body, lm.sender_role AS last_role, lm.created_at AS last_at,
               (SELECT count(*) FROM message m
                 WHERE m.thread_id = t.thread_id AND m.sender_role <> ?::user_role
                   AND m.message_id > COALESCE(r.last_read_id, 0))::int AS unread
          FROM message_thread t
          LEFT JOIN alumnus a ON a.alumni_id = t.alumni_id
          LEFT JOIN program p ON p.program_id = a.program_id
          LEFT JOIN college ac ON ac.college_id = COALESCE(p.college_id, a.declared_college_id)
          LEFT JOIN user_account su ON su.user_id = t.staff_user_id
          LEFT JOIN college sc ON sc.college_id = su.college_id
          LEFT JOIN LATERAL (SELECT body, sender_role, created_at FROM message m
                              WHERE m.thread_id = t.thread_id ORDER BY m.created_at DESC, m.message_id DESC LIMIT 1) lm ON true
          LEFT JOIN message_read r ON r.thread_id = t.thread_id AND r.user_id = ?
        SQL;

    /**
     * The viewer's conversations, newest first. Staff see only threads that have messages; an alumnus also sees
     * their own empty ones.
     *
     * @return list<array<string, mixed>>
     */
    public function threads(UserAccount $user): array
    {
        [$where, $bind] = $this->visible($user);
        $rows = DB::select(self::THREADS." WHERE {$where} ORDER BY COALESCE(t.last_message_at, t.created_at) DESC, t.thread_id DESC", [$user->role, $user->user_id, ...$bind]);

        return array_map(fn ($r) => $this->threadOut($r, $user), $rows);
    }

    /** Unread messages across the viewer's conversations (the widget's dot). */
    public function unread(UserAccount $user): int
    {
        return array_sum(array_column($this->threads($user), 'unread'));
    }

    /**
     * Finds or starts the thread for a channel: an alumnus with the office or their college; college staff with one of
     * their college's alumni, or with the office; the office with an alumnus.
     *
     * @return array<string, mixed>
     */
    public function open(UserAccount $user, string $channel, ?int $alumniId): array
    {
        $scope = Scope::for($user);
        if ($user->role === 'alumni') {
            if (! in_array($channel, ['office', 'college'], true)) {
                throw new ApiException(422, 'Choose the Alumni Office or your college.', 'invalid_channel');
            }
            $alumniId = $scope->alumniId ?? throw ApiException::forbidden();
            if ($channel === 'college' && $this->collegeOf($alumniId) === null) {
                throw new ApiException(422, 'Add your program in Edit Profile so we know which college to message.', 'no_college');
            }
        } elseif ($user->role === 'dept') {
            if ($channel === 'admin') {
                return $this->thread($user, $this->upsert('admin', null, $user->user_id), false);
            }
            if ($channel !== 'college' || $alumniId === null) {
                throw new ApiException(422, 'Choose an alumnus of your college.', 'invalid_channel');
            }
        } elseif ($channel !== 'office' || $alumniId === null) {
            throw new ApiException(422, 'Choose an alumnus to message.', 'invalid_channel');
        }

        $exists = DB::table('alumnus')->where('alumni_id', $alumniId)->whereNull('archived_at')->whereNull('merged_into_id')->exists();
        if (! $exists) {
            throw ApiException::notFound();
        }
        $scope->authorizeAlumnus($alumniId);

        return $this->thread($user, $this->upsert($channel, $alumniId, null), false);
    }

    /**
     * One conversation with its messages (oldest first). Opening it marks it read for the viewer.
     *
     * @return array<string, mixed>
     */
    public function thread(UserAccount $user, int $threadId, bool $markRead = true): array
    {
        $this->authorize($user, $threadId);
        if ($markRead) {
            $this->markRead($threadId, $user->user_id);
        }
        $row = DB::selectOne(self::THREADS.' WHERE t.thread_id = ?', [$user->role, $user->user_id, $threadId]);
        $messages = DB::select('SELECT message_id, sender_role, body, created_at FROM message WHERE thread_id = ? ORDER BY created_at, message_id', [$threadId]);

        return $this->threadOut($row, $user) + ['messages' => array_map(fn ($m) => $this->messageOut($m, $user), $messages)];
    }

    /** @return array<string, mixed> the new message */
    public function send(UserAccount $user, int $threadId, string $body): array
    {
        $this->authorize($user, $threadId);
        $text = trim($body);
        if ($text === '') {
            throw new ApiException(422, 'Write a message first.', 'validation', ['body' => 'Write a message first.']);
        }

        return DB::transaction(function () use ($user, $threadId, $text) {
            $m = DB::selectOne(
                'INSERT INTO message (thread_id, sender_id, sender_role, body) VALUES (?, ?, ?::user_role, ?) RETURNING message_id, sender_role, body, created_at',
                [$threadId, $user->user_id, $user->role, $text],
            );
            DB::update('UPDATE message_thread SET last_message_at = ? WHERE thread_id = ?', [$m->created_at, $threadId]);
            $this->markRead($threadId, $user->user_id);

            return $this->messageOut($m, $user);
        });
    }

    /** @return array{0: string, 1: list<mixed>} */
    private function visible(UserAccount $user): array
    {
        return match ($user->role) {
            'admin' => ["t.channel IN ('office', 'admin') AND t.last_message_at IS NOT NULL", []],
            'dept' => [
                "t.last_message_at IS NOT NULL AND ((t.channel = 'college' AND COALESCE(p.college_id, a.declared_college_id) = ?) OR (t.channel = 'admin' AND t.staff_user_id = ?))",
                [$user->college_id, $user->user_id],
            ],
            default => ["t.channel IN ('office', 'college') AND t.alumni_id = ?", [Scope::for($user)->alumniId ?? 0]],
        };
    }

    /** Throws 404 / 403 unless the viewer is a party to the thread. */
    private function authorize(UserAccount $user, int $threadId): void
    {
        $t = DB::table('message_thread')->where('thread_id', $threadId)->first(['channel', 'alumni_id', 'staff_user_id']) ?? throw ApiException::notFound();
        $ok = match ($t->channel) {
            'office' => $user->role === 'admin' || ($user->role === 'alumni' && Scope::for($user)->alumniId === (int) $t->alumni_id),
            'college' => in_array($user->role, ['alumni', 'dept'], true) && Scope::for($user)->allowsAlumnus((int) $t->alumni_id),
            default => $user->role === 'admin' || (int) $t->staff_user_id === $user->user_id,
        };
        if (! $ok) {
            throw ApiException::forbidden();
        }
    }

    private function upsert(string $channel, ?int $alumniId, ?int $staffId): int
    {
        $conflict = $channel === 'admin' ? "(staff_user_id) WHERE channel = 'admin'" : '(channel, alumni_id) WHERE alumni_id IS NOT NULL';
        DB::insert("INSERT INTO message_thread (channel, alumni_id, staff_user_id) VALUES (?::message_channel, ?, ?) ON CONFLICT {$conflict} DO NOTHING", [$channel, $alumniId, $staffId]);

        return (int) DB::table('message_thread')->where('channel', $channel)
            ->when($channel === 'admin', fn ($q) => $q->where('staff_user_id', $staffId), fn ($q) => $q->where('alumni_id', $alumniId))
            ->value('thread_id');
    }

    private function markRead(int $threadId, int $userId): void
    {
        DB::insert(
            'INSERT INTO message_read (thread_id, user_id, last_read_id, read_at)
             VALUES (?, ?, (SELECT COALESCE(max(message_id), 0) FROM message WHERE thread_id = ?), now())
             ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_id = GREATEST(message_read.last_read_id, EXCLUDED.last_read_id), read_at = now()',
            [$threadId, $userId, $threadId],
        );
    }

    private function collegeOf(int $alumniId): ?int
    {
        $id = DB::selectOne('SELECT COALESCE(p.college_id, a.declared_college_id) AS c FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.alumni_id = ?', [$alumniId])?->c;

        return $id === null ? null : (int) $id;
    }

    /** @return array<string, mixed> */
    private function threadOut(object $r, UserAccount $user): array
    {
        $alumnus = $r->alumni_id === null ? null : [
            'id' => (int) $r->alumni_id,
            'name' => trim($r->first_name.' '.$r->last_name),
            'meta' => implode(' · ', array_filter([$r->program_abbr ?? $r->course_other, 'Batch '.$r->year_graduated])),
            'collegeCode' => $r->alumni_college_code,
        ];
        $staff = $r->staff_user_id === null ? null : ['id' => (int) $r->staff_user_id, 'name' => $r->staff_name, 'collegeCode' => $r->staff_college_code];

        return [
            'id' => (int) $r->thread_id,
            'channel' => $r->channel,
            'alumnus' => $alumnus,
            'staff' => $staff,
            'lastMessage' => $r->last_at === null ? null : ['body' => $r->last_body, 'mine' => $r->last_role === $user->role, 'at' => $r->last_at],
            'unread' => (int) $r->unread,
            'updatedAt' => $r->last_message_at ?? $r->created_at,
        ];
    }

    /** @return array<string, mixed> */
    private function messageOut(object $m, UserAccount $user): array
    {
        return ['id' => (int) $m->message_id, 'body' => $m->body, 'from' => $m->sender_role, 'mine' => $m->sender_role === $user->role, 'at' => $m->created_at];
    }
}
