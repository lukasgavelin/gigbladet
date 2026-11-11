import type { GigData } from '../../src/types/gig.ts';
import { DEMO_GIG_CHOIR, DEMO_GIG_SOUL, getTodayDateString } from '../../src/data/demoData.ts';
import { isValidIdentifier, validateAndSanitizeGigInput, type SanitizedGigInput } from '../../server/validation.ts';

interface Env {
  DB?: D1Database;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

interface GigRow {
  public_id: string;
  admin_token?: string;
  data_json: string;
  updated_at: string;
}

interface EventContext {
  request: Request;
  env: Env;
  params: {
    route?: string[];
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function jsonResponse(data: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      ...SECURITY_HEADERS,
    },
  });
}

function getRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateAdminToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return 'adm_' + btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createUniquePublicId(db: D1Database, title: string): Promise<string> {
  const slugBase = title
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18);

  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = getRandomHex(4);
    const candidate = slugBase ? `${slugBase}-${rand}` : `gig-${rand}`;
    const existing = await db
      .prepare('SELECT 1 FROM gigs WHERE public_id = ?')
      .bind(candidate)
      .first();
    if (!existing) {
      return candidate;
    }
  }

  return `gig-${getRandomHex(8)}`;
}

function calculateExpiresAt(gigDate?: string, now = new Date()): string {
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

function timingSafeMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
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

async function readSafeJsonBody(
  request: Request,
  maxBytes = 100 * 1024
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const cl = request.headers.get('content-length');
  if (cl && parseInt(cl, 10) > maxBytes) {
    return {
      ok: false,
      response: jsonResponse({ error: 'För stort anrop (max 100 KB).' }, 413),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: 'Kunde inte läsa förfrågan.' }, 400),
    };
  }

  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: jsonResponse({ error: 'För stort anrop (max 100 KB).' }, 413),
    };
  }

  try {
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: 'Ogiltig JSON-data.' }, 400),
    };
  }
}

