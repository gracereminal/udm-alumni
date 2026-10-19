import { entryPassCode, formatResetCode, renderEmail } from './emailTemplates';

const RESET = { first_name: 'Maria', reset_url: 'https://alumni.udm.edu.ph/reset-password?token=abc', code: formatResetCode('482913'), expires_minutes: 30, logo_url: 'https://alumni.udm.edu.ph/alumni-logo.png' };
const EVENT = {
  first_name: 'Maria', event_title: 'Merlion Run 2026', event_date: 'Sunday, November 8, 2026', event_time: '5:00 AM', event_venue: 'Rizal Park',
  event_fee: '₱650', answers: '5K · ₱650 · M', pass_code: 'UDM-RUNX-00001', event_url: 'https://alumni.udm.edu.ph/alumni/events?event=run', logo_url: 'https://alumni.udm.edu.ph/alumni-logo.png',
};

describe('email templates (shared with the backend mailer)', () => {
  it('renders the password reset email with subject, html and text, leaving no placeholders', () => {
    const m = renderEmail('password-reset', RESET);
    expect(m.subject).toBe('Reset your UDM Alumni portal password');
    expect(m.from).toEqual({ name: 'UDM Alumni', address: 'no-reply@udmalumni.edu' });
    expect(m.html).toContain('482 913');
    expect(m.html).toContain('href="https://alumni.udm.edu.ph/reset-password?token=abc"');
    expect(m.text).toContain('expires in 30 minutes');
    for (const part of [m.html, m.text]) expect(part).not.toMatch(/\{\{|<!--if:/);
  });

  it('renders the event registration email and fills the subject from <title>', () => {
    const m = renderEmail('event-registration', EVENT);
    expect(m.subject).toBe('You’re registered: Merlion Run 2026');
    expect(m.html).toContain('UDM-RUNX-00001');
    expect(m.html).toContain('Your details');
    expect(m.text).toContain('Your details: 5K · ₱650 · M');
    for (const part of [m.html, m.text]) expect(part).not.toMatch(/\{\{|<!--if:/);
  });

  it('drops optional blocks when the value is empty and escapes values in html only', () => {
    const m = renderEmail('event-registration', { ...EVENT, answers: '', event_title: 'Q&A <Night>' });
    expect(m.html).not.toContain('Your details');
    expect(m.html).toContain('Q&amp;A &lt;Night&gt;');
    expect(m.subject).toBe('You’re registered: Q&A <Night>');
    expect(m.text).toContain('Q&A <Night>');
  });

  it('throws when a placeholder has no value', () => {
    const missing = { ...RESET };
    delete missing.code;
    expect(() => renderEmail('password-reset', missing)).toThrow(/code/);
  });

  it('makes a stable entry pass code per event and recipient', () => {
    expect(entryPassCode('homecoming', 'a@b.c')).toMatch(/^UDM-HOME-\d{5}$/);
    expect(entryPassCode('run', 'a@b.c')).toMatch(/^UDM-RUNX-\d{5}$/);
    expect(entryPassCode('run', 'a@b.c')).toBe(entryPassCode('run', 'a@b.c'));
  });
});
