import { ClassificationRulesService } from './classification-rules.service';

describe('ClassificationRulesService', () => {
  function makeService(rules: any[], config: any = null) {
    const prisma = {
      classificationRule: { findMany: jest.fn().mockResolvedValue(rules) },
      emailIngestConfig: { findUnique: jest.fn().mockResolvedValue(config) },
    } as any;
    return new ClassificationRulesService(prisma);
  }

  it('returns the first matching rule in order', async () => {
    const service = makeService([
      { matchType: 'subject_contains', matchValue: 'factura', groupId: 'g5', categoryId: 'c10', priority: 'medium' },
      { matchType: 'subject_contains', matchValue: 'acceso', groupId: 'g1', categoryId: 'c4', priority: 'high' },
    ]);
    const result = await service.classify({
      subject: 'Problema de acceso a mi cuenta',
      body: '',
      fromEmail: 'a@b.com',
    });
    expect(result).toEqual({ groupId: 'g1', categoryId: 'c4', priority: 'high' });
  });

  it('matches by sender domain', async () => {
    const service = makeService([
      { matchType: 'from_domain', matchValue: 'proveedor.com', groupId: 'g6', categoryId: 'c5', priority: 'low' },
    ]);
    const result = await service.classify({
      subject: 'Cotización',
      body: '',
      fromEmail: 'ventas@proveedor.com',
    });
    expect(result.groupId).toBe('g6');
  });

  it('falls back to EmailIngestConfig defaults when nothing matches', async () => {
    const service = makeService([], {
      defaultGroupId: 'g1',
      defaultCategoryId: 'c-inbox',
      defaultPriority: 'medium',
    });
    const result = await service.classify({ subject: 'algo', body: '', fromEmail: 'a@b.com' });
    expect(result).toEqual({ groupId: 'g1', categoryId: 'c-inbox', priority: 'medium' });
  });

  it('returns empty result when no rules and no config exist', async () => {
    const service = makeService([], null);
    const result = await service.classify({ subject: 'algo', body: '', fromEmail: 'a@b.com' });
    expect(result).toEqual({});
  });
});
