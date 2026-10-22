<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Support\HtmlString;

/**
 * The account email for alumni added by a masterlist import (AI Data Management): emails/account-invite.html + .txt
 * with the sign-in email, the temporary password and when it expires. The password exists only in this message.
 */
class AccountInviteMail extends Mailable
{
    public function __construct(
        public readonly string $firstName,
        public readonly string $email,
        public readonly string $tempPassword,
        public readonly string $membershipId,
        public readonly int $expiresDays,
    ) {}

    private string $plainText = '';

    public function build(): static
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $t = EmailTemplate::render('account-invite', [
            'first_name' => $this->firstName,
            'email' => $this->email,
            'temp_password' => $this->tempPassword,
            'membership_id' => $this->membershipId,
            'signin_url' => "{$appUrl}/signin",
            'expires_days' => $this->expiresDays,
            'logo_url' => "{$appUrl}/alumni-logo.png",
        ]);

        $this->plainText = $t['text'];

        return $this->from($t['from']['address'], $t['from']['name'])
            ->subject($t['subject'])
            ->html($t['html']);
    }

    /** @return array{html: HtmlString, raw: string} */
    protected function buildView(): array
    {
        return ['html' => new HtmlString((string) $this->html), 'raw' => $this->plainText];
    }
}
