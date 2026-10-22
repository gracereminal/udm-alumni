# Email templates

These files are the **single source** for every email the portal sends. The demo inbox
(`client/src/pages/auth/SampleInbox.jsx`, "Sample Email") renders exactly these files, and the
Laravel API sends exactly these files through the Gmail API once the backend exists
(`docs/plan-backend.md` → "Email"). Change the design here and both follow.

| Template | Sent when | Placeholders |
|---|---|---|
| `password-reset` | `POST /auth/forgot-password` | `first_name`, `reset_url`, `code` (shown as `482 913`), `expires_minutes`, `logo_url` |
| `event-registration` | `POST /events/:id/rsvp` | `first_name`, `event_title`, `event_date`, `event_time`, `event_venue`, `event_fee`, `answers` (optional), `pass_code`, `event_url`, `logo_url` |
| `account-invite` | `POST /imports/:id/confirm` (AI Data Management), one per new account | `first_name`, `email`, `temp_password`, `membership_id`, `signin_url`, `expires_days`, `logo_url` |

Each template has an `.html` part and a `.txt` part (send both as `multipart/alternative`).

## What Gmail shows above the email
The sender line in the Sample Email (`UDM Alumni <no-reply@udmalumni.edu>`, `9:20 AM (2 minutes ago)`, `to maria…`)
is not in the template. Gmail builds it from the message headers, so the mailer must set them:

| Shown in Gmail | Header | Value |
|---|---|---|
| `UDM Alumni` | `From` name | `senders.json` → `name` |
| `<no-reply@udmalumni.edu>` | `From` address | `senders.json` → `address` |
| `9:20 AM (2 minutes ago)` | `Date` | send time (Gmail adds it) |
| `to maria.delacruz@udmalumni.edu` | `To` | the alumnus's account email |
| Subject line | `Subject` | `<title>` of the `.html` file |
| Round logo next to the name | — | the sending Google account's profile photo; set the UDM Alumni seal as that account's photo (with a Workspace domain, BIMI shows it to everyone) |

Gmail only sends as an address the signed-in account owns:
- **Now (OAuth, `udm.alumni.mailer@gmail.com`):** the name shows as `UDM Alumni`, but the address is the Gmail address.
  `no-reply@` / `events@` appear only after they are added as verified "Send mail as" aliases of that account.
- **Later (Workspace service account):** impersonate `no-reply@udmalumni.edu` and add `events@udmalumni.edu` as its
  alias (or impersonate it directly). Then the line matches the Sample Email exactly.

## Format
- `{{ name }}` is replaced by the value, HTML-escaped in `.html` and as-is in `.txt`. Every placeholder must get a value.
- `<!--if:name-->…<!--endif:name-->` is kept only when `name` is not empty, otherwise removed.
- The subject is the text of `<title>` in the `.html` file, with placeholders filled.
- Only inline styles and tables (no `<style>` block, no flexbox), because Gmail and Outlook strip or ignore them.
- Images and links must be absolute URLs (`APP_URL/alumni-logo.png`, `APP_URL/reset-password?token=…`).

## Use from Laravel
Copy or symlink this folder to `backend/resources/emails/` and render it with a small helper instead of Blade,
so the markup stays identical:

```php
// app/Mail/EmailTemplate.php
final class EmailTemplate
{
    public static function render(string $name, array $vars): array
    {
        $dir = resource_path('emails');
        $fill = function (string $src, bool $html) use ($vars): string {
            $src = preg_replace_callback('/<!--if:(\w+)-->(.*?)<!--endif:\1-->/s',
                fn ($m) => ($vars[$m[1]] ?? '') !== '' ? $m[2] : '', $src);
            return preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', function ($m) use ($vars, $html) {
                if (!array_key_exists($m[1], $vars)) throw new \InvalidArgumentException("Missing {$m[1]}");
                return $html ? e((string) $vars[$m[1]]) : (string) $vars[$m[1]];
            }, $src);
        };
        $html = $fill(file_get_contents("$dir/$name.html"), true);
        preg_match('/<title>(.*?)<\/title>/s', $html, $t);
        $from = json_decode(file_get_contents("$dir/senders.json"), true)[$name];
        return [
            'from' => $from, // ['name' => 'UDM Alumni', 'address' => 'no-reply@udmalumni.edu']
            'subject' => html_entity_decode(trim($t[1] ?? ''), ENT_QUOTES | ENT_HTML5),
            'html' => $html,
            'text' => $fill(file_get_contents("$dir/$name.txt"), false),
        ];
    }
}

// In a Mailable's build():
// ['from' => $f, 'subject' => $s, 'html' => $h, 'text' => $t] = EmailTemplate::render('password-reset', [...]);
// return $this->from($f['address'], $f['name'])->subject($s)->html($h)->text(new \Illuminate\Support\HtmlString($t));
```

The `GmailTransport` sends the MIME message Laravel builds, so nothing else changes when the
mailer switches from OAuth to the Workspace service account.

The client's JavaScript renderer (`client/src/lib/emailTemplates.js`) follows the same rules, and
`client/src/lib/emailTemplates.test.js` checks that every placeholder is filled.
