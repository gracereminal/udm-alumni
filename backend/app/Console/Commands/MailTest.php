<?php

namespace App\Console\Commands;

use App\Mail\PasswordResetMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends a sample password reset email (a dummy link and code that work nowhere) through the configured mailer, to
 * check the Gmail setup end to end: php artisan app:mail-test you@gmail.com
 */
class MailTest extends Command
{
    protected $signature = 'app:mail-test {to : recipient address}';

    protected $description = 'Send a sample password reset email through the configured mailer';

    public function handle(): int
    {
        $to = (string) $this->argument('to');
        try {
            Mail::to($to)->send(new PasswordResetMail('Test', 'mail-test-'.bin2hex(random_bytes(8)), '000000'));
        } catch (Throwable $e) {
            $this->error('Sending failed: '.$e->getMessage());

            return self::FAILURE;
        }
        $this->info(sprintf('Sent with MAIL_MAILER=%s to %s.', config('mail.default'), $to));

        return self::SUCCESS;
    }
}
