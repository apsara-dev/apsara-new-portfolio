import { NextResponse } from "next/server";
import { forceSyncPortfolio } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const direction =
      body?.direction === "db-to-json" ? "db-to-json" : "json-to-db";
    const synced = forceSyncPortfolio(direction);
    return NextResponse.json(
      {
        status: "ok",
        direction,
        syncedAt: new Date().toISOString(),
        data: synced,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize DB and JSON" },
      { status: 500 }
    );
  }
}
