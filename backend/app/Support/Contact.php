<?php

namespace App\Support;

/** Server copy of the client's contact-link rules (client/src/lib/contact.js: messengerUrl, applyUrl). */
final class Contact
{
    private const FB_HOSTS = '#^(?:https?://)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com|messenger\.com/t|m\.me)/?#i';

    /** A username, @handle, facebook.com / fb.com / m.me / messenger.com link or profile.php?id= -> m.me link, or ''. */
    public static function messengerUrl(?string $value): string
    {
        $v = trim((string) $value);
        if ($v === '') {
            return '';
        }
        if (preg_match('/profile\.php\?(?:[^#]*&)?id=(\d+)/i', $v, $m)) {
            return "https://m.me/{$m[1]}";
        }
        $v = (string) preg_replace(self::FB_HOSTS, '', $v);
        $v = rtrim(explode('#', explode('?', ltrim($v, '@'))[0])[0], '/');
        $parts = array_values(array_filter(explode('/', $v), fn ($p) => $p !== ''));
        $handle = ($parts[0] ?? '') === 'people' && isset($parts[2]) ? $parts[2] : ($parts[0] ?? '');

        return $handle !== '' && preg_match('/^[\w.-]+$/', $handle) ? "https://m.me/{$handle}" : '';
    }

    /** "How to apply": an email address or a web address. Returns 'email', 'website' or null when neither. */
    public static function applyChannel(?string $value): ?string
    {
        $v = trim((string) $value);

        return match (true) {
            $v === '' => null,
            preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $v) === 1 => 'email',
            preg_match('#^https?://\S+$#i', $v) === 1, preg_match('#^[\w-]+(\.[\w-]+)+(/\S*)?$#', $v) === 1 => 'website',
            default => null,
        };
    }
}
