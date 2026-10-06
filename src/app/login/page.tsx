"use client";

import { useActionState } from "react";
import { loginAction, AuthActionResponse } from "@/actions/auth";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResponse | null, FormData>(
    loginAction,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner Superior con color de marca #cfd500 */}
        <div
          className="p-8 text-center text-black border-b border-black/10"
          style={{ backgroundColor: "#cfd500" }}
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-black text-[#cfd500] flex items-center justify-center font-black text-2xl shadow-md">
            HC
          </div>
          <h1 className="text-2xl font-black tracking-tight">SANDALIAS HC</h1>
          <p className="text-sm font-semibold opacity-80 mt-1">
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
              className="w-full mt-6 py-3.5 px-4 rounded-xl font-black text-black text-sm tracking-wide shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
