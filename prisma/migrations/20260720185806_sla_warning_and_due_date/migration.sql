-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'sla_warning';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "slaWarningSentAt" TIMESTAMP(3);
