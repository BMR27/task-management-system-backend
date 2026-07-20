-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('web', 'email');

-- CreateEnum
CREATE TYPE "CommentSource" AS ENUM ('web', 'email');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('pending', 'processing', 'processed', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "RuleMatchType" AS ENUM ('subject_contains', 'body_contains', 'from_domain', 'from_email');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "source" "CommentSource" NOT NULL DEFAULT 'web';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'web';

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "direction" "EmailDirection" NOT NULL,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fromEmail" TEXT,
    "fromName" TEXT,
    "subject" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'pending',
    "ticketId" TEXT,
    "commentId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "matchType" "RuleMatchType" NOT NULL,
    "matchValue" TEXT NOT NULL,
    "groupId" TEXT,
    "categoryId" TEXT,
    "priority" "TicketPriority",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailIngestConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "monitoredAddress" TEXT,
    "defaultGroupId" TEXT,
    "defaultCategoryId" TEXT,
    "defaultPriority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "senderBlocklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxAttachmentsPerEmail" INTEGER NOT NULL DEFAULT 5,
    "maxAttachmentSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maxTicketsPerSenderPerHour" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIngestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_messageId_key" ON "EmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");

-- CreateIndex
CREATE INDEX "EmailMessage_ticketId_idx" ON "EmailMessage"("ticketId");

-- CreateIndex
CREATE INDEX "EmailMessage_inReplyTo_idx" ON "EmailMessage"("inReplyTo");

-- CreateIndex
CREATE INDEX "ClassificationRule_isActive_order_idx" ON "ClassificationRule"("isActive", "order");

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRule" ADD CONSTRAINT "ClassificationRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
