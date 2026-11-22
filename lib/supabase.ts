import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioPayload } from "@/data/portfolio";
import type { ContactSubmission, PhoneAccessLog } from "./db";

const DATA_DIR = path.join(process.cwd(), "data");
const SUPABASE_CONFIG_PATH = path.join(DATA_DIR, "supabase_config.json");

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  databaseUrl: string;
}

export const SUPABASE_SQL_SCHEMA = `
-- Run this in Supabase SQL Editor if you connect using Project URL + API Key only
-- (If you provide the PostgreSQL Connection String DATABASE_URL, these tables are created automatically!)

CREATE TABLE IF NOT EXISTS portfolio_cloud_store (
  id INTEGER PRIMARY KEY DEFAULT 1,
  payload_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_access_logs (
  id BIGSERIAL PRIMARY KEY,
  viewer_name TEXT NOT NULL,
  viewer_email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION purge_expired_60day_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM contact_messages WHERE created_at < NOW() - INTERVAL '60 days';
  DELETE FROM phone_access_logs WHERE created_at < NOW() - INTERVAL '60 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purge_contact_messages_60d ON contact_messages;
CREATE TRIGGER trg_purge_contact_messages_60d
AFTER INSERT ON contact_messages
FOR EACH STATEMENT
EXECUTE FUNCTION purge_expired_60day_logs();

DROP TRIGGER IF EXISTS trg_purge_phone_logs_60d ON phone_access_logs;
CREATE TRIGGER trg_purge_phone_logs_60d
AFTER INSERT ON phone_access_logs
FOR EACH STATEMENT
EXECUTE FUNCTION purge_expired_60day_logs();
`.trim();

export function getSupabaseConfig(): SupabaseConfig {
  let fileCfg: Partial<SupabaseConfig> = {};
  try {
    if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
      fileCfg = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, "utf-8"));
    }
  } catch {}

  return {
    supabaseUrl: (
      fileCfg.supabaseUrl ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://ddpogcrjwxbzdsljupni.supabase.co"
    ).trim(),
    supabaseKey: (
      fileCfg.supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_wiL6jksIyuPjgLe0XshJmQ_2babqk-a"
    ).trim(),
    databaseUrl: (
      fileCfg.databaseUrl ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL ||
      ""
    ).trim(),
  };
}

export function saveSupabaseConfig(
  input: Partial<SupabaseConfig>
): SupabaseConfig {
  const current = getSupabaseConfig();
  const updated: SupabaseConfig = {
    supabaseUrl: (input.supabaseUrl ?? current.supabaseUrl).trim(),
    supabaseKey:
      input.supabaseKey && !input.supabaseKey.includes("•")
        ? input.supabaseKey.trim()
        : current.supabaseKey,
    databaseUrl:
      input.databaseUrl && !input.databaseUrl.includes("•")
        ? input.databaseUrl.trim()
        : current.databaseUrl,
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      SUPABASE_CONFIG_PATH,
      JSON.stringify(updated, null, 2),
      "utf-8"
    );
  } catch {}

  resetPgPool();
  return updated;
}

let pgPool: Pool | null = null;
let lastPoolUrl = "";

function resetPgPool() {
  if (pgPool) {
    pgPool.end().catch(() => {});
    pgPool = null;
    lastPoolUrl = "";
  }
}

function getPgPool(): Pool | null {
  const { databaseUrl } = getSupabaseConfig();
  if (!databaseUrl) return null;

  if (!pgPool || lastPoolUrl !== databaseUrl) {
    resetPgPool();
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 8000,
    });
    lastPoolUrl = databaseUrl;
  }
  return pgPool;
}

function getSupabaseRestClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): {
  configured: boolean;
  mode: "postgres" | "rest" | "none";
} {
  const cfg = getSupabaseConfig();
  if (cfg.databaseUrl) return { configured: true, mode: "postgres" };
  if (cfg.supabaseUrl && cfg.supabaseKey) {
    return { configured: true, mode: "rest" };
  }
  return { configured: false, mode: "none" };
}

export async function initSupabaseTablesIfPostgres(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;
  await pool.query(SUPABASE_SQL_SCHEMA);
  return true;
}

