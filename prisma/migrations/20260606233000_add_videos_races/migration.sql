-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('OPEN', 'CLOSED', 'RUNNING', 'FINISHED');

-- CreateTable
CREATE TABLE "Video" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "videoId" UUID NOT NULL,
    "resultado" TEXT NOT NULL,
    "status" "RaceStatus" NOT NULL DEFAULT 'OPEN',
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "runAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_nombre_key" ON "Video"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Race_numero_key" ON "Race"("numero");

-- CreateIndex
CREATE INDEX "Race_videoId_idx" ON "Race"("videoId");

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
