import { NextResponse } from "next/server";
import { getCurrentVersionInfo } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  const versionInfo = getCurrentVersionInfo();
  return NextResponse.json(versionInfo, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
