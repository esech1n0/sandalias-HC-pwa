"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ShoppingCart,
  Search,
  Package,
  Vault,
  ReceiptText,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  CheckCheck,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
}

interface HeaderProps {
  userName?: string;
  notifications?: NotificationItem[];
  unreadCount?: number;
}

export function Header({
  userName = "Usuario",
  notifications = [],
  unreadCount = 0,
}: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("hc-theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [hasMarkedAllRead, setHasMarkedAllRead] = useState(false);

  const displayNotifications = hasMarkedAllRead
    ? notifications.map((n) => ({ ...n, isRead: true }))
    : notifications;
  const displayUnreadCount = hasMarkedAllRead ? 0 : unreadCount;

  useEffect(() => {
    const savedTheme = localStorage.getItem("hc-theme") as "light" | "dark" | null;
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("hc-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const navLinks = [
    { href: "/ventas", label: "Ventas", icon: ShoppingCart },
    { href: "/consultas", label: "Consultas", icon: Search },
    { href: "/inventario", label: "Inventario", icon: Package },
    { href: "/caja", label: "Caja y Cortes", icon: Vault },
    { href: "/gastos", label: "Gastos", icon: ReceiptText },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ];

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setHasMarkedAllRead(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 text-black shadow-md"
        style={{ backgroundColor: "#cfd500" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Izquierda: Botón Menú Hamburguesa */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-black/15 transition-all focus:outline-hidden cursor-pointer active:scale-95"
              aria-label="Abrir menú de navegación"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <span className="hidden sm:inline-block font-semibold text-sm opacity-90">
              Hola, {userName}
            </span>
          </div>

          {/* Centro: Logo / Identidad */}
          <Link
            href="/ventas"
            className="flex items-center hover:opacity-90 transition-opacity cursor-pointer py-1"
            aria-label="Sandalias HC"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="Sandalias HC"
              className="h-11 sm:h-12 w-auto object-contain transition-transform hover:scale-105"
            />
          </Link>

          {/* Derecha: Icono de Notificaciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-black/15 transition-all relative focus:outline-hidden cursor-pointer active:scale-95"
              aria-label="Ver notificaciones"
            >
              <Bell className="w-6 h-6" />
              {displayUnreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Menú Hamburguesa con animación de deslizamiento */}
      <div
        className={`fixed inset-0 z-50 flex transition-[visibility,opacity] duration-300 ease-in-out ${
          menuOpen ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`relative w-72 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-50 text-slate-800 dark:text-slate-100 transform transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header del menú */}
          <div
            className="p-4 flex items-center justify-between border-b border-black/10"
            style={{ backgroundColor: "#cfd500" }}
          >
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Logo HC"
                className="h-9 w-auto object-contain drop-shadow-xs"
              />
              <div>
                <div className="font-black text-base text-black leading-tight">
                  HC Venta
                </div>
                <div className="text-[11px] font-bold text-black/75">
                  Operador: {userName}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 rounded-md text-black hover:bg-black/10 cursor-pointer active:scale-90 transition-all"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Opciones de navegación */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    isActive
                      ? "bg-[#cfd500]/30 text-black dark:text-yellow-300 font-bold translate-x-1 shadow-xs"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:translate-x-1"
                  }`}
                >
                  <Icon className="w-5 h-5 opacity-80" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Pie del menú: Tema y Cerrar Sesión */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span className="flex items-center gap-2">
                {theme === "light" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-400" />
                )}
                Tema: {theme === "light" ? "Claro" : "Oscuro"}
              </span>
              <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                Cambiar
              </span>
            </button>

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer active:scale-[0.98] transition-all font-bold"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Drawer de Notificaciones con animación de deslizamiento */}
      <div
        className={`fixed inset-0 z-50 flex justify-end transition-[visibility,opacity] duration-300 ease-in-out ${
          notifOpen ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            notifOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setNotifOpen(false)}
        />
        <div
          className={`relative w-80 max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-50 text-slate-800 dark:text-slate-100 transform transition-transform duration-300 ease-out ${
            notifOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Notificaciones</h3>
              {displayUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {displayUnreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setNotifOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer active:scale-90 transition-all"
              aria-label="Cerrar notificaciones"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleMarkAllRead}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas leídas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayNotifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No hay notificaciones pendientes.
              </div>
            ) : (
              displayNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border text-sm transition-all hover:shadow-xs ${
                    notif.isRead
                      ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70"
                      : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-xs"
                  }`}
                >
                  <div className="font-semibold text-xs text-amber-700 dark:text-amber-400 mb-0.5">
                    {notif.title}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 text-xs">
                    {notif.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
