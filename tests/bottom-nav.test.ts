import { describe, it, expect } from "vitest";

describe("Navegación Inferior Móvil (BottomNav) y Permisos por Rol", () => {
  // Configuración de módulos del sistema
  const primaryModules = [
    { href: "/ventas", label: "Ventas" },
    { href: "/consultas", label: "Consultas" },
    { href: "/inventario", label: "Inventario" },
    { href: "/caja", label: "Caja" },
  ];

  const adminOnlyModules = [
    { href: "/gastos", label: "Gastos" },
    { href: "/reportes", label: "Reportes" },
    { href: "/configuracion", label: "Configuración" },
  ];

  // Función lógica para obtener los módulos visibles según el rol
  function getNavStructure(isEmployee: boolean) {
    if (isEmployee) {
      return {
        primary: primaryModules,
        hasMoreButton: false,
        moreItems: [],
        totalAccessibleRoutes: primaryModules.map((m) => m.href),
      };
    }

    return {
      primary: primaryModules,
      hasMoreButton: true,
      moreItems: adminOnlyModules,
      totalAccessibleRoutes: [
        ...primaryModules.map((m) => m.href),
        ...adminOnlyModules.map((m) => m.href),
      ],
    };
  }

  function isRouteActive(currentPath: string, targetHref: string) {
    if (targetHref === "/ventas") {
      return (
        currentPath === "/" ||
        currentPath === "/ventas" ||
        currentPath.startsWith("/ventas/")
      );
    }
    return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`);
  }

  function isMoreMenuIndicatorActive(currentPath: string) {
    return adminOnlyModules.some((item) => isRouteActive(currentPath, item.href));
  }

  describe("Estructura de navegación para Rol Empleado", () => {
    const nav = getNavStructure(true);

    it("Debe mostrar únicamente los 4 módulos operativos autorizados en la barra", () => {
      expect(nav.primary).toHaveLength(4);
      expect(nav.primary.map((p) => p.href)).toEqual([
        "/ventas",
        "/consultas",
        "/inventario",
        "/caja",
      ]);
    });

    it("NO debe incluir el botón 'Más' ni módulos administrativos", () => {
      expect(nav.hasMoreButton).toBe(false);
      expect(nav.moreItems).toHaveLength(0);
    });

    it("No debe dar acceso ni mostrar gastos, reportes ni configuración", () => {
      expect(nav.totalAccessibleRoutes).not.toContain("/gastos");
      expect(nav.totalAccessibleRoutes).not.toContain("/reportes");
      expect(nav.totalAccessibleRoutes).not.toContain("/configuracion");
    });
  });

  describe("Estructura de navegación para Rol Administrador", () => {
    const nav = getNavStructure(false);

    it("Debe mostrar los 4 módulos primarios en la barra principal", () => {
      expect(nav.primary).toHaveLength(4);
    });

    it("Debe habilitar el botón 'Más' con exactamente los 3 módulos administrativos restantes", () => {
      expect(nav.hasMoreButton).toBe(true);
      expect(nav.moreItems).toHaveLength(3);
      expect(nav.moreItems.map((m) => m.href)).toEqual([
        "/gastos",
        "/reportes",
        "/configuracion",
      ]);
    });

    it("No debe duplicar elementos entre la barra principal y el menú 'Más'", () => {
      const primaryHrefs = new Set(nav.primary.map((p) => p.href));
      const moreHrefs = new Set(nav.moreItems.map((m) => m.href));

      nav.moreItems.forEach((item) => {
        expect(primaryHrefs.has(item.href)).toBe(false);
      });
      expect(primaryHrefs.size + moreHrefs.size).toBe(7);
    });
  });

  describe("Lógica de estado activo (resaltado visual)", () => {
    it("Detecta correctamente la ruta raíz '/' como activa en Ventas", () => {
      expect(isRouteActive("/", "/ventas")).toBe(true);
      expect(isRouteActive("/", "/caja")).toBe(false);
    });

    it("Detecta correctamente las rutas operativas directas", () => {
      expect(isRouteActive("/caja", "/caja")).toBe(true);
      expect(isRouteActive("/consultas", "/consultas")).toBe(true);
      expect(isRouteActive("/inventario", "/inventario")).toBe(true);
      expect(isRouteActive("/caja", "/inventario")).toBe(false);
    });

    it("Activa el indicador de 'Más' cuando se navega en /gastos, /reportes o /configuracion", () => {
      expect(isMoreMenuIndicatorActive("/gastos")).toBe(true);
      expect(isMoreMenuIndicatorActive("/reportes")).toBe(true);
      expect(isMoreMenuIndicatorActive("/configuracion")).toBe(true);
      expect(isMoreMenuIndicatorActive("/ventas")).toBe(false);
      expect(isMoreMenuIndicatorActive("/caja")).toBe(false);
    });
  });
});
