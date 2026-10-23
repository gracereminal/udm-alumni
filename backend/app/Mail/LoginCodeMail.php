<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Support\HtmlString;

/** The two-step verification email: emails/login-code.html + .txt, with the 6-digit sign-in code. */
class LoginCodeMail extends Mailable
{
    public function __construct(
        public readonly string $firstName,
        public readonly string $code,
    ) {}

    /** The rendered plain-text part (emails/login-code.txt). */
    private string $plainText = '';

    public function build(): static
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $t = EmailTemplate::render('login-code', [
            'first_name' => $this->firstName,
            'code' => $this->code,
            'expires_minutes' => (int) config('auth.mfa.ttl_minutes'),
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
}
