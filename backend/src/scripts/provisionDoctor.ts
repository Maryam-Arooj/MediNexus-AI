/**
 * Usage (from backend/):
 *   npm run doctor:provision                      create the doctor from DEMO_DOCTOR_* in .env (safe to re-run)
 *   npm run doctor:provision -- --promote-existing  turn an existing account with that email into a doctor
 *                                                  (only if DEMO_DOCTOR_PASSWORD matches its password)
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env' });

import { PrismaClient } from '@prisma/client';
import { provisionDoctor, ProvisionError } from '../services/doctorProvisioning';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await provisionDoctor(prisma, {
      env: process.env,
      promoteExisting: process.argv.includes('--promote-existing'),
    });
    const msg = {
      created: `✅ Doctor account created for ${result.email}. Log in with that email and DEMO_DOCTOR_PASSWORD.`,
      'already-doctor': `✅ ${result.email} is already a doctor. Nothing was changed (password not reset).`,
      promoted: `✅ Existing account ${result.email} is now a doctor (audited in role_change_audit).`,
    }[result.status];
    console.log(msg);
  } catch (err) {
    if (err instanceof ProvisionError) {
      console.error(`❌ ${err.message}`);
    } else {
      console.error('❌ Provisioning failed:', (err as Error).name, (err as { code?: string }).code ?? '');
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
