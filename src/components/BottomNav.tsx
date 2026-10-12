"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Package,
  Vault,
  ReceiptText,
  BarChart3,
  Settings,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react";

export interface BottomNavProps {
  isEmployee?: boolean;
}

export function BottomNav({ isEmployee = false }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Cerrar el panel "Más" automáticamente al navegar a otra ruta
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoreOpen(false);
  }, [pathname]);

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
      }
    };
    if (moreOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  // 1. Módulos primarios de acceso rápido (visibles directamente en la barra)
  const primaryNavItems = [
    {
      href: "/ventas",
      label: "Ventas",
      icon: ShoppingCart,
    },
    {
      href: "/consultas",
      label: "Consultas",
      icon: Search,
    },
    {
      href: "/inventario",
      label: "Inventario",
      icon: Package,
    },
    {
      href: "/caja",
      label: "Caja",
      icon: Vault,
    },
  ];

  // 2. Módulos secundarios para Administrador (visibles dentro de la opción "Más")
  const moreNavItems = [
    {
      href: "/gastos",
      label: "Gastos",
      description: "Registro y control de gastos de caja",
      icon: ReceiptText,
    },
    {
      href: "/reportes",
      label: "Reportes",
      description: "Métricas financieras y resúmenes de ventas",
      icon: BarChart3,
    },
    {
      href: "/configuracion",
      label: "Configuración",
      description: "Ajustes del sistema, usuarios y negocio",
      icon: Settings,
    },
  ];

  // Determinar si la ruta actual coincide con un elemento
  const isRouteActive = (href: string) => {
    if (href === "/ventas") {
      return pathname === "/" || pathname === "/ventas" || pathname.startsWith("/ventas/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Determinar si alguna ruta de "Más" está actualmente activa
  const isMoreActive = moreNavItems.some((item) => isRouteActive(item.href));

  return (
    <>
      {/* ==================================================================== */}
      {/* Barra de Navegación Inferior (Exclusiva para Móviles: md:hidden) */}
      {/* ==================================================================== */}
      <nav
        role="navigation"
        aria-label="Navegación inferior móvil"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] transition-all select-none"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.25rem)",
        }}
      >
        <div
          className={`grid items-center h-15 px-1 max-w-lg mx-auto ${
            isEmployee ? "grid-cols-4" : "grid-cols-5"
          }`}
        >
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Ir al módulo de ${item.label}`}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
                  active
                    ? "text-black dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <div
                  className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                    active
                      ? "bg-[#cfd500] text-black font-black shadow-xs scale-105"
                      : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 leading-none transition-colors truncate max-w-[64px] ${
                    active
                      ? "font-black text-slate-950 dark:text-[#cfd500]"
                      : "font-semibold"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botón "Más" (únicamente para administradores cuando hay módulos secundarios) */}
          {!isEmployee && (
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-label="Abrir más módulos"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
                isMoreActive || moreOpen
                  ? "text-black dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <div
                className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all relative ${
                  isMoreActive || moreOpen
                    ? "bg-[#cfd500] text-black font-black shadow-xs scale-105"
                    : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80"
                }`}
              >
                <MoreHorizontal className="w-5 h-5 shrink-0" />
                {isMoreActive && !moreOpen && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-black dark:bg-[#cfd500] ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 leading-none transition-colors truncate max-w-[64px] ${
                  isMoreActive || moreOpen
                    ? "font-black text-slate-950 dark:text-[#cfd500]"
                    : "font-semibold"
                }`}
              >
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* Panel / Bottom Sheet de Módulos Adicionales ("Más") */}
      {/* ==================================================================== */}
      {!isEmployee && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Módulos adicionales"
          className={`fixed inset-0 z-50 md:hidden flex flex-col justify-end transition-[visibility,opacity] duration-300 ease-in-out ${
            moreOpen
              ? "visible opacity-100 pointer-events-auto"
              : "invisible opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop con desenfoque suave */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
              moreOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Contenedor del Bottom Sheet */}
          <div
            className={`relative w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 transform transition-transform duration-300 ease-out z-10 ${
              moreOpen ? "translate-y-0" : "translate-y-full"
            }`}
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)",
            }}
          >
            {/* Píldora de arrastre superior */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

            {/* Cabecera del panel */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                  Más Módulos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Opciones avanzadas de administración
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-90"
                aria-label="Cerrar panel de opciones"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de módulos complementarios autorizados */}
            <div className="space-y-2">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer group active:scale-[0.98] ${
                      active
                        ? "bg-[#cfd500]/15 dark:bg-[#cfd500]/10 border-[#cfd500] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-[#cfd500]/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        active
                          ? "bg-[#cfd500] text-black font-black shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs group-hover:bg-[#cfd500] group-hover:text-black"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-sm truncate ${
                            active
                              ? "text-black dark:text-[#cfd500]"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {item.label}
                        </span>
                        {active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#cfd500] text-black">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-5 h-5 shrink-0 transition-transform ${
                        active
                          ? "text-[#cfd500] translate-x-0.5"
                          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
