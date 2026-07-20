export interface InboundEmailForDetection {
  fromEmail: string;
  subject: string;
  headers: Record<string, string>;
}

const BOUNCE_SENDER_PATTERNS = [/^mailer-daemon@/i, /^postmaster@/i, /^bounce/i, /^bounces@/i, /^no-?reply@/i];

const AUTOMATED_SUBJECT_PATTERNS = [
  /undelivered mail/i,
  /delivery status notification/i,
  /delivery has failed/i,
  /mail delivery failed/i,
  /out of office/i,
  /automatic reply/i,
  /respuesta autom[aá]tica/i,
  /fuera de la oficina/i,
  /correo no entregado/i,
  /^auto[- ]?reply/i,
];

/**
 * Detects bounces, out-of-office replies, and other automated mail that
 * should never spawn (or reopen) a ticket. Header checks come first since
 * they're the most reliable signal; subject/sender patterns are a fallback
 * for providers that don't forward standard headers.
 */
export function isAutomatedEmail(email: InboundEmailForDetection): boolean {
  const headers = normalizeHeaders(email.headers);

  const autoSubmitted = headers['auto-submitted'];
  if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') {
    return true;
  }

  const precedence = headers['precedence'];
  if (precedence && ['bulk', 'junk', 'list'].includes(precedence.toLowerCase())) {
    return true;
  }

  const fromEmail = (email.fromEmail || '').toLowerCase();
  if (BOUNCE_SENDER_PATTERNS.some((pattern) => pattern.test(fromEmail))) {
    return true;
  }

  const subject = email.subject || '';
  if (AUTOMATED_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) {
    return true;
  }

  return false;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}
