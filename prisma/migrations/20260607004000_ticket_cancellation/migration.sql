-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "cancelledBy" UUID;
ALTER TABLE "Ticket" ADD COLUMN "cancelReason" TEXT;

-- CreateTable
CREATE TABLE "TicketCancellationCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketCancellationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketCancellationCode_code_key" ON "TicketCancellationCode"("code");

-- CreateIndex
CREATE INDEX "TicketCancellationCode_createdBy_idx" ON "TicketCancellationCode"("createdBy");

-- CreateIndex
CREATE INDEX "TicketCancellationCode_expiresAt_idx" ON "TicketCancellationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "TicketCancellationCode_used_idx" ON "TicketCancellationCode"("used");

-- AddForeignKey
ALTER TABLE "TicketCancellationCode" ADD CONSTRAINT "TicketCancellationCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
