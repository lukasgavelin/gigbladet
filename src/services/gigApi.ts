import type { GigData } from '../types/gig.ts';

export type GigWritePayload = Omit<GigData, 'publicId' | 'updatedAt'>;

async function handleJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errorMessage = fallbackMessage;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) {
        errorMessage = errBody.error;
      }
    } catch {
      // Ignore JSON parse errors on non-JSON error responses
    }
    throw new Error(errorMessage);
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
  adminToken?: string
): Promise<GigData> {
  const isUpdate = Boolean(adminToken);
  const endpoint = isUpdate
    ? `/api/gigs/admin/${encodeURIComponent(adminToken!)}`
    : '/api/gigs';

  const res = await fetch(endpoint, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<GigData>(res, 'Kunde inte spara körschemat.');
}
