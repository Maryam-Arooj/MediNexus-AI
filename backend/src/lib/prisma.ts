import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — reused across requests.
// Prisma's own "error" log prints full query details (which can include patient data), so only
// warnings are logged here; errors are handled and logged safely by middleware/errorHandler.ts.
const prisma = new PrismaClient({ log: ['warn'] });

export default prisma;
