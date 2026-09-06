import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const p = await prisma.patient.findUnique({
    where: { patientId: 'SC-2026-2487' },
    select: { id: true, name: true },
  });
  if (!p) {
    console.log('Test Patient not found — already removed.');
  } else {
    console.log(`Deleting: ${p.name} (SC-2026-2487)`);
    await prisma.patient.delete({ where: { id: p.id } });
    console.log('Deleted.');
  }
  const remaining = await prisma.patient.count();
  console.log(`Total patients remaining: ${remaining}`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
