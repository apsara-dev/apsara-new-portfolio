import { NextResponse } from "next/server";
import {
  getSyncedPortfolioData,
  updatePortfolioDataBoth,
} from "@/lib/db";
import { maskPhoneNumber, verifyAdminRequest } from "@/lib/security";
import {
  isSupabaseConfigured,
  pullPortfolioFromSupabase,
  pushPortfolioToSupabase,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let data = getSyncedPortfolioData();

    // If Supabase Cloud DB is configured, hydrate from Supabase so Vercel deployments always serve live cloud edits
    if (isSupabaseConfigured().configured) {
      const cloudData = await pullPortfolioFromSupabase();
      if (cloudData && cloudData.profile) {
        data = cloudData;
      }
    }

    const { searchParams } = new URL(request.url);
    const wantsAdminView = searchParams.get("admin") === "1";
    const isAdmin = wantsAdminView && verifyAdminRequest(request);

    const responsePayload = isAdmin
      ? data
      : {
          ...data,
          profile: {
            ...data.profile,
            phone: maskPhoneNumber(data.profile.phone),
          },
        };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch portfolio data" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updated = updatePortfolioDataBoth(body);

    if (isSupabaseConfigured().configured) {
      await pushPortfolioToSupabase(updated);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update portfolio data" },
      { status: 400 }
    );
  }
}
