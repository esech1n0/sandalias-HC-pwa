import "dotenv/config";
import { execSync } from "child_process";

// ==============================================================================
// Script seguro para aplicar migraciones en Producción (HC Venta)
// Regla: develop -> crear/probar migration -> revisar -> aplicar en production.
// NUNCA usar la base de datos de producción para pruebas o migrate dev/reset.
// ==============================================================================

const prodUrl = process.env.DATABASE_URL_PROD || process.env.DIRECT_URL_PROD;

if (!prodUrl) {
  console.error("❌ ERROR: DATABASE_URL_PROD o DIRECT_URL_PROD no está configurada.");
  console.error("Para aplicar migraciones en producción:");
  console.error("DATABASE_URL_PROD=\"...\" npm run db:migrate:prod");
  process.exit(1);
}

// Validación de seguridad: verificar que no contenga 'dev' o que sea una base intencionada
console.log("🔒 Verificando entorno de Producción...");
console.log("Aplicando migraciones probadas en Develop hacia Producción...");

try {
  // Ejecuta prisma migrate deploy usando la URL de producción
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: prodUrl,
      DIRECT_URL: prodUrl,
    },
    stdio: "inherit",
  });

  console.log("✅ Migraciones aplicadas con éxito en Producción.");
} catch (error) {
  console.error("❌ Error al aplicar migraciones en Producción:", error);
  process.exit(1);
}
