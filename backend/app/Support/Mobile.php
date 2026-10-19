<?php

namespace App\Support;

/** Philippine mobile numbers: accepted as 09XXXXXXXXX or 639XXXXXXXXX, stored as 639XXXXXXXXX. */
final class Mobile
{
    public static function normalize(?string $input): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $input) ?? '';
        if (preg_match('/^09\d{9}$/', $digits)) {
            return '63'.substr($digits, 1);
        }

        return preg_match('/^639\d{9}$/', $digits) ? $digits : null;
    }

    /** "639171234567" -> "0917 123 4567", as the forms show it. */
    public static function display(?string $stored): string
    {
        if ($stored === null || ! preg_match('/^639\d{9}$/', $stored)) {
            return (string) $stored;
        }
        $local = '0'.substr($stored, 2);

        return substr($local, 0, 4).' '.substr($local, 4, 3).' '.substr($local, 7);
    }
}
