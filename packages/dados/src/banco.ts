import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Instância única: evita abrir várias conexões no hot reload do Next.
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global_.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    // O padrão (5 s) não basta para os importadores num banco remoto (Neon).
    transactionOptions: { timeout: 300_000 },
  });

if (process.env.NODE_ENV !== "production") global_.prisma = prisma;
