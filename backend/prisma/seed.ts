/**
 * Prisma Seed — SmartCare
 *
 * ⚠️  Seed data has been intentionally removed.
 *
 * The SmartCare database must only contain real patient records created through
 * the actual registration flow. Running this seed will NOT insert any demo or
 * fake patients.
 *
 * If you need to test the registration flow, use the SmartCare UI at
 * http://localhost:5173 to register a real patient.
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 SmartCare seed: no demo data to insert.');
  console.log('   Use the SmartCare UI to register real patients.');
  console.log('✅ Seed complete (nothing changed).');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
