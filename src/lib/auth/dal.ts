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

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      redirect("/login");
    }

    return user;
  } catch {
    return null;
  }
});
