import { PrismaClient } from '@prisma/client';

// Avoid creating multiple instances of PrismaClient in development
// when Next.js hot-reloads, by attaching it to the global object.
// In production a single instance is fine.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
