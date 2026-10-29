import type { GigData } from '../types/gig.ts';

const PUBLIC_CACHE_PREFIX = 'gigbladet_public_cache_';
const ADMIN_DRAFT_PREFIX = 'gigbladet_admin_draft_';
const RECENT_GIGS_KEY = 'gigbladet_recent_gigs';

export interface RecentGigEntry {
  publicId: string;
  adminToken?: string;
  title: string;
  ensemble: string;
  date: string;
  venue: string;
  lastVisitedAt: string;
}

export function savePublicGigCache(gig: GigData): void {
  try {
    localStorage.setItem(`${PUBLIC_CACHE_PREFIX}${gig.publicId}`, JSON.stringify(gig));
    recordRecentGig({
      publicId: gig.publicId,
      adminToken: gig.adminToken,
      title: gig.title,
      ensemble: gig.ensemble,
      date: gig.date,
      venue: gig.venue,
      lastVisitedAt: new Date().toISOString(),
    });
  } catch {
    // Ignore storage quota errors
  }
}

export function loadPublicGigCache(publicId: string): GigData | null {
  try {
    const raw = localStorage.getItem(`${PUBLIC_CACHE_PREFIX}${publicId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GigData;
  } catch {
    return null;
  }
}

export function saveAdminDraft(key: string, data: Omit<GigData, 'publicId' | 'updatedAt'>): void {
  try {
    localStorage.setItem(
      `${ADMIN_DRAFT_PREFIX}${key}`,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        data,
      })
    );
  } catch {
    // Ignore quota errors
  }
}

export function loadAdminDraft(
  key: string
): { savedAt: string; data: Omit<GigData, 'publicId' | 'updatedAt'> } | null {
  try {
    const raw = localStorage.getItem(`${ADMIN_DRAFT_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAdminDraft(key: string): void {
  try {
    localStorage.removeItem(`${ADMIN_DRAFT_PREFIX}${key}`);
  } catch {
    // Ignore
  }
}

export function recordRecentGig(entry: RecentGigEntry): void {
  try {
    const existing = getRecentGigs();
    const prev = existing.find((e) => e.publicId === entry.publicId);
    const merged: RecentGigEntry = {
      ...entry,
      adminToken: entry.adminToken || prev?.adminToken,
    };
    const filtered = existing.filter((e) => e.publicId !== entry.publicId);
    const updated = [merged, ...filtered].slice(0, 12);
    localStorage.setItem(RECENT_GIGS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function getRecentGigs(): RecentGigEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_GIGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
