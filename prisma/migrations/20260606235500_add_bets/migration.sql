-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('WINNER', 'EXACTA', 'TRIPLE');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'PAID');

-- CreateTable
CREATE TABLE "Bet" (
    "id" UUID NOT NULL,
    "raceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tipo" "BetType" NOT NULL,
    "combinacion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bet_raceId_idx" ON "Bet"("raceId");

-- CreateIndex
CREATE INDEX "Bet_userId_idx" ON "Bet"("userId");

-- CreateIndex
CREATE INDEX "Bet_raceId_userId_idx" ON "Bet"("raceId", "userId");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
