/**
 * READ-ONLY database inspection. Prints counts and integrity checks only — no names, CNICs or
 * other personal data. Safe to run at any time:  npm run db:inspect
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env' });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const q = <T = unknown>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
    const one = async (label: string, sql: string) => {
      try {
        const rows = await q<Record<string, unknown>>(sql);
        console.log(`${label}:`, JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
      } catch (e) {
        console.log(`${label}: (not available — ${(e as { code?: string }).code ?? (e as Error).name})`);
      }
    };
    await one('Applied migrations', `SELECT migration_name, finished_at IS NOT NULL AS applied FROM "_prisma_migrations" ORDER BY started_at`);
    await one('Users by role', `SELECT role::text AS role, COUNT(*) AS n FROM "users" GROUP BY 1`);
    await one('Patients total', `SELECT COUNT(*) AS n FROM "patients"`);
    await one('Patients not linked to an account', `SELECT COUNT(*) AS n FROM "patients" WHERE "userId" IS NULL`);
    await one('Patients missing triage', `SELECT COUNT(*) AS n FROM "patients" p LEFT JOIN "triage_results" t ON t."patientId"=p.id WHERE t.id IS NULL`);
    await one('Patients missing review', `SELECT COUNT(*) AS n FROM "patients" p LEFT JOIN "doctor_reviews" r ON r."patientId"=p.id WHERE r.id IS NULL`);
    await one('Highest token per prefix', `SELECT split_part("tokenNumber",'-',1) AS prefix, MAX(NULLIF(regexp_replace(split_part("tokenNumber",'-',2),'\\D','','g'),'')::int) AS max FROM "patients" GROUP BY 1`);
    await one('Token counters', `SELECT key, value FROM "token_counters" ORDER BY key`);
    await one('Review status counts', `SELECT status, COUNT(*) AS n FROM "doctor_reviews" GROUP BY 1`);
    await one('Role change audit entries', `SELECT COUNT(*) AS n FROM "role_change_audit"`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Inspection failed:', (e as Error).name, (e as { code?: string }).code ?? '');
  process.exitCode = 1;
});
