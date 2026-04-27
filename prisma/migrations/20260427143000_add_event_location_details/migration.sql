ALTER TABLE "Event"
ADD COLUMN "location" TEXT,
ADD COLUMN "isOnlineMeeting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "meetingLink" TEXT;
