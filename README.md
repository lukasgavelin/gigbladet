# GigBladet – Det friktionsfria körschemat för musiker och ensembler

GigBladet samlar hålltider, live-puls, kontaktpersoner, portkoder, Wi-Fi, klädkod och setlist på en enda mobiloptimerad länk – helt utan kontotvång eller appinstallation.

## Kom igång

```bash
# Starta utvecklingsmiljö (Vite på port 5173 + Express/SQLite API på port 3001)
npm run dev

# Bygg för produktion och starta servern (port 3001)
npm run build
npm start
```

## Nyckelfunktioner
- **Musiker-vy (`/g/:publicId`):** Mörkt backstage-tema, live-puls baserat på enhetens klocka, 1-klicksknappar för karta, kalenderfil (`.ics`) och telefonsamtal (`tel:`), kopieringsknappar för portkod/Wi-Fi, klädkod med färgcirklar, utfällbar setlist med visuell tempoblink samt full offline-cachning (`localStorage` + Service Worker).
- **Skapar- & Administratörsvy (`/ny` & `/edit/:adminToken`):** Skapa körschema direkt från tre färdiga mallar (*Vokalensemble / Kör*, *Band / Klubbspelning*, *Akustiskt / Event*), sortera och flytta hållpunkter, felsäker utkastlagring vid svajigt nätverk och tydligt dela-läge med separat läslänk och hemlig redigeringslänk.
