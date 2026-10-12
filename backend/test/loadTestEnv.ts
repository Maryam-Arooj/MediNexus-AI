import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads backend/.env.test and refuses to continue unless DATABASE_URL points to a database whose
 * name ends in "_test". This protects your real data: the test suite deletes every row it finds.
 */
export function loadTestEnv() {
  const file = path.resolve(__dirname, '..', '.env.test');
  if (fs.existsSync(file)) dotenv.config({ path: file, override: true });
  process.env.NODE_ENV = 'test';
  const url = process.env.DATABASE_URL || '';
  let dbName = '';
  try {
    dbName = new URL(url).pathname.replace(/^\//, '');
  } catch {
    /* handled below */
  }
  if (!dbName.endsWith('_test')) {
    throw new Error(
      'Refusing to run tests: DATABASE_URL in backend/.env.test must point to a database whose name ends in "_test" (e.g. medinexus_test).'
    );
  }
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef';
}
