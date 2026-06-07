-- CreateTable
CREATE TABLE "VideoQueue" (
    "id" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoQueue_used_position_idx" ON "VideoQueue"("used", "position");

-- CreateIndex
CREATE INDEX "VideoQueue_videoId_idx" ON "VideoQueue"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQueue_position_key" ON "VideoQueue"("position");

-- AddForeignKey
ALTER TABLE "VideoQueue" ADD CONSTRAINT "VideoQueue_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
