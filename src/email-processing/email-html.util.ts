import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'blockquote',
    'a', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'cid'],
  disallowedTagsMode: 'discard',
};

/** Strips scripts/handlers/unsafe schemes, keeping a safe formatting subset. */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Plain-text rendering of sanitized HTML, used for title/description/comment text. */
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractPlainTextBody(params: { text?: string; html?: string }): string {
  if (params.text?.trim()) return params.text.trim();
  if (params.html) return htmlToPlainText(sanitizeEmailHtml(params.html));
  return '(Sin contenido)';
}
