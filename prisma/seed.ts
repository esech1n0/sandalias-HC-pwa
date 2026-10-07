import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DIRECT_URL o DATABASE_URL no configurada en las variables de entorno.");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

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

  // 2. Usuarios administrativos requeridos
  const usersToSeed = [
    {
      username: "Edson",
      password: "3s34dm1n777",
      name: "Edson",
    },
    {
      username: "Hector",
      password: "Choco1234$",
      name: "Hector",
    },
    {
      username: "Empleado",
      password: "JD#56B",
      name: "Empleado",
    },
  ];

  for (const user of usersToSeed) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const existing = await prisma.user.findUnique({
      where: { username: user.username },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: user.name,
          isActive: true,
        },
      });
      console.log(`✅ Usuario actualizado: ${user.username}`);
    } else {
      await prisma.user.create({
        data: {
          username: user.username,
          passwordHash,
          name: user.name,
          isActive: true,
        },
      });
      console.log(`✅ Usuario creado: ${user.username}`);
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
  console.log("✅ Categorías iniciales registradas");

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
  console.log("✅ Categorías de gastos iniciales registradas");

  console.log("✨ Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
