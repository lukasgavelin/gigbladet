# GigBladet – Det friktionsfria körschemat för musiker och ensembler

GigBladet samlar hålltider, live-puls, kontaktpersoner, portkoder, Wi-Fi, klädkod och setlist på en enda mobiloptimerad länk – helt utan kontotvång eller appinstallation.

---

## 🌟 Nyckelfunktioner

- **Musiker-vy (`/g/:publicId`):**
  - Live-puls i realtid (*PÅGÅR NU*, *NÄSTA OM X MIN*, nedräkning).
  - Tidsreglage ("Testa tid") för att simulera speldagens hållpunkter.
  - 1-klicksknappar för Google Maps-vägbeskrivning, `.ics`-kalenderfil och telefonsamtal (`tel:`).
  - 1-klickskopiering för portkod och Wi-Fi-lösenord med tydlig statusindikator.
  - Klädkod med färgprover (hexkoder) och textuell instruktion.
  - Setlist med tonarter, solistnoteringar och visuell tempoblink (ljudlös BPM-metronom).
  - Fullt offline-stöd via Service Worker och `localStorage` – fungerar nere i logen även utan mobiltäckning.
  - Växla sömlöst mellan ljust och mörkt tema (ljust är förvalt).

- **Skapar- och administratörsvy (`/ny` & `/edit/:adminToken`):**
  - Startar i ett rent, tomt formulär utan malltvång.
  - Kronologisk tidssortering, flytta rader upp/ner och markera hållpunkter (stjärna/highlight).
  - Automatisk utkastlagring lokalt i webbläsaren om nätverket svajar under redigering.
  - Tydlig delningsmodal med separat läslänk för musiker och hemlig administratörslänk för arrangören.

- **Demoläge:**
  - Förberedda exempelgig på `/g/demo-soul` (*Soul & Brass Night*) och `/g/demo-kor` (*Höstkonsert: Nordiskt Ljus*) för att snabbt kunna testa och visa appens gränssnitt.

---

## 🔒 Integritet, säkerhet & dataåtkomst

Ett av GigBladets viktigaste designmål är att minimera datainsamling och friktion:

1. **Inga konton, lösenord eller spårning:**
   - Inga e-postadresser, användarnamn, lösenord eller sessionskakor sparas någonsin.
   - Inga analysverktyg från tredje part eller reklamspårare.
2. **Olistade och svårgissade länkar:**
   - Det finns inget publikt register eller sökfunktion för skapade gig. Endast den som har den specifika länken (`/g/:publicId`) kan se körschemat.
3. **Kryptografisk redigeringsnyckel:**
   - Körschemat kan endast ändras av den som har administratörslänken med hemlig `adminToken` (144 bitars kryptografisk entropi). Redigeringsnyckeln exponeras aldrig i den publika musikervyn eller i publika API-svar.
4. **Vem kan se datan i databasen?**
   - **Andra användare:** Kan **inte** se dina gig om du inte delar länken med dem.
   - **Den som driftar databasen:** Informationen (tider, portkod, telefonnummer, setlist) lagras som JSON i databasen för att musikerna ska kunna nå länken från vilken mobil som helst. Den som äger driftskontot (t.ex. Cloudflare D1-kontot) har teknisk access till själva databasfilen. 
   - *Tips:* Om din ensemble har strikta sekretesskrav kan du med fördel driftsätta en egen helt privat instans med stegen nedan – appen är 100 % öppen källkod.

---

## 🛠️ Teknisk arkitektur

GigBladet är byggt som en hybridapplikation med stöd för både serverlös distribution på edge och lokal utveckling:

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Vite 6.
- **Produktionsmiljö (Serverless Edge):**
  - **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/) med global CDN.
  - **Edge API:** Cloudflare Pages Functions (`functions/api/[[route]].ts`) som körs i Cloudflares globala V8-runtime.
  - **Databas:** [Cloudflare D1](https://developers.cloudflare.com/d1/) – serverlös SQLite med transaktioner och noll kallstarter.
- **Lokal utvecklingsmiljö:**
  - Express 4 som körs via Node.js med `--experimental-strip-types` och inbyggd `node:sqlite` (`data/gigbladet.db`).

---

## 🚀 Kom igång lokalt

För att köra appen lokalt på din dator eller Raspberry Pi:

```bash
# 1. Klona repot och installera beroenden
git clone git@github.com:lukasgavelin/gigbladet.git
cd gigbladet
npm install

# 2. Starta lokal utvecklingsmiljö (Vite på port 5173 + Express API på port 3001)
npm run dev

# 3. Kör typtestning och säkerhetstester
npm run typecheck
npm test

# 4. Bygg för produktion
npm run build
```

---

## ☁️ Distribuera till Cloudflare Pages med D1

Appen är förberedd för fullstack-distribution på **Cloudflare Pages** med **Cloudflare D1**:

1. **Skapa en D1-databas i Cloudflare:**
   - I Cloudflare Dashboard: gå till **Storage & Databases** > **D1** > **Create database**. Döp den till `gigbladet-db`.
   - Kopiera ditt **Database ID** (UUID) och klistra in i [`wrangler.toml`](file:///home/lukas/repos/gig/wrangler.toml) under `database_id`.
2. **Kör databasschemat:**
   - Öppna databasens **Console** i Cloudflare Dashboard och kör innehållet i [`schema.sql`](file:///home/lukas/repos/gig/schema.sql) (eller kör `npm run d1:migrate:remote`).
3. **Koppla repot till Cloudflare Pages:**
   - Gå till **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   - Bygginställningar:
     - **Framework preset:** `Vite`
     - **Build command:** `npm run build`
     - **Build output directory:** `dist`
4. Klart! Cloudflare bygger och driftsätter automatiskt din app vid varje push till `main`.
