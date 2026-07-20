const LOGO_URL = 'https://www.nextoshelpdesk.com.mx/logimarket-logo.png';

function folioBadge(folio: string) {
  return `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-weight:600;font-size:13px;padding:4px 10px;border-radius:6px;font-family:monospace;">${folio}</span>`;
}

function wrap(title: string, body: string, ctaUrl?: string) {
  return `
  <div style="font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e4e4e7;">
    <div style="background:#0c1e35; padding:28px 32px; text-align:center;">
      <img src="${LOGO_URL}" alt="Logimarket" width="44" height="44" style="display:block; margin:0 auto 10px; border-radius:8px;" />
      <p style="color:#93c5fd; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; margin:0; font-weight:600;">
        Logimarket &middot; NEXT OS Help Desk
      </p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#0f172a; font-size:19px; margin:0 0 14px; font-weight:600;">${title}</h2>
      <div style="color:#3f3f46; font-size:14px; line-height:1.7;">${body}</div>
      ${
        ctaUrl
          ? `<p style="margin:24px 0 0;">
              <a href="${ctaUrl}" style="background:#0369a1;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                Ver ticket →
              </a>
            </p>`
          : ''
      }
    </div>
    <div style="padding:16px 32px; background:#f4f4f5; border-top:1px solid #e4e4e7; text-align:center;">
      <p style="color:#a1a1aa; font-size:11px; margin:0;">
        Este es un correo automático de NEXT OS Help Desk. No respondas si no es necesario.
      </p>
    </div>
  </div>`;
}

export function ticketCreatedTemplate(folio: string, title: string, url: string) {
  return wrap(
    'Nuevo ticket creado',
    `<p style="margin:0 0 10px;">Se ha creado un nuevo ticket:</p>
     <p style="margin:0 0 4px;">${folioBadge(folio)}</p>
     <p style="margin:8px 0 0; font-style:italic;">"${title}"</p>`,
    url,
  );
}

export function ticketAssignedTemplate(folio: string, title: string, url: string) {
  return wrap(
    'Se te asignó un ticket',
    `<p style="margin:0 0 10px;">Tienes un nuevo ticket asignado:</p>
     <p style="margin:0 0 4px;">${folioBadge(folio)}</p>
     <p style="margin:8px 0 0; font-style:italic;">"${title}"</p>`,
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
    `<p style="margin:0 0 10px;">${folioBadge(folio)} <span style="color:#71717a;">"${title}"</span></p>
     <p style="margin:12px 0 0;">
       <span style="color:#71717a;">${oldStatus}</span>
       <span style="margin:0 6px;">→</span>
       <b style="color:#0f172a;">${newStatus}</b>
     </p>`,
    url,
  );
}

export function newCommentTemplate(folio: string, title: string, author: string, url: string) {
  return wrap(
    'Nuevo comentario en tu ticket',
    `<p style="margin:0 0 10px;">${folioBadge(folio)} <span style="color:#71717a;">"${title}"</span></p>
     <p style="margin:12px 0 0;"><b>${author}</b> comentó en tu ticket.</p>`,
    url,
  );
}

export function ticketReceivedTemplate(folio: string, title: string, areaName?: string) {
  return wrap(
    'Hemos recibido tu solicitud',
    `<p style="margin:0 0 10px;">Tu solicitud quedó registrada como:</p>
     <p style="margin:0 0 4px;">${folioBadge(folio)}</p>
     <p style="margin:8px 0 16px; font-style:italic;">"${title}"</p>
     ${areaName ? `<p style="margin:0 0 10px;">Área asignada: <b>${areaName}</b></p>` : ''}
     <p style="margin:0;">En breve uno de nuestros agentes atenderá tu caso. Te avisaremos a este mismo correo cuando quede resuelta, y puedes responder este correo para agregar información.</p>`,
  );
}

export function ticketResolvedExternalTemplate(folio: string, title: string) {
  return wrap(
    'Tu ticket ha sido resuelto',
    `<p style="margin:0 0 10px;">${folioBadge(folio)}</p>
     <p style="margin:8px 0 16px; font-style:italic;">"${title}"</p>
     <p style="margin:0;">Este ticket ha sido marcado como <b style="color:#059669;">resuelto</b>. Si tu solicitud no quedó atendida, responde a este correo para reabrirla.</p>`,
  );
}

export function newCommentExternalTemplate(folio: string, title: string, author: string) {
  return wrap(
    'Nueva respuesta en tu ticket',
    `<p style="margin:0 0 10px;">${folioBadge(folio)} <span style="color:#71717a;">"${title}"</span></p>
     <p style="margin:12px 0 0;"><b>${author}</b> respondió tu solicitud. Puedes responder este correo si necesitas agregar algo más.</p>`,
  );
}

export function slaWarningTemplate(folio: string, title: string, url: string) {
  return wrap(
    'SLA próximo a vencer',
    `<p style="margin:0 0 10px;">${folioBadge(folio)} <span style="color:#71717a;">"${title}"</span></p>
     <p style="margin:12px 0 0;">Este ticket está <b style="color:#d97706;">cerca de incumplir su SLA</b>. Revísalo cuanto antes.</p>`,
    url,
  );
}

export function digestTemplate(items: { title: string; message: string }[]) {
  const rows = items
    .map(
      (i) =>
        `<li style="margin-bottom:8px;"><b style="color:#0f172a;">${i.title}</b><br/><span style="color:#71717a;">${i.message}</span></li>`,
    )
    .join('');
  return wrap('Resumen de notificaciones', `<ul style="padding-left:18px; margin:0;">${rows}</ul>`);
}
