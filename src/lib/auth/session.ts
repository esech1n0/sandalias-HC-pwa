import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ==============================================================================
// Manejo de Sesiones Seguras con Jose y Cookies HTTP-Only (Next.js 16)
// ==============================================================================

// Sin clave de respaldo: una clave conocida permitiría a cualquiera falsificar sesiones.
let cachedKey: Uint8Array | null = null;
function getEncodedKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey || secretKey.length < 32) {
    throw new Error(
      "SESSION_SECRET no está configurada o tiene menos de 32 caracteres. Configúrala en las variables de entorno."
    );
  }
  cachedKey = new TextEncoder().encode(secretKey);
  return cachedKey;
}

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  expiresAt: Date;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());
}

export async function decryptSession(session: string | undefined): Promise<SessionPayload | null> {
  if (!session) return null;
  // Fuera del try: una configuración faltante debe fallar visiblemente, no como "sesión inválida".
  const key = getEncodedKey();
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      name: payload.name as string,
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; username: string; name: string }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encryptSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  return decryptSession(sessionToken);
}
