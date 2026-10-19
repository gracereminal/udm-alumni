<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Support\SurveyMapping;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Admin edits to the Register and Edit Profile questions (Alumni Tracer page), stored in tracer_question. Only the edits
 * and added questions are stored; the defaults stay in the client's data/formDefs.js. GET returns the client's own
 * config shape (client/src/lib/questionStore.js): { ov: { id: { label, placeholder, options, required, hidden } },
 * custom: [{ id, sec, label, type, options }], order: { section: [id…] } }.
 */
class TracerQuestionService
{
    /** Section keys of the Alumni Tracer page => the forms they appear on. */
    public const SECTIONS = [
        'personal' => 'both', 'contact' => 'both', 'education' => 'both', 'password' => 'register',
        'edu' => 'profile', 'employment' => 'profile', 'details' => 'profile', 'self' => 'profile', 'feedback' => 'profile',
    ];

    public const TYPES = ['text', 'textarea', 'choice', 'select', 'multi'];

    /** Fields that cannot be hidden or made optional (the tracer_core_fields constraint). */
    public const CORE = ['last_name', 'first_name', 'email', 'college', 'course', 'year_graduated', 'reg_pw', 'reg_pw2'];

    /** Fields whose options come from the colleges list / year range (the client ignores option edits on them). */
    private const LINKED = ['college', 'course', 'year_graduated'];

    public function __construct(private readonly AuditService $audit) {}

    /** @return array<string, array<string, mixed>> field_id => row, for validation and completion */
    public function rows(): array
    {
        return DB::table('tracer_question')->get()->mapWithKeys(fn ($q) => [$q->field_id => [
            'section' => $q->section, 'form' => $q->form, 'label' => $q->label, 'placeholder' => $q->placeholder, 'type' => $q->type,
            'options' => $q->options === null ? null : json_decode($q->options, true),
            'required' => $q->required, 'shown' => $q->shown, 'sort' => $q->sort, 'is_custom' => (bool) $q->is_custom,
        ]])->all();
    }

    /** @return array{ov: object, custom: list<array<string, mixed>>, order: object} */
    public function config(): array
    {
        $ov = [];
        $custom = [];
        $order = [];
        $rows = DB::table('tracer_question')->orderBy('section')->orderByRaw('sort NULLS LAST')->orderBy('question_id')->get();
        foreach ($rows as $q) {
            $options = $q->options === null ? null : json_decode($q->options, true);
            if ($q->is_custom) {
                $custom[] = ['id' => $q->field_id, 'sec' => $q->section, 'label' => $q->label, 'type' => $q->type, 'options' => $options ?? []];
            }
            $edit = array_filter([
                'label' => $q->is_custom ? null : $q->label,
                'placeholder' => $q->placeholder,
                'options' => $q->is_custom ? null : $options,
                'required' => $q->required,
                'hidden' => $q->shown === false ? true : null,
            ], fn ($v) => $v !== null);
            if ($edit !== []) {
                $ov[$q->field_id] = $edit;
            }
            if ($q->sort !== null) {
                $order[$q->section][] = $q->field_id;
            }
        }

        return ['ov' => (object) $ov, 'custom' => $custom, 'order' => (object) $order];
    }

