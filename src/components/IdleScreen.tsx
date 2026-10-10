"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

interface IdleScreenProps {
  /**
   * Tiempo de inactividad en milisegundos antes de mostrar la Idle Screen.
   * Por defecto: 5 minutos (300,000 ms).
   */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export function IdleScreen({ timeoutMs = DEFAULT_TIMEOUT_MS }: IdleScreenProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isIdleRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(0);

  // 1. Detección y sincronización en tiempo real del tema (Claro / Oscuro)
  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem("hc-theme") as "light" | "dark" | null;
      const docTheme = document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null;

      let activeTheme: "light" | "dark" = "light";

      if (savedTheme === "dark" || savedTheme === "light") {
        activeTheme = savedTheme;
      } else if (docTheme === "dark" || docTheme === "light") {
        activeTheme = docTheme;
      } else if (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        activeTheme = "dark";
      }

      setTheme(activeTheme);
    };

    syncTheme();

    // Observar cambios en el atributo 'data-theme' del elemento <html>
    const observer = new MutationObserver(() => {
      syncTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Escuchar cambios de localStorage entre pestañas
    window.addEventListener("storage", syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  // 2. Control de temporizador de inactividad
  const startTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(() => {
      setIsIdle(true);
      isIdleRef.current = true;
    }, timeoutMs);
  }, [timeoutMs]);

  // 3. Manejador de actividad de usuario
  const handleUserActivity = useCallback(() => {
    const now = Date.now();

    // Si ya está en pantalla de inactividad, quitarla inmediatamente
    if (isIdleRef.current) {
      setIsIdle(false);
      isIdleRef.current = false;
      lastActivityTimeRef.current = now;
      startTimer();
      return;
    }

    // Limitar reinicios excesivos durante movimiento continuo del cursor (máximo 1 vez por segundo)
    if (now - lastActivityTimeRef.current > 1000) {
      lastActivityTimeRef.current = now;
      startTimer();
    }
  }, [startTimer]);

  useEffect(() => {
    // Iniciar temporizador al montar el componente
    startTimer();

    // Eventos de actividad según especificación:
    // mover el cursor (mousemove), presionar cualquier tecla (keydown),
    // y eventos complementarios (mousedown, touchstart, pointerdown, wheel, scroll)
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "pointerdown",
      "wheel",
      "scroll",
    ];

    const options: AddEventListenerOptions = { passive: true, capture: true };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, options);
    });

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity, options);
      });
    };
  }, [startTimer, handleUserActivity]);

  if (!isIdle) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pantalla de inactividad"
      onClick={handleUserActivity}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none cursor-default transition-colors duration-300 ${isDark ? "bg-[#121212]" : "bg-white"
        }`}
      style={{
        backgroundColor: isDark ? "#121212" : "#ffffff",
      }}
    >
      <div className="relative flex flex-col items-center justify-center p-6">
        {/* Resplandor suave decorativo de fondo */}
        <div
          className={`absolute -inset-8 rounded-full filter blur-3xl opacity-25 pointer-events-none transition-all duration-700 ${isDark ? "bg-[#cfd500]/25" : "bg-[#cfd500]/35"
            }`}
        />

        {/* Imagen central requerida: background-login.png */}
        <div className="relative z-10 transition-transform duration-700 hover:scale-105">
          <Image
            src="/images/background-login.png"
            alt="Sandalias y Pantuflas HC"
            width={500}
            height={500}
            priority
            className="w-40 sm:w-52 md:w-60 h-auto object-contain select-none pointer-events-none drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
