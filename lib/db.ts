import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  defaultPortfolioData,
  type PortfolioPayload,
} from "@/data/portfolio";
import { regenerateA4ResumePdf } from "@/lib/generateResumePdf";
import {
  isSupabaseConfigured,
  pushContactToSupabase,
  pushPhoneLogToSupabase,
  pushPortfolioToSupabase,
} from "@/lib/supabase";

const REPO_DATA_DIR = path.join(process.cwd(), "data");
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_DATA_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), "apsara-portfolio-data")
  : REPO_DATA_DIR;
const JSON_PATH = path.join(REPO_DATA_DIR, "portfolio.json");
const RUNTIME_JSON_PATH = path.join(RUNTIME_DATA_DIR, "portfolio.json");
const DB_PATH = path.join(RUNTIME_DATA_DIR, "portfolio.db");
const DATA_DIR = RUNTIME_DATA_DIR;

// 60-Day Data Retention Policy for contact_messages and phone_access_logs
const RETENTION_DAYS = 60;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getRetentionCutoffIso(): string {
  return new Date(Date.now() - RETENTION_MS).toISOString();
}

function isWithinRetentionWindow(createdAt?: string): boolean {
  if (!createdAt) return true;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts <= RETENTION_MS;
}

export interface ContactSubmission {
  id?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at?: string;
}

