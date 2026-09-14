/**
 * Demo data: three upcoming events and one past event. Safe to re-run (matches on name).
 *   npx prisma db seed
 */
import { DistanceCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const days = (n: number, hour = 6) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const events = [
  {
    name: 'Marine Drive Sunrise 5K',
    description: 'A flat, fast 5K along the sea face. Meet at NCPA at 5:45 am; water at the halfway turn.',
    distanceCategory: DistanceCategory.FIVE_K,
    date: days(10),
    location: 'Marine Drive, Mumbai',
  },
  {
    name: 'Cubbon Park 10K',
    description: 'Two loops of the park under the trees. Chip-free - your Kovi time is your result.',
    distanceCategory: DistanceCategory.TEN_K,
    date: days(24, 6),
    location: 'Cubbon Park, Bengaluru',
  },
  {
    name: 'Delhi Half Marathon Tune-up',
    description: 'A supported 21K training race on the Rajpath loop. Aid stations every 3 km.',
    distanceCategory: DistanceCategory.HALF_MARATHON,
    date: days(45, 5),
    location: 'India Gate, New Delhi',
  },
  {
    name: 'Monsoon Mud 5K',
    description: 'It rained. We ran anyway.',
    distanceCategory: DistanceCategory.FIVE_K,
    date: days(-20, 7),
    location: 'Aarey Colony, Mumbai',
  },
];

async function main() {
  for (const e of events) {
    const existing = await prisma.event.findFirst({ where: { name: e.name, deletedAt: null } });
    if (existing) continue;
    await prisma.event.create({ data: e });
    console.log(`created event: ${e.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
