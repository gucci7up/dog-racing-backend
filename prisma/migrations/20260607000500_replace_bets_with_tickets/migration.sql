-- Drop Bet table first (it depends on BetType/BetStatus)
DROP TABLE IF EXISTS "Bet";

-- Drop old enums
DROP TYPE IF EXISTS "BetStatus";
DROP TYPE IF EXISTS "BetType";

-- Create new enums
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'PAID');
CREATE TYPE "BetType" AS ENUM ('WINNER', 'EXACTA', 'TRIFECTA');

-- Create Ticket
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "raceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- Create TicketDetail
CREATE TABLE "TicketDetail" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "betType" "BetType" NOT NULL,
    "selection" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "odds" DECIMAL(12,4) NOT NULL,
    "potentialPrize" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketDetail_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_raceId_idx" ON "Ticket"("raceId");
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");
CREATE INDEX "Ticket_raceId_userId_idx" ON "Ticket"("raceId", "userId");
CREATE INDEX "TicketDetail_ticketId_idx" ON "TicketDetail"("ticketId");

-- Foreign keys
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDetail" ADD CONSTRAINT "TicketDetail_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
