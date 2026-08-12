import { isAutomatedEmail } from './automated-email-detector';

describe('isAutomatedEmail', () => {
  it('detects Auto-Submitted header', () => {
    expect(
      isAutomatedEmail({
        fromEmail: 'alguien@example.com',
        subject: 'Consulta normal',
        headers: { 'Auto-Submitted': 'auto-replied' },
      }),
    ).toBe(true);
  });

  it('allows Auto-Submitted: no', () => {
    expect(
      isAutomatedEmail({
        fromEmail: 'alguien@example.com',
        subject: 'Consulta normal',
        headers: { 'Auto-Submitted': 'no' },
      }),
    ).toBe(false);
  });

  it('detects bulk Precedence header', () => {
    expect(
      isAutomatedEmail({
        fromEmail: 'alguien@example.com',
        subject: 'Newsletter',
        headers: { Precedence: 'bulk' },
      }),
    ).toBe(true);
  });

  it('detects known bounce senders', () => {
    expect(
      isAutomatedEmail({
        fromEmail: 'MAILER-DAEMON@example.com',
        subject: 'Cualquier cosa',
        headers: {},
      }),
    ).toBe(true);
  });

  it('detects out-of-office subjects in spanish and english', () => {
    expect(
      isAutomatedEmail({ fromEmail: 'a@b.com', subject: 'Out of Office: vacaciones', headers: {} }),
    ).toBe(true);
    expect(
      isAutomatedEmail({ fromEmail: 'a@b.com', subject: 'Respuesta automática', headers: {} }),
    ).toBe(true);
  });

  it('detects bounce/DSN subjects', () => {
    expect(
      isAutomatedEmail({ fromEmail: 'a@b.com', subject: 'Undelivered Mail Returned to Sender', headers: {} }),
    ).toBe(true);
  });

  it('leaves a normal support request alone', () => {
    expect(
      isAutomatedEmail({
        fromEmail: 'cliente@example.com',
        subject: 'No puedo acceder a mi cuenta',
        headers: {},
      }),
    ).toBe(false);
  });

  it('detects the system\'s own notification address looping back (mail loop)', () => {
    expect(
      isAutomatedEmail(
        {
          fromEmail: 'notificaciones@nextoshelpdesk.com.mx',
          subject: 'Cambio de estado en TK-2026-001121',
          headers: {},
        },
        ['NEXT OS Help Desk <notificaciones@nextoshelpdesk.com.mx>'],
      ),
    ).toBe(true);
  });

  it('matches self-sender regardless of display-name formatting on either side', () => {
    expect(
      isAutomatedEmail(
        {
          fromEmail: 'NEXT OS Help Desk <notificaciones@nextoshelpdesk.com.mx>',
          subject: 'Nueva respuesta en tu ticket TK-2026-001121',
          headers: {},
        },
        ['notificaciones@nextoshelpdesk.com.mx'],
      ),
    ).toBe(true);
  });

  it('does not flag an unrelated sender just because a self-sender list is passed', () => {
    expect(
      isAutomatedEmail(
        { fromEmail: 'cliente@example.com', subject: 'No puedo acceder a mi cuenta', headers: {} },
        ['notificaciones@nextoshelpdesk.com.mx'],
      ),
    ).toBe(false);
  });
});
