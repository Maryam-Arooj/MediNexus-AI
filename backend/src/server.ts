import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './lib/prisma';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  try {
    // Verify database connection on startup
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    app.listen(PORT, () => {
      console.log(`🚀 SmartCare backend running at http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Patients: http://localhost:${PORT}/api/patients`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('🔌 PostgreSQL disconnected — server shut down');
  process.exit(0);
});

start();
