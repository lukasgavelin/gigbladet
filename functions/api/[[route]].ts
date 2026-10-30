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

export async function onRequest(context: EventContext): Promise<Response> {
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Ogiltig JSON-data.' }, 400);
    }

    const validation = validateAndSanitizeGigInput(body);
    if (!validation.valid || !validation.data) {
      return jsonResponse({ error: validation.error || 'Ogiltig indata.' }, 400);
    }

    const publicId = await createUniquePublicId(env.DB, validation.data.title || validation.data.ensemble || 'gig');
    const adminToken = generateAdminToken();
    const now = new Date().toISOString();

    const storedData: GigData = {
      ...validation.data,
      publicId,
      updatedAt: now,
    };

    await env.DB.prepare(
      'INSERT INTO gigs (public_id, admin_token, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(publicId, adminToken, JSON.stringify(storedData), now, now)
      .run();

    return jsonResponse({ ...storedData, adminToken }, 201);
  }

  // Route: PUT /api/gigs/admin/:adminToken
  if (method === 'PUT' && route.length === 3 && route[0] === 'gigs' && route[1] === 'admin') {
    const adminToken = route[2];
    if (!isValidIdentifier(adminToken, 80)) {
      return jsonResponse({ error: 'Ogiltig administratörslänk.' }, 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Ogiltig JSON-data.' }, 400);
    }

    const validation = validateAndSanitizeGigInput(body);
    if (!validation.valid || !validation.data) {
      return jsonResponse({ error: validation.error || 'Ogiltig indata.' }, 400);
    }

    const row = await env.DB.prepare(
      'SELECT public_id, admin_token FROM gigs WHERE admin_token = ?'
    )
      .bind(adminToken)
      .first<{ public_id: string; admin_token: string }>();

    if (!row || !timingSafeMatch(row.admin_token, adminToken)) {
      return jsonResponse({ error: 'Kunde inte hitta gigget för denna administratörslänk.' }, 404);
    }

    const now = new Date().toISOString();
    const updatedData: GigData = {
      ...validation.data,
      publicId: row.public_id,
      updatedAt: now,
    };

    await env.DB.prepare('UPDATE gigs SET data_json = ?, updated_at = ? WHERE admin_token = ?')
      .bind(JSON.stringify(updatedData), now, adminToken)
      .run();

    return jsonResponse({ ...updatedData, adminToken });
  }

  return jsonResponse({ error: 'Endpoint hittades inte.' }, 404);
}
