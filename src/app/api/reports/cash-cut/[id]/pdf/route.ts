import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { generateDailySalesPdf } from "@/services/pdfReport";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("No autorizado. Inicie sesión para ver reportes.", {
        status: 401,
      });
    }

    const { id } = await params;
    if (!id) {
      return new NextResponse("Identificador de corte de caja no válido.", {
        status: 400,
      });
    }

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "true";

    const { buffer, filename } = await generateDailySalesPdf(id);

    const disposition = isDownload
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    console.error("Error al generar reporte de ventas en PDF:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const status = message.includes("no encontrado") ? 404 : 500;
    return new NextResponse(message, { status });
  }
}
