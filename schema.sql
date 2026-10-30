-- Cloudflare D1 Schema for GigBladet
-- Execute with: wrangler d1 execute gigbladet-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS gigs (
  public_id TEXT PRIMARY KEY,
  admin_token TEXT UNIQUE NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gigs_admin_token ON gigs(admin_token);
