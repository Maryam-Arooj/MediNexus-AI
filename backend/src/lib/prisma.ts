import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — reuse across requests
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
