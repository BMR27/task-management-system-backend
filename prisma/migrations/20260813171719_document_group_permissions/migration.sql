-- CreateEnum
CREATE TYPE "DocumentPermissionLevel" AS ENUM ('view', 'manage');

-- CreateTable
CREATE TABLE "DocumentGroupPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "level" "DocumentPermissionLevel" NOT NULL,

    CONSTRAINT "DocumentGroupPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentGroupPermission_groupId_idx" ON "DocumentGroupPermission"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentGroupPermission_userId_groupId_key" ON "DocumentGroupPermission"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "DocumentGroupPermission" ADD CONSTRAINT "DocumentGroupPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGroupPermission" ADD CONSTRAINT "DocumentGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: carry over existing canManageDocuments=true grants as 'manage'
-- on the user's own group.
INSERT INTO "DocumentGroupPermission" ("id", "userId", "groupId", "level")
SELECT gen_random_uuid()::text, "id", "groupId", 'manage'::"DocumentPermissionLevel"
FROM "User"
WHERE "canManageDocuments" = true AND "groupId" IS NOT NULL
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- DataMigration: carry over existing documentViewGroups (view-only extra
-- groups) as 'view' rows. Skipped where a 'manage' row already exists for
-- that (user, group) from the step above.
INSERT INTO "DocumentGroupPermission" ("id", "userId", "groupId", "level")
SELECT gen_random_uuid()::text, "B", "A", 'view'::"DocumentPermissionLevel"
FROM "_DocumentViewGroups"
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- DropForeignKey
ALTER TABLE "_DocumentViewGroups" DROP CONSTRAINT "_DocumentViewGroups_A_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentViewGroups" DROP CONSTRAINT "_DocumentViewGroups_B_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "canManageDocuments";

-- DropTable
DROP TABLE "_DocumentViewGroups";
