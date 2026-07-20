import { Injectable } from '@nestjs/common';
import { TicketPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailForClassification {
  subject: string;
  body: string;
  fromEmail: string;
}

export interface ClassificationResult {
  groupId?: string;
  categoryId?: string;
  priority?: TicketPriority;
}

@Injectable()
export class ClassificationRulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Evaluates active ClassificationRule rows in order; the first rule whose
   * matchValue is found wins. Falls back to EmailIngestConfig's configured
   * defaults when nothing matches (and to no defaults at all — the caller
   * then falls back to the static "Bandeja de Entrada" category).
   */
  async classify(email: EmailForClassification): Promise<ClassificationResult> {
    const rules = await this.prisma.classificationRule.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    for (const rule of rules) {
      if (this.matches(rule, email)) {
        return {
          groupId: rule.groupId ?? undefined,
          categoryId: rule.categoryId ?? undefined,
          priority: rule.priority ?? undefined,
        };
      }
    }

    const config = await this.prisma.emailIngestConfig.findUnique({ where: { id: 1 } });
    if (!config) return {};
    return {
      groupId: config.defaultGroupId ?? undefined,
      categoryId: config.defaultCategoryId ?? undefined,
      priority: config.defaultPriority,
    };
  }

  private matches(
    rule: { matchType: string; matchValue: string },
    email: EmailForClassification,
  ): boolean {
    const value = rule.matchValue.toLowerCase();
    switch (rule.matchType) {
      case 'subject_contains':
        return email.subject.toLowerCase().includes(value);
      case 'body_contains':
        return email.body.toLowerCase().includes(value);
      case 'from_email':
        return email.fromEmail.toLowerCase() === value;
      case 'from_domain': {
        const domain = email.fromEmail.split('@')[1]?.toLowerCase();
        return domain === value;
      }
      default:
        return false;
    }
  }
}
