import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const groups = [
  { id: 'g1', name: 'Help Desk TI', description: 'Soporte técnico de primer nivel', color: '#3b82f6' },
  { id: 'g2', name: 'Operaciones', description: 'Equipo de operaciones y logística', color: '#10b981' },
  { id: 'g3', name: 'Auditoría', description: 'Control y auditoría interna', color: '#f59e0b' },
  { id: 'g4', name: 'RH', description: 'Recursos Humanos', color: '#ec4899' },
  { id: 'g5', name: 'Finanzas', description: 'Departamento financiero', color: '#8b5cf6' },
  { id: 'g6', name: 'Compras', description: 'Adquisiciones y proveedores', color: '#06b6d4' },
  { id: 'g7', name: 'Calidad', description: 'Control de calidad', color: '#84cc16' },
  { id: 'g8', name: 'Mantenimiento', description: 'Mantenimiento de instalaciones', color: '#f97316' },
  { id: 'g9', name: 'Seguridad', description: 'Seguridad patrimonial', color: '#ef4444' },
  { id: 'g10', name: 'Dirección', description: 'Alta dirección', color: '#6366f1' },
];

const users = [
  { id: 'u1', email: 'admin@nextos.com', name: 'Carlos Mendoza', role: 'admin', groupId: 'g1' },
  { id: 'u2', email: 'supervisor@nextos.com', name: 'María García', role: 'supervisor', groupId: 'g1' },
  { id: 'u3', email: 'agent1@nextos.com', name: 'Roberto Sánchez', role: 'agent', groupId: 'g1' },
  { id: 'u4', email: 'agent2@nextos.com', name: 'Ana López', role: 'agent', groupId: 'g2' },
  { id: 'u5', email: 'user1@nextos.com', name: 'Pedro Ramírez', role: 'user', groupId: 'g3' },
  { id: 'u6', email: 'user2@nextos.com', name: 'Laura Martínez', role: 'user', groupId: 'g4' },
  { id: 'u7', email: 'supervisor2@nextos.com', name: 'Diego Hernández', role: 'supervisor', groupId: 'g2' },
  { id: 'u8', email: 'agent3@nextos.com', name: 'Sofia Torres', role: 'agent', groupId: 'g3' },
  { id: 'u9', email: 'agent4@nextos.com', name: 'Miguel Flores', role: 'agent', groupId: 'g8' },
  { id: 'u10', email: 'user3@nextos.com', name: 'Carmen Ruiz', role: 'user', groupId: 'g5', isActive: false },
] as const;

const categories = [
  { id: 'c1', name: 'Hardware', description: 'Problemas con equipos físicos', icon: 'monitor', groupId: 'g1', slaHours: 8 },
  { id: 'c2', name: 'Software', description: 'Instalación y soporte de aplicaciones', icon: 'code', groupId: 'g1', slaHours: 4 },
  { id: 'c3', name: 'Red / Conectividad', description: 'Problemas de red e internet', icon: 'wifi', groupId: 'g1', slaHours: 2 },
  { id: 'c4', name: 'Accesos', description: 'Permisos y credenciales', icon: 'key', groupId: 'g1', slaHours: 4 },
  { id: 'c5', name: 'Solicitud de Equipo', description: 'Nuevos equipos o reemplazos', icon: 'package', groupId: 'g6', slaHours: 72 },
  { id: 'c6', name: 'Incidente Operativo', description: 'Fallas en procesos operativos', icon: 'alert-triangle', groupId: 'g2', slaHours: 4 },
  { id: 'c7', name: 'Auditoría Interna', description: 'Hallazgos de auditoría', icon: 'clipboard-check', groupId: 'g3', slaHours: 48 },
  { id: 'c8', name: 'Mantenimiento', description: 'Reparaciones y mantenimiento', icon: 'wrench', groupId: 'g8', slaHours: 24 },
  { id: 'c9', name: 'Solicitud RH', description: 'Trámites de recursos humanos', icon: 'users', groupId: 'g4', slaHours: 48 },
  { id: 'c10', name: 'Finanzas', description: 'Solicitudes financieras', icon: 'dollar-sign', groupId: 'g5', slaHours: 24 },
];

