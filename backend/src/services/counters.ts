import { Prisma } from '@prisma/client';

/**
 * Atomically increments a named counter and returns the new value.
 * The UPSERT takes a row lock that is held until the surrounding transaction commits, so
 * concurrent registrations are serialised and can never receive the same number.
 * Counters only ever increase — deleting patients can never cause a number to be reused.
 */
export async function nextCounterValue(tx: Prisma.TransactionClient, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "token_counters" ("key", "value", "updatedAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE
      SET "value" = "token_counters"."value" + 1, "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "value"`;
  return Number(rows[0].value);
}

export const formatToken = (prefix: string, n: number) => `${prefix}-${String(n).padStart(2, '0')}`;
export const formatPatientId = (year: number, n: number) => `SC-${year}-${String(n).padStart(4, '0')}`;

/** Allocates a token that is not already present (defensive against unusual legacy rows). */
export async function allocateToken(tx: Prisma.TransactionClient, prefix: string): Promise<string> {
  for (let i = 0; i < 1000; i++) {
    const token = formatToken(prefix, await nextCounterValue(tx, prefix));
    const taken = await tx.patient.findUnique({ where: { tokenNumber: token }, select: { id: true } });
    if (!taken) return token;
  }
  throw new Error('Could not allocate a free token number');
}

export async function allocatePatientId(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  for (let i = 0; i < 1000; i++) {
    const id = formatPatientId(year, await nextCounterValue(tx, `PID-${year}`));
    const taken = await tx.patient.findUnique({ where: { patientId: id }, select: { id: true } });
    if (!taken) return id;
  }
  throw new Error('Could not allocate a free patient id');
}
