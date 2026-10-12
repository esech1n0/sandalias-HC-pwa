import { NextResponse } from "next/server";
import { markSystemUpdateNotificationsAsRead } from "@/services/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await markSystemUpdateNotificationsAsRead();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al marcar actualizaciones del sistema como leídas:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
