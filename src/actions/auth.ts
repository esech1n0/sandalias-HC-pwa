"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/auth/session";

export interface AuthActionResponse {
  success: boolean;
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { success: false, error: "Por favor, ingresa tu usuario y contraseña." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    if (!user || !user.isActive) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordsMatch) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    // Crear sesión HTTP-Only
    await createSession({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { success: false, error: "Error de conexión. Inténtalo de nuevo." };
  }

  redirect("/ventas");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<AuthActionResponse> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "No autenticado." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: "La contraseña actual no es correcta." };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return { success: false, error: "No se pudo actualizar la contraseña." };
  }
}
