<?php

namespace App\Support;

/**
 * Content-based matching for job recommendations: TF-IDF vectors over a small corpus, compared by cosine similarity.
 * No training data needed. Text becomes terms (lowercased, stop words dropped, lightly stemmed, plus adjacent-word
 * pairs so "information technology" outweighs a lone "technology"); all-caps acronyms such as IT, CS or SQL are kept
 * as written. Each term remembers the first surface form it came from, so a match can say why it matched.
 */
final class TfIdf
{
    private const STOP = [
        'a', 'about', 'after', 'all', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'for', 'from',
        'has', 'have', 'in', 'into', 'is', 'it', 'its', 'least', 'may', 'more', 'must', 'new', 'not', 'of', 'on', 'or', 'other', 'our',
        'per', 'such', 'than', 'that', 'the', 'their', 'them', 'there', 'these', 'they', 'this', 'to', 'up', 'was', 'we', 'were', 'will',
        'with', 'who', 'you', 'your', 'within', 'well', 'open', 'apply', 'welcome', 'preferred', 'required', 'graduate', 'graduates',
        'fresh', 'program', 'programs', 'course', 'courses', 'degree', 'major', 'specialization', 'year', 'track', 'academic', 'thesis', 'non',
        'job', 'work', 'team', 'role', 'position', 'applicant', 'applicants', 'candidate', 'candidates', 'experience', 'strong', 'good',
        'ability', 'able', 'one', 'two', 'years', 'hold', 'valid', 'related', 'relevant', 'including', 'etc', 'please', 'send',
    ];

    /** Longest first; a suffix is cut only when at least four letters remain, so "nursing"/"nurse" and "teacher"/"teaching" meet. */
    private const SUFFIXES = ['ologists', 'ologist', 'ology', 'ations', 'ation', 'ancy', 'ency', 'ings', 'ing', 'ists', 'ist', 'ers', 'er', 'es', 's', 'e'];

    /**
     * Terms of a text, repeated `$weight` times, as term => surface label.
     *
     * @return list<array{0: string, 1: string}> [term, label]
     */
    public static function terms(?string $text, int $weight = 1): array
    {
        preg_match_all("/[\\p{L}\\p{N}][\\p{L}\\p{N}+#.']*/u", (string) $text, $m);
        $out = [];
        $prev = null;
        foreach ($m[0] as $raw) {
            $raw = rtrim($raw, ".'");
            $lower = mb_strtolower($raw);
            if (preg_match('/^[A-Z][A-Z0-9+#]{1,5}$/', $raw)) {
                $term = $lower;                                       // acronym: IT, CS, HR, SQL, C++
            } elseif (mb_strlen($lower) < 3 || in_array($lower, self::STOP, true) || preg_match('/^\d+$/', $lower)) {
                $prev = null;

                continue;
            } else {
                $term = self::stem($lower);
            }
            $out[] = [$term, $raw];
            if ($prev !== null) {
                $out[] = ["{$prev[0]} {$term}", "{$prev[1]} {$raw}"];
            }
            $prev = [$term, $raw];
        }

        return $weight > 1 ? array_merge(...array_fill(0, $weight, $out)) : $out;
    }

    /**
     * A named skill as one whole term (so "Power BI" matches "Power BI" and not only "power"), plus its words.
     *
     * @return list<array{0: string, 1: string}>
     */
    public static function phrase(string $name, int $weight = 1): array
    {
        $name = trim($name);
        $one = [['skill:'.mb_strtolower($name), $name]];

        return array_merge(array_merge(...array_fill(0, $weight, $one)), self::terms($name, $weight));
    }

    /** Cuts suffixes until none applies, so "engineering" -> "engineer" -> ... meets "engineer". */
    private static function stem(string $w): string
    {
        foreach (self::SUFFIXES as $s) {
            if (str_ends_with($w, $s) && mb_strlen($w) - mb_strlen($s) >= 4 && ! ($s === 's' && str_ends_with($w, 'ss'))) {
                return self::stem(mb_substr($w, 0, -mb_strlen($s)));
            }
        }

        return $w;
    }

    /**
     * Ranks `$docs` against `$query` by cosine similarity of their TF-IDF vectors (IDF over `$docs`, smoothed;
     * sublinear TF). Returns the documents scoring at least `$min`, best first, with the shared terms that
     * contributed most.
     *
     * @param  list<array{0: string, 1: string}>  $query
     * @param  array<int|string, list<array{0: string, 1: string}>>  $docs
     * @return list<array{key: int|string, score: float, terms: list<string>}>
     */
    public static function rank(array $query, array $docs, float $min = 0.0, int $explain = 3): array
    {
        $n = count($docs);
        if ($n === 0 || $query === []) {
            return [];
        }
        $df = [];
        $labels = [];
        $counts = [];
        foreach ($docs as $key => $terms) {
            $counts[$key] = self::count($terms, $labels);
            foreach (array_keys($counts[$key]) as $t) {
                $df[$t] = ($df[$t] ?? 0) + 1;
            }
        }
        $idf = fn (string $t) => log((1 + $n) / (1 + ($df[$t] ?? 0))) + 1;
        $q = self::vector(self::count($query, $labels), $idf);

        $out = [];
        foreach ($counts as $key => $c) {
            $d = self::vector($c, $idf);
            $parts = [];
            foreach (array_intersect_key($q, $d) as $t => $w) {
                $parts[$t] = $w * $d[$t];
            }
            $score = array_sum($parts);
            if ($score <= 0 || $score < $min) {
                continue;
            }
            arsort($parts);
            $out[] = ['key' => $key, 'score' => $score, 'terms' => self::explain(array_keys($parts), $labels, $explain)];
        }
        usort($out, fn ($a, $b) => $b['score'] <=> $a['score']);

        return $out;
    }

    /**
     * @param  list<array{0: string, 1: string}>  $terms
     * @param  array<string, string>  $labels
     * @return array<string, int>
     */
    private static function count(array $terms, array &$labels): array
    {
        $c = [];
        foreach ($terms as [$t, $label]) {
            $c[$t] = ($c[$t] ?? 0) + 1;
            $labels[$t] ??= $label;
        }

        return $c;
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<string, float> L2-normalized
     */
    private static function vector(array $counts, callable $idf): array
    {
        $v = [];
        foreach ($counts as $t => $tf) {
            $v[$t] = (1 + log($tf)) * $idf($t);
        }
        $norm = sqrt(array_sum(array_map(fn ($x) => $x * $x, $v)));

        return $norm > 0 ? array_map(fn ($x) => $x / $norm, $v) : [];
    }

    /**
     * Readable reasons: the strongest shared terms, where a phrase ("Information Technology") takes the place of
     * the single words it covers and a word already inside a phrase shown is skipped.
     *
     * @param  list<string>  $terms  best first
     * @param  array<string, string>  $labels
     * @return list<string>
     */
    private static function explain(array $terms, array $labels, int $max): array
    {
        $shown = [];
        foreach ($terms as $t) {
            $label = $labels[$t];
            $lower = mb_strtolower($label);
            if (array_filter($shown, fn ($s) => str_contains(mb_strtolower($s), $lower))) {
                continue;
            }
            $covered = array_keys(array_filter($shown, fn ($s) => str_contains($lower, mb_strtolower($s))));
            if ($covered !== []) {
                $shown[$covered[0]] = $label;
                $shown = array_values(array_diff_key($shown, array_flip(array_slice($covered, 1))));
            } elseif (count($shown) < $max) {
                $shown[] = $label;
            }
        }

        return $shown;
    }
}