async function handleRequest(context: EventContext): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const route = params.route || [];
  const method = request.method.toUpperCase();

  // Route: /api/health
  if (route.length === 1 && route[0] === 'health') {
    return jsonResponse({
      status: 'ok',
      time: new Date().toISOString(),
      databaseConnected: Boolean(env.DB),
    });
  }

  // Handle demo gig fallback if DB is not yet populated
  if (method === 'GET' && route.length === 3 && route[0] === 'gigs' && route[1] === 'public') {
    const publicId = route[2];
    if (publicId === 'demo-soul' || publicId === 'demo-kor') {
      const demoData = publicId === 'demo-soul' ? DEMO_GIG_SOUL : DEMO_GIG_CHOIR;
      // Check if DB has an updated version first
      if (env.DB) {
        const row = await env.DB.prepare(
          'SELECT public_id, data_json, updated_at FROM gigs WHERE public_id = ?'
        )
          .bind(publicId)
          .first<GigRow>();
        if (row) {
          const parsed = safeParseGigJson(row.data_json);
          if (parsed) {
            const { adminToken: _omit, ...safe } = parsed;
            return jsonResponse({ ...safe, publicId: row.public_id, updatedAt: row.updated_at }, 200, 'no-cache');
          }
        }
      }
      return jsonResponse(
        {
          ...demoData,
          publicId,
          date: getTodayDateString(),
          updatedAt: new Date().toISOString(),
        },
        200,
        'no-cache'
      );
    }
  }

  // Ensure DB is bound for real operations
  if (!env.DB) {
    return jsonResponse(
      {
        error:
          "Cloudflare D1-databasen är inte kopplad. Lägg till en D1-bindning med namnet 'DB' i Cloudflare Pages inställningar.",
      },
      503
    );
  }

  // Route: GET /api/gigs/public/:publicId
  if (method === 'GET' && route.length === 3 && route[0] === 'gigs' && route[1] === 'public') {
    const publicId = route[2];
    if (!isValidIdentifier(publicId, 64)) {
      return jsonResponse({ error: 'Ogiltigt körschema-ID.' }, 400);
    }

    const row = await env.DB.prepare(
      'SELECT public_id, data_json, updated_at FROM gigs WHERE public_id = ?'
    )
      .bind(publicId)
      .first<GigRow>();

    if (!row) {
      return jsonResponse({ error: 'Körschemat hittades inte.' }, 404);
    }

    const parsed = safeParseGigJson(row.data_json);
    if (!parsed) {
      return jsonResponse({ error: 'Kunde inte läsa körschemat.' }, 500);
    }

    const { adminToken: _omit, ...publicSafeData } = parsed;
    return jsonResponse(
      {
        ...publicSafeData,
        publicId: row.public_id,
        updatedAt: row.updated_at,
      },
      200,
      'no-cache'
    );
  }

  // Route: GET /api/gigs/admin/:adminToken
  if (method === 'GET' && route.length === 3 && route[0] === 'gigs' && route[1] === 'admin') {
    const adminToken = route[2];
    if (!isValidIdentifier(adminToken, 80)) {
      return jsonResponse({ error: 'Ogiltigt format på administratörslänk.' }, 400);
    }

    const row = await env.DB.prepare(
      'SELECT public_id, admin_token, data_json, updated_at FROM gigs WHERE admin_token = ?'
    )
      .bind(adminToken)
      .first<GigRow>();

    if (!row || !row.admin_token || !timingSafeMatch(row.admin_token, adminToken)) {
      return jsonResponse({ error: 'Ogiltig administratörslänk eller så har gigget tagits bort.' }, 404);
    }

    const parsed = safeParseGigJson(row.data_json);
    if (!parsed) {
      return jsonResponse({ error: 'Kunde inte läsa körschemat.' }, 500);
    }

    return jsonResponse({
      ...parsed,
      publicId: row.public_id,
      adminToken: row.admin_token,
      updatedAt: row.updated_at,
    });
  }

  // Route: POST /api/gigs
  if (method === 'POST' && route.length === 1 && route[0] === 'gigs') {
    const parseRes = await readSafeJsonBody(request);
    if (!parseRes.ok) {
      return parseRes.response;
    }

    const validation = validateAndSanitizeGigInput(parseRes.data);
    if (!validation.valid || !validation.data) {
      return jsonResponse({ error: validation.error || 'Ogiltig indata.' }, 400);
    }

    const publicId = await createUniquePublicId(env.DB, validation.data.title || validation.data.ensemble || 'gig');
    const adminToken = generateAdminToken();
    const now = new Date().toISOString();
    const expiresAt = calculateExpiresAt(validation.data.date);

    const storedData: GigData = {
      ...validation.data,
      publicId,
      updatedAt: now,
    };

    await env.DB.prepare(
      'INSERT INTO gigs (public_id, admin_token, data_json, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(publicId, adminToken, JSON.stringify(storedData), now, now, expiresAt)
      .run();

    return jsonResponse({ ...storedData, adminToken }, 201);
  }

  // Route: PUT /api/gigs/admin/:adminToken
  if (method === 'PUT' && route.length === 3 && route[0] === 'gigs' && route[1] === 'admin') {
    const adminToken = route[2];
    if (!isValidIdentifier(adminToken, 80)) {
      return jsonResponse({ error: 'Ogiltig administratörslänk.' }, 400);
    }

    const parseRes = await readSafeJsonBody(request);
    if (!parseRes.ok) {
      return parseRes.response;
    }

    const validation = validateAndSanitizeGigInput(parseRes.data);
    if (!validation.valid || !validation.data) {
      return jsonResponse({ error: validation.error || 'Ogiltig indata.' }, 400);
    }

    const ifMatch = request.headers.get('if-match');
    const expectedUpdatedAt = ifMatch ? ifMatch.replace(/^"|"$/g, '').trim() : undefined;

    const row = await env.DB.prepare(
      'SELECT public_id, admin_token, data_json, updated_at FROM gigs WHERE admin_token = ?'
    )
      .bind(adminToken)
      .first<{ public_id: string; admin_token: string; data_json: string; updated_at: string }>();

    if (!row || !timingSafeMatch(row.admin_token, adminToken)) {
      return jsonResponse({ error: 'Kunde inte hitta gigget för denna administratörslänk.' }, 404);
    }

    if (expectedUpdatedAt && row.updated_at !== expectedUpdatedAt) {
      const current = safeParseGigJson(row.data_json);
      return jsonResponse(
        {
          error: 'Körschemat har uppdaterats av någon annan sedan du öppnade det.',
          current: current ? { ...current, publicId: row.public_id, updatedAt: row.updated_at } : undefined,
        },
        409
      );
    }

    const now = new Date().toISOString();
    const expiresAt = calculateExpiresAt(validation.data.date);
    const updatedData: GigData = {
      ...validation.data,
      publicId: row.public_id,
      updatedAt: now,
    };

    await env.DB.prepare('UPDATE gigs SET data_json = ?, updated_at = ?, expires_at = ? WHERE admin_token = ?')
      .bind(JSON.stringify(updatedData), now, expiresAt, adminToken)
      .run();

    return jsonResponse({ ...updatedData, adminToken });
  }

  // Route: DELETE /api/gigs/admin/:adminToken
  if (method === 'DELETE' && route.length === 3 && route[0] === 'gigs' && route[1] === 'admin') {
    const adminToken = route[2];
    if (!isValidIdentifier(adminToken, 80)) {
      return jsonResponse({ error: 'Ogiltig administratörslänk.' }, 400);
    }

    const row = await env.DB.prepare(
      'SELECT public_id, admin_token FROM gigs WHERE admin_token = ?'
    )
      .bind(adminToken)
      .first<{ public_id: string; admin_token: string }>();

    if (!row || !timingSafeMatch(row.admin_token, adminToken)) {
      return jsonResponse({ error: 'Kunde inte hitta gigget för denna administratörslänk.' }, 404);
    }

    await env.DB.prepare('DELETE FROM gigs WHERE admin_token = ?').bind(adminToken).run();
    return jsonResponse({ success: true, message: 'Körschemat har raderats permanent.' });
  }

  return jsonResponse({ error: 'Endpoint hittades inte.' }, 404);
}

export async function onRequest(context: EventContext): Promise<Response> {
  try {
    return await handleRequest(context);
  } catch (err) {
    console.error('Unhandled Pages Function error:', err);
    return jsonResponse({ error: 'Ett internt serverfel uppstod. Försök igen om en stund.' }, 500);
  }
}
