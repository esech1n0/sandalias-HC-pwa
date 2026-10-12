"use client";

import { useState, useEffect, useCallback } from "react";

export interface AppUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  newVersion: string | null;
  applyUpdate: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
}

export function useAppUpdate(): AppUpdateState {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const getInitialVersion = (): string => {
    if (typeof window === "undefined") return "";
    let stored = sessionStorage.getItem("hc_current_version");
    if (!stored) {
      stored =
        process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_BUILD_TIME ||
        "";
      if (stored) {
        sessionStorage.setItem("hc_current_version", stored);
      }
    }
    return stored;
  };

  const checkForUpdate = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const serverDeploymentId = data.deploymentId || data.buildTime;
      if (!serverDeploymentId) return;

      const appliedVersion = localStorage.getItem("hc_applied_version");
      let currentRunning = sessionStorage.getItem("hc_current_version");

      // Si es la primera vez que carga y no hay versión guardada en session
      if (!currentRunning) {
        sessionStorage.setItem("hc_current_version", serverDeploymentId);
        currentRunning = serverDeploymentId;
      }

      // Si el servidor tiene una versión distinta a la que corre el cliente
      // y no ha sido aplicada previamente por el usuario
      if (
        serverDeploymentId !== currentRunning &&
        serverDeploymentId !== appliedVersion
      ) {
        setHasUpdate(true);
        setNewVersion(serverDeploymentId);
      } else {
        setHasUpdate(false);
      }
    } catch {
      // Fallos de red silenciosos para no interrumpir al usuario
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      const targetVersion = newVersion || "applied";
      localStorage.setItem("hc_applied_version", targetVersion);
      sessionStorage.setItem("hc_current_version", targetVersion);

      // 1. Marcar notificaciones de tipo SYSTEM_UPDATE como leídas en la BD
      try {
        await fetch("/api/notifications/mark-system-update-read", {
          method: "POST",
        });
      } catch {
        // Ignorar
      }

      // 2. Gestionar activación de Service Worker y limpieza de caché
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          if (reg.active) {
            reg.active.postMessage({ type: "CLEAR_CACHE" });
            reg.active.postMessage({ type: "SKIP_WAITING" });
          }
          await reg.update().catch(() => {});
        }
      }

      // 3. Limpiar CacheStorage del navegador
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          // Ignorar
        }
      }

      // 4. Recarga forzada de la aplicación evitando versiones en caché
      setTimeout(() => {
        window.location.href =
          window.location.pathname + "?_upd=" + Date.now();
      }, 300);
    } catch {
      window.location.reload();
    }
  }, [newVersion]);

  useEffect(() => {
    // Escuchar evento del service worker cuando detecte nueva versión instalada
    const handleSwUpdate = () => {
      setHasUpdate(true);
    };
    window.addEventListener("hc-sw-update-available", handleSwUpdate);

    // Inicializar versión actual
    getInitialVersion();

    // Comprobación inicial tras 5 segundos (no bloquea carga inicial)
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 5000);

    // Comprobación periódica cada 3 minutos (evita sobrecargar el servidor)
    const intervalTimer = setInterval(() => {
      checkForUpdate();
    }, 3 * 60 * 1000);

    // Comprobación al volver a enfocar la app (ej. regresar de otra pestaña o app en móvil)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      window.removeEventListener("hc-sw-update-available", handleSwUpdate);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, [checkForUpdate]);

  return {
    hasUpdate,
    isUpdating,
    newVersion,
    applyUpdate,
    checkForUpdate,
  };
}
