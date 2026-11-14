"use client";

// ==============================================================================
// Botón de ojo para mostrar / ocultar la contraseña
// - Un clic muestra la contraseña y se mantiene visible hasta el siguiente clic.
// - Ojo abierto = contraseña visible; ojo cerrado = contraseña oculta.
// - La transición entre ambos estados se define en globals.css (.eye-toggle).
// ==============================================================================

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  controlsId?: string;
  className?: string;
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
  controlsId,
  className = "",
}: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      // Evita que el campo pierda el foco (y el cursor de escritura) al pulsar el botón
      onMouseDown={(e) => e.preventDefault()}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
      aria-controls={controlsId}
      title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      data-state={visible ? "open" : "closed"}
      className={`eye-toggle p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cfd500] cursor-pointer ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Ojo abierto: contorno + pupila. Se "cierra" aplastándose hacia la línea media. */}
        <g className="eye-open">
          <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.36 7.4 5 12 5s8.58 3.36 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.64 16.6 19 12 19s-8.58-3.36-9.94-6.65" />
          <circle className="eye-pupil" cx="12" cy="12" r="3" />
        </g>
        {/* Ojo cerrado: párpado curvo con pestañas que aparecen al cerrarse */}
        <g className="eye-closed">
          <path d="M2.5 11c2.2 3.4 5.6 5.2 9.5 5.2s7.3-1.8 9.5-5.2" />
          <path className="eye-lash" d="M5.4 14.4 3.8 16.4" />
          <path className="eye-lash" d="M9.4 15.9 8.8 18.4" />
          <path className="eye-lash" d="M14.6 15.9l.6 2.5" />
          <path className="eye-lash" d="M18.6 14.4l1.6 2" />
        </g>
      </svg>
    </button>
  );
}
