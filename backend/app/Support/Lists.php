<?php

namespace App\Support;

use App\Exceptions\ApiException;
use Illuminate\Http\Request;

/**
 * List conventions (plan-backend "API"): `page`, `per_page` (max 100) and the `{ data, meta: { page, per_page, total } }`
 * response shape, plus the ILIKE escape every search box uses.
 */
final class Lists
{
    /** @return array{0: int, 1: int} page, per_page */
    public static function paging(Request $request, int $default = 25, int $max = 100): array
    {
        $page = filter_var($request->query('page', 1), FILTER_VALIDATE_INT);
        $per = filter_var($request->query('per_page', $default), FILTER_VALIDATE_INT);
        if ($page === false || $page < 1 || $per === false || $per < 1) {
            throw new ApiException(422, 'Invalid page or per_page.', 'validation');
        }

        return [$page, min($per, $max)];
    }

    /**
     * @param  iterable<mixed>  $rows
     * @param  array<string, mixed>  $extra  more keys for meta (e.g. unread)
     * @return array{data: list<mixed>, meta: array<string, mixed>}
     */
    public static function out(iterable $rows, int $total, int $page, int $perPage, array $extra = []): array
    {
        $data = [];
        foreach ($rows as $row) {
            $data[] = $row;
        }

        return ['data' => $data, 'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total] + $extra];
    }

    /** "50%_off" -> "%50\%\_off%" for ILIKE. */
    public static function like(string $q): string
    {
        return '%'.addcslashes(trim($q), '%_\\').'%';
    }

    /** A positive integer query parameter, or null when absent. */
    public static function intParam(Request $request, string $key): ?int
    {
        $v = $request->query($key);
        if ($v === null || $v === '') {
            return null;
        }
        $n = filter_var($v, FILTER_VALIDATE_INT);
        if ($n === false || $n < 1) {
            throw new ApiException(422, "Invalid {$key}.", 'validation', [$key => 'Invalid value.']);
        }

        return $n;
    }
}
