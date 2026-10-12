import { ConfigError, getConfig } from './config/env';
import prisma from './lib/prisma';

async function start() {
  let config;
  try {
    config = getConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`❌ Configuration error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const { createApp } = await import('./app');
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL. Check DATABASE_URL in backend/.env and that PostgreSQL is running.', (err as Error).name);
    process.exit(1);
  }

  createApp(config).listen(config.port, () => {
    console.log(`🚀 MediNexus AI backend running at http://localhost:${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/api/health`);
  });
}

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
