/**
 * One-off, idempotent data migration: adds the 17 "área comercial" ticket
 * categories (Operaciones & Última Milla, Financiero & COD, Técnico &
 * Integraciones, Gestión de Cuenta & CS, Calidad & Quejas) to the existing
 * "Comercial" group, sets Sofia Feregrino as their default assignee, and
 * adds keyword-based classification rules so matching inbound emails route
 * to that group automatically.
 *
 * Safe to run against any environment (including production) — everything
 * is upserted by a stable slug id, and it never touches unrelated groups,
 * users, or categories. Run with:
 *   npx ts-node --transpile-only prisma/seed-comercial-categories.ts
 */
import { PrismaClient, TicketPriority } from '@prisma/client';

const prisma = new PrismaClient();

const COMERCIAL_GROUP_NAME = 'Comercial';
const DEFAULT_ASSIGNEE_EMAIL = 'sofia.feregrino@logimarket.com.mx';

interface CategorySpec {
  slug: string;
  name: string;
  description: string;
  icon: string;
  slaHours: number;
  priority: TicketPriority;
  /** Keywords used to auto-route matching inbound emails to this category. */
  keywords: string[];
}

const CATEGORIES: CategorySpec[] = [
  {
    slug: 'com-aclaracion-entrega',
    name: 'Aclaración de Entrega (No Recibido)',
    description:
      'El sistema marca "Entregado", pero el merchant o el comprador final alegan que no lo recibieron.',
    icon: 'package-search',
    slaHours: 24,
    priority: 'high',
    keywords: ['no fue recibido', 'no lo recibió', 'no lo recibí', 'no le llegó el paquete', 'no me llegó el paquete'],
  },
  {
    slug: 'com-robo-extravio',
    name: 'Robo o Extravío Confirmado',
    description:
      'Operaciones confirma que el paquete no aparece. Requiere iniciar proceso de indemnización.',
    icon: 'shield-alert',
    slaHours: 72,
    priority: 'urgent',
    keywords: ['extravío', 'extravio', 'robo del paquete'],
  },
  {
    slug: 'com-dano-mercancia',
    name: 'Daño en Mercancía (Avería)',
    description: 'El paquete llegó roto, abierto o mojado al destinatario final.',
    icon: 'package-x',
    slaHours: 48,
    priority: 'high',
    keywords: ['avería', 'averia', 'paquete dañado', 'llegó roto'],
  },
  {
    slug: 'com-correccion-direccion',
    name: 'Corrección de Dirección Urgente',
    description: 'El paquete ya está en ruta, pero la dirección es incorrecta. Requiere re-enrutamiento.',
    icon: 'map-pin',
    slaHours: 4,
    priority: 'urgent',
    keywords: ['corrección de dirección', 'cambio de dirección urgente'],
  },
  {
    slug: 'com-rto-no-autorizado',
    name: 'Retorno (RTO) No Autorizado',
    description:
      'El merchant alega que la paquetería devolvió el paquete sin cumplir los intentos de entrega pactados.',
    icon: 'undo-2',
    slaHours: 48,
    priority: 'medium',
    keywords: ['rto no autorizado', 'retorno no autorizado', 'devolución sin intentos'],
  },
  {
    slug: 'com-dispersion-cod-no-recibida',
    name: 'Dispersión COD No Recibida',
    description:
      'El merchant alega que el paquete se entregó y cobró, pero no ha recibido el depósito del dinero.',
    icon: 'banknote',
    slaHours: 72,
    priority: 'urgent',
    keywords: ['dispersión cod', 'dispersion cod', 'no he recibido el depósito'],
  },
  {
    slug: 'com-monto-dispersion-incorrecto',
    name: 'Monto de Dispersión Incorrecto',
    description: 'El dinero recibido por el merchant no coincide con el valor COD del paquete enviado.',
    icon: 'calculator',
    slaHours: 72,
    priority: 'high',
    keywords: ['monto de dispersión', 'dispersión incorrecta'],
  },
  {
    slug: 'com-aclaracion-facturacion',
    name: 'Aclaración de Facturación (Saneamiento)',
    description:
      'El merchant no está de acuerdo con los cargos logísticos aplicados (sobrepeso, zonas extendidas, etc.).',
    icon: 'receipt',
    slaHours: 120,
    priority: 'medium',
    keywords: ['saneamiento', 'aclaración de factura', 'cargo de sobrepeso'],
  },
  {
    slug: 'com-fallo-cobro-cod',
    name: 'Fallo en Cobro COD (Efectivo)',
    description:
      'El repartidor no pudo cobrar (falla de terminal o falta de cambio) y no entregó. Requiere re-intento coordinado.',
    icon: 'credit-card',
    slaHours: 8,
    priority: 'high',
    keywords: ['fallo en cobro', 'no pudo cobrar', 'falta de cambio'],
  },
  {
    slug: 'com-falla-api',
    name: 'Falla en API',
    description:
      'La tienda del merchant (Shopify, VTEX) no está recibiendo actualizaciones de estatus o no genera guías.',
    icon: 'plug-zap',
    slaHours: 12,
    priority: 'urgent',
    keywords: ['falla en api', 'no genera guías', 'api key'],
  },
  {
    slug: 'com-error-portal-dashboard',
    name: 'Error en Portal Web / Dashboard',
    description:
      'El merchant no puede loguearse, el dashboard no carga datos o no puede descargar reportes masivos.',
    icon: 'monitor-x',
    slaHours: 24,
    priority: 'high',
    keywords: ['no puedo loguearme', 'el dashboard no carga', 'no descarga el reporte'],
  },
  {
    slug: 'com-nueva-integracion',
    name: 'Solicitud de Nueva Integración / Conectividad',
    description: 'Un merchant Nivel A o B solicita ayuda técnica para conectar un nuevo WMS o ERP.',
    icon: 'plug',
    slaHours: 48,
    priority: 'medium',
    keywords: ['nueva integración', 'conectar wms', 'conectar erp'],
  },
  {
    slug: 'com-recoleccion-especial',
    name: 'Solicitud de Recolección Especial / Pico',
    description:
      'El merchant tiene un pico de venta y requiere unidades adicionales de recolección fuera de horario.',
    icon: 'truck',
    slaHours: 8,
    priority: 'high',
    keywords: ['recolección especial', 'recolección pico', 'unidades adicionales de recolección'],
  },
  {
    slug: 'com-recotizacion-volumen',
    name: 'Re-cotización por Volumen (Upsell)',
    description: 'El merchant informa que duplicará sus envíos y pide revisión de tarifas.',
    icon: 'trending-up',
    slaHours: 72,
    priority: 'medium',
    keywords: ['recotización', 'revisión de tarifas', 'duplicará sus envíos'],
  },
  {
    slug: 'com-activacion-vas',
    name: 'Activación de Servicios VAS',
    description: 'El merchant solicita activar seguros de carga, fulfillment o embalaje especial.',
    icon: 'shield-plus',
    slaHours: 48,
    priority: 'medium',
    keywords: ['servicios vas', 'activar seguro de carga', 'embalaje especial'],
  },
  {
    slug: 'com-alerta-churn',
    name: 'Alerta de Churn (Riesgo de Fuga)',
    description: 'El CSM detecta que el cliente está insatisfecho o cotizando con la competencia.',
    icon: 'user-x',
    slaHours: 24,
    priority: 'high',
    keywords: ['riesgo de fuga', 'cotizando con la competencia'],
  },
  {
    slug: 'com-queja-formal',
    name: 'Queja Formal de Servicio (Comportamiento)',
    description: 'Maltrato del repartidor al comprador final o del agente de soporte al merchant.',
    icon: 'flag',
    slaHours: 48,
    priority: 'medium',
    keywords: ['queja formal', 'maltrato del repartidor'],
  },
];

