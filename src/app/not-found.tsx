"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Package } from "lucide-react";

export default function NotFound() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Obtener tema guardado en localStorage ('hc-theme') o preferencia del sistema
    const savedTheme = localStorage.getItem("hc-theme") as "light" | "dark" | null;
    let activeTheme: "light" | "dark" = "light";

    if (savedTheme === "dark" || savedTheme === "light") {
      activeTheme = savedTheme;
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      activeTheme = "dark";
    }

    setTheme(activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.body.style.backgroundColor = activeTheme === "dark" ? "#121212" : "#ffffff";
    setMounted(true);

    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const isDark = mounted ? theme === "dark" : false;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-300 ${
        isDark ? "bg-[#121212] text-white" : "bg-white text-slate-800"
      }`}
      style={{
        backgroundColor: isDark ? "#121212" : "#ffffff",
      }}
    >
      {/* Cabecera superior con Logo (sin botón de alternar tema) */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/ventas"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
          title="Ir al Punto de Venta"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Sandalias y Pantuflas HC"
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </Link>
      </header>

      {/* Contenido Principal con estructura de 2 columnas inspirada en la captura */}
      <main className="flex-1 flex items-center justify-center px-6 py-6 md:py-10">
        <div className="w-full max-w-5xl mx-auto flex flex-col-reverse lg:flex-row items-center justify-center gap-8 lg:gap-12">
          {/* Columna Izquierda: Textos y Botones */}
          <div className="flex-1 max-w-lg text-center lg:text-left flex flex-col items-center lg:items-start">
            <span
              className={`text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2 select-none ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              ERROR 404
            </span>

            <h1
              className={`text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Página no encontrada
            </h1>

            <p
              className={`text-base sm:text-lg leading-relaxed mb-8 max-w-md ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Parece que la página que buscas no existe, ha sido movida o no
              tienes permisos para acceder a ella.
            </p>

            {/* Botones de acción del Punto de Venta */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full">
              <Link
                href="/ventas"
                className="px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer bg-[#cfd500] hover:bg-[#b8be00] text-black shadow-[#cfd500]/25"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                <span>Ir al Inicio</span>
              </Link>

              <Link
                href="/inventario"
                className={`px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer border ${
                  isDark
                    ? "bg-[#1a1a1d] hover:bg-[#262629] text-white border-[#262629] hover:border-[#cfd500]/50"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Ver Inventario</span>
              </Link>
            </div>

            {/* Nota de pie del sistema */}
            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 w-full flex items-center justify-center lg:justify-start">
              <p
                className={`text-xs font-medium tracking-wide ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Sandalias y Pantuflas HC • Punto de Venta
              </p>
            </div>
          </div>

          {/* Columna Derecha: Ilustración error.png (Aumentada 40px, sin reacción hover, junto al texto) */}
          <div className="flex-1 flex items-center justify-center max-w-md lg:max-w-lg shrink-0">
            <div className="relative">
              {/* Brillo difuminado sutil detrás del personaje */}
              <div
                className={`absolute inset-0 rounded-full filter blur-3xl opacity-20 pointer-events-none ${
                  isDark ? "bg-[#cfd500]/20" : "bg-slate-300/50"
                }`}
              />
              <Image
                src="/images/error.png"
                alt="Página no encontrada - Error 404"
                width={520}
                height={520}
                priority
                className="relative z-10 w-full max-w-[310px] sm:max-w-[380px] md:max-w-[430px] lg:max-w-[480px] h-auto object-contain select-none pointer-events-none drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página invisible para equilibrar el espaciado vertical */}
      <footer className="w-full py-2 opacity-0 select-none pointer-events-none">
        HC Venta
      </footer>
    </div>
  );
}
