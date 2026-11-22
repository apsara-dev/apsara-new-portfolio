import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
  pushPortfolioToSupabase,
  pullPortfolioFromSupabase,
  SUPABASE_SQL_SCHEMA,
} from "@/lib/supabase";
import {
  getSyncedPortfolioData,
  updatePortfolioDataBoth,
} from "@/lib/db";
import { verifyAdminRequest } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin authentication required." },
      { status: 401 }
    );
  }

  const cfg = getSupabaseConfig();
  const status = isSupabaseConfigured();

  return NextResponse.json({
    configured: status.configured,
    mode: status.mode,
    supabaseUrl: cfg.supabaseUrl,
    maskedSupabaseKey: cfg.supabaseKey
      ? "•••• •••• " + cfg.supabaseKey.slice(-6)
      : "",
    maskedDatabaseUrl: cfg.databaseUrl
      ? cfg.databaseUrl.replace(/:([^:@]+)@/, ":••••••@")
      : "",
    sqlSchema: SUPABASE_SQL_SCHEMA,
  });
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, supabaseUrl, supabaseKey, databaseUrl } = body || {};

    if (
      typeof supabaseUrl === "string" ||
      typeof supabaseKey === "string" ||
      typeof databaseUrl === "string"
    ) {
      saveSupabaseConfig({ supabaseUrl, supabaseKey, databaseUrl });
    }

    if (action === "pull-from-supabase") {
      const cloudData = await pullPortfolioFromSupabase();
      if (!cloudData) {
        return NextResponse.json(
          {
            error:
              "No portfolio data found in Supabase yet. Click 'Save & Push to Supabase' first to seed your cloud database.",
          },
          { status: 404 }
        );
      }
      const synced = updatePortfolioDataBoth(cloudData);
      return NextResponse.json({
        status: "pulled",
        message:
          "Pulled latest portfolio data from Supabase Cloud DB into local SQLite & portfolio.json!",
        data: synced,
      });
    }

    // Default: Test & Push current portfolio data to Supabase
    const current = getSyncedPortfolioData();
    const pushRes = await pushPortfolioToSupabase(current);

    if (!pushRes.ok) {
      return NextResponse.json(
        {
          error:
            pushRes.error ||
            "Could not connect to Supabase. Please check your URL/Key or PostgreSQL URI.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "connected_and_synced",
      mode: pushRes.mode,
      message: `Connected via ${pushRes.mode}! All portfolio data is now synced to Supabase Cloud DB.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Supabase sync error" },
      { status: 500 }
    );
  }
}
