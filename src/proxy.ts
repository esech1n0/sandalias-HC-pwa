import { NextRequest, NextResponse } from "next/server";
import { decryptSession } from "./lib/auth/session";

// ==============================================================================
// Proxy (Next.js 16) - Filtro de Protección de Rutas
// ==============================================================================

const publicRoutes = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Permitir archivos estáticos, imágenes y favicon
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api/public") ||
    path.includes(".") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(path);
  const sessionCookie = req.cookies.get("session")?.value;
  const session = await decryptSession(sessionCookie);

  // 1. Si la ruta requiere autenticación y no hay sesión activa -> redirigir a /login
  if (!isPublicRoute && !session?.userId) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Si ya está autenticado e intenta ir a /login -> redirigir a /ventas
  if (isPublicRoute && session?.userId) {
    const ventasUrl = new URL("/ventas", req.nextUrl.origin);
    return NextResponse.redirect(ventasUrl);
  }

  // 3. Si entra a la raíz "/" -> redirigir a /ventas
  if (path === "/" && session?.userId) {
    const ventasUrl = new URL("/ventas", req.nextUrl.origin);
    return NextResponse.redirect(ventasUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/public|_next/static|_next/image|favicon.ico).*)"],
};
