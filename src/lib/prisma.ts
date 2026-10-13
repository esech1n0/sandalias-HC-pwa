import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeConnectionString(url: string): string {
  if (!url) return url;
  if (url.includes("sslmode=require") && !url.includes("uselibpqcompat")) {
    return url.replace("sslmode=require", "sslmode=verify-full");
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = normalizeConnectionString(process.env.DATABASE_URL || "");
  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
