import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "../prisma";

// ==============================================================================
// Data Access Layer (DAL) - Verificación Segura de Sesión
// ==============================================================================

export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true, userId: session.userId, username: session.username, name: session.name };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  let user: { id: string; username: string; name: string; isActive: boolean } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error al consultar el usuario de la sesión:", error);
    return null;
  }

  // redirect() lanza una excepción especial: debe quedar FUERA del try/catch para que funcione.
  // Así un usuario desactivado o eliminado pierde el acceso aunque su JWT siga vigente.
  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
});
