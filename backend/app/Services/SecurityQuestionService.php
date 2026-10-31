<?php

namespace App\Services;

use App\Exceptions\ApiException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Security questions, the second way through two-step verification (UDM Alumni.dc.html "MFA Verification",
 * "Security questions" tab). Each account picks two different questions from QUESTIONS: alumni at registration,
 * everyone else on a one-time screen after signing in. Answers are stored only as argon2id hashes of the trimmed,
 * lower-cased text, so they are not case-sensitive. The list matches client/src/data/securityQuestions.js.
 */
class SecurityQuestionService
{
    public const QUESTIONS = [
        'What was the name of your first-year adviser?',
        'In what city were you born?',
        'What was the name of your first pet?',
        'What is your mother’s maiden name?',
        'What elementary school did you attend?',
        'Who was your favorite teacher in high school?',
    ];

    public const BAD_ANSWERS = 'One or more answers don’t match our records.';

    public function __construct(private readonly AuditService $audit) {}

    /** "  Santos " and "SANTOS" are the same answer. */
    public static function normalize(string $answer): string
    {
        return mb_strtolower((string) preg_replace('/\s+/u', ' ', trim($answer)));
    }

    /**
     * Field errors for {sq1, sq1_answer, sq2, sq2_answer}, with the client's messages.
     *
     * @param  array<string, mixed>  $a
     * @return array<string, string>
     */
    public static function errors(array $a): array
    {
        $e = [];
        foreach ([1, 2] as $n) {
            $q = $a["sq{$n}"] ?? null;
            $ans = is_string($a["sq{$n}_answer"] ?? null) ? self::normalize($a["sq{$n}_answer"]) : '';
            if (! is_string($q) || ! in_array($q, self::QUESTIONS, true)) {
                $e["sq{$n}"] = 'Choose a question.';
            }
            if ($ans === '') {
                $e["sq{$n}_answer"] = 'Enter your answer.';
            } elseif (mb_strlen($ans) < 2) {
                $e["sq{$n}_answer"] = 'Use at least 2 characters.';
            } elseif (mb_strlen($ans) > 100) {
                $e["sq{$n}_answer"] = 'Keep this under 100 characters.';
            }
        }
        if (! isset($e['sq1']) && ! isset($e['sq2']) && $a['sq1'] === $a['sq2']) {
            $e['sq2'] = 'Choose a different question.';
        }

        return $e;
    }

    public function has(int $userId): bool
    {
        return DB::table('security_answer')->where('user_id', $userId)->exists();
    }

    /** @return list<string> the account's two questions in order, or [] when none are set up */
    public function questionsFor(int $userId): array
    {
        return DB::table('security_answer')->where('user_id', $userId)->orderBy('slot')->pluck('question')->all();
    }

    /**
     * Stores the two answers (a body that passed errors()). Runs in the caller's transaction when there is one.
     *
     * @param  array<string, mixed>  $a
     */
    public function save(int $userId, array $a): void
    {
        DB::table('security_answer')->where('user_id', $userId)->delete();
        foreach ([1, 2] as $n) {
            DB::table('security_answer')->insert([
                'user_id' => $userId, 'slot' => $n, 'question' => $a["sq{$n}"],
                'answer_hash' => Hash::make(self::normalize((string) $a["sq{$n}_answer"])),
            ]);
        }
        $this->audit->log('security_questions_set', 'user', $userId, $userId);
    }

    /**
     * POST /auth/security-questions: the one-time setup for an account that has none yet.
     *
     * @param  array<string, mixed>  $a
     */
    public function setUp(int $userId, array $a): void
    {
        if ($e = self::errors($a)) {
            throw new ApiException(422, 'Check the highlighted fields.', 'validation', $e);
        }
        DB::transaction(function () use ($userId, $a) {
            // Locks the account row, so two tabs cannot both pass the "none yet" check.
            DB::selectOne('SELECT user_id FROM user_account WHERE user_id = ? FOR UPDATE', [$userId]);
            if ($this->has($userId)) {
                throw new ApiException(409, 'Your security questions are already set up.', 'already_set');
            }
            $this->save($userId, $a);
        });
    }

    /**
     * Whether both answers match, in order. Every hash is checked, so the time taken does not show which one failed.
     *
     * @param  list<mixed>  $answers
     */
    public function matches(int $userId, array $answers): bool
    {
        $rows = DB::table('security_answer')->where('user_id', $userId)->orderBy('slot')->pluck('answer_hash')->all();
        if (count($rows) !== 2) {
            return false;
        }
        $ok = true;
        foreach ($rows as $i => $hash) {
            $given = is_string($answers[$i] ?? null) ? self::normalize($answers[$i]) : '';
            $ok = Hash::check($given, $hash) && $ok;
        }

        return $ok;
    }
}
