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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-vercel-signature");
    const secret = process.env.VERCEL_WEBHOOK_SECRET;

    // Verificar firma criptográfica si VERCEL_WEBHOOK_SECRET está configurado
    if (secret && signature) {
      const computedSignature = crypto
        .createHmac("sha1", secret)
        .update(rawBody)
        .digest("hex");

      if (signature !== computedSignature) {
        return NextResponse.json(
          { error: "Firma inválida del webhook de Vercel" },
          { status: 401 }
        );
      }
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
