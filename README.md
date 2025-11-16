# B2B Lead Generator - Apify Actor

Ein produktionsreifer Apify Actor zur automatisierten Generierung qualifizierter B2B Leads mit Fokus auf Entscheidungsträger in deutschen Unternehmen.

## Features

- **Intelligente Unternehmenssuche**: Findet relevante Unternehmen basierend auf Standort und Branche
- **Entscheidungsträger-Identifikation**: Extrahiert gezielt CEOs, Geschäftsführer, HR-Leiter und weitere Führungskräfte
- **E-Mail-Anreicherung**: Generiert und validiert E-Mail-Adressen basierend auf gängigen Mustern
- **Kontaktdaten-Extraktion**: Sammelt E-Mail-Adressen, Telefonnummern und LinkedIn-Profile
- **Qualitätssicherung**: Validiert Daten, entfernt Duplikate und bewertet Lead-Qualität
- **DSGVO-konform**: Nutzt ausschließlich öffentlich verfügbare Informationen
- **Skalierbar**: Verarbeitet große Datenmengen effizient mit Proxy-Support

## Verwendung

### Input-Parameter

```json
{
  "jobTitles": [
    "Geschäftsführer",
    "CEO",
    "Personalleiter",
    "Head of HR"
  ],
  "locations": [
    "München",
    "Berlin",
    "Hamburg"
  ],
  "maxResults": 100,
  "industries": ["IT", "Consulting"],
  "companySize": "51-200",
  "enrichWithEmail": true
}
```

### Minimale Konfiguration

```json
{
  "jobTitles": ["Geschäftsführer"],
  "locations": ["München"]
}
```

### Input-Felder

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `jobTitles` | Array | Ja | Job-Titel der gesuchten Entscheidungsträger |
| `locations` | Array | Ja | Städte/Regionen für die Suche |
| `maxResults` | Number | Nein | Maximale Anzahl an Leads (Standard: 50, Max: 500) |
| `postalCodes` | Array | Nein | Spezifische PLZ-Bereiche als Filter |
| `industries` | Array | Nein | Branchen-Filter (z.B. IT, Consulting) |
| `companySize` | String | Nein | Unternehmensgröße (1-10, 11-50, 51-200, 201-500, 500+) |
| `searchEngine` | String | Nein | Suchmaschine (google oder bing, Standard: google) |
| `enrichWithEmail` | Boolean | Nein | E-Mail-Anreicherung aktivieren (Standard: true) |
| `proxyConfiguration` | Object | Nein | Apify Proxy Konfiguration |

## Output-Struktur

Jeder Lead wird mit folgenden Feldern gespeichert:

```json
{
  "salutation": "Herr",
  "firstName": "Max",
  "lastName": "Mustermann",
  "company": "Tech Solutions GmbH",
  "location": "München",
  "postalCode": "80331",
  "email": "max.mustermann@tech-solutions.de",
  "phone": "+49891234567",
  "jobTitle": "Geschäftsführer",
  "linkedInUrl": "https://linkedin.com/in/max-mustermann",
  "companyWebsite": "https://tech-solutions.de",
  "dataSource": "Company Website",
  "confidence": "high",
  "scrapedAt": "2025-11-16T10:30:00Z"
}
```

### Confidence Levels

- **high** (80-100 Punkte): E-Mail + Telefon + LinkedIn + Job-Titel vorhanden
- **medium** (50-79 Punkte): Mindestens E-Mail oder Telefon vorhanden
- **low** (0-49 Punkte): Nur Basis-Informationen vorhanden

## Technische Details

### Architektur

```
src/
├── main.js                    # Actor Entry Point
├── scrapers/
│   ├── company-search.js      # Unternehmenssuche über Suchmaschinen
│   └── website.js             # Website-Scraping für Kontakte
├── enrichment/
│   ├── email-finder.js        # E-Mail-Generierung und -Validierung
│   └── data-validator.js      # Datenvalidierung und Qualitätsprüfung
└── utils/
    └── helpers.js             # Hilfsfunktionen
```

### Workflow

1. **Suchphase**: Findet Unternehmen basierend auf Job-Titeln und Standorten
2. **Extraktion**: Scrapt Unternehmenswebsites (Impressum, Team-Seiten, Kontakt)
3. **Anreicherung**: Generiert E-Mail-Adressen nach gängigen Mustern
4. **Validierung**: Prüft Datenqualität und entfernt ungültige Einträge
5. **Deduplizierung**: Entfernt Duplikate basierend auf E-Mail oder Name+Firma
6. **Output**: Speichert Leads im Apify Dataset

