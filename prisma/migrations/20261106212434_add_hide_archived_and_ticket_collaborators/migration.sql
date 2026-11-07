-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hideArchivedTickets" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_TicketCollaborators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TicketCollaborators_AB_unique" ON "_TicketCollaborators"("A", "B");

-- CreateIndex
CREATE INDEX "_TicketCollaborators_B_index" ON "_TicketCollaborators"("B");

-- AddForeignKey
ALTER TABLE "_TicketCollaborators" ADD CONSTRAINT "_TicketCollaborators_A_fkey" FOREIGN KEY ("A") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TicketCollaborators" ADD CONSTRAINT "_TicketCollaborators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
