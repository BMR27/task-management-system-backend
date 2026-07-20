import { sanitizeEmailHtml, htmlToPlainText, extractPlainTextBody } from './email-html.util';

describe('email-html.util', () => {
  it('strips script tags and event handlers', () => {
    const dirty = '<p onclick="evil()">Hola</p><script>alert(1)</script>';
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('Hola');
  });

  it('strips javascript: hrefs', () => {
    const clean = sanitizeEmailHtml('<a href="javascript:alert(1)">click</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('converts sanitized html to plain text', () => {
    expect(htmlToPlainText('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo');
  });

  it('prefers the plain text part when present', () => {
    expect(extractPlainTextBody({ text: '  Hola  ', html: '<p>otro</p>' })).toBe('Hola');
  });

  it('falls back to sanitized html text when there is no plain text', () => {
    expect(extractPlainTextBody({ html: '<p>Solo HTML</p>' })).toBe('Solo HTML');
  });

  it('falls back to a placeholder when there is no content at all', () => {
    expect(extractPlainTextBody({})).toBe('(Sin contenido)');
  });
});
