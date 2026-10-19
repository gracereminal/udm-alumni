<?php

namespace App\Support;

/**
 * Event entry pass "UDM-XXXX-NNNNN", the same code entryPassCode() in client/src/lib/emailTemplates.js builds,
 * so the portal and the confirmation email show one pass per event and recipient.
 */
final class EntryPass
{
    public static function code(string|int $eventId, string $email): string
    {
        $prefix = str_pad(strtoupper(substr((string) preg_replace('/[^a-z0-9]/i', '', (string) $eventId), 0, 4)), 4, 'X');

        // (a * 31 + charCode) | 0 in JavaScript: 32-bit signed overflow.
        $h = 7;
        foreach (mb_str_split($eventId.$email) as $char) {
            $h = ($h * 31 + mb_ord($char)) & 0xFFFFFFFF;
            if ($h >= 0x80000000) {
                $h -= 0x100000000;
            }
        }

        return sprintf('UDM-%s-%05d', $prefix, abs($h) % 100000);
    }
}
