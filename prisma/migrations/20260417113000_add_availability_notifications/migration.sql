-- CreateTable
CREATE TABLE "EventAvailabilityNotification" (
    "eventId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "emailManageTokenHash" TEXT,
    "pendingSinceAt" TIMESTAMP(3),
    "pendingFlushAfterAt" TIMESTAMP(3),
    "pendingParticipantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pendingChangeCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAvailabilityNotification_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "EventAvailabilityNotification_pendingFlushAfterAt_idx" ON "EventAvailabilityNotification"("pendingFlushAfterAt");

-- AddForeignKey
ALTER TABLE "EventAvailabilityNotification" ADD CONSTRAINT "EventAvailabilityNotification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
