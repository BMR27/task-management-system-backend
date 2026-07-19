-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultAssigneeId" TEXT;

-- CreateIndex
CREATE INDEX "Category_defaultAssigneeId_idx" ON "Category"("defaultAssigneeId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
