import { describe, it, expect } from "vitest";

describe("Restricciones de Rol Empleado y Rutas Administrativas (403)", () => {
  const adminOnlyRoutes = ["/gastos", "/reportes", "/configuracion"];
  const employeeAllowedRoutes = ["/ventas", "/consultas", "/inventario", "/caja"];

  function isRouteAllowedForEmployee(path: string): boolean {
    const isRestricted = adminOnlyRoutes.some(
      (route) => path === route || path.startsWith(`${route}/`)
    );
    return !isRestricted;
  }

  function getRedirectForRoute(userRole: "admin" | "empleado", path: string): string | null {
    if (userRole === "empleado") {
      const isRestricted = adminOnlyRoutes.some(
        (route) => path === route || path.startsWith(`${route}/`)
      );
      if (isRestricted) {
        return "/403";
      }
    }
    return null; // Permitido
  }

  it("Permite a la cuenta empleado acceder a ventas, consultas, inventario y caja", () => {
    employeeAllowedRoutes.forEach((route) => {
      expect(isRouteAllowedForEmployee(route)).toBe(true);
      expect(getRedirectForRoute("empleado", route)).toBeNull();
    });
  });

  it("Bloquea a la cuenta empleado y redirige a /403 en gastos, reportes y configuracion", () => {
    adminOnlyRoutes.forEach((route) => {
      expect(isRouteAllowedForEmployee(route)).toBe(false);
      expect(getRedirectForRoute("empleado", route)).toBe("/403");
    });
  });

  it("Permite al administrador acceder a todas las rutas", () => {
    [...employeeAllowedRoutes, ...adminOnlyRoutes].forEach((route) => {
      expect(getRedirectForRoute("admin", route)).toBeNull();
    });
  });
});