async function main() {
  const group = await prisma.group.findFirst({ where: { name: COMERCIAL_GROUP_NAME } });
  if (!group) {
    throw new Error(
      `No se encontró el grupo "${COMERCIAL_GROUP_NAME}". Créalo antes de correr este script.`,
    );
  }

  const defaultAssignee = await prisma.user.findFirst({
    where: { email: { equals: DEFAULT_ASSIGNEE_EMAIL, mode: 'insensitive' } },
  });
  if (!defaultAssignee) {
    console.warn(
      `Aviso: no se encontró un usuario con el correo ${DEFAULT_ASSIGNEE_EMAIL}. Las categorías se crearán sin asignado por defecto (recaerán en el líder del grupo, si tiene uno).`,
    );
  }

  let ruleOrder = 200;
  for (const spec of CATEGORIES) {
    const categoryId = `cat-${spec.slug}`;
    await prisma.category.upsert({
      where: { id: categoryId },
      create: {
        id: categoryId,
        name: spec.name,
        description: spec.description,
        icon: spec.icon,
        groupId: group.id,
        slaHours: spec.slaHours,
        isActive: true,
        defaultAssigneeId: defaultAssignee?.id ?? null,
        defaultPriority: spec.priority,
      },
      update: {
        name: spec.name,
        description: spec.description,
        icon: spec.icon,
        slaHours: spec.slaHours,
        defaultAssigneeId: defaultAssignee?.id ?? null,
        defaultPriority: spec.priority,
      },
    });

    for (const [i, keyword] of spec.keywords.entries()) {
      const ruleId = `rule-${spec.slug}-${i + 1}`;
      await prisma.classificationRule.upsert({
        where: { id: ruleId },
        create: {
          id: ruleId,
          name: `${spec.name} → Comercial`,
          order: ruleOrder,
          matchType: 'body_contains',
          matchValue: keyword,
          groupId: group.id,
          categoryId,
          priority: spec.priority,
        },
        update: {
          order: ruleOrder,
          matchValue: keyword,
          groupId: group.id,
          categoryId,
          priority: spec.priority,
        },
      });
      ruleOrder += 1;
    }
  }

  console.log(`Listo: ${CATEGORIES.length} categorías comerciales creadas/actualizadas en el grupo "${group.name}".`);
  console.log(
    defaultAssignee
      ? `Asignado por defecto: ${defaultAssignee.name} <${defaultAssignee.email}>`
      : 'Sin asignado por defecto (usuario no encontrado).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