    /**
     * PUT /tracer/questions/:field_id: edits a default question or an added one. `null` clears one edit.
     *
     * @param  array<string, mixed>  $b  section, label, placeholder, options, required, hidden
     */
    public function put(string $fieldId, array $b, int $actorId): void
    {
        $existing = DB::table('tracer_question')->where('field_id', $fieldId)->first();
        $section = (string) ($b['section'] ?? $existing->section ?? '');
        $this->checkSection($section);
        $core = in_array($fieldId, self::CORE, true);
        if ($core && (($b['hidden'] ?? false) === true || ($b['required'] ?? true) === false)) {
            throw new ApiException(422, 'Core questions cannot be hidden or made optional.', 'validation', ['required' => 'Core questions cannot be hidden or made optional.']);
        }
        $row = ['section' => $section, 'form' => self::SECTIONS[$section], 'updated_by' => $actorId];
        if (array_key_exists('label', $b)) {
            $row['label'] = $this->text($b['label'], 255, 'label', $existing !== null && $existing->is_custom);
        }
        if (array_key_exists('placeholder', $b)) {
            $row['placeholder'] = $this->text($b['placeholder'], 255, 'placeholder', false);
        }
        if (array_key_exists('options', $b)) {
            if (in_array($fieldId, self::LINKED, true) || in_array($fieldId, SurveyMapping::FIXED_OPTIONS, true)) {
                throw new ApiException(422, 'The options of this question cannot be edited.', 'validation', ['options' => 'The options of this question cannot be edited.']);
            }
            $row['options'] = $b['options'] === null ? null : json_encode($this->options($b['options']));
        }
        if (array_key_exists('required', $b)) {
            $row['required'] = $b['required'] === null ? null : (bool) $b['required'];
        }
        if (array_key_exists('hidden', $b)) {
            $row['shown'] = $b['hidden'] === null ? null : ! $b['hidden'];
        }
        DB::transaction(function () use ($fieldId, $row, $existing) {
            $existing === null
                ? DB::table('tracer_question')->insert($row + ['field_id' => $fieldId])
                : DB::table('tracer_question')->where('field_id', $fieldId)->update($row);
            $this->dropEmpty($fieldId);
            $this->audit->log('tracer_question_update', 'tracer_question', null, null, ['field_id' => $fieldId, 'fields' => array_keys($row)]);
        });
    }

    /**
     * POST /tracer/questions: an added question (short / long text, single choice, dropdown, multi-select).
     *
     * @param  array<string, mixed>  $b  section, label, type, options
     * @return string the new field id
     */
    public function create(array $b, int $actorId): string
    {
        $section = (string) ($b['section'] ?? '');
        $this->checkSection($section);
        $type = (string) ($b['type'] ?? '');
        if (! in_array($type, self::TYPES, true)) {
            throw new ApiException(422, 'Choose a question type.', 'validation', ['type' => 'Choose a question type.']);
        }
        $label = $this->text($b['label'] ?? null, 255, 'label', true);
        $options = in_array($type, ['choice', 'select', 'multi'], true) ? $this->options($b['options'] ?? []) : [];
        $id = isset($b['id']) && preg_match('/^custom_[a-z0-9_]{1,40}$/', (string) $b['id']) ? (string) $b['id'] : 'custom_'.Str::lower(Str::random(10));
        if (DB::table('tracer_question')->where('field_id', $id)->exists() || isset(SurveyMapping::QUESTIONS[$id])) {
            throw ApiException::conflict('A question with this id already exists.');
        }
        $sort = DB::table('tracer_question')->where('section', $section)->max('sort');
        DB::transaction(function () use ($id, $section, $label, $type, $options, $actorId, $sort) {
            DB::table('tracer_question')->insert([
                'field_id' => $id, 'section' => $section, 'form' => self::SECTIONS[$section], 'label' => $label, 'type' => $type,
                'options' => json_encode($options), 'required' => false, 'shown' => true, 'is_custom' => true, 'updated_by' => $actorId,
                'sort' => $sort === null ? null : (int) $sort + 1,
            ]);
            $this->audit->log('tracer_question_create', 'tracer_question', null, $actorId, ['field_id' => $id, 'section' => $section]);
        });

        return $id;
    }

