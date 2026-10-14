import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function normalizeConnectionString(url: string): string {
  if (!url) return url;
  if (url.includes("sslmode=require") && !url.includes("uselibpqcompat")) {
    return url.replace("sslmode=require", "sslmode=verify-full");
  }
  return url;
}

function getPool(): Pool {
  if (globalForPrisma.pgPool) {
    return globalForPrisma.pgPool;
  }

  const connectionString = normalizeConnectionString(process.env.DATABASE_URL || "");
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });

  // Manejar errores de sockets cerrados por el servidor o PgBouncer cuando están inactivos
  pool.on("error", (err) => {
    console.warn("[PostgreSQL Pool] Aviso de socket inactivo cerrado:", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = getPool();
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reutilizar cliente singleton en desarrollo para evitar saturar el pool de conexiones en Hot Reload
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
