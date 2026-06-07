-- CreateTable
CREATE TABLE "QueueState" (
    "id" UUID NOT NULL,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueState_pkey" PRIMARY KEY ("id")
);
