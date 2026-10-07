"use client";

import { useActionState, useEffect } from "react";
import { loginAction, AuthActionResponse } from "@/actions/auth";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResponse | null, FormData>(
    loginAction,
    null
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("hc-theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Fondos con efecto difuminado según el tema */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center transition-opacity duration-500 scale-105 filter blur-md block dark:hidden"
        style={{ backgroundImage: "url('/images/background-login.png')" }}
      />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center transition-opacity duration-500 scale-105 filter blur-md hidden dark:block"
        style={{ backgroundImage: "url('/images/background-login-black.png')" }}
      />

      {/* Capa de contraste sobre el fondo difuminado */}
      <div className="absolute inset-0 -z-10 bg-black/25 dark:bg-black/60" />

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden relative z-10">
        {/* Banner Superior con color de marca #cfd500 y logo nuevo */}
        <div
          className="p-6 text-center text-black border-b border-black/10 flex flex-col items-center justify-center"
          style={{ backgroundColor: "#cfd500" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-16 max-w-[220px] w-auto object-contain drop-shadow-sm mx-auto"
          />
          <p className="text-xs font-bold opacity-80 mt-2">
            Punto de Venta — HC Venta
          </p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
            Iniciar Sesión
          </h2>

          {state?.error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#cfd500] focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#cfd500] focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-6 py-3.5 px-4 rounded-xl font-black text-black text-sm tracking-wide shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: "#cfd500" }}
            >
              {isPending ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
