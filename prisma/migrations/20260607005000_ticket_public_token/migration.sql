-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "publicToken" TEXT;

UPDATE "Ticket"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "publicToken" IS NULL;

ALTER TABLE "Ticket" ALTER COLUMN "publicToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicToken_key" ON "Ticket"("publicToken");
