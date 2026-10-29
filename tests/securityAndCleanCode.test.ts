import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidIdentifier,
  validateAndSanitizeGigInput,
} from '../server/validation.ts';
import {
  createGig,
  getGigByAdminToken,
  getGigByPublicId,
  updateGigByAdminToken,
} from '../server/db.ts';
import { generateGigCalendarIcs } from '../src/utils/calendar.ts';
import { evaluateSchedule } from '../src/utils/time.ts';
import { GIG_PRESETS } from '../src/data/presets.ts';
import { securityHeadersMiddleware } from '../server/securityHeaders.ts';
import type { Request, Response } from 'express';

describe('Security & Validation (server/validation.ts)', () => {
  it('rejects missing title or non-object payloads', () => {
    assert.equal(validateAndSanitizeGigInput(null).valid, false);
    assert.equal(validateAndSanitizeGigInput([]).valid, false);
    assert.equal(validateAndSanitizeGigInput({ title: '   ' }).valid, false);
  });

  it('sanitizes control characters, unknown fields, and invalid hex colors', () => {
    const result = validateAndSanitizeGigInput({
      title: 'Konsert\u0000MedNullByte',
      maliciousExtraField: 'should-be-dropped',
      date: 'not-a-date',
      schedule: [
        {
          id: 'bad id with spaces!',
          time: '99:99',
          title: 'Soundcheck',
        },
      ],
      contacts: [
        {
          id: 'c1',
          name: 'Ljud-Erik',
          role: 'Tekniker',
          phone: 'javascript:alert(1)070-123 45 67',
        },
      ],
      backstage: {
        dressCodeColors: [
          {
            id: 'clr1',
            name: 'Guld',
            hex: 'red; background:url(evil)',
          },
        ],
      },
    });

    assert.equal(result.valid, true);
    assert.ok(result.data);
    assert.equal(result.data.title, 'KonsertMedNullByte');
    assert.equal('maliciousExtraField' in result.data, false);
    assert.match(result.data.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(result.data.schedule[0].id, 'sch-1');
    assert.equal(result.data.schedule[0].time, '18:00');
    assert.equal(result.data.contacts[0].phone, '(1)070-123 45 67');
    assert.equal(result.data.backstage.dressCodeColors[0].hex, '#18181B');
  });

  it('validates identifiers against injection and path traversal', () => {
    assert.equal(isValidIdentifier('demo-soul'), true);
    assert.equal(isValidIdentifier('adm_AbCdEf123_-'), true);
    assert.equal(isValidIdentifier('../etc/passwd'), false);
    assert.equal(isValidIdentifier('id with spaces'), false);
    assert.equal(isValidIdentifier(''), false);
    assert.equal(isValidIdentifier('a'.repeat(100)), false);
  });

  it('filters out empty schedule items, contacts, colors, and songs', () => {
    const result = validateAndSanitizeGigInput({
      title: 'Minimalistiskt Gig',
      schedule: [{ id: 'sch-1', time: '18:00', title: '   ' }],
      contacts: [{ id: 'cnt-1', name: '', role: 'Ljud', phone: '' }],
      backstage: {
        dressCodeColors: [{ id: 'clr-1', name: '  ', hex: '#000000' }],
      },
      setlistEnabled: true,
      setlist: [{ id: 'sng-1', title: '   ', key: 'Cm', tempo: '120', soloistOrNotes: '' }],
    });

    assert.equal(result.valid, true);
    assert.ok(result.data);
    assert.equal(result.data.schedule.length, 0);
    assert.equal(result.data.contacts.length, 0);
    assert.equal(result.data.backstage.dressCodeColors.length, 0);
    assert.equal(result.data.setlist.length, 0);
  });
});

describe('Database & Admin Token Security (server/db.ts)', () => {
  it('never exposes adminToken in public gig queries', () => {
    const publicDemo = getGigByPublicId('demo-soul');
    assert.ok(publicDemo);
    assert.equal(publicDemo.adminToken, undefined);
  });

  it('creates gigs with high-entropy adminToken and updates reflected on public view', () => {
    const validated = validateAndSanitizeGigInput(GIG_PRESETS[0].defaultData);
    assert.ok(validated.data);

    const created = createGig(validated.data);
    assert.ok(created.publicId);
    assert.ok(created.adminToken);
    assert.ok(created.adminToken.startsWith('adm_'));
    assert.ok(created.adminToken.length >= 24);

    // Wrong token must return null
    assert.equal(getGigByAdminToken(`${created.adminToken}x`), null);

    // Valid token updates the gig
    const updated = updateGigByAdminToken(created.adminToken, {
      ...validated.data,
      title: 'Säkerhetsuppdaterat Gig',
    });
    assert.equal(updated?.title, 'Säkerhetsuppdaterat Gig');

    const publicView = getGigByPublicId(created.publicId);
    assert.equal(publicView?.title, 'Säkerhetsuppdaterat Gig');
    assert.equal(publicView?.adminToken, undefined);
  });
});

describe('iCalendar (.ics) Injection Protection (src/utils/calendar.ts)', () => {
  it('escapes CRLF newlines so attackers cannot inject arbitrary ICS properties', () => {
    const baseGig = getGigByPublicId('demo-soul')!;
    const maliciousGig = {
      ...baseGig,
      title: 'Vanlig titel\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nEND:VALARM',
    };

    const ics = generateGigCalendarIcs(maliciousGig, 'https://gigbladet.se');
    const rawLines = ics.split('\r\n');
    assert.equal(rawLines.includes('BEGIN:VALARM'), false);
  });
});

describe('HTTP Security Headers (server/securityHeaders.ts)', () => {
  it('sets strict CSP, Referrer-Policy: no-referrer, and frame protection', () => {
    const headers = new Map<string, string>();
    const mockRes = {
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
    } as unknown as Response;

    let nextCalled = false;
    securityHeadersMiddleware({} as Request, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.ok(headers.get('Content-Security-Policy')?.includes("default-src 'self'"));
  });
});

describe('Schedule & Live-puls Evaluation (src/utils/time.ts)', () => {
  it('computes live_now and countdown_today accurately', () => {
    const demo = getGigByPublicId('demo-soul')!;

    // At 15:30 -> 30 min before 16:00 Load-in
    const beforeCall = new Date('2026-10-29T15:30:00');
    const resBefore = evaluateSchedule(demo.schedule, demo.date, beforeCall, true);
    assert.equal(resBefore.pulse.mode, 'countdown_today');
    assert.match(resBefore.pulse.headline, /om 30 min/);

    // At 20:15 -> During Set 1 (20:00–20:50)
    const duringSet1 = new Date('2026-10-29T20:15:00');
    const resDuring = evaluateSchedule(demo.schedule, demo.date, duringSet1, true);
    assert.equal(resDuring.pulse.mode, 'live_now');
    assert.equal(resDuring.pulse.currentItem?.title, 'Set 1 (Konsertstart)');
  });
});
