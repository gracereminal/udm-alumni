<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Support\HtmlString;

/**
 * The RSVP confirmation: emails/event-registration.html + .txt with the event details, the RSVP answers and the entry
 * pass, the same email the client's Sample Email inbox renders.
 */
class EventRegistrationMail extends Mailable
{
    /** @param  array{title: string, date: string, time: string, venue: string, fee: string}  $event */
    public function __construct(
        public readonly string $firstName,
        public readonly int $eventId,
        public readonly array $event,
        public readonly string $answers,
        public readonly string $passCode,
    ) {}

    private string $plainText = '';

    public function build(): static
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $t = EmailTemplate::render('event-registration', [
            'first_name' => $this->firstName,
            'event_title' => $this->event['title'],
            'event_date' => $this->event['date'],
            'event_time' => $this->event['time'],
            'event_venue' => $this->event['venue'],
            'event_fee' => $this->event['fee'] !== '' ? $this->event['fee'] : 'Free',
            'answers' => $this->answers,
            'pass_code' => $this->passCode,
            'event_url' => "{$appUrl}/alumni/events?event={$this->eventId}",
            'logo_url' => "{$appUrl}/alumni-logo.png",
        ]);
        $this->plainText = $t['text'];

        return $this->from($t['from']['address'], $t['from']['name'])->subject($t['subject'])->html($t['html']);
    }

    /** @return array{html: HtmlString, raw: string} */
    protected function buildView(): array
    {
        return ['html' => new HtmlString((string) $this->html), 'raw' => $this->plainText];
    }
}
