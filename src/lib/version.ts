import fs from "fs";
import path from "path";

export interface VersionInfo {
  version: string;
  deploymentId: string;
  commitSha: string;
  buildTime: string;
  environment: string;
}

export function getDeploymentId(): string {
  // 1. Identificador de Deployment de Vercel (si está desplegado en Vercel)
  if (process.env.VERCEL_DEPLOYMENT_ID) {
    return process.env.VERCEL_DEPLOYMENT_ID;
  }

  // 2. Hash de commit de Vercel Git
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }

  // 3. BUILD_ID generado por Next.js en compilación
  try {
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    if (fs.existsSync(buildIdPath)) {
      return fs.readFileSync(buildIdPath, "utf-8").trim();
    }
  } catch {
    // Si no está disponible el archivo, continuar con fallback
  }

  // 4. Fallback de entorno
  return process.env.NODE_ENV === "production" ? "prod-release" : "dev-environment";
}

export function getCurrentVersionInfo(): VersionInfo {
  return {
    version: process.env.npm_package_version || "0.1.0",
    deploymentId: getDeploymentId(),
    commitSha: (
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      ""
    ).substring(0, 7),
    buildTime:
      process.env.BUILD_TIME ||
      process.env.NEXT_PUBLIC_BUILD_TIME ||
      new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  };
}
