import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ==============================================================================
// Script seguro para seed en Producción (Sandalias HC)
// Agrega usuarios 'Hector', 'Empleado', 'Edson', configuración y catálogos base.
// ==============================================================================

const prodUrl = process.env.DATABASE_URL_PROD || process.env.DIRECT_URL_PROD;

if (!prodUrl) {
  console.error("❌ ERROR: DATABASE_URL_PROD o DIRECT_URL_PROD no está configurada.");
  process.exit(1);
}

function normalizeConnectionString(url: string): string {
  if (url.includes("sslmode=require") && !url.includes("uselibpqcompat")) {
    return url.replace("sslmode=require", "sslmode=verify-full");
  }
  return url;
}

const adapter = new PrismaPg({
  connectionString: normalizeConnectionString(prodUrl),
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Iniciando inicialización/seed en Producción...");

  // 1. Configuración del sistema
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {
      businessName: "Sandalias HC",
      headerColor: "#cfd500",
      defaultMinStock: 5,
      allowBelowCostSales: true,
    },
    create: {
      id: "default",
      businessName: "Sandalias HC",
      headerColor: "#cfd500",
      defaultMinStock: 5,
      allowBelowCostSales: true,
    },
  });
  console.log("✅ Configuración del sistema inicializada");

  // 2. Usuarios administrativos y de operación requeridos
  // Las contraseñas NUNCA se escriben en el código: se leen de variables de entorno.
  // - Usuario nuevo sin variable definida -> se omite con aviso.
  // - Usuario existente -> solo se cambia su contraseña si la variable está definida.
  const usersToSeed = [
    { username: "Edson", name: "Edson", envVar: "SEED_PASSWORD_EDSON" },
    { username: "Hector", name: "Hector", envVar: "SEED_PASSWORD_HECTOR" },
    { username: "Empleado", name: "Empleado", envVar: "SEED_PASSWORD_EMPLEADO" },
  ];

  for (const user of usersToSeed) {
    const password = process.env[user.envVar];
    const existing = await prisma.user.findUnique({
      where: { username: user.username },
    });

    if (password && password.length < 8) {
      console.warn(`⚠️  ${user.envVar} debe tener al menos 8 caracteres. Se omite ${user.username}.`);
      continue;
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: user.name,
          isActive: true,
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });
      console.log(
        `✅ Usuario actualizado: ${user.username}${password ? " (contraseña cambiada)" : ""}`
      );
    } else if (password) {
      await prisma.user.create({
        data: {
          username: user.username,
          passwordHash: await bcrypt.hash(password, 10),
          name: user.name,
          isActive: true,
        },
      });
      console.log(`✅ Usuario creado: ${user.username}`);
    } else {
      console.warn(`⚠️  ${user.envVar} no está definida. No se creó el usuario ${user.username}.`);
    }
  }

  // 3. Categorías iniciales de productos
  const initialCategories = [
    { name: "Sandalia", color: "#cfd500" },
    { name: "Pantufla", color: "#f59e0b" },
    { name: "Ropa", color: "#ec4899" },
    { name: "Ropa interior", color: "#8b5cf6" },
    { name: "Calceta", color: "#10b981" },
    { name: "Gorra", color: "#3b82f6" },
    { name: "Termo", color: "#06b6d4" },
    { name: "Otros", color: "#6b7280" },
  ];

  for (const cat of initialCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { color: cat.color, isActive: true },
      create: { name: cat.name, color: cat.color, isActive: true },
    });
  }
  console.log("✅ Categorías iniciales registradas en Producción");

  // 4. Categorías iniciales de gastos del negocio
  const initialExpenseCategories = [
    "Renta",
    "Servicios (Luz / Agua)",
    "Sueldos",
    "Transporte",
    "Mantenimiento",
  ];

  for (const expCat of initialExpenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: expCat },
      update: {},
      create: { name: expCat },
    });
  }
  console.log("✅ Categorías de gastos iniciales registradas en Producción");

  console.log("✨ Seed de Producción completado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de Producción:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