const tickets = [
  { id: 't1', folio: 'TK-2026-001001', title: 'Laptop no enciende después de actualización', description: 'Mi laptop Dell se quedó congelada durante una actualización de Windows y ahora no enciende.', status: 'in_progress', priority: 'high', categoryId: 'c1', groupId: 'g1', assignedToId: 'u3', createdById: 'u5', tags: ['hardware', 'laptop', 'urgente'] },
  { id: 't2', folio: 'TK-2026-001002', title: 'Solicitud de acceso a carpeta compartida Finanzas', description: 'Requiero acceso de lectura a la carpeta compartida del departamento de Finanzas.', status: 'new', priority: 'medium', categoryId: 'c4', groupId: 'g1', assignedToId: null, createdById: 'u8', tags: ['accesos', 'auditoria'] },
  { id: 't3', folio: 'TK-2026-001003', title: 'Internet lento en área de producción', description: 'Desde hace 2 días el internet está muy lento en toda el área de producción.', status: 'in_progress', priority: 'urgent', categoryId: 'c3', groupId: 'g1', assignedToId: 'u3', createdById: 'u7', tags: ['red', 'produccion', 'erp'] },
  { id: 't4', folio: 'TK-2026-001004', title: 'Instalar Office 365 en equipo nuevo', description: 'Se entregó equipo nuevo al área de RH, requiere instalación de Office 365.', status: 'resolved', priority: 'low', categoryId: 'c2', groupId: 'g1', assignedToId: 'u3', createdById: 'u6', tags: ['software', 'office'], resolved: true },
  { id: 't5', folio: 'TK-2026-001005', title: 'Hallazgo: Falta de respaldo de documentos críticos', description: 'Durante auditoría se detectó que el área de Compras no tiene respaldos.', status: 'new', priority: 'high', categoryId: 'c7', groupId: 'g3', assignedToId: 'u8', createdById: 'u5', tags: ['auditoria', 'critico'] },
  { id: 't6', folio: 'TK-2026-001006', title: 'Aire acondicionado no funciona en sala de juntas', description: 'El aire acondicionado de la sala de juntas principal dejó de funcionar.', status: 'in_progress', priority: 'medium', categoryId: 'c8', groupId: 'g8', assignedToId: 'u9', createdById: 'u2', tags: ['mantenimiento'] },
  { id: 't7', folio: 'TK-2026-001007', title: 'Solicitud de 5 monitores para área de diseño', description: 'Se requieren 5 monitores de 27 pulgadas.', status: 'new', priority: 'low', categoryId: 'c5', groupId: 'g6', assignedToId: null, createdById: 'u7', tags: ['compras', 'equipo'] },
  { id: 't8', folio: 'TK-2026-001008', title: 'Error en sistema de nómina', description: 'El sistema de nómina muestra error al generar reporte. Código: NOM-5521.', status: 'closed', priority: 'urgent', categoryId: 'c2', groupId: 'g1', assignedToId: 'u3', createdById: 'u6', tags: ['nomina', 'critico'], resolved: true, closed: true },
  { id: 't9', folio: 'TK-2026-001009', title: 'Printer HP no imprime en red', description: 'La impresora HP LaserJet del piso 2 dejó de imprimir por red.', status: 'new', priority: 'medium', categoryId: 'c1', groupId: 'g1', assignedToId: null, createdById: 'u4', tags: ['impresora', 'red'] },
  { id: 't10', folio: 'TK-2026-001010', title: 'Incidente: Fuga de agua en almacén', description: 'Se detectó fuga de agua en el almacén de materiales.', status: 'in_progress', priority: 'urgent', categoryId: 'c6', groupId: 'g2', assignedToId: 'u4', createdById: 'u7', tags: ['incidente', 'urgente'] },
  { id: 't11', folio: 'TK-2026-001011', title: 'Solicitud de vacaciones - Juan Pérez', description: 'Solicito 5 días de vacaciones del 15 al 19 de mayo.', status: 'resolved', priority: 'low', categoryId: 'c9', groupId: 'g4', assignedToId: 'u6', createdById: 'u5', tags: ['rh', 'vacaciones'], resolved: true },
  { id: 't12', folio: 'TK-2026-001012', title: 'VPN no conecta desde casa', description: 'No puedo conectarme a la VPN corporativa desde mi casa.', status: 'new', priority: 'high', categoryId: 'c3', groupId: 'g1', assignedToId: null, createdById: 'u10', tags: ['vpn', 'remoto'] },
  { id: 't13', folio: 'TK-2026-001013', title: 'Reembolso de gastos de viaje', description: 'Solicito reembolso de gastos de viaje a Monterrey.', status: 'in_progress', priority: 'medium', categoryId: 'c10', groupId: 'g5', assignedToId: null, createdById: 'u8', tags: ['finanzas', 'reembolso'] },
  { id: 't14', folio: 'TK-2026-001014', title: 'Cámaras de seguridad sin grabación', description: 'Las cámaras del estacionamiento no están grabando desde ayer.', status: 'new', priority: 'urgent', categoryId: 'c8', groupId: 'g9', assignedToId: null, createdById: 'u9', tags: ['seguridad', 'urgente'] },
  { id: 't15', folio: 'TK-2026-001015', title: 'Actualizar antivirus en servidores', description: 'Programar actualización de antivirus en servidores de producción.', status: 'closed', priority: 'high', categoryId: 'c2', groupId: 'g1', assignedToId: 'u3', createdById: 'u1', tags: ['seguridad', 'antivirus'], resolved: true, closed: true },
];

