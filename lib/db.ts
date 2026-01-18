import { PrismaClient } from "@prisma/client"

/**
 * This prevents creating multiple PrismaClient instances
 * during hot reloads in development (Next.js issue).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
// ✅ What this code solves

// This code ensures:

// ONLY ONE PrismaClient exists in development

// Prisma client is reused across hot reloads

// No connection leaks

// No random crashes
