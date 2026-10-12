/**
 * Prisma seed — MediNexus AI.
 * Inserts NO patients (the database only holds real records created through the app).
 * It only provisions the demo doctor from DEMO_DOCTOR_* (same rules as `npm run doctor:provision`),
 * and does nothing when those variables are not set.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env' });

import { PrismaClient } from '@prisma/client';
import { provisionDoctor, ProvisionError } from '../src/services/doctorProvisioning';

async function main() {
  if (!process.env.DEMO_DOCTOR_EMAIL) {
    console.log('ℹ️  DEMO_DOCTOR_EMAIL not set — no doctor provisioned. Nothing changed.');
    return;
  }
  const prisma = new PrismaClient();
  try {
    const r = await provisionDoctor(prisma, { env: process.env });
    console.log(`✅ Demo doctor: ${r.status} (${r.email})`);
  } catch (e) {
    console.error(`❌ ${e instanceof ProvisionError ? e.message : (e as Error).name}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
