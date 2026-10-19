<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Support\HtmlString;

/** The password reset email: emails/password-reset.html + .txt, with the link and the 6-digit code. */
class PasswordResetMail extends Mailable
{
    public function __construct(
        public readonly string $firstName,
        public readonly string $token,
        public readonly string $code,
    ) {}

    /** The rendered plain-text part (emails/password-reset.txt). */
    private string $plainText = '';

    public function build(): static
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $t = EmailTemplate::render('password-reset', [
            'first_name' => $this->firstName,
            'reset_url' => "{$appUrl}/reset-password?token={$this->token}",
            'code' => self::formatCode($this->code),
            'expires_minutes' => (int) config('auth.reset.ttl_minutes'),
            'logo_url' => "{$appUrl}/alumni-logo.png",
        ]);

        $this->plainText = $t['text'];

        return $this->from($t['from']['address'], $t['from']['name'])
            ->subject($t['subject'])
            ->html($t['html']);
    }

    /**
     * Both parts come from the template files, not views: 'raw' is Laravel's key for a literal text part.
     *
     * @return array{html: HtmlString, raw: string}
     */
    protected function buildView(): array
    {
        return ['html' => new HtmlString((string) $this->html), 'raw' => $this->plainText];
    }

    /** "482913" → "482 913", as the Sample Email shows it (formatResetCode in client/src/lib/emailTemplates.js). */
    public static function formatCode(string $code): string
    {
        return substr($code, 0, 3).' '.substr($code, 3);
    }
}
