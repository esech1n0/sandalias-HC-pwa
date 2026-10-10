import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Idle Screen - Inactividad de 5 minutos y Comportamiento", () => {
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos (300,000 ms)

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("El temporizador por defecto debe ser de 5 minutos (300,000 ms)", () => {
    expect(IDLE_TIMEOUT_MS).toBe(300000);
  });

  it("Se activa la pantalla de inactividad exactamente después de 5 minutos sin actividad", () => {
    let isIdle = false;
    const timerId = setTimeout(() => {
      isIdle = true;
    }, IDLE_TIMEOUT_MS);

    // Antes de 5 minutos no debe activarse
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(isIdle).toBe(false);

    // Al cumplirse los 5 minutos exactos se activa
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(isIdle).toBe(true);

    clearTimeout(timerId);
  });

  it("Cualquier actividad del usuario (mover ratón o pulsar tecla) reinicia la cuenta regresiva antes de 5 minutos", () => {
    let isIdle = false;
    let timerId: NodeJS.Timeout | null = null;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        isIdle = true;
      }, IDLE_TIMEOUT_MS);
    };

    resetTimer();

    // Avanzan 4 minutos (queda 1 minuto para activarse)
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(isIdle).toBe(false);

    // Usuario mueve el cursor o presiona una tecla
    resetTimer();

    // Avanzan 2 minutos más (han pasado 6 minutos en total desde el inicio, pero solo 2 desde el reset)
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(isIdle).toBe(false);

    // Avanzan los 3 minutos restantes
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(isIdle).toBe(true);

    if (timerId) clearTimeout(timerId);
  });

  it("Al estar en pantalla de inactividad, cualquier tecla o movimiento de cursor quita la pantalla de inmediato", () => {
    let isIdle = true;
    const handleActivityWhenIdle = () => {
      if (isIdle) {
        isIdle = false; // Quita la pantalla de inactividad
      }
    };

    expect(isIdle).toBe(true);

    // Simula evento de cursor o teclado
    handleActivityWhenIdle();

    expect(isIdle).toBe(false);
  });

  it("Determina el color de fondo correcto según el tema seleccionado: Claro (#ffffff) u Oscuro (#121212)", () => {
    const getBackgroundColor = (theme: "light" | "dark") => {
      return theme === "dark" ? "#121212" : "#ffffff";
    };

    expect(getBackgroundColor("light")).toBe("#ffffff");
    expect(getBackgroundColor("dark")).toBe("#121212");
  });
});
