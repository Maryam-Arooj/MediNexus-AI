/**
 * One-time cleanup script — removes fake/demo seed patients from PostgreSQL.
 * Preserves ALL real patients (including SC-2026-1715 / hIna).
 * TriageResult and DoctorReview rows are CASCADE-deleted by PostgreSQL.
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// These are the fake patientIds inserted by the seed script.
// We delete ONLY these — every other record is kept.
const FAKE_PATIENT_IDS = [
  'SC-2026-0841', // Ramesh Verma
  'SC-2026-0842', // Priya Sharma
  'SC-2026-0843', // Amina Begum
  'SC-2026-0844', // Karan Malhotra
];

async function main() {
  console.log('🔍 Finding fake/demo patients by patientId...');

  const fakePatients = await prisma.patient.findMany({
    where: { patientId: { in: FAKE_PATIENT_IDS } },
    select: { id: true, patientId: true, name: true },
  });

  if (fakePatients.length === 0) {
    console.log('✅ No fake patients found — database is already clean.');
  } else {
    console.log(`Found ${fakePatients.length} fake patient(s):`);
    fakePatients.forEach((p) => console.log(`  - ${p.name} (${p.patientId})`));

    const internalIds = fakePatients.map((p) => p.id);

    // onDelete: Cascade on TriageResult and DoctorReview means deleting Patient
    // will automatically delete related triage and review rows.
    const deleted = await prisma.patient.deleteMany({
      where: { id: { in: internalIds } },
    });
    console.log(`\n  ✅ Deleted ${deleted.count} patient record(s) (cascade removes triage + review)`);
  }

  // Verify the real patient is still there
  const realPatient = await prisma.patient.findUnique({
    where: { patientId: 'SC-2026-1715' },
    include: { triage: true, review: true },
  });

  if (realPatient) {
    console.log('\n✅ Real patient SC-2026-1715 is PRESERVED:');
    console.log(`   Name:        ${realPatient.name}`);
    console.log(`   Token:       ${realPatient.tokenNumber}`);
    console.log(`   TriageResult: ${realPatient.triage ? 'exists ✓' : 'MISSING ✗'}`);
    console.log(`   DoctorReview: ${realPatient.review ? 'exists ✓' : 'MISSING ✗'}`);
  } else {
    console.warn('\n⚠️  WARNING: SC-2026-1715 was NOT found after cleanup!');
  }

  // Show remaining patient count
  const remaining = await prisma.patient.count();
  console.log(`\n📊 Total patients remaining in database: ${remaining}`);
  console.log('\n✅ Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