    /**
     * PUT /tracer/sections/:section/order: the question ids of one section, in display order.
     *
     * @param  list<string>  $ids
     */
    public function order(string $section, array $ids, int $actorId): void
    {
        $this->checkSection($section);
        DB::transaction(function () use ($section, $ids, $actorId) {
            DB::table('tracer_question')->where('section', $section)->update(['sort' => null]);
            foreach (array_values(array_unique($ids)) as $i => $id) {
                if (! preg_match('/^[a-z][a-z0-9_]{0,59}$/', $id)) {
                    throw new ApiException(422, 'Invalid question id.', 'validation', ['ids' => 'Invalid question id.']);
                }
                DB::table('tracer_question')->upsert(
                    ['field_id' => $id, 'section' => $section, 'form' => self::SECTIONS[$section], 'sort' => $i, 'updated_by' => $actorId],
                    ['field_id'], ['sort', 'updated_by'],
                );
            }
            foreach (DB::table('tracer_question')->where('section', $section)->pluck('field_id') as $id) {
                $this->dropEmpty((string) $id);
            }
            $this->audit->log('tracer_question_order', 'tracer_question', null, $actorId, ['section' => $section]);
        });
    }

    /** DELETE /tracer/questions/:field_id: deletes an added question, or resets a default question's edits (its position stays). */
    public function reset(string $fieldId, int $actorId): void
    {
        $q = DB::table('tracer_question')->where('field_id', $fieldId)->first() ?? throw ApiException::notFound();
        DB::transaction(function () use ($q, $fieldId, $actorId) {
            if ($q->is_custom) {
                DB::table('tracer_question')->where('field_id', $fieldId)->delete();
            } else {
                DB::table('tracer_question')->where('field_id', $fieldId)->update(['label' => null, 'placeholder' => null, 'options' => null, 'required' => null, 'shown' => null, 'updated_by' => $actorId]);
                $this->dropEmpty($fieldId);
            }
            $this->audit->log('tracer_question_reset', 'tracer_question', null, $actorId, ['field_id' => $fieldId]);
        });
    }

    /** DELETE /tracer/questions: back to the default questions everywhere. */
    public function resetAll(int $actorId): void
    {
        DB::transaction(function () use ($actorId) {
            DB::table('tracer_question')->delete();
            $this->audit->log('tracer_question_reset_all', 'tracer_question', null, $actorId);
        });
    }

    /** A default question with no edit left (and no position) is just the default: drop its row. */
    private function dropEmpty(string $fieldId): void
    {
        DB::table('tracer_question')->where('field_id', $fieldId)->where('is_custom', false)
            ->whereNull('label')->whereNull('placeholder')->whereNull('options')->whereNull('required')->whereNull('shown')->whereNull('sort')
            ->delete();
    }

    private function checkSection(string $section): void
    {
        if (! isset(self::SECTIONS[$section])) {
            throw new ApiException(422, 'Unknown section.', 'validation', ['section' => 'Unknown section.']);
        }
    }

    private function text(mixed $v, int $max, string $field, bool $required): ?string
    {
        $s = is_scalar($v) ? trim((string) $v) : '';
        if ($s === '') {
            if ($required) {
                throw new ApiException(422, 'Enter the question text.', 'validation', [$field => 'Enter the question text.']);
            }

            return null;
        }
        if (mb_strlen($s) > $max) {
            throw new ApiException(422, "Keep this under {$max} characters.", 'validation', [$field => "Keep this under {$max} characters."]);
        }

        return $s;
    }

    /** @return list<string> */
    private function options(mixed $v): array
    {
        $list = is_array($v) ? array_values(array_unique(array_filter(array_map(fn ($o) => is_scalar($o) ? trim((string) $o) : '', $v), fn ($o) => $o !== ''))) : [];
        if (count($list) < 2) {
            throw new ApiException(422, 'Add at least 2 options.', 'validation', ['options' => 'Add at least 2 options.']);
        }
        if (count($list) > 40 || max(array_map('mb_strlen', $list)) > 160) {
            throw new ApiException(422, 'Use at most 40 options of 160 characters.', 'validation', ['options' => 'Use at most 40 options of 160 characters.']);
        }

        return $list;
    }
}
