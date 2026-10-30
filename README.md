# GigBladet – Det friktionsfria körschemat för musiker och ensembler

GigBladet samlar hålltider, live-puls, kontaktpersoner, portkoder, Wi-Fi, klädkod och setlist på en enda mobiloptimerad länk – helt utan kontotvång eller appinstallation.

## Kom igång lokalt

```bash
# Starta utvecklingsmiljö (Vite på port 5173 + Express/SQLite API på port 3001)
npm run dev

# Bygg för produktion och starta servern (port 3001)
npm run build
npm start
```

## Distribuera till Cloudflare Pages

GigBladet är förberett för fullstack-distribution på **Cloudflare Pages** med **Cloudflare D1** (serverlös SQLite).

### 1. Skapa D1-databas i Cloudflare
Kör i terminalen (eller via Cloudflares dashboard):
```bash
npx wrangler d1 create gigbladet-db
```
Kopiera `database_id` som skrivs ut och klistra in i [`wrangler.toml`](file:///home/lukas/repos/gig/wrangler.toml).

### 2. Applicera databasschemat
```bash
npx wrangler d1 execute gigbladet-db --remote --file=./schema.sql
```

### 3. Koppla repot till Cloudflare Pages
1. Gå till [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Compute (Workers) & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Välj detta Git-repo.
3. Bygginställningar:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Under fliken **Settings** > **Functions** > **D1 database bindings**:
   - Skapa en bindning med variabelnamn: `DB`
   - Välj din skapade D1-databas (`gigbladet-db`).
5. Spara och deploya! Din app har nu global CDN-distribution och serverlös databas med noll driftkostnad.

## Nyckelfunktioner
- **Musiker-vy (`/g/:publicId`):** Mörkt backstage-tema, live-puls baserat på enhetens klocka, 1-klicksknappar för karta, kalenderfil (`.ics`) och telefonsamtal (`tel:`), kopieringsknappar för portkod/Wi-Fi, klädkod med färgcirklar, utfällbar setlist med visuell tempoblink samt full offline-cachning (`localStorage` + Service Worker).
- **Skapar- & Administratörsvy (`/ny` & `/edit/:adminToken`):** Skapa körschema direkt i ett rent och intuitivt formulär, sortera och flytta hållpunkter, felsäker utkastlagring vid svajigt nätverk och tydligt dela-läge med separat läslänk och hemlig redigeringslänk. För att testa appen finns ett demoläge med färdig exempeldata (*Soul & Brass Night* och *Höstkonsert*).