export async function pushPortfolioToSupabase(
  payload: PortfolioPayload
): Promise<{ ok: boolean; mode: string; error?: string }> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initSupabaseTablesIfPostgres();
      await pool.query(
        `
        INSERT INTO portfolio_cloud_store (id, payload_json, updated_at)
        VALUES (1, $1::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          payload_json = EXCLUDED.payload_json,
          updated_at = NOW()
      `,
        [JSON.stringify(payload)]
      );
      return { ok: true, mode: "Supabase PostgreSQL" };
    } catch (err: any) {
      return {
        ok: false,
        mode: "Supabase PostgreSQL",
        error: err?.message || "PostgreSQL write failed",
      };
    }
  }

  const client = getSupabaseRestClient();
  if (client) {
    try {
      const { error } = await client.from("portfolio_cloud_store").upsert(
        {
          id: 1,
          payload_json: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) {
        return {
          ok: false,
          mode: "Supabase REST API",
          error: error.message,
        };
      }
      return { ok: true, mode: "Supabase REST API" };
    } catch (err: any) {
      return {
        ok: false,
        mode: "Supabase REST API",
        error: err?.message || "REST upsert failed",
      };
    }
  }

  return { ok: false, mode: "none", error: "Supabase credentials not set" };
}

export async function pullPortfolioFromSupabase(): Promise<PortfolioPayload | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initSupabaseTablesIfPostgres();
      const res = await pool.query(
        "SELECT payload_json FROM portfolio_cloud_store WHERE id = 1"
      );
      if (res.rows.length > 0 && res.rows[0].payload_json) {
        return res.rows[0].payload_json as PortfolioPayload;
      }
    } catch {}
  }

  const client = getSupabaseRestClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("portfolio_cloud_store")
        .select("payload_json")
        .eq("id", 1)
        .single();
      if (!error && data?.payload_json) {
        return data.payload_json as PortfolioPayload;
      }
    } catch {}
  }

  return null;
}

export async function pushContactToSupabase(
  msg: ContactSubmission
): Promise<void> {
  const cutoffIso = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();

  const pool = getPgPool();
  if (pool) {
    try {
      await initSupabaseTablesIfPostgres();
      await pool.query(
        `DELETE FROM contact_messages WHERE created_at < NOW() - INTERVAL '60 days'`
      );
      await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [msg.name, msg.email, msg.subject, msg.message]
      );
      return;
    } catch {}
  }

  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client
        .from("contact_messages")
        .delete()
        .lt("created_at", cutoffIso);
      await client.from("contact_messages").insert({
        name: msg.name,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
      });
    } catch {}
  }
}

export async function pushPhoneLogToSupabase(
  log: PhoneAccessLog
): Promise<void> {
  const cutoffIso = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();

  const pool = getPgPool();
  if (pool) {
    try {
      await initSupabaseTablesIfPostgres();
      await pool.query(
        `DELETE FROM phone_access_logs WHERE created_at < NOW() - INTERVAL '60 days'`
      );
      await pool.query(
        `INSERT INTO phone_access_logs (viewer_name, viewer_email, company, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          log.viewer_name,
          log.viewer_email,
          log.company || "",
          log.ip_address || "",
          log.user_agent || "",
        ]
      );
      return;
    } catch {}
  }

  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client
        .from("phone_access_logs")
        .delete()
        .lt("created_at", cutoffIso);
      await client.from("phone_access_logs").insert({
        viewer_name: log.viewer_name,
        viewer_email: log.viewer_email,
        company: log.company || "",
        ip_address: log.ip_address || "",
        user_agent: log.user_agent || "",
      });
    } catch {}
  }
}

export async function pullContactsFromSupabase(): Promise<ContactSubmission[] | null> {
  const cutoffIso = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();
  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client
        .from("contact_messages")
        .delete()
        .lt("created_at", cutoffIso);
      const { data, error } = await client
        .from("contact_messages")
        .select("id, name, email, subject, message, created_at")
        .order("id", { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        return data as ContactSubmission[];
      }
    } catch {}
  }
  return null;
}

export async function deleteContactFromSupabase(id: number): Promise<void> {
  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client.from("contact_messages").delete().eq("id", Number(id));
    } catch {}
  }
}

export async function pullPhoneLogsFromSupabase(): Promise<PhoneAccessLog[] | null> {
  const cutoffIso = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000
  ).toISOString();
  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client
        .from("phone_access_logs")
        .delete()
        .lt("created_at", cutoffIso);
      const { data, error } = await client
        .from("phone_access_logs")
        .select("id, viewer_name, viewer_email, company, ip_address, user_agent, created_at")
        .order("id", { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data)) {
        return data as PhoneAccessLog[];
      }
    } catch {}
  }
  return null;
}

export async function deletePhoneLogFromSupabase(id: number): Promise<void> {
  const client = getSupabaseRestClient();
  if (client) {
    try {
      await client.from("phone_access_logs").delete().eq("id", Number(id));
    } catch {}
  }
}
