import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { GigData } from '../src/types/gig.ts';
import { DEMO_GIG_SOUL, DEMO_GIG_CHOIR, getTodayDateString } from '../src/data/demoData.ts';
import { isValidIdentifier, type SanitizedGigInput } from './validation.ts';

const DB_TARGET = process.env.GIGBLADET_DB_PATH;
const isMemory = DB_TARGET === ':memory:';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!isMemory && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

const DB_PATH = isMemory ? ':memory:' : (DB_TARGET || path.join(DATA_DIR, 'gigbladet.db'));
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS gigs (
    public_id TEXT PRIMARY KEY,
    admin_token TEXT UNIQUE NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_gigs_admin_token ON gigs(admin_token);
  CREATE INDEX IF NOT EXISTS idx_gigs_expires_at ON gigs(expires_at);
`);

try {
  db.exec('ALTER TABLE gigs ADD COLUMN expires_at TEXT;');
} catch {
  // Column already exists
}

interface GigRow {
  public_id: string;
  admin_token?: string;
  data_json: string;
  updated_at: string;
  expires_at?: string | null;
}

const MAX_SLUG_ATTEMPTS = 5;

function createUniquePublicId(title: string): string {
  const slugBase = title
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18);

  const checkStmt = db.prepare('SELECT 1 FROM gigs WHERE public_id = ?');

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const rand = crypto.randomBytes(4).toString('hex');
    const candidate = slugBase ? `${slugBase}-${rand}` : `gig-${rand}`;
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }

  return `gig-${crypto.randomBytes(8).toString('hex')}`;
}

function generateAdminToken(): string {
  // 144 bits of cryptographic entropy, URL-safe
  return `adm_${crypto.randomBytes(18).toString('base64url')}`;
}

function safeParseGigJson(jsonStr: string): GigData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as GigData;
  } catch {
    return null;
  }
}

function timingSafeStringMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function seedDemoGigs(): void {
  const now = new Date().toISOString();

  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO gigs (public_id, admin_token, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  );

  const soulGig: GigData = {
    ...DEMO_GIG_SOUL,
    date: getTodayDateString(),
    publicId: 'demo-soul',
    updatedAt: now,
  };
  insertStmt.run('demo-soul', 'adm_demo_soul_secret', JSON.stringify(soulGig), now, now);

  const choirGig: GigData = {
    ...DEMO_GIG_CHOIR,
    date: getTodayDateString(),
    publicId: 'demo-kor',
    updatedAt: now,
  };
  insertStmt.run('demo-kor', 'adm_demo_kor_secret', JSON.stringify(choirGig), now, now);
}

seedDemoGigs();

export function getGigByPublicId(publicId: string): GigData | null {
  if (!isValidIdentifier(publicId, 64)) return null;

  const row = db
    .prepare('SELECT public_id, data_json, updated_at FROM gigs WHERE public_id = ?')
    .get(publicId) as GigRow | undefined;

  if (!row) return null;
  const parsed = safeParseGigJson(row.data_json);
  if (!parsed) return null;

  // Never expose adminToken on public queries
  const { adminToken: _omit, ...publicSafeData } = parsed;
  return {
    ...publicSafeData,
    publicId: row.public_id,
    updatedAt: row.updated_at,
  };
}

export function getGigByAdminToken(adminToken: string): GigData | null {
  if (!isValidIdentifier(adminToken, 80)) return null;

  const row = db
    .prepare('SELECT public_id, admin_token, data_json, updated_at FROM gigs WHERE admin_token = ?')
    .get(adminToken) as GigRow | undefined;

  if (!row || !row.admin_token || !timingSafeStringMatch(row.admin_token, adminToken)) {
    return null;
  }

  const parsed = safeParseGigJson(row.data_json);
  if (!parsed) return null;

  return {
    ...parsed,
    publicId: row.public_id,
    adminToken: row.admin_token,
    updatedAt: row.updated_at,
  };
}

export function calculateExpiresAt(gigDate?: string, now = new Date()): string {
  if (gigDate && /^\d{4}-\d{2}-\d{2}$/.test(gigDate.trim())) {
    const [y, m, d] = gigDate.trim().split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(date.getTime())) {
      date.setUTCDate(date.getUTCDate() + 60);
      return date.toISOString().slice(0, 10);
    }
  }
  const fallback = new Date(now.getTime());
  fallback.setUTCDate(fallback.getUTCDate() + 180);
  return fallback.toISOString().slice(0, 10);
}

export function purgeExpiredGigs(now = new Date()): number {
  const nowIso = now.toISOString().slice(0, 10);
  const info = db
    .prepare('DELETE FROM gigs WHERE expires_at IS NOT NULL AND expires_at < ?')
    .run(nowIso);
  return Number(info.changes);
}

export function createGig(input: SanitizedGigInput): GigData {
  const publicId = createUniquePublicId(input.title || input.ensemble || 'gig');
  const adminToken = generateAdminToken();
  const now = new Date().toISOString();
  const expiresAt = calculateExpiresAt(input.date);

  const storedData: GigData = {
    ...input,
    publicId,
    updatedAt: now,
  };

  db.prepare(
    'INSERT INTO gigs (public_id, admin_token, data_json, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(publicId, adminToken, JSON.stringify(storedData), now, now, expiresAt);

  return {
    ...storedData,
    adminToken,
  };
}

export function updateGigByAdminToken(
  adminToken: string,
  input: SanitizedGigInput,
  expectedUpdatedAt?: string
): (GigData & { conflict?: false }) | { conflict: true; current: GigData } | null {
  const existing = getGigByAdminToken(adminToken);
  if (!existing) return null;

  if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) {
    return { conflict: true, current: existing };
  }

  const now = new Date().toISOString();
  const expiresAt = calculateExpiresAt(input.date);
  const updatedData: GigData = {
    ...input,
    publicId: existing.publicId,
    updatedAt: now,
  };

  db.prepare(
    'UPDATE gigs SET data_json = ?, updated_at = ?, expires_at = ? WHERE admin_token = ?'
  ).run(JSON.stringify(updatedData), now, expiresAt, adminToken);

  return {
    ...updatedData,
    adminToken,
  };
}

export function deleteGigByAdminToken(adminToken: string): boolean {
  if (!isValidIdentifier(adminToken, 80)) return false;
  const existing = getGigByAdminToken(adminToken);
  if (!existing) return false;

  const info = db.prepare('DELETE FROM gigs WHERE admin_token = ?').run(adminToken);
  return Number(info.changes) > 0;
}