export interface PhoneAccessLog {
  id?: number;
  viewer_name: string;
  viewer_email: string;
  company?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function readJsonFileSafe(): { data: PortfolioPayload; raw: string; hash: string } {
  try {
    if (IS_VERCEL && fs.existsSync(RUNTIME_JSON_PATH)) {
      const raw = fs.readFileSync(RUNTIME_JSON_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PortfolioPayload;
      return { data: parsed, raw, hash: computeHash(raw) };
    }
    if (!fs.existsSync(JSON_PATH)) {
      const raw = JSON.stringify(defaultPortfolioData, null, 2);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(RUNTIME_JSON_PATH, raw, "utf-8");
      return { data: defaultPortfolioData, raw, hash: computeHash(raw) };
    }
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PortfolioPayload;
    return { data: parsed, raw, hash: computeHash(raw) };
  } catch (err) {
    console.error("Failed reading portfolio.json, falling back to default:", err);
    const raw = JSON.stringify(defaultPortfolioData, null, 2);
    return { data: defaultPortfolioData, raw, hash: computeHash(raw) };
  }
}

function writeJsonFileSafe(payload: PortfolioPayload): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const raw = JSON.stringify(payload, null, 2);
  const targetPath = IS_VERCEL ? RUNTIME_JSON_PATH : JSON_PATH;
  fs.writeFileSync(targetPath, raw, "utf-8");
  return computeHash(raw);
}

// Dynamically load Node's built-in node:sqlite (Node 22.5+) so builds never fail even on older runtimes
function openSqliteDb(): any | null {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // Use dynamic require so webpack does not attempt to bundle built-in node:sqlite
    const dynamicRequire = eval("require");
    const sqlite = dynamicRequire("node:sqlite");
    const db = new sqlite.DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json_hash TEXT NOT NULL,
        last_synced_at TEXT NOT NULL,
        sync_direction TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio_sections (
        section_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects_table (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS skills_table (
        group_name TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS experience_table (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        company TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS phone_access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        viewer_name TEXT NOT NULL,
        viewer_email TEXT NOT NULL,
        company TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_otps (
        email TEXT PRIMARY KEY,
        viewer_name TEXT NOT NULL,
        company TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    return db;
  } catch (err) {
    console.warn("SQLite unavailable, running in JSON-only fallback mode:", err);
    return null;
  }
}

function writePayloadToSqlite(
  db: any,
  payload: PortfolioPayload,
  jsonHash: string,
  direction: "json->db" | "db->json" | "api->both"
) {
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    const upsertSection = db.prepare(`
      INSERT INTO portfolio_sections (section_key, payload_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(section_key) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `);

    upsertSection.run("profile", JSON.stringify(payload.profile), now);
    upsertSection.run("stackHighlights", JSON.stringify(payload.stackHighlights), now);
    upsertSection.run("architecture", JSON.stringify(payload.architecture), now);
    upsertSection.run("githubRepos", JSON.stringify(payload.githubRepos), now);
    upsertSection.run("education", JSON.stringify(payload.education), now);

    db.exec("DELETE FROM projects_table");
    const insertProject = db.prepare(`
      INSERT INTO projects_table (id, name, kind, payload_json, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    payload.projects.forEach((proj, idx) => {
      insertProject.run(
        proj.id || `proj-${idx}`,
        proj.name,
        proj.kind,
        JSON.stringify(proj),
        idx
      );
    });

    db.exec("DELETE FROM skills_table");
    const insertSkill = db.prepare(`
      INSERT INTO skills_table (group_name, payload_json, sort_order)
      VALUES (?, ?, ?)
    `);
    payload.skills.forEach((sk, idx) => {
      insertSkill.run(sk.group, JSON.stringify(sk), idx);
    });

    db.exec("DELETE FROM experience_table");
    const insertExp = db.prepare(`
      INSERT INTO experience_table (id, role, company, payload_json, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    payload.experience.forEach((exp, idx) => {
      insertExp.run(
        exp.id || `exp-${idx}`,
        exp.role,
        exp.company,
        JSON.stringify(exp),
        idx
      );
    });

    const upsertMeta = db.prepare(`
      INSERT INTO sync_meta (id, json_hash, last_synced_at, sync_direction)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        json_hash = excluded.json_hash,
        last_synced_at = excluded.last_synced_at,
        sync_direction = excluded.sync_direction
    `);
    upsertMeta.run(jsonHash, now, direction);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function readPayloadFromSqlite(db: any): PortfolioPayload | null {
  try {
    const sections = db
      .prepare("SELECT section_key, payload_json FROM portfolio_sections")
      .all() as Array<{ section_key: string; payload_json: string }>;

    if (!sections || sections.length === 0) return null;

    const sectionMap: Record<string, any> = {};
    for (const row of sections) {
      sectionMap[row.section_key] = JSON.parse(row.payload_json);
    }

    const projectRows = db
      .prepare("SELECT payload_json FROM projects_table ORDER BY sort_order ASC")
      .all() as Array<{ payload_json: string }>;

    const skillRows = db
      .prepare("SELECT payload_json FROM skills_table ORDER BY sort_order ASC")
      .all() as Array<{ payload_json: string }>;

    const expRows = db
      .prepare("SELECT payload_json FROM experience_table ORDER BY sort_order ASC")
      .all() as Array<{ payload_json: string }>;

    const metaRow = db
      .prepare("SELECT last_synced_at, sync_direction FROM sync_meta WHERE id = 1")
      .get() as { last_synced_at: string; sync_direction: string } | undefined;

    const contactCountRow = db
      .prepare("SELECT COUNT(*) as count FROM contact_messages")
      .get() as { count: number } | undefined;

    return {
      meta: {
        lastSyncedAt: metaRow?.last_synced_at || new Date().toISOString(),
        syncSource: `SQLite (portfolio.db) ↔ JSON (${metaRow?.sync_direction || "synced"})`,
        version: 2,
        dbStatus: "Connected • SQLite + JSON In Sync",
        contactCount: contactCountRow?.count ?? 0,
      },
      profile: sectionMap.profile || defaultPortfolioData.profile,
      stackHighlights:
        sectionMap.stackHighlights || defaultPortfolioData.stackHighlights,
      architecture:
        sectionMap.architecture || defaultPortfolioData.architecture,
      projects:
        projectRows.length > 0
          ? projectRows.map((r) => JSON.parse(r.payload_json))
          : defaultPortfolioData.projects,
      experience:
        expRows.length > 0
          ? expRows.map((r) => JSON.parse(r.payload_json))
          : defaultPortfolioData.experience,
      skills:
        skillRows.length > 0
          ? skillRows.map((r) => JSON.parse(r.payload_json))
          : defaultPortfolioData.skills,
      githubRepos:
        sectionMap.githubRepos || defaultPortfolioData.githubRepos,
      education: sectionMap.education || defaultPortfolioData.education,
    };
  } catch (err) {
    console.error("Error reading from SQLite:", err);
    return null;
  }
}

/**
 * Bi-Directional Sync Getter:
 * 1. Reads data/portfolio.json and computes its SHA-256 hash.
 * 2. Checks data/portfolio.db sync_meta table.
 * 3. If portfolio.json was edited directly on disk (hash mismatch) or DB is empty,
 *    automatically syncs portfolio.json -> portfolio.db!
 * 4. Returns the structured portfolio data from SQLite along with live sync telemetry.
 */
export function getSyncedPortfolioData(): PortfolioPayload {
  const { data: jsonData, hash: currentJsonHash } = readJsonFileSafe();
  const db = openSqliteDb();

  if (!db) {
    return {
      ...jsonData,
      meta: {
        lastSyncedAt: new Date().toISOString(),
        syncSource: "JSON Direct (data/portfolio.json)",
        version: 2,
        dbStatus: "JSON Mode Active",
        contactCount: 0,
      },
    };
  }

  try {
    const meta = db
      .prepare("SELECT json_hash FROM sync_meta WHERE id = 1")
      .get() as { json_hash: string } | undefined;

    if (!meta || meta.json_hash !== currentJsonHash) {
      // JSON file on disk is newer or DB is uninitialized -> Sync JSON to SQLite DB
      writePayloadToSqlite(db, jsonData, currentJsonHash, "json->db");
    }

    const fromDb = readPayloadFromSqlite(db);
    db.close();
    return fromDb || jsonData;
  } catch (err) {
    console.error("Sync check failed, returning JSON payload:", err);
    try {
      db.close();
    } catch {}
    return jsonData;
  }
}

/**
 * Bi-Directional Update:
 * Writes updated portfolio data simultaneously to BOTH data/portfolio.json AND data/portfolio.db!
 */
export function updatePortfolioDataBoth(
  partialOrFull: Partial<PortfolioPayload>
): PortfolioPayload {
  const current = getSyncedPortfolioData();
  const now = new Date().toISOString();

  const merged: PortfolioPayload = {
    meta: {
      lastSyncedAt: now,
      syncSource: "Bi-Directional Sync (DB + JSON Updated)",
      version: (current.meta?.version || 2) + 1,
      dbStatus: "Connected • SQLite + JSON In Sync",
    },
    profile: partialOrFull.profile
      ? { ...current.profile, ...partialOrFull.profile }
      : current.profile,
    stackHighlights:
      partialOrFull.stackHighlights || current.stackHighlights,
    architecture: partialOrFull.architecture
      ? { ...current.architecture, ...partialOrFull.architecture }
      : current.architecture,
    projects: partialOrFull.projects || current.projects,
    experience: partialOrFull.experience || current.experience,
    skills: partialOrFull.skills || current.skills,
    githubRepos: partialOrFull.githubRepos || current.githubRepos,
    education: partialOrFull.education || current.education,
  };

  // 1. Update data/portfolio.json on disk
  const newHash = writeJsonFileSafe(merged);

  // 1b. Regenerate full-page A4 PDF (public/Apsara_R_Resume.pdf) asynchronously
  try {
    regenerateA4ResumePdf(merged);
  } catch {}

  // 1c. Push to Supabase Cloud DB asynchronously if configured
  if (isSupabaseConfigured().configured) {
    pushPortfolioToSupabase(merged).catch((err) => {
      console.warn("Supabase background sync warning:", err);
    });
  }

  // 2. Update data/portfolio.db in SQLite
  const db = openSqliteDb();
  if (db) {
    try {
      writePayloadToSqlite(db, merged, newHash, "api->both");
      const refreshed = readPayloadFromSqlite(db);
      db.close();
      if (refreshed) return refreshed;
    } catch (err) {
      console.error("Failed updating SQLite DB:", err);
      try {
        db.close();
      } catch {}
    }
  }

  return merged;
}

/**
 * Force Sync Action:
 * Direction 'json-to-db': Reads data/portfolio.json from disk and overwrites data/portfolio.db
 * Direction 'db-to-json': Reads data/portfolio.db and writes formatted JSON to data/portfolio.json
 */
export function forceSyncPortfolio(
  direction: "json-to-db" | "db-to-json" = "json-to-db"
): PortfolioPayload {
  const db = openSqliteDb();
  if (!db) {
    return getSyncedPortfolioData();
  }

  try {
    if (direction === "db-to-json") {
      const dbPayload = readPayloadFromSqlite(db);
      if (dbPayload) {
        const hash = writeJsonFileSafe(dbPayload);
        writePayloadToSqlite(db, dbPayload, hash, "db->json");
        const finalData = readPayloadFromSqlite(db);
        db.close();
        return finalData || dbPayload;
      }
    }

    // Default: json-to-db
    const { data: jsonData, hash } = readJsonFileSafe();
    writePayloadToSqlite(db, jsonData, hash, "json->db");
    const finalData = readPayloadFromSqlite(db);
    db.close();
    return finalData || jsonData;
  } catch (err) {
    try {
      db.close();
    } catch {}
    throw err;
  }
}

/**
 * Save a Contact Message into SQLite (data/portfolio.db) AND data/contact_messages.json
 */
export function saveContactMessage(msg: ContactSubmission): {
  saved: ContactSubmission;
  totalMessages: number;
} {
  const now = new Date().toISOString();
  const cutoffIso = getRetentionCutoffIso();
  const contactJsonPath = path.join(DATA_DIR, "contact_messages.json");

  let existingList: ContactSubmission[] = [];
  try {
    if (fs.existsSync(contactJsonPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(contactJsonPath, "utf-8")
      ) as ContactSubmission[];
      existingList = parsed.filter((item) =>
        isWithinRetentionWindow(item.created_at)
      );
    }
  } catch {}

  const record: ContactSubmission = {
    id: Date.now(),
    name: msg.name.trim(),
    email: msg.email.trim(),
    subject: msg.subject.trim() || "Portfolio Inquiry",
    message: msg.message.trim(),
    created_at: now,
  };

  existingList.unshift(record);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    contactJsonPath,
    JSON.stringify(existingList, null, 2),
    "utf-8"
  );

  const db = openSqliteDb();
  let total = existingList.length;
  if (db) {
    try {
      db.prepare("DELETE FROM contact_messages WHERE created_at < ?").run(
        cutoffIso
      );
      const stmt = db.prepare(`
        INSERT INTO contact_messages (name, email, subject, message, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        record.name,
        record.email,
        record.subject,
        record.message,
        now
      );
      const row = db
        .prepare("SELECT COUNT(*) as count FROM contact_messages")
        .get() as { count: number } | undefined;
      if (row) total = row.count;
      db.close();
    } catch (err) {
      console.error("Failed saving contact message to SQLite:", err);
      try {
        db.close();
      } catch {}
    }
  }

  if (isSupabaseConfigured().configured) {
    pushContactToSupabase(record).catch(() => {});
  }

  return { saved: record, totalMessages: total };
}

export function getContactMessages(): ContactSubmission[] {
  const cutoffIso = getRetentionCutoffIso();
  const contactJsonPath = path.join(DATA_DIR, "contact_messages.json");
  try {
    if (fs.existsSync(contactJsonPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(contactJsonPath, "utf-8")
      ) as ContactSubmission[];
      const fresh = parsed.filter((item) =>
        isWithinRetentionWindow(item.created_at)
      );
      if (fresh.length !== parsed.length) {
        fs.writeFileSync(
          contactJsonPath,
          JSON.stringify(fresh, null, 2),
          "utf-8"
        );
      }
    }
  } catch {}

  const db = openSqliteDb();
  if (db) {
    try {
      db.prepare("DELETE FROM contact_messages WHERE created_at < ?").run(
        cutoffIso
      );
      const rows = db
        .prepare(
          "SELECT id, name, email, subject, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 50"
        )
        .all() as ContactSubmission[];
      db.close();
      if (rows.length > 0) return rows;
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  try {
    if (fs.existsSync(contactJsonPath)) {
      return JSON.parse(fs.readFileSync(contactJsonPath, "utf-8"));
    }
  } catch {}
  return [];
}

export function deleteContactMessage(id: number): ContactSubmission[] {
  const contactJsonPath = path.join(DATA_DIR, "contact_messages.json");
  try {
    if (fs.existsSync(contactJsonPath)) {
      const list = JSON.parse(
        fs.readFileSync(contactJsonPath, "utf-8")
      ) as ContactSubmission[];
      const filtered = list.filter((item) => Number(item.id) !== Number(id));
      fs.writeFileSync(
        contactJsonPath,
        JSON.stringify(filtered, null, 2),
        "utf-8"
      );
    }
  } catch {}

  const db = openSqliteDb();
  if (db) {
    try {
      db.prepare("DELETE FROM contact_messages WHERE id = ?").run(Number(id));
      db.close();
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  return getContactMessages();
}

export function savePhoneAccessLog(entry: PhoneAccessLog): {
  saved: PhoneAccessLog;
  totalViews: number;
} {
  const now = new Date().toISOString();
  const cutoffIso = getRetentionCutoffIso();
  const phoneJsonPath = path.join(DATA_DIR, "phone_access_logs.json");

  let existingList: PhoneAccessLog[] = [];
  try {
    if (fs.existsSync(phoneJsonPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(phoneJsonPath, "utf-8")
      ) as PhoneAccessLog[];
      existingList = parsed.filter((item) =>
        isWithinRetentionWindow(item.created_at)
      );
    }
  } catch {}

  const record: PhoneAccessLog = {
    id: Date.now(),
    viewer_name: entry.viewer_name.trim(),
    viewer_email: entry.viewer_email.trim(),
    company: (entry.company || "").trim(),
    ip_address: entry.ip_address || "Local / Direct",
    user_agent: entry.user_agent || "Browser",
    created_at: now,
  };

  existingList.unshift(record);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    phoneJsonPath,
    JSON.stringify(existingList, null, 2),
    "utf-8"
  );

  const db = openSqliteDb();
  let total = existingList.length;
  if (db) {
    try {
      db.prepare("DELETE FROM phone_access_logs WHERE created_at < ?").run(
        cutoffIso
      );
      const stmt = db.prepare(`
        INSERT INTO phone_access_logs (viewer_name, viewer_email, company, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        record.viewer_name,
        record.viewer_email,
        record.company || "",
        record.ip_address || "",
        record.user_agent || "",
        now
      );
      const row = db
        .prepare("SELECT COUNT(*) as count FROM phone_access_logs")
        .get() as { count: number } | undefined;
      if (row) total = row.count;
      db.close();
    } catch (err) {
      console.error("Failed saving phone access log to SQLite:", err);
      try {
        db.close();
      } catch {}
    }
  }

  if (isSupabaseConfigured().configured) {
    pushPhoneLogToSupabase(record).catch(() => {});
  }

  return { saved: record, totalViews: total };
}

export function getPhoneAccessLogs(): PhoneAccessLog[] {
  const cutoffIso = getRetentionCutoffIso();
  const phoneJsonPath = path.join(DATA_DIR, "phone_access_logs.json");
  try {
    if (fs.existsSync(phoneJsonPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(phoneJsonPath, "utf-8")
      ) as PhoneAccessLog[];
      const fresh = parsed.filter((item) =>
        isWithinRetentionWindow(item.created_at)
      );
      if (fresh.length !== parsed.length) {
        fs.writeFileSync(
          phoneJsonPath,
          JSON.stringify(fresh, null, 2),
          "utf-8"
        );
      }
    }
  } catch {}

  const db = openSqliteDb();
  if (db) {
    try {
      db.prepare("DELETE FROM phone_access_logs WHERE created_at < ?").run(
        cutoffIso
      );
      const rows = db
        .prepare(
          "SELECT id, viewer_name, viewer_email, company, ip_address, user_agent, created_at FROM phone_access_logs ORDER BY id DESC LIMIT 100"
        )
        .all() as PhoneAccessLog[];
      db.close();
      if (rows.length > 0) return rows;
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  try {
    if (fs.existsSync(phoneJsonPath)) {
      return JSON.parse(fs.readFileSync(phoneJsonPath, "utf-8"));
    }
  } catch {}
  return [];
}

export function deletePhoneAccessLog(id: number): PhoneAccessLog[] {
  const phoneJsonPath = path.join(DATA_DIR, "phone_access_logs.json");
  try {
    if (fs.existsSync(phoneJsonPath)) {
      const list = JSON.parse(
        fs.readFileSync(phoneJsonPath, "utf-8")
      ) as PhoneAccessLog[];
      const filtered = list.filter((item) => Number(item.id) !== Number(id));
      fs.writeFileSync(
        phoneJsonPath,
        JSON.stringify(filtered, null, 2),
        "utf-8"
      );
    }
  } catch {}

  const db = openSqliteDb();
  if (db) {
    try {
      db.prepare("DELETE FROM phone_access_logs WHERE id = ?").run(Number(id));
      db.close();
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  return getPhoneAccessLogs();
}

export function createEmailOtp(input: {
  viewer_name: string;
  viewer_email: string;
  company?: string;
}): string {
  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const cleanEmail = input.viewer_email.trim().toLowerCase();
  const cleanName = input.viewer_name.trim();
  const cleanCompany = (input.company || "").trim();

  const otpJsonPath = path.join(DATA_DIR, "active_otps.json");
  let otpMap: Record<
    string,
    {
      viewer_name: string;
      company: string;
      otp_code: string;
      expires_at: number;
    }
  > = {};
  try {
    if (fs.existsSync(otpJsonPath)) {
      otpMap = JSON.parse(fs.readFileSync(otpJsonPath, "utf-8"));
    }
  } catch {}

  otpMap[cleanEmail] = {
    viewer_name: cleanName,
    company: cleanCompany,
    otp_code: otp,
    expires_at: expiresAt,
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(otpJsonPath, JSON.stringify(otpMap, null, 2), "utf-8");

  const db = openSqliteDb();
  if (db) {
    try {
      db.prepare(
        `
        INSERT INTO email_otps (email, viewer_name, company, otp_code, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          viewer_name = excluded.viewer_name,
          company = excluded.company,
          otp_code = excluded.otp_code,
          expires_at = excluded.expires_at
      `
      ).run(cleanEmail, cleanName, cleanCompany, otp, expiresAt);
      db.close();
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  return otp;
}

export function verifyEmailOtp(
  viewerEmail: string,
  otpCode: string
): {
  valid: boolean;
  viewer_name?: string;
  company?: string;
  reason?: string;
} {
  const cleanEmail = viewerEmail.trim().toLowerCase();
  const cleanCode = otpCode.trim();

  let record:
    | {
        viewer_name: string;
        company: string;
        otp_code: string;
        expires_at: number;
      }
    | undefined;

  const db = openSqliteDb();
  if (db) {
    try {
      record = db
        .prepare(
          "SELECT viewer_name, company, otp_code, expires_at FROM email_otps WHERE email = ?"
        )
        .get(cleanEmail) as any;
      db.close();
    } catch {
      try {
        db.close();
      } catch {}
    }
  }

  if (!record) {
    const otpJsonPath = path.join(DATA_DIR, "active_otps.json");
    try {
      if (fs.existsSync(otpJsonPath)) {
        const otpMap = JSON.parse(fs.readFileSync(otpJsonPath, "utf-8"));
        record = otpMap[cleanEmail];
      }
    } catch {}
  }

  if (!record) {
    return {
      valid: false,
      reason: "No OTP request found for this email. Please request a new OTP.",
    };
  }

  if (Date.now() > Number(record.expires_at)) {
    return {
      valid: false,
      reason: "This OTP has expired (10-minute limit). Please request a new OTP.",
    };
  }

  if (String(record.otp_code) !== cleanCode) {
    return {
      valid: false,
      reason: "Invalid 6-digit OTP code. Please check your email and try again.",
    };
  }

  // Delete consumed OTP
  const dbCleanup = openSqliteDb();
  if (dbCleanup) {
    try {
      dbCleanup
        .prepare("DELETE FROM email_otps WHERE email = ?")
        .run(cleanEmail);
      dbCleanup.close();
    } catch {
      try {
        dbCleanup.close();
      } catch {}
    }
  }

  return {
    valid: true,
    viewer_name: record.viewer_name,
    company: record.company,
  };
}
