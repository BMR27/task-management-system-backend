-- CreateTable
CREATE TABLE "_DocumentViewGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DocumentViewGroups_AB_unique" ON "_DocumentViewGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_DocumentViewGroups_B_index" ON "_DocumentViewGroups"("B");

-- AddForeignKey
ALTER TABLE "_DocumentViewGroups" ADD CONSTRAINT "_DocumentViewGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentViewGroups" ADD CONSTRAINT "_DocumentViewGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
