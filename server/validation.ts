import type {
  BackstageInfo,
  ContactPerson,
  DressCodeColor,
  GigData,
  ScheduleItem,
  SetlistItem,
} from '../src/types/gig.ts';

export type SanitizedGigInput = Omit<GigData, 'publicId' | 'adminToken' | 'updatedAt'>;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: SanitizedGigInput;
}

const LIMITS = {
  TITLE_MAX: 140,
  ENSEMBLE_MAX: 140,
  VENUE_MAX: 140,
  ADDRESS_MAX: 240,
  NOTES_MAX: 600,
  SCHEDULE_MAX_ITEMS: 60,
  SCHEDULE_TITLE_MAX: 140,
  SCHEDULE_DESC_MAX: 400,
  SCHEDULE_LOC_MAX: 120,
  CONTACTS_MAX_ITEMS: 20,
  CONTACT_NAME_MAX: 100,
  CONTACT_ROLE_MAX: 100,
  CONTACT_PHONE_MAX: 40,
  DOOR_CODE_MAX: 60,
  GREEN_ROOM_MAX: 160,
  WIFI_NAME_MAX: 100,
  WIFI_PASS_MAX: 120,
  DRESS_TEXT_MAX: 400,
  DRESS_COLORS_MAX: 12,
  COLOR_NAME_MAX: 50,
  FOOD_INFO_MAX: 500,
  PARKING_INFO_MAX: 500,
  SETLIST_MAX_ITEMS: 100,
  SONG_TITLE_MAX: 140,
  SONG_KEY_MAX: 20,
  SONG_TEMPO_MAX: 40,
  SONG_NOTES_MAX: 300,
  SONG_HEADER_MAX: 80,
  ID_MAX: 64,
} as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  // Remove null bytes and control characters except newline/tab
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return cleaned.slice(0, maxLength);
}

function sanitizeId(value: unknown, fallbackPrefix: string, index: number): string {
  if (typeof value === 'string' && SAFE_ID_REGEX.test(value)) {
    return value.slice(0, LIMITS.ID_MAX);
  }
  return `${fallbackPrefix}-${index + 1}`;
}

function sanitizeTime(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return TIME_REGEX.test(trimmed) ? trimmed : '';
}

function sanitizeDate(value: unknown): string {
  if (typeof value === 'string' && DATE_REGEX.test(value.trim())) {
    return value.trim();
  }
  return new Date().toISOString().slice(0, 10);
}

function sanitizeHexColor(value: unknown): string {
  if (typeof value === 'string' && HEX_COLOR_REGEX.test(value.trim())) {
    return value.trim();
  }
  return '#18181B';
}

function sanitizeSchedule(raw: unknown): ScheduleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, LIMITS.SCHEDULE_MAX_ITEMS)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: sanitizeId(item.id, 'sch', idx),
      time: sanitizeTime(item.time) || '18:00',
      endTime: sanitizeTime(item.endTime) || undefined,
      title: sanitizeString(item.title, LIMITS.SCHEDULE_TITLE_MAX),
      description: sanitizeString(item.description, LIMITS.SCHEDULE_DESC_MAX) || undefined,
      location: sanitizeString(item.location, LIMITS.SCHEDULE_LOC_MAX) || undefined,
      highlight: Boolean(item.highlight),
    }))
    .filter((item) => item.title.length > 0);
}

function sanitizeContacts(raw: unknown): ContactPerson[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, LIMITS.CONTACTS_MAX_ITEMS)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: sanitizeId(item.id, 'cnt', idx),
      name: sanitizeString(item.name, LIMITS.CONTACT_NAME_MAX),
      role: sanitizeString(item.role, LIMITS.CONTACT_ROLE_MAX),
      phone: sanitizeString(item.phone, LIMITS.CONTACT_PHONE_MAX).replace(/[^\d+\s()-]/g, ''),
    }))
    .filter((c) => c.name.length > 0 || c.phone.length > 0);
}

function sanitizeDressColors(raw: unknown): DressCodeColor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, LIMITS.DRESS_COLORS_MAX)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: sanitizeId(item.id, 'clr', idx),
      name: sanitizeString(item.name, LIMITS.COLOR_NAME_MAX),
      hex: sanitizeHexColor(item.hex),
    }))
    .filter((c) => c.name.length > 0);
}

function sanitizeBackstage(raw: unknown): BackstageInfo {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    doorCode: sanitizeString(obj.doorCode, LIMITS.DOOR_CODE_MAX),
    greenRoom: sanitizeString(obj.greenRoom, LIMITS.GREEN_ROOM_MAX),
    wifiName: sanitizeString(obj.wifiName, LIMITS.WIFI_NAME_MAX),
    wifiPassword: sanitizeString(obj.wifiPassword, LIMITS.WIFI_PASS_MAX),
    dressCodeText: sanitizeString(obj.dressCodeText, LIMITS.DRESS_TEXT_MAX),
    dressCodeColors: sanitizeDressColors(obj.dressCodeColors),
    foodInfo: sanitizeString(obj.foodInfo, LIMITS.FOOD_INFO_MAX),
    parkingInfo: sanitizeString(obj.parkingInfo, LIMITS.PARKING_INFO_MAX),
  };
}

function sanitizeSetlist(raw: unknown): SetlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, LIMITS.SETLIST_MAX_ITEMS)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: sanitizeId(item.id, 'sng', idx),
      title: sanitizeString(item.title, LIMITS.SONG_TITLE_MAX),
      key: sanitizeString(item.key, LIMITS.SONG_KEY_MAX),
      tempo: sanitizeString(item.tempo, LIMITS.SONG_TEMPO_MAX),
      soloistOrNotes: sanitizeString(item.soloistOrNotes, LIMITS.SONG_NOTES_MAX),
      setHeader: sanitizeString(item.setHeader, LIMITS.SONG_HEADER_MAX) || undefined,
    }))
    .filter((song) => song.title.length > 0);
}

export function validateAndSanitizeGigInput(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Ogiltigt dataformat.' };
  }

  const body = payload as Record<string, unknown>;
  const title = sanitizeString(body.title, LIMITS.TITLE_MAX);

  if (!title) {
    return { valid: false, error: 'Evenemangets namn krävs.' };
  }

  const data: SanitizedGigInput = {
    title,
    ensemble: sanitizeString(body.ensemble, LIMITS.ENSEMBLE_MAX),
    date: sanitizeDate(body.date),
    venue: sanitizeString(body.venue, LIMITS.VENUE_MAX),
    address: sanitizeString(body.address, LIMITS.ADDRESS_MAX),
    generalNotes: sanitizeString(body.generalNotes, LIMITS.NOTES_MAX),
    schedule: sanitizeSchedule(body.schedule),
    contacts: sanitizeContacts(body.contacts),
    backstage: sanitizeBackstage(body.backstage),
    setlistEnabled: Boolean(body.setlistEnabled),
    setlist: sanitizeSetlist(body.setlist),
  };

  return { valid: true, data };
}

export function isValidIdentifier(value: unknown, maxLen = 80): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLen &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}
