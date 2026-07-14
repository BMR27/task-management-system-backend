function wrap(title: string, body: string, ctaUrl?: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
    <h2 style="color:#0369a1;">${title}</h2>
    <p>${body}</p>
    ${ctaUrl ? `<p><a href="${ctaUrl}" style="background:#0369a1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Ver ticket</a></p>` : ''}
    <p style="color:#71717a;font-size:12px;">NEXT OS Help Desk</p>
  </div>`;
}

export function ticketCreatedTemplate(folio: string, title: string, url: string) {
  return wrap(
    'Nuevo ticket creado',
    `Se ha creado el ticket <b>${folio}</b>: "${title}".`,
    url,
  );
}

export function ticketAssignedTemplate(folio: string, title: string, url: string) {
  return wrap(
    'Se te asignó un ticket',
    `El ticket <b>${folio}</b>: "${title}" te ha sido asignado.`,
    url,
  );
}

export function statusChangedTemplate(
  folio: string,
  title: string,
  oldStatus: string,
  newStatus: string,
  url: string,
) {
  return wrap(
    'Cambio de estado en tu ticket',
    `El ticket <b>${folio}</b>: "${title}" cambió de estado: <b>${oldStatus}</b> → <b>${newStatus}</b>.`,
    url,
  );
}

export function newCommentTemplate(folio: string, title: string, author: string, url: string) {
  return wrap(
    'Nuevo comentario en tu ticket',
    `${author} comentó en el ticket <b>${folio}</b>: "${title}".`,
    url,
  );
}

export function digestTemplate(items: { title: string; message: string }[]) {
  const rows = items
    .map((i) => `<li><b>${i.title}</b>: ${i.message}</li>`)
    .join('');
  return wrap('Resumen de notificaciones', `<ul>${rows}</ul>`);
}
