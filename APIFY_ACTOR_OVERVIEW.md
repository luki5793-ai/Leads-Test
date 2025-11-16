# B2B Lead Generator - Projekt-Übersicht

## Implementierte Dateien

### Konfiguration
- `.actor/actor.json` - Apify Actor Konfiguration
- `.actor/INPUT_SCHEMA.json` - Input-Schema Definition
- `.actor/INPUT.json` - Beispiel-Input für Tests
- `package.json` - NPM Dependencies
- `Dockerfile` - Container-Konfiguration
- `.gitignore` - Git Ignore Regeln
- `.dockerignore` - Docker Ignore Regeln
- `.env.example` - Umgebungsvariablen Template

### Haupt-Anwendung
- `src/main.js` - Actor Entry Point und Hauptlogik

### Scraper-Module
- `src/scrapers/company-search.js` - Unternehmenssuche via Google/Bing
- `src/scrapers/website.js` - Website-Scraping für Kontakte

### Enrichment-Module
- `src/enrichment/email-finder.js` - E-Mail-Generierung und -Validierung
- `src/enrichment/data-validator.js` - Datenvalidierung und Qualitätsprüfung

### Utilities
- `src/utils/helpers.js` - Hilfsfunktionen

### Dokumentation
- `README.md` - Vollständige Dokumentation

## Features

✅ Unternehmenssuche über Suchmaschinen (Google/Bing)
✅ Website-Scraping (Impressum, Team, Kontakt)
✅ Kontaktdaten-Extraktion (E-Mail, Telefon, LinkedIn)
✅ E-Mail-Generierung nach deutschen Mustern
✅ Datenvalidierung und -bereinigung
✅ Duplikatserkennung
✅ Qualitäts-Scoring (high/medium/low)
✅ DSGVO-konforme Datenverarbeitung
✅ Proxy-Support für skalierbares Scraping
✅ Retry-Logik mit exponential backoff
✅ Detailliertes Logging
✅ Export als JSON/CSV/Excel

## Nächste Schritte

1. Dependencies installieren: `npm install`
2. Lokal testen: `npm start`
3. Auf Apify deployen: `apify push`
4. Optional: E-Mail-Verifikations-APIs integrieren
5. Optional: XING-Integration hinzufügen

## Technologie-Stack

- **Runtime**: Node.js 20
- **Framework**: Apify SDK 3.x
- **Scraping**: Playwright + Cheerio
- **Validierung**: email-validator
- **HTTP**: Axios
