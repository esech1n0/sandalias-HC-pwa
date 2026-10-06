import { NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/services/notifications";

export async function POST() {
  try {
    await markAllNotificationsAsRead();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al marcar notificaciones:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
