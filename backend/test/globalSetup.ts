import { execSync } from 'child_process';
import * as path from 'path';
import { loadTestEnv } from './loadTestEnv';

export default function setup() {
  loadTestEnv();
  if (process.env.SKIP_TEST_MIGRATE === '1') return;
  // Bring the TEST database up to date with the committed migrations (non-interactive, never resets).
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
