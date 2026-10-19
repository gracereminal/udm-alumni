<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Mail\EventRegistrationMail;
use App\Models\UserAccount;
use App\Support\EntryPass;
use App\Support\Vocab;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Events, RSVPs and event notices. Counts come from event_registration (v_event_stats); capacity is enforced in the
 * RSVP transaction with SELECT … FOR UPDATE on the event. Times are entered and shown in Asia/Manila.
 */
class EventService
{
    private const SELECT = <<<'SQL'
        SELECT ev.*, s.registered, s.status_key,
               to_char(ev.starts_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS date_iso,
               to_char(ev.starts_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS time_start,
               to_char(ev.ends_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS time_end,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('time', to_char(i.starts_at, 'HH24:MI'), 'label', i.title) ORDER BY i.sort, i.item_id)
                           FROM event_agenda_item i WHERE i.event_id = ev.event_id), '[]') AS agenda,
               COALESCE((SELECT jsonb_agg(jsonb_build_object('key', f.field_key, 'label', f.label, 'hint', f.hint, 'type', f.type, 'required', f.required, 'options', f.options) ORDER BY f.sort, f.field_id)
                           FROM event_reg_field f WHERE f.event_id = ev.event_id), '[]') AS reg_fields,
               COALESCE(an.is_hidden, false) AS ann_hidden,
               r.answers AS my_answers, r.created_at AS my_registered_at, r.entry_pass AS my_entry_pass
          FROM event ev
          JOIN v_event_stats s ON s.event_id = ev.event_id
          LEFT JOIN announcement an ON an.event_id = ev.event_id
          LEFT JOIN event_registration r ON r.event_id = ev.event_id AND r.alumni_id = ? AND r.cancelled_at IS NULL
        SQL;

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly StorageService $storage,
    ) {}

    /** @return list<array<string, mixed>> */
    public function list(UserAccount $viewer, ?string $when): array
    {
        $where = ['ev.deleted_at IS NULL'];
        if ($viewer->role !== 'admin') {
            $where[] = 'ev.published_at IS NOT NULL';
        }
        if ($when === 'upcoming') {
            $where[] = "s.status_key NOT IN ('past', 'cancelled')";
        } elseif ($when === 'past') {
            $where[] = "s.status_key = 'past'";
        }

        return array_map(self::out(...), DB::select(self::SELECT.' WHERE '.implode(' AND ', $where).' ORDER BY ev.starts_at, ev.event_id', [$this->viewerAlumni($viewer)]));
    }

    /** @return array<string, mixed> */
    public function get(int $eventId, UserAccount $viewer): array
    {
        $e = DB::selectOne(self::SELECT.' WHERE ev.event_id = ? AND ev.deleted_at IS NULL', [$this->viewerAlumni($viewer), $eventId]);
        if ($e === null || ($e->published_at === null && $viewer->role !== 'admin')) {
            throw ApiException::notFound();
        }

        return self::out($e);
    }

    /** @param  array<string, mixed>  $b */
    public function create(array $b, UserAccount $admin): int
    {
        $b = self::validate($b, true);
        self::checkTimes($b['dateISO'], $b['timeStart'], $b['timeEnd'] ?? null, true);
        $publish = ($b['publish'] ?? true) === true;
        $cover = isset($b['coverFrom']) ? DB::table('event')->where('event_id', $b['coverFrom'])->whereNull('deleted_at')->value('cover_photo_url') : null;
        $id = (int) DB::table('event')->insertGetId([
            'created_by' => $admin->user_id, 'title' => $b['title'], 'category' => Vocab::code(Vocab::EVENT_CATEGORY, $b['kind'] ?? 'EVENT') ?? 'event',
            'organizer' => $b['organizer'] ?? null, 'starts_at' => self::ts($b['dateISO'], $b['timeStart']),
            'ends_at' => empty($b['timeEnd']) ? null : self::ts($b['dateISO'], $b['timeEnd']), 'venue' => $b['venue'], 'fee_text' => $b['fee'] ?? null,
            'capacity' => $b['capacity'] ?? null, 'highlights' => json_encode($b['highlights'] ?? []), 'teaser' => mb_substr($b['body'], 0, 150),
            'body' => $b['body'], 'published_at' => $publish ? now() : null, 'cover_photo_url' => $cover,
        ], 'event_id');
        $this->writeChildren($id, $b);
        $this->audit->log('create', 'event', $id, $admin->user_id);
        if ($publish) {
            $this->announce($id, $b['title'], "{$b['dateISO']} {$b['timeStart']} · {$b['venue']}");
        }

        return $id;
    }

    /** @param  array<string, mixed>  $b */
    public function update(int $eventId, array $b, UserAccount $admin): void
    {
        $e = DB::selectOne("SELECT *, to_char(starts_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS d, to_char(starts_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS t1,
                                   to_char(ends_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS t2 FROM event WHERE event_id = ? AND deleted_at IS NULL FOR UPDATE", [$eventId])
            ?? throw ApiException::notFound();
        $b = self::validate($b, false);
        $set = [];
        $timing = isset($b['dateISO']) || isset($b['timeStart']) || array_key_exists('timeEnd', $b);
        if ($timing) {
            $d = $b['dateISO'] ?? $e->d;
            $t1 = $b['timeStart'] ?? $e->t1;
            $t2 = array_key_exists('timeEnd', $b) ? $b['timeEnd'] : $e->t2;
            self::checkTimes($d, $t1, $t2, $d !== $e->d);
            $set['starts_at'] = self::ts($d, $t1);
            $set['ends_at'] = $t2 ? self::ts($d, $t2) : null;
        }
        foreach (['title' => 'title', 'organizer' => 'organizer', 'venue' => 'venue', 'fee' => 'fee_text', 'capacity' => 'capacity'] as $k => $col) {
            if (array_key_exists($k, $b)) {
                $set[$col] = $b[$k];
            }
        }
        if (isset($b['kind'])) {
            $set['category'] = Vocab::code(Vocab::EVENT_CATEGORY, $b['kind']);
        }
        if (array_key_exists('highlights', $b)) {
            $set['highlights'] = json_encode($b['highlights'] ?? []);
        }
        if (isset($b['body'])) {
            $set['body'] = $b['body'];
            $set['teaser'] = mb_substr($b['body'], 0, 150);
        }
        $publishing = ($b['publish'] ?? null) === true && $e->published_at === null;
        if ($publishing) {
            $set['published_at'] = now();
        }
        if (isset($b['status'])) {
            $b['status'] === 'past' ? $set['ended_at'] = now() : $set += ['reg_status' => $b['status'], 'ended_at' => null];
        }
        if ($set !== []) {
            DB::table('event')->where('event_id', $eventId)->update($set);
        }
        $this->writeChildren($eventId, $b);
        if (array_key_exists('annHidden', $b)) {
            DB::insert("INSERT INTO announcement (event_id, author_id, kind, title, is_hidden) VALUES (?, ?, 'notice', ?, ?)
                        ON CONFLICT (event_id) DO UPDATE SET is_hidden = EXCLUDED.is_hidden", [$eventId, $admin->user_id, $e->title, (bool) $b['annHidden']]);
        }
        $this->audit->log('edit', 'event', $eventId, $admin->user_id, ['fields' => array_keys($b)]);
        if (($timing || isset($b['venue'])) && $e->published_at !== null) {
            $this->notifications->notify($this->notifications->eventRegistrantIds($eventId), 'event', 'Event updated: '.($b['title'] ?? $e->title),
                'The date, time or venue changed. Check the event details.', 'events');
        }
        if ($publishing) {
            $this->announce($eventId, $b['title'] ?? $e->title, (string) ($b['venue'] ?? $e->venue));
        }
    }

    /** Copy as an unpublished draft ("(copy)" title, same cover file, agenda and RSVP questions). */
    public function duplicate(int $eventId, UserAccount $admin): int
    {
        $row = DB::selectOne(
            "INSERT INTO event (created_by, title, category, organizer, starts_at, ends_at, venue, fee_text, capacity, cover_photo_url, highlights, teaser, body)
             SELECT ?, left(title || ' (copy)', 160), category, organizer, starts_at, ends_at, venue, fee_text, capacity, cover_photo_url, highlights, teaser, body
               FROM event WHERE event_id = ? AND deleted_at IS NULL RETURNING event_id",
            [$admin->user_id, $eventId],
        ) ?? throw ApiException::notFound();
        $new = (int) $row->event_id;
        DB::insert('INSERT INTO event_agenda_item (event_id, starts_at, title, sort) SELECT ?, starts_at, title, sort FROM event_agenda_item WHERE event_id = ?', [$new, $eventId]);
        DB::insert('INSERT INTO event_reg_field (event_id, field_key, label, hint, type, required, options, sort) SELECT ?, field_key, label, hint, type, required, options, sort FROM event_reg_field WHERE event_id = ?', [$new, $eventId]);
        $this->audit->log('duplicate', 'event', $new, $admin->user_id, ['from' => $eventId]);

        return $new;
    }

    /** Sets or clears the cover; the old file is deleted only when no other event (a duplicate) still uses it. */
    public function setCover(int $eventId, ?string $key, UserAccount $admin): void
    {
        $old = DB::transaction(function () use ($eventId, $key, $admin) {
            $prev = DB::selectOne('SELECT cover_photo_url FROM event WHERE event_id = ? AND deleted_at IS NULL FOR UPDATE', [$eventId]) ?? throw ApiException::notFound();
            DB::update('UPDATE event SET cover_photo_url = ? WHERE event_id = ?', [$key, $eventId]);
            $this->audit->log($key === null ? 'photo_remove' : 'photo_update', 'event', $eventId, $admin->user_id);

            return $prev->cover_photo_url;
        });
        if ($old !== null && $old !== $key && ! DB::table('event')->where('cover_photo_url', $old)->exists()) {
            $this->storage->delete($old);
        }
    }

    public function delete(int $eventId, UserAccount $admin): void
    {
        if (DB::update('UPDATE event SET deleted_at = now() WHERE event_id = ? AND deleted_at IS NULL', [$eventId]) === 0) {
            throw ApiException::notFound();
        }
        $this->audit->log('delete', 'event', $eventId, $admin->user_id);
    }

    public function cancelEvent(int $eventId, UserAccount $admin): void
    {
        $e = DB::selectOne('UPDATE event SET cancelled_at = COALESCE(cancelled_at, now()) WHERE event_id = ? AND deleted_at IS NULL RETURNING title', [$eventId])
            ?? throw ApiException::notFound();
        $this->audit->log('cancel', 'event', $eventId, $admin->user_id);
        $this->notifications->notify($this->notifications->eventRegistrantIds($eventId), 'event', "Event cancelled: {$e->title}",
            'This event has been cancelled. We’re sorry for the inconvenience.', 'events', "event_cancel:{$eventId}");
    }

    /**
     * Registers the alumnus (answers checked against the event's questions), issues the entry pass and, after the
     * commit, sends the confirmation email. Returns whether the email was sent.
     *
     * @param  array<string, mixed>  $input
     */
    public function rsvp(int $eventId, int $alumniId, array $input, string $rsvp = 'going'): bool
    {
        $mail = DB::transaction(function () use ($eventId, $alumniId, $input, $rsvp) {
            $e = DB::selectOne('SELECT * FROM event WHERE event_id = ? AND deleted_at IS NULL AND published_at IS NOT NULL FOR UPDATE', [$eventId]) ?? throw ApiException::notFound();
            $s = DB::selectOne('SELECT status_key, registered FROM v_event_stats WHERE event_id = ?', [$eventId]);
            $mine = DB::selectOne('SELECT cancelled_at FROM event_registration WHERE event_id = ? AND alumni_id = ?', [$eventId, $alumniId]);
            if ($mine !== null && $mine->cancelled_at === null) {
                throw ApiException::conflict('You are already registered for this event.', 'already_registered');
            }
            if ($s->status_key !== 'open') {
                throw ApiException::conflict($s->status_key === 'full' ? 'This event is full.' : 'Registration for this event is closed.', 'registration_closed');
            }
            $answers = [];
            foreach (DB::select('SELECT field_key, label, required, options FROM event_reg_field WHERE event_id = ? ORDER BY sort, field_id', [$eventId]) as $f) {
                $v = $input[$f->field_key] ?? null;
                $v = is_scalar($v) ? trim((string) $v) : '';
                $options = (array) json_decode((string) $f->options, true);
                if ($v === '') {
                    if ($f->required) {
                        throw new ApiException(422, 'Answer every registration question.', 'validation', [$f->field_key => 'Select an option.']);
                    }

                    continue;
                }
                if ($options !== [] && ! in_array($v, $options, true)) {
                    throw new ApiException(422, 'Select a listed option.', 'validation', [$f->field_key => 'Select a listed option.']);
                }
                $answers[$f->field_key] = mb_substr($v, 0, 200);
            }
            $who = DB::selectOne('SELECT a.first_name, COALESCE(u.email, a.contact_email) AS email FROM alumnus a LEFT JOIN user_account u ON u.user_id = a.user_id WHERE a.alumni_id = ?', [$alumniId]);
            $pass = EntryPass::code($eventId, (string) $who->email);
            DB::insert(
                'INSERT INTO event_registration (event_id, alumni_id, rsvp, answers, entry_pass) VALUES (?, ?, ?::rsvp, ?::jsonb, ?)
                 ON CONFLICT (event_id, alumni_id) DO UPDATE SET rsvp = EXCLUDED.rsvp, answers = EXCLUDED.answers, entry_pass = EXCLUDED.entry_pass, created_at = now(), cancelled_at = NULL',
                [$eventId, $alumniId, $rsvp, json_encode((object) $answers), $pass],
            );
            $this->audit->log('rsvp', 'event', $eventId);
            $n = $s->registered + 1;
            // Capacity milestones for the admins: full, and every 100 registrations (each created once).
            if ($e->capacity !== null && $n >= $e->capacity) {
                $this->notifications->notify($this->notifications->adminIds(), 'rsvp', "{$e->title} is full",
                    number_format($n).' of '.number_format($e->capacity).' slots are taken. Registration is now closed.', 'events', "rsvp_full:{$eventId}");
            } elseif ($n % 100 === 0) {
                $this->notifications->notify($this->notifications->adminIds(), 'rsvp', "{$e->title} RSVPs reached {$n}",
                    number_format($n).' alumni have registered.', 'events', "rsvp:{$eventId}:{$n}");
            }
            if ($who->email === null) {
                return null;
            }
            $start = CarbonImmutable::parse($e->starts_at)->setTimezone('Asia/Manila');
            $end = $e->ends_at === null ? null : CarbonImmutable::parse($e->ends_at)->setTimezone('Asia/Manila');

            return [$who->email, new EventRegistrationMail((string) $who->first_name, $eventId, [
                'title' => $e->title, 'date' => $start->format('l, F j, Y'), 'time' => $start->format('g:i A').($end ? ' – '.$end->format('g:i A') : ''),
                'venue' => (string) $e->venue, 'fee' => (string) $e->fee_text,
            ], implode(' · ', array_values($answers)), $pass)];
        });

        if ($mail === null) {
            return false;
        }
        try {
            Mail::to($mail[0])->send($mail[1]);

            return true;
        } catch (Throwable $err) {
            Log::error('Event confirmation email failed', ['event_id' => $eventId, 'error' => $err->getMessage()]);

            return false;
        }
    }

    public function cancelRsvp(int $eventId, int $alumniId): void
    {
        if (DB::update('UPDATE event_registration SET cancelled_at = now() WHERE event_id = ? AND alumni_id = ? AND cancelled_at IS NULL', [$eventId, $alumniId]) === 0) {
            throw ApiException::notFound('You are not registered for this event.');
        }
        $this->audit->log('rsvp_cancel', 'event', $eventId);
    }

    /** @return array{data: list<object>, active: int} */
    public function registrations(int $eventId): array
    {
        if (! DB::table('event')->where('event_id', $eventId)->whereNull('deleted_at')->exists()) {
            throw ApiException::notFound();
        }
        $rows = DB::select(
            "SELECT r.registration_id AS id, r.alumni_id AS \"alumniId\", concat_ws(' ', a.first_name, a.last_name) AS name, COALESCE(p.abbr, 'Unmapped') AS program,
                    a.year_graduated AS batch, r.rsvp, r.answers, r.entry_pass AS \"entryPass\", r.created_at AS \"registeredAt\", r.cancelled_at AS \"cancelledAt\"
               FROM event_registration r JOIN alumnus a ON a.alumni_id = r.alumni_id LEFT JOIN program p ON p.program_id = a.program_id
              WHERE r.event_id = ? ORDER BY r.cancelled_at NULLS FIRST, r.created_at DESC, r.registration_id DESC",
            [$eventId],
        );
        foreach ($rows as $r) {
            $r->answers = json_decode((string) $r->answers, true);
        }

        return ['data' => $rows, 'active' => count(array_filter($rows, fn ($r) => $r->cancelledAt === null))];
    }

    /**
     * The event card / detail as the client shows it.
     *
     * @return array<string, mixed>
     */
    public static function out(object $e): array
    {
        $start = CarbonImmutable::parse($e->starts_at)->setTimezone('Asia/Manila');
        $end = $e->ends_at === null ? null : CarbonImmutable::parse($e->ends_at)->setTimezone('Asia/Manila');

        return [
            'id' => (int) $e->event_id, 'title' => $e->title, 'kind' => Vocab::label(Vocab::EVENT_CATEGORY, $e->category),
            'organizer' => $e->organizer ?? '', 'venue' => $e->venue ?? '', 'fee' => $e->fee_text ?? '',
            'iso' => $e->date_iso, 'timeStart' => $e->time_start, 'timeEnd' => $e->time_end ?? '',
            'month' => $start->format('M'), 'day' => $start->format('d'), 'date' => $start->format('l, F j, Y'),
            'time' => $start->format('g:i A').($end ? ' – '.$end->format('g:i A') : ''),
            'startsAt' => $e->starts_at, 'endsAt' => $e->ends_at,
            'capacity' => $e->capacity === null ? null : (int) $e->capacity, 'regCount' => (int) $e->registered,
            'statusKey' => $e->status_key, 'regStatus' => $e->reg_status,
            'highlights' => json_decode((string) $e->highlights, true), 'teaser' => $e->teaser ?? '',
            'body' => array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', (string) $e->body) ?: []))),
            'agenda' => json_decode((string) $e->agenda, true),
            'regFields' => array_map(fn ($f) => ['options' => $f['options'] ?? []] + $f, (array) json_decode((string) $e->reg_fields, true)),
            'photo' => StorageService::publicUrl($e->cover_photo_url), 'annHidden' => (bool) $e->ann_hidden,
            'published' => $e->published_at !== null, 'pub' => $e->published_at, 'cancelledAt' => $e->cancelled_at, 'updatedAt' => $e->updated_at,
            'registered' => $e->my_registered_at !== null, 'myAnswers' => $e->my_answers === null ? null : json_decode((string) $e->my_answers, true),
            'myRegisteredAt' => $e->my_registered_at, 'myEntryPass' => $e->my_entry_pass,
        ];
    }

    // --- Helpers ---------------------------------------------------------------------------------------

    private function announce(int $eventId, string $title, string $message): void
    {
        $this->notifications->notify($this->notifications->allAlumniIds(), 'event', "New event: {$title}", $message, 'events', "event_pub:{$eventId}");
    }

    /** @param  array<string, mixed>  $b */
    private function writeChildren(int $eventId, array $b): void
    {
        if (array_key_exists('agenda', $b)) {
            DB::delete('DELETE FROM event_agenda_item WHERE event_id = ?', [$eventId]);
            foreach ($b['agenda'] as $i => $a) {
                DB::table('event_agenda_item')->insert(['event_id' => $eventId, 'starts_at' => $a['time'] ?: null, 'title' => $a['label'], 'sort' => $i]);
            }
        }
        if (array_key_exists('regFields', $b)) {
            DB::delete('DELETE FROM event_reg_field WHERE event_id = ?', [$eventId]);
            foreach ($b['regFields'] as $i => $f) {
                DB::table('event_reg_field')->insert([
                    'event_id' => $eventId, 'field_key' => $f['key'], 'label' => $f['label'], 'hint' => $f['hint'] ?: null,
                    'type' => 'choice', 'required' => $f['required'], 'options' => json_encode($f['options']), 'sort' => $i,
                ]);
            }
        }
    }

    private function viewerAlumni(UserAccount $viewer): int
    {
        return (int) (DB::table('alumnus')->where('user_id', $viewer->user_id)->value('alumni_id') ?? -1);
    }

    private static function ts(string $date, string $time): string
    {
        return "{$date} {$time}:00+08";
    }

    private static function checkTimes(string $date, string $start, ?string $end, bool $checkPast): void
    {
        $e = [];
        if ($checkPast && $date < now('Asia/Manila')->toDateString()) {
            $e['dateISO'] = 'Choose a date that hasn’t passed.';
        }
        if ($end !== null && $end !== '' && $end <= $start) {
            $e['timeEnd'] = 'End time must be after the start time.';
        }
        if ($e !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $e);
        }
    }

    /**
     * The composer's checks; returns the cleaned body (only the keys sent).
     *
     * @param  array<string, mixed>  $b
     * @return array<string, mixed>
     */
    private static function validate(array $b, bool $creating): array
    {
        $out = [];
        $e = [];
        $text = function (string $k, int $max, ?string $requiredMsg = null) use ($b, $creating, &$out, &$e) {
            if (! array_key_exists($k, $b) && ! ($creating && $requiredMsg)) {
                return;
            }
            $v = is_scalar($b[$k] ?? null) ? trim((string) $b[$k]) : '';
            if ($v === '' && $requiredMsg) {
                $e[$k] = $requiredMsg;
            } elseif (mb_strlen($v) > $max) {
                $e[$k] = "Keep this under {$max} characters.";
            }
            $out[$k] = $v === '' ? null : $v;
        };
        $text('title', 160, 'Enter an event title.');
        $text('venue', 160, 'Enter a venue.');
        $text('body', 10000, 'Add a description.');
        $text('organizer', 120);
        $text('fee', 120);
        $hhmm = '/^([01]\d|2[0-3]):[0-5]\d$/';
        if ($creating || array_key_exists('dateISO', $b)) {
            $d = (string) ($b['dateISO'] ?? '');
            preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && checkdate((int) substr($d, 5, 2), (int) substr($d, 8, 2), (int) substr($d, 0, 4))
                ? $out['dateISO'] = $d : $e['dateISO'] = 'Select a date.';
        }
        if ($creating || array_key_exists('timeStart', $b)) {
            preg_match($hhmm, (string) ($b['timeStart'] ?? '')) ? $out['timeStart'] = $b['timeStart'] : $e['timeStart'] = 'Use a valid time.';
        }
        if (array_key_exists('timeEnd', $b)) {
            $t = (string) ($b['timeEnd'] ?? '');
            $t === '' ? $out['timeEnd'] = null : (preg_match($hhmm, $t) ? $out['timeEnd'] = $t : $e['timeEnd'] = 'Use a valid time.');
        }
        if (array_key_exists('kind', $b)) {
            isset(Vocab::EVENT_CATEGORY[$b['kind']]) ? $out['kind'] = $b['kind'] : $e['kind'] = 'Select a category.';
        }
        if (array_key_exists('capacity', $b)) {
            $c = $b['capacity'];
            $c === null || $c === '' ? $out['capacity'] = null
                : (filter_var($c, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false ? $out['capacity'] = (int) $c : $e['capacity'] = 'Enter a capacity above 0, or leave it empty.');
        }
        if (array_key_exists('highlights', $b)) {
            $h = is_array($b['highlights']) ? array_values(array_filter(array_map(fn ($x) => is_scalar($x) ? trim((string) $x) : '', $b['highlights']), fn ($x) => $x !== '')) : null;
            $h === null || count($h) > 12 ? $e['highlights'] = 'Use at most 12 highlights.' : $out['highlights'] = $h;
        }
        if (array_key_exists('agenda', $b)) {
            $out['agenda'] = [];
            foreach (is_array($b['agenda']) ? array_slice($b['agenda'], 0, 30) : [] as $a) {
                $label = is_array($a) && is_scalar($a['label'] ?? null) ? trim((string) $a['label']) : '';
                $time = is_array($a) && is_scalar($a['time'] ?? null) ? trim((string) $a['time']) : '';
                if ($label === '' || ($time !== '' && ! preg_match($hhmm, $time))) {
                    $e['agenda'] = 'Each agenda line needs a label and a valid time.';
                }
                $out['agenda'][] = ['time' => $time, 'label' => mb_substr($label, 0, 160)];
            }
        }
        if (array_key_exists('regFields', $b)) {
            $out['regFields'] = [];
            foreach (is_array($b['regFields']) ? array_slice($b['regFields'], 0, 10) : [] as $f) {
                $key = is_array($f) ? (string) ($f['key'] ?? '') : '';
                $options = is_array($f['options'] ?? null) ? array_values(array_filter(array_map(fn ($o) => is_scalar($o) ? trim((string) $o) : '', $f['options']), fn ($o) => $o !== '')) : [];
                if (! preg_match('/^[a-z][a-z0-9_]{0,39}$/', $key) || trim((string) ($f['label'] ?? '')) === '' || count($options) > 20) {
                    $e['regFields'] = 'Each registration question needs a key, a label and at most 20 options.';
                }
                $out['regFields'][] = ['key' => $key, 'label' => mb_substr(trim((string) ($f['label'] ?? '')), 0, 120), 'hint' => mb_substr(trim((string) ($f['hint'] ?? '')), 0, 160),
                    'options' => $options, 'required' => ($f['required'] ?? true) !== false];
            }
        }
        foreach (['publish', 'annHidden'] as $k) {
            if (array_key_exists($k, $b)) {
                is_bool($b[$k]) ? $out[$k] = $b[$k] : $e[$k] = 'Use true or false.';
            }
        }
        if (array_key_exists('status', $b)) {
            in_array($b['status'], ['open', 'closed', 'full', 'past'], true) ? $out['status'] = $b['status'] : $e['status'] = 'Select a status.';
        }
        if (isset($b['coverFrom'])) {
            $out['coverFrom'] = (int) $b['coverFrom'];
        }
        if ($e !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $e);
        }

        return $out;
    }
}
