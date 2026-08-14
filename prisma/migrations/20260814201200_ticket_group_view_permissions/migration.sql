-- CreateTable
CREATE TABLE "TicketGroupViewPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "TicketGroupViewPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketGroupViewPermission_groupId_idx" ON "TicketGroupViewPermission"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketGroupViewPermission_userId_groupId_key" ON "TicketGroupViewPermission"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "TicketGroupViewPermission" ADD CONSTRAINT "TicketGroupViewPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketGroupViewPermission" ADD CONSTRAINT "TicketGroupViewPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
