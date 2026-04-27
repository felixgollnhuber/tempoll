#!/usr/bin/env node

import crypto from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/tempoll?schema=public";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

const participantColors = [
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
];

function hashSecret(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toViennaUtc(dateKey, minutes) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcMinutes = minutes - 120;
  const utcHour = Math.floor(utcMinutes / 60);
  const utcMinute = utcMinutes % 60;

  return new Date(Date.UTC(year, month - 1, day, utcHour, utcMinute));
}

function slotRange(dateKey, startHour, endHour) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push(toViennaUtc(dateKey, hour * 60));
    slots.push(toViennaUtc(dateKey, hour * 60 + 30));
  }

  return slots;
}

function participant(id, eventId, displayName, index) {
  return {
    id,
    eventId,
    displayName,
    displayNameNormalized: displayName.toLowerCase(),
    color: participantColors[index % participantColors.length],
    editTokenHash: hashSecret(`edit-${id}`),
    lastSeenAt: new Date("2026-04-27T12:00:00.000Z"),
  };
}

async function createEvent({
  id,
  slug,
  title,
  dates,
  dayStartMinutes,
  dayEndMinutes,
  meetingDurationMinutes = 60,
  status = "OPEN",
  finalSlotStartAt = null,
  manageToken,
  participants,
  availability,
}) {
  await prisma.event.create({
    data: {
      id,
      slug,
      title,
      timezone: "Europe/Vienna",
      slotMinutes: 30,
      meetingDurationMinutes,
      dayStartMinutes,
      dayEndMinutes,
      status,
      finalSlotStartAt,
      manageTokenHash: hashSecret(manageToken),
      dates: {
        createMany: {
          data: dates.map((dateKey) => ({ dateKey })),
        },
      },
    },
  });

  await prisma.participant.createMany({
    data: participants.map((name, index) => participant(`${id}_participant_${index + 1}`, id, name, index)),
  });

  const slots = availability.flatMap(({ participantIndex, starts }) =>
    starts.map((slotStartAt) => ({
      eventId: id,
      participantId: `${id}_participant_${participantIndex + 1}`,
      slotStartAt,
    })),
  );

  if (slots.length > 0) {
    await prisma.availabilitySlot.createMany({
      data: slots,
      skipDuplicates: true,
    });
  }

  return {
    manageUrl: `${appUrl}/manage/${id}.${manageToken}`,
    publicUrl: `${appUrl}/e/${slug}`,
    title,
  };
}

async function main() {
  await prisma.event.deleteMany();

  const seededEvents = [];

  seededEvents.push(
    await createEvent({
      id: "dev_team_sync",
      slug: "dev-team-sync",
      title: "Dev Team Sync",
      dates: ["2026-05-04", "2026-05-05", "2026-05-06"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 17 * 60,
      manageToken: "manage-dev-team-sync",
      participants: ["Alex", "Nora", "Sam", "Mina"],
      availability: [
        {
          participantIndex: 0,
          starts: [
            ...slotRange("2026-05-04", 9, 12),
            ...slotRange("2026-05-05", 13, 16),
          ],
        },
        {
          participantIndex: 1,
          starts: [
            ...slotRange("2026-05-04", 10, 13),
            ...slotRange("2026-05-06", 9, 12),
          ],
        },
        {
          participantIndex: 2,
          starts: [
            ...slotRange("2026-05-05", 10, 15),
            ...slotRange("2026-05-06", 13, 16),
          ],
        },
        {
          participantIndex: 3,
          starts: [
            ...slotRange("2026-05-04", 11, 15),
            ...slotRange("2026-05-05", 14, 17),
          ],
        },
      ],
    }),
  );

  seededEvents.push(
    await createEvent({
      id: "dev_product_planning",
      slug: "dev-product-planning",
      title: "Product Planning",
      dates: ["2026-05-11", "2026-05-12", "2026-05-13", "2026-05-14"],
      dayStartMinutes: 10 * 60,
      dayEndMinutes: 18 * 60,
      meetingDurationMinutes: 90,
      manageToken: "manage-dev-product-planning",
      participants: ["Lea", "Chris", "Jordan", "Taylor", "Priya"],
      availability: [
        {
          participantIndex: 0,
          starts: [...slotRange("2026-05-11", 10, 14), ...slotRange("2026-05-13", 12, 16)],
        },
        {
          participantIndex: 1,
          starts: [...slotRange("2026-05-11", 13, 17), ...slotRange("2026-05-12", 10, 13)],
        },
        {
          participantIndex: 2,
          starts: [...slotRange("2026-05-12", 11, 15), ...slotRange("2026-05-14", 14, 18)],
        },
        {
          participantIndex: 3,
          starts: [...slotRange("2026-05-13", 10, 14), ...slotRange("2026-05-14", 10, 13)],
        },
        {
          participantIndex: 4,
          starts: [...slotRange("2026-05-11", 11, 16), ...slotRange("2026-05-12", 13, 17)],
        },
      ],
    }),
  );

  seededEvents.push(
    await createEvent({
      id: "dev_closed_review",
      slug: "dev-closed-review",
      title: "Closed Design Review",
      dates: ["2026-05-18", "2026-05-19"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 15 * 60,
      status: "CLOSED",
      finalSlotStartAt: toViennaUtc("2026-05-19", 10 * 60),
      manageToken: "manage-dev-closed-review",
      participants: ["Riley", "Morgan", "Jamie"],
      availability: [
        {
          participantIndex: 0,
          starts: [...slotRange("2026-05-18", 9, 12), ...slotRange("2026-05-19", 10, 13)],
        },
        {
          participantIndex: 1,
          starts: [...slotRange("2026-05-18", 11, 14), ...slotRange("2026-05-19", 9, 12)],
        },
        {
          participantIndex: 2,
          starts: [...slotRange("2026-05-19", 10, 13)],
        },
      ],
    }),
  );

  console.log("Seeded demo events:");

  for (const event of seededEvents) {
    console.log(`- ${event.title}`);
    console.log(`  public:  ${event.publicUrl}`);
    console.log(`  private: ${event.manageUrl}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
