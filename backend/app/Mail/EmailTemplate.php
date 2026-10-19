<?php

namespace App\Mail;

use InvalidArgumentException;
use RuntimeException;

/**
 * Renders a shared /emails template (emails/README.md), the same files the client's Sample Email inbox shows:
 * {{ name }} placeholders (HTML-escaped in .html), <!--if:name-->…<!--endif:name--> blocks, the subject from <title>
 * and the From name/address from senders.json. No Blade, so the markup stays identical.
 */
final class EmailTemplate
{
    /**
     * @param  array<string, scalar|null>  $vars
     * @return array{from: array{name: string, address: string}, subject: string, html: string, text: string}
     */
    public static function render(string $name, array $vars): array
    {
        $dir = rtrim((string) config('mail.templates_path'), '/\\');
        $read = function (string $file) use ($dir): string {
            $src = @file_get_contents("{$dir}/{$file}");
            if ($src === false) {
                throw new RuntimeException("Email template file not found: {$dir}/{$file} (check EMAIL_TEMPLATES_PATH).");
            }

            return $src;
        };

        $html = self::fill($read("{$name}.html"), $vars, true);
        preg_match('/<title>(.*?)<\/title>/s', $html, $title);
        $senders = json_decode($read('senders.json'), true);
        $from = is_array($senders) ? ($senders[$name] ?? null) : null;
        if (! is_array($from) || ! isset($from['name'], $from['address'])) {
            throw new RuntimeException("senders.json has no sender for \"{$name}\".");
        }

        return [
            'from' => ['name' => (string) $from['name'], 'address' => (string) $from['address']],
            'subject' => html_entity_decode(trim($title[1] ?? ''), ENT_QUOTES | ENT_HTML5),
            'html' => $html,
            'text' => self::fill($read("{$name}.txt"), $vars, false),
        ];
    }

    /** @param  array<string, scalar|null>  $vars */
    private static function fill(string $src, array $vars, bool $html): string
    {
        $src = (string) preg_replace_callback(
            '/<!--if:(\w+)-->(.*?)<!--endif:\1-->/s',
            fn (array $m) => (string) ($vars[$m[1]] ?? '') !== '' ? $m[2] : '',
            $src,
        );

        return (string) preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', function (array $m) use ($vars, $html) {
            if (! array_key_exists($m[1], $vars)) {
                throw new InvalidArgumentException("Email template placeholder {{ {$m[1]} }} has no value.");
            }
            $value = (string) $vars[$m[1]];

            return $html ? htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8') : $value;
        }, $src);
    }
}
