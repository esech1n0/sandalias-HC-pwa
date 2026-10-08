"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Lock,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Database,
  Building,
} from "lucide-react";
import { changePasswordAction } from "@/actions/auth";
import { updateSettingsAction } from "@/actions/settings";

interface SettingsData {
  id: string;
  allowBelowCostSales: boolean;
  defaultMinStock: number;
  businessName: string;
  headerColor: string;
}

interface SettingsManagerProps {
  initialSettings: SettingsData;
  currentUser: {
    username: string;
    name?: string | null;
  };
}

export function SettingsManager({ initialSettings, currentUser }: SettingsManagerProps) {
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  // System settings state
  const [allowBelowCost, setAllowBelowCost] = useState(initialSettings.allowBelowCostSales);
  const [minStock, setMinStock] = useState(initialSettings.defaultMinStock);
  const [businessName, setBusinessName] = useState(initialSettings.businessName);
  const [settingsStatus, setSettingsStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  // Theme state
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("hc-theme") as "light" | "dark" | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setActiveTheme(saved);
  }, []);

  const handleToggleTheme = (theme: "light" | "dark") => {
    setActiveTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("hc-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: "" });

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "La nueva contraseña y la confirmación no coinciden.",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (res.success) {
        setPasswordStatus({
          type: "success",
          message: "¡Contraseña actualizada exitosamente!",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({
          type: "error",
          message: res.error || "No se pudo cambiar la contraseña.",
        });
      }
    } catch {
      setPasswordStatus({
        type: "error",
        message: "Ocurrió un error inesperado al actualizar la contraseña.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsStatus({ type: null, message: "" });
    setSavingSettings(true);

    try {
      const res = await updateSettingsAction({
        allowBelowCostSales: allowBelowCost,
        defaultMinStock: Number(minStock) || 5,
        businessName: businessName.trim(),
      });

      if (res.success) {
        setSettingsStatus({
          type: "success",
          message: "Configuración guardada correctamente.",
        });
      } else {
        setSettingsStatus({
          type: "error",
          message: res.error || "Error al guardar configuración.",
        });
      }
    } catch {
      setSettingsStatus({
        type: "error",
        message: "Error de red al conectar con el servidor.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#cfd500]" />
          Configuración del Sistema
        </h1>
        <p className="text-sm text-slate-500">
          Personaliza los parámetros operativos, seguridad y apariencia de HC Venta
        </p>
      </div>

      {/* Tarjeta: Parámetros del Negocio y POS */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Building className="w-5 h-5 text-[#cfd500]" />
          <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
            Parámetros de Operación
          </h2>
        </div>

        {settingsStatus.type && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
              settingsStatus.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            {settingsStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{settingsStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre del Establecimiento / Negocio
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
              placeholder="Sandalias HC"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stock Mínimo Predeterminado
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Alerta de stock bajo para productos nuevos sin umbral manual.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#cfd500]" />
                  Ventas con Utilidad Negativa
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Permitir concretar ventas si el precio personalizado o descuento deja margen negativo (resalta alerta visual).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={allowBelowCost}
                  onChange={(e) => setAllowBelowCost(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#cfd500]"></div>
                <span className="ml-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {allowBelowCost ? "Permitido (Con advertencia)" : "Bloqueado"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-black text-[#cfd500] hover:bg-slate-800 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? "Guardando..." : "Guardar Parámetros"}
            </button>
          </div>
        </form>
      </div>

      {/* Tarjeta: Apariencia y Tema */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Sun className="w-5 h-5 text-[#cfd500]" />
          <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
            Apariencia de la Interfaz
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => handleToggleTheme("light")}
            className={`flex-1 p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              activeTheme === "light"
                ? "border-black bg-slate-100 text-black shadow-xs"
                : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            Modo Claro
          </button>

          <button
            type="button"
            onClick={() => handleToggleTheme("dark")}
            className={`flex-1 p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              activeTheme === "dark"
                ? "border-[#cfd500] bg-slate-800 text-white shadow-xs"
                : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <Moon className="w-4 h-4 text-purple-400" />
            Modo Oscuro
          </button>
        </div>
      </div>

      {/* Tarjeta: Seguridad y Contraseña */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#cfd500]" />
            <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
              Seguridad de la Cuenta ({currentUser.username})
            </h2>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Sesión Activa
          </span>
        </div>

        {passwordStatus.type && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
              passwordStatus.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            {passwordStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{passwordStatus.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-black text-[#cfd500] hover:bg-slate-800 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {savingPassword ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      </div>

      {/* Tarjeta: Reglas de Negocio y Garantías del Sistema */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-[#cfd500]" />
          <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
            Reglas del Sistema y Arquitectura de Datos
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Promedio Ponderado
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Costo recalculado en cada compra: ((stock * costo_ant) + (nuevas * nuevo_costo)) / nuevo_stock.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Inmutabilidad de Ventas
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Las ventas guardan foto histórica de precio y costo. No se editan ni alteran ventas pasadas.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Retiros vs Gastos Separados
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Los retiros solo afectan efectivo en caja. Los gastos del negocio reducen la ganancia neta.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Transacciones Atómicas
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ventas, compras, caja y ajustes se ejecutan en transacciones PostgreSQL ACID con rollback total.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
