export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  return ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType);
}

export function safeAttachmentFilename(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
