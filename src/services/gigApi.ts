import type { GigData } from '../types/gig.ts';

export type GigWritePayload = Omit<GigData, 'publicId' | 'updatedAt'>;

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errorMessage = fallbackMessage;
    let errBody: { error?: string; current?: GigData } | undefined;
    try {
      errBody = (await res.json()) as { error?: string; current?: GigData };
      if (errBody?.error) {
        errorMessage = errBody.error;
      }
    } catch {
      // Ignore JSON parse errors on non-JSON error responses
    }
    throw new ApiError(errorMessage, res.status, errBody);
  }
  return (await res.json()) as T;
}

export async function fetchPublicGig(publicId: string): Promise<GigData> {
  const res = await fetch(`/api/gigs/public/${encodeURIComponent(publicId)}`);
  return handleJsonResponse<GigData>(res, 'Kunde inte hämta körschemat.');
}

export async function fetchAdminGig(adminToken: string): Promise<GigData> {
  const res = await fetch(`/api/gigs/admin/${encodeURIComponent(adminToken)}`);
  return handleJsonResponse<GigData>(
    res,
    'Kunde inte ladda administratörslänken. Kontrollera att länken är komplett.'
  );
}

export async function saveGigToServer(
  payload: GigWritePayload,
  adminToken?: string,
  expectedUpdatedAt?: string
): Promise<GigData> {
  const isUpdate = Boolean(adminToken);
  const endpoint = isUpdate
    ? `/api/gigs/admin/${encodeURIComponent(adminToken!)}`
    : '/api/gigs';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isUpdate && expectedUpdatedAt) {
    headers['If-Match'] = `"${expectedUpdatedAt}"`;
  }

  const res = await fetch(endpoint, {
    method: isUpdate ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<GigData>(res, 'Kunde inte spara körschemat.');
}

export async function deleteGigOnServer(adminToken: string): Promise<void> {
  const res = await fetch(`/api/gigs/admin/${encodeURIComponent(adminToken)}`, {
    method: 'DELETE',
  });
  await handleJsonResponse<{ success: boolean }>(res, 'Kunde inte radera körschemat.');
}
