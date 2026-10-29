import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getGigByPublicId,
  getGigByAdminToken,
  createGig,
  updateGigByAdminToken,
} from './db.ts';
import { isValidIdentifier, validateAndSanitizeGigInput } from './validation.ts';
import { createRateLimiter } from './rateLimit.ts';
import { securityHeadersMiddleware } from './securityHeaders.ts';

export const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.disable('x-powered-by');
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '100kb', strict: true }));

const readLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 120,
  message: 'För många anrop. Vänta en stund och försök igen.',
});

const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  message: 'För många sparförsök. Vänta en minut och försök igen.',
});

// Health check
app.get('/api/health', readLimiter, (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get public gig (Musician view)
app.get('/api/gigs/public/:publicId', readLimiter, (req, res) => {
  const { publicId } = req.params;
  if (!isValidIdentifier(publicId, 64)) {
    res.status(400).json({ error: 'Ogiltigt körschema-ID.' });
    return;
  }

  const gig = getGigByPublicId(publicId);
  if (!gig) {
    res.status(404).json({ error: 'Körschemat hittades inte.' });
    return;
  }

  res.setHeader('Cache-Control', 'no-cache');
  res.json(gig);
});

// Get admin gig (Editor view)
app.get('/api/gigs/admin/:adminToken', readLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { adminToken } = req.params;
  if (!isValidIdentifier(adminToken, 80)) {
    res.status(400).json({ error: 'Ogiltigt format på administratörslänk.' });
    return;
  }

  const gig = getGigByAdminToken(adminToken);
  if (!gig) {
    res.status(404).json({ error: 'Ogiltig administratörslänk eller så har gigget tagits bort.' });
    return;
  }

  res.json(gig);
});

// Create new gig (No account required)
app.post('/api/gigs', writeLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const validation = validateAndSanitizeGigInput(req.body);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error || 'Ogiltig indata.' });
    return;
  }

  try {
    const created = createGig(validation.data);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating gig:', err);
    res.status(500).json({ error: 'Kunde inte spara körschemat.' });
  }
});

// Update existing gig via adminToken
app.put('/api/gigs/admin/:adminToken', writeLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { adminToken } = req.params;
  if (!isValidIdentifier(adminToken, 80)) {
    res.status(400).json({ error: 'Ogiltig administratörslänk.' });
    return;
  }

  const validation = validateAndSanitizeGigInput(req.body);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error || 'Ogiltig indata.' });
    return;
  }

  try {
    const updated = updateGigByAdminToken(adminToken, validation.data);
    if (!updated) {
      res.status(404).json({ error: 'Kunde inte hitta gigget för denna administratörslänk.' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating gig:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera körschemat.' });
  }
});

// Handle malformed JSON payloads cleanly without leaking stack traces
app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (err && (err.status === 400 || err.type === 'entity.parse.failed' || err.type === 'entity.too.large')) {
    res.status(err.status || 400).json({ error: 'Ogiltigt eller för stort anrop.' });
    return;
  }
  next(err);
});

// Serve static build in production
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', readLimiter, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GigBladet API server running on http://localhost:${PORT}`);
  });
}