const comments = [
  { id: 'cm1', ticketId: 't1', userId: 'u3', content: 'Revisando el equipo. Parece ser problema con la batería o motherboard.', type: 'public' },
  { id: 'cm2', ticketId: 't1', userId: 'u2', content: 'Nota interna: Verificar si está en garantía antes de solicitar refacción.', type: 'internal' },
  { id: 'cm3', ticketId: 't1', userId: 'u3', content: 'Se confirma falla en motherboard. Equipo tiene garantía vigente.', type: 'public' },
  { id: 'cm4', ticketId: 't3', userId: 'u3', content: 'Realizando diagnóstico de red. Se detecta saturación en el switch principal.', type: 'public' },
  { id: 'cm5', ticketId: 't3', userId: 'u3', content: 'Se reinició switch y se liberaron puertos no utilizados. Monitoreando.', type: 'public' },
  { id: 'cm6', ticketId: 't6', userId: 'u9', content: 'Se revisó unidad. Requiere cambio de compresor. Solicitando cotización.', type: 'public' },
  { id: 'cm7', ticketId: 't10', userId: 'u4', content: 'Equipo de mantenimiento en sitio. Se cerró válvula principal para contener fuga.', type: 'public' },
  { id: 'cm8', ticketId: 't4', userId: 'u3', content: 'Office 365 instalado y correo configurado. Usuario notificado.', type: 'public' },
];

async function main() {
  for (const g of groups) {
    await prisma.group.upsert({ where: { id: g.id }, create: { ...g, isActive: true }, update: g });
  }

  for (const u of users) {
    const passwordHash = await bcrypt.hash('demo', 10);
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as any,
        groupId: u.groupId,
        passwordHash,
        isActive: (u as any).isActive ?? true,
      },
      update: {},
    });
  }

  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, create: { ...c, isActive: true }, update: c });
  }

  for (const t of tickets) {
    const now = new Date();
    await prisma.ticket.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        folio: t.folio,
        title: t.title,
        description: t.description,
        status: t.status as any,
        priority: t.priority as any,
        categoryId: t.categoryId,
        groupId: t.groupId,
        assignedToId: t.assignedToId,
        createdById: t.createdById,
        tags: t.tags,
        resolvedAt: (t as any).resolved ? now : null,
        closedAt: (t as any).closed ? now : null,
      },
      update: {},
    });
    await prisma.historyEntry.upsert({
      where: { id: `h-${t.id}-created` },
      create: { id: `h-${t.id}-created`, ticketId: t.id, userId: t.createdById, action: 'created' },
      update: {},
    });
  }

  for (const c of comments) {
    await prisma.comment.upsert({
      where: { id: c.id },
      create: { ...c, type: c.type as any },
      update: {},
    });
  }

  await prisma.folioCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, lastSeq: 1015 },
    update: {},
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      general: {
        systemName: 'NEXT OS Help Desk',
        companyName: 'Mi Empresa',
        defaultLanguage: 'es',
        timezone: 'America/Mexico_City',
        ticketPrefix: 'TK',
        autoAssign: false,
        allowSelfAssign: true,
      },
      security: {
        sessionTimeout: 60,
        requireMfa: false,
        passwordExpiry: 0,
        minPasswordLength: 6,
        allowPasswordReset: true,
      },
    },
    update: {},
  });

  console.log('Seed completado. Usuarios de prueba (password: "demo"):');
  for (const u of users) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
