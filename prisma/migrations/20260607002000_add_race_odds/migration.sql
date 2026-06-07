-- CreateTable
CREATE TABLE "RaceOdds" (
    "id" UUID NOT NULL,
    "raceId" UUID NOT NULL,
    "betType" "BetType" NOT NULL,
    "selection" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentOdds" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "finalOdds" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceOdds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaceOdds_raceId_idx" ON "RaceOdds"("raceId");

-- CreateIndex
CREATE INDEX "RaceOdds_raceId_betType_idx" ON "RaceOdds"("raceId", "betType");

-- CreateIndex
CREATE UNIQUE INDEX "RaceOdds_raceId_betType_selection_key" ON "RaceOdds"("raceId", "betType", "selection");

-- AddForeignKey
ALTER TABLE "RaceOdds" ADD CONSTRAINT "RaceOdds_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
