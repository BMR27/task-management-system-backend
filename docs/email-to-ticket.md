# Correo → Ticket (ingestión automática)

## Arquitectura

```
Resend (buzón real) --webhook--> POST /api/webhooks/resend-inbound
                                        │
                                        │ 1. verifica firma (svix)
                                        │ 2. dedupe por Message-ID (EmailMessage.messageId único)
                                        │ 3. crea EmailMessage(status=pending) + encola job
                                        ▼
                              Redis / cola BullMQ "email-inbound"
                                        │
                                        ▼
                              EmailProcessor (worker)
                    ┌───────────────────┼────────────────────┐
                    │                   │                    │
          filtra automatizados   busca ticket existente   clasifica (reglas)
          (rebotes/OOO/bulk)     (folio en asunto o        y crea ticket nuevo
          bloqueo/rate-limit      In-Reply-To/References)   con adjuntos
                    │                   │                    │
                    └───────► Comment (source=email) ◄───────┘
                                 + reabre ticket si estaba resuelto/cerrado
                                        │
                                        ▼
                     Notificaciones (staff del grupo + confirmación al
                     remitente externo, con Message-ID propio para threading)
```

El canal de entrada sigue siendo el webhook de Resend ya existente
(`src/inbound-email/`), no IMAP/Graph/Gmail — es el mecanismo ya integrado en
el sistema. Lo que cambió es que el webhook ahora solo verifica, deduplica y
encola; todo el trabajo pesado (fetch del cuerpo completo, adjuntos,
clasificación, creación de ticket/comentario) ocurre de forma asíncrona en
`EmailProcessor` (`src/email-processing/email.processor.ts`), con reintentos
automáticos de BullMQ.

## Modelo de datos nuevo

- **`EmailMessage`**: un registro por cada correo entrante o saliente ligado
  a un ticket. Es a la vez la cola de dedupe (`messageId` único) y el log de
  auditoría (`status`, `errorMessage`, `retryCount`, `receivedAt`).
- **`ClassificationRule`**: reglas de asignación automática, evaluadas en
  orden (`order` ascendente), primera coincidencia gana. `matchType` puede
  ser `subject_contains`, `body_contains`, `from_domain` o `from_email`.
- **`EmailIngestConfig`**: fila única (como `Settings`) con los valores por
  defecto (grupo/categoría/prioridad si ninguna regla coincide), blocklist de
  remitentes, y límites de adjuntos/rate-limit.
- **`Ticket.source` / `Comment.source`**: `web` o `email` — reemplaza la
  inferencia anterior por presencia de `requesterEmail` y evita reenviar un
  correo de notificación al mismo remitente que acaba de escribir por correo
  (loop de respuestas).

## Cómo agregar una regla de clasificación

Inserta una fila en `ClassificationRule` (por ahora vía Prisma Studio/SQL o
el seed — el CRUD administrativo queda para la Fase 2, ver más abajo):

```ts
await prisma.classificationRule.create({
  data: {
    name: 'Ventas → Comercial',
    order: 50,
    matchType: 'subject_contains', // o body_contains / from_domain / from_email
    matchValue: 'cotización',
    groupId: 'g-comercial',
    categoryId: 'c-ventas',
    priority: 'medium',
  },
});
```

Reglas con `order` menor se evalúan primero. Si ninguna coincide, se usan los
defaults de `EmailIngestConfig`; si esa fila tampoco tiene defaults, cae en
la categoría fija `"Bandeja de Entrada"` (comportamiento histórico).

## Threading de respuestas

1. Se busca el folio (`TK-\d{4}-\d{6}`) dentro del asunto del correo.
2. Si no aparece, se buscan los headers `In-Reply-To`/`References` del
   correo entrante contra `EmailMessage` de dirección `outbound` — cada vez
   que `MailService.send(...)` se llama con `{ ticketId }`, genera un
   Message-ID propio y lo persiste, exactamente para este matching.
3. Si se encuentra el ticket, la respuesta se agrega como `Comment`
   (`source: email`) y, si el ticket estaba `resolved`/`closed`, se reabre
   pasándolo a `in_progress`.
4. Si no se encuentra, se trata como una solicitud nueva.

## Variables de entorno nuevas

```
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
MAIL_DOMAIN="example.com"      # dominio usado en los Message-ID que generamos
REDIS_URL="redis://localhost:6379"
```

## Reprocesar un correo fallido

`GET /api/email-messages?status=failed` (rol admin) para listar los
correos que agotaron los reintentos de BullMQ. `POST
/api/email-messages/:id/reprocess` los vuelve a encolar usando el
`email_id` de Resend guardado en `rawPayload`.

## Seguridad

- Firma del webhook verificada con `svix` (sin cambios).
- HTML sanitizado con `sanitize-html` (allowlist de tags/atributos, sin
  scripts ni `javascript:`), no con una regex.
- Adjuntos validados con el mismo allowlist de MIME types y límite de tamaño
  que las subidas manuales (`src/attachments/attachment-validation.util.ts`).
- Filtro de correos automáticos/rebotes/fuera de oficina
  (`automated-email-detector.ts`) antes de crear cualquier ticket/comentario.
- Blocklist de remitentes + límite de tickets por remitente/hora
  (`sender-guard.service.ts`), configurables en `EmailIngestConfig`.

**Limitación conocida**: no se implementa escaneo antivirus de adjuntos (no
hay infraestructura tipo ClamAV en este proyecto). Si se necesita, el punto
de integración natural es dentro de `EmailProcessor.processEmail()`, antes
de `attachments.createForTicketFromInboundFiles(...)`.

**Limitación conocida**: el correo entrante depende de Resend (no hay
soporte IMAP/Graph/Gmail genérico). Si en el futuro se necesita monitorear
un buzón que no pase por Resend, el punto de extensión es reemplazar
`ResendEmailFetcherService` por un adaptador equivalente que produzca el
mismo tipo `FetchedEmail` — el resto del pipeline (dedupe, clasificación,
threading, notificaciones) no depende de Resend.

## Fase 2 (pendiente)

CRUD administrativo (`src/classification-rules/`, siguiendo el patrón de
`src/categories/`) + UI en el frontend para gestionar reglas, blocklist,
defaults de `EmailIngestConfig`, y ver/reprocesar correos fallidos desde
`GET /api/email-messages`.