### Datenquellen

- **Suchmaschinen**: Google/Bing für Unternehmenssuche
- **Unternehmenswebsites**: Impressum, Team-Seiten, Kontaktseiten
- **E-Mail-Muster**: Generierung nach deutschen Standards

### Rate Limiting & Best Practices

- Nutzt Apify Proxy für zuverlässiges Scraping
- Implementiert Retry-Logik mit exponential backoff
- Respektiert robots.txt
- Begrenzt Requests pro Domain

## Datenschutz & DSGVO

Dieser Actor ist DSGVO-konform und beachtet folgende Prinzipien:

- Nur öffentlich verfügbare Daten werden gesammelt
- Keine Umgehung von Zugangsbeschränkungen
- Transparenz über Datenquellen
- Respektierung von robots.txt und rechtlichen Vorgaben

**Hinweis**: Die Verwendung der generierten Leads für Marketing-Zwecke unterliegt den DSGVO-Bestimmungen. Nutzer sind selbst verantwortlich für die rechtskonforme Verwendung der Daten.

## Export-Optionen

Die generierten Leads können in folgenden Formaten exportiert werden:

- **JSON**: Vollständige Datenstruktur
- **CSV**: Tabellarische Darstellung für Excel
- **Excel**: Formatierte XLSX-Datei

## Statistiken

Nach jedem Lauf wird eine Zusammenfassung mit folgenden Metriken gespeichert:

- Anzahl gefundener Leads
- Leads mit E-Mail-Adresse
- Leads mit Telefonnummer
- Verteilung nach Job-Titel
- Verteilung nach Standort
- Qualitätsverteilung (high/medium/low)

## Lokale Entwicklung

### Installation

```bash
npm install
```

### Lokaler Test

```bash
# Mit Standard-Input
npm start

# Mit eigenem Input
apify run -p
```

### Input-Beispiel erstellen

Erstelle eine Datei `.actor/INPUT.json`:

```json
{
  "jobTitles": ["Geschäftsführer", "CEO"],
  "locations": ["München"],
  "maxResults": 10
}
```

## Deployment auf Apify

1. **Actor auf Apify hochladen**:
   ```bash
   apify push
   ```

2. **Im Apify Store veröffentlichen** (optional)

3. **Per API aufrufen**:
   ```bash
   curl -X POST https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "jobTitles": ["Geschäftsführer"],
       "locations": ["München"],
       "maxResults": 50
     }'
   ```

## Fehlerbehandlung

Der Actor implementiert robuste Fehlerbehandlung:

- **Graceful Degradation**: Fehlende Datenfelder werden mit null gefüllt
- **Retry-Logik**: Fehlgeschlagene Requests werden automatisch wiederholt
- **Detailliertes Logging**: Alle Fehler werden protokolliert
- **Validierung**: Ungültige Inputs werden früh erkannt

## Limitierungen

- **Keine LinkedIn-Scraping**: Direktes LinkedIn-Scraping verstößt gegen deren ToS
- **E-Mail-Verifikation**: Nur Format-Prüfung, keine SMTP-Verifikation
- **Suchmaschinen-Limits**: Rate Limits von Google/Bing können Ergebnisse begrenzen

## Erweiterungsmöglichkeiten

- Integration von E-Mail-Verifikations-APIs (Hunter.io, ZeroBounce)
- XING-Integration für deutschsprachigen Raum
- Unternehmensverzeichnisse (Handelsregister, Northdata)
- Lead-Scoring basierend auf weiteren Kriterien
- CRM-Integration (Salesforce, HubSpot)

## Support

Bei Fragen oder Problemen:

- GitHub Issues: [https://github.com/luki5793-ai/Leads-Test/issues](https://github.com/luki5793-ai/Leads-Test/issues)
- Apify Community Forum

## Lizenz

Apache-2.0

## Disclaimer

Dieser Actor dient der Unterstützung bei der Lead-Generierung. Die Nutzer sind selbst verantwortlich für:

- Die rechtskonforme Verwendung der generierten Daten
- Die Einhaltung der DSGVO bei der Kontaktaufnahme
- Die Respektierung von Opt-out-Wünschen
- Die Beachtung lokaler Datenschutzgesetze

Der Actor sollte ausschließlich für legitime B2B-Marketing-Zwecke verwendet werden.
