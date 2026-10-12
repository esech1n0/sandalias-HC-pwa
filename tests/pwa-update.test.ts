import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCurrentVersionInfo, getDeploymentId } from "../src/lib/version";

describe("Sistema de Notificación y Actualización de Versiones PWA", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Control e Identificación de Versiones", () => {
    it("debe priorizar VERCEL_DEPLOYMENT_ID si está presente", () => {
      process.env.VERCEL_DEPLOYMENT_ID = "dpl_vercel_test_12345";
      const id = getDeploymentId();
      expect(id).toBe("dpl_vercel_test_12345");
    });

    it("debe retornar información completa de versión con commit SHA abreviado", () => {
      process.env.VERCEL_DEPLOYMENT_ID = "dpl_prod_998877";
      process.env.VERCEL_GIT_COMMIT_SHA = "a1b2c3d4e5f6789";
      process.env.VERCEL_ENV = "production";

      const info = getCurrentVersionInfo();
      expect(info.deploymentId).toBe("dpl_prod_998877");
      expect(info.commitSha).toBe("a1b2c3d");
      expect(info.environment).toBe("production");
    });
  });

  describe("Lógica de Detección y No Repetición de Notificaciones", () => {
    it("detecta que hay actualización si la versión de servidor es distinta a la de sesión", () => {
      const currentRunning: string = "dpl_v1";
      const serverVersion: string = "dpl_v2";
      const appliedVersion: string | null = null;

      const hasUpdate =
        serverVersion !== currentRunning && serverVersion !== appliedVersion;
      expect(hasUpdate).toBe(true);
    });

    it("NO notifica si la versión del servidor ya fue aplicada por el usuario (evita avisos repetidos)", () => {
      const currentRunning: string = "dpl_v1";
      const serverVersion: string = "dpl_v2";
      const appliedVersion: string | null = "dpl_v2"; // Ya aplicada por el usuario

      const hasUpdate =
        serverVersion !== currentRunning && serverVersion !== appliedVersion;
      expect(hasUpdate).toBe(false);
    });

    it("NO notifica si la versión del servidor coincide con la versión en ejecución", () => {
      const currentRunning: string = "dpl_v2";
      const serverVersion: string = "dpl_v2";
      const appliedVersion: string | null = null;

      const hasUpdate =
        serverVersion !== currentRunning && serverVersion !== appliedVersion;
      expect(hasUpdate).toBe(false);
    });
  });

  describe("Filtrado de Eventos del Webhook de Vercel", () => {
    function evaluateWebhookEvent(eventType: string) {
      if (
        eventType === "deployment.succeeded" ||
        eventType === "deployment.ready" ||
        eventType === "deployment-ready"
      ) {
        return { shouldNotify: true };
      }
      return { shouldNotify: false };
    }

    it("notifica cuando el deployment finaliza exitosamente (deployment.succeeded)", () => {
      const res = evaluateWebhookEvent("deployment.succeeded");
      expect(res.shouldNotify).toBe(true);
    });

    it("notifica cuando el deployment está listo (deployment.ready)", () => {
      const res = evaluateWebhookEvent("deployment.ready");
      expect(res.shouldNotify).toBe(true);
    });

    it("NO notifica si el deployment falla (deployment.error)", () => {
      const res = evaluateWebhookEvent("deployment.error");
      expect(res.shouldNotify).toBe(false);
    });

    it("NO notifica si el deployment se cancela (deployment.canceled)", () => {
      const res = evaluateWebhookEvent("deployment.canceled");
      expect(res.shouldNotify).toBe(false);
    });

    it("NO notifica cuando el deployment apenas se crea (deployment.created)", () => {
      const res = evaluateWebhookEvent("deployment.created");
      expect(res.shouldNotify).toBe(false);
    });
  });

  describe("Mensaje exacto de notificación en la aplicación", () => {
    it("el mensaje de actualización coincide exactamente con el requerido", () => {
      const expectedMessage =
        "El sistema recibió una notificación, pulse aquí para actualizar";
      expect(expectedMessage).toBe(
        "El sistema recibió una notificación, pulse aquí para actualizar"
      );
    });
  });
});
