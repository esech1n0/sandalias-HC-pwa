import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { triggerSystemUpdateNotification } from "@/services/notifications";

export const dynamic = "force-dynamic";

/**
 * Webhook de Vercel para detectar deployments finalizados exitosamente.
 * Vercel envía eventos: deployment.succeeded, deployment.error, deployment.canceled, etc.
 */
interface VercelWebhookBody {
  type?: string;
  payload?: {
    deployment?: {
      id?: string;
      name?: string;
      url?: string;
    };
  };
}

/** Compara la firma HMAC-SHA1 en tiempo constante para evitar ataques de temporización. */
function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha1", secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-vercel-signature");
    const secret = process.env.VERCEL_WEBHOOK_SECRET;

    // La firma es obligatoria: sin secreto configurado o sin firma, se rechaza la petición.
    if (!secret) {
      console.error("VERCEL_WEBHOOK_SECRET no está configurado; webhook rechazado.");
      return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
    }
    if (!signature || !isValidSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: "Firma inválida del webhook de Vercel" },
        { status: 401 }
      );
    }

    let body: VercelWebhookBody;
    try {
      body = JSON.parse(rawBody) as VercelWebhookBody;
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON inválido" },
        { status: 400 }
      );
    }

    const eventType = body?.type;
    const deployment = body?.payload?.deployment;
    const deploymentId = deployment?.id;

    // 1. REQUISITO: Detectar cuando se complete un deployment EXITOSO en Vercel
    if (
      eventType === "deployment.succeeded" ||
      eventType === "deployment.ready" ||
      eventType === "deployment-ready"
    ) {
      await triggerSystemUpdateNotification(deploymentId);

      return NextResponse.json({
        success: true,
        message: "Notificación de actualización de la aplicación registrada.",
        deploymentId,
      });
    }

    // 2. REQUISITO: No notificar si el deployment falla, se cancela o si no requiere actualizar
    return NextResponse.json({
      success: true,
      message: `Evento '${eventType}' procesado sin notificar (solo se notifica ante deployments exitosos).`,
    });
  } catch (error) {
    console.error("Error al procesar webhook de Vercel:", error);
    return NextResponse.json(
      { error: "Error interno al procesar webhook" },
      { status: 500 }
    );
  }
}
