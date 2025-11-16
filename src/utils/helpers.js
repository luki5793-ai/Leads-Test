/**
 * Helper-Funktionen für den B2B Lead Generator
 */

/**
 * Erstellt eine optimierte Suchquery
 * @param {string} jobTitle - Job-Titel
 * @param {string} location - Standort
 * @param {Array} industries - Branchen (optional)
 * @returns {string} Optimierte Suchquery
 */
export function buildSearchQuery(jobTitle, location, industries = []) {
    let query = `"${jobTitle}" ${location} Deutschland`;

    // Branchen hinzufügen wenn vorhanden
    if (industries.length > 0) {
        query += ` (${industries.join(' OR ')})`;
    }

    // Recruiter und Personalvermittler ausschließen
    query += ' -recruiting -personalvermittlung -zeitarbeit -headhunter';

    // Impressum/Kontakt Seiten bevorzugen
    query += ' (impressum OR kontakt OR "über uns")';

    return query;
}

/**
 * Entfernt Duplikate aus Lead-Liste
 * @param {Array} leads - Array von Leads
 * @returns {Array} Array ohne Duplikate
 */
export function deduplicateLeads(leads) {
    const seen = new Set();
    const unique = [];

    for (const lead of leads) {
        // Eindeutiger Key: Email ODER Name+Firma
        const key = lead.email
            ? lead.email.toLowerCase()
            : `${lead.firstName}_${lead.lastName}_${lead.company}`.toLowerCase();

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(lead);
        } else {
            console.log(`⚠️ Duplikat entfernt: ${lead.firstName} ${lead.lastName} (${lead.company})`);
        }
    }

    return unique;
}

/**
 * Verzögerung für Rate Limiting
 * @param {number} ms - Millisekunden
 * @returns {Promise}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gruppiert Array nach Schlüssel
 * @param {Array} array - Array zum Gruppieren
 * @param {string} key - Schlüssel nach dem gruppiert wird
 * @returns {Object} Gruppiertes Objekt
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const value = item[key] || 'Unbekannt';
        result[value] = (result[value] || 0) + 1;
        return result;
    }, {});
}

/**
 * Extrahiert Domain aus URL
 * @param {string} url - URL
 * @returns {string} Domain
 */
export function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return null;
    }
}

/**
 * Normalisiert deutsche Städtenamen
 * @param {string} city - Stadtname
 * @returns {string} Normalisierter Stadtname
 */
export function normalizeCity(city) {
    if (!city) return '';

    // Entferne Präfixe wie "Stadt", "Kreis", etc.
    let normalized = city
        .replace(/^(Stadt|Kreis|Landkreis)\s+/i, '')
        .trim();

    // Großschreibung
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

    return normalized;
}

/**
 * Chunked Array Processing
 * @param {Array} array - Array zum Verarbeiten
 * @param {number} chunkSize - Größe der Chunks
 * @returns {Array} Array von Chunks
 */
export function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Retry-Funktion für fehlerhafte Requests
 * @param {Function} fn - Funktion die ausgeführt werden soll
 * @param {number} maxRetries - Maximale Anzahl an Versuchen
 * @param {number} delayMs - Verzögerung zwischen Versuchen
 * @returns {Promise} Result der Funktion
 */
export async function retryWithBackoff(fn, maxRetries = 3, delayMs = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.log(`⚠️ Versuch ${i + 1}/${maxRetries} fehlgeschlagen: ${error.message}`);

            if (i < maxRetries - 1) {
                const waitTime = delayMs * Math.pow(2, i); // Exponential backoff
                console.log(`⏳ Warte ${waitTime}ms vor erneutem Versuch...`);
                await delay(waitTime);
            }
        }
    }

    throw lastError;
}

/**
 * Validiert ob ein String eine URL ist
 * @param {string} str - String zum Prüfen
 * @returns {boolean} true wenn URL
 */
export function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Bereinigt Text von Sonderzeichen
 * @param {string} text - Text zum Bereinigen
 * @returns {string} Bereinigter Text
 */
export function sanitizeText(text) {
    if (!text) return '';

    return text
        .replace(/[\r\n\t]+/g, ' ')  // Zeilenumbrüche durch Leerzeichen ersetzen
        .replace(/\s+/g, ' ')        // Mehrfache Leerzeichen reduzieren
        .trim();
}

/**
 * Erstellt einen Fingerprint für Duplikatserkennung
 * @param {Object} lead - Lead-Objekt
 * @returns {string} Fingerprint
 */
export function createLeadFingerprint(lead) {
    const parts = [
        lead.email?.toLowerCase(),
        lead.firstName?.toLowerCase(),
        lead.lastName?.toLowerCase(),
        lead.company?.toLowerCase()
    ].filter(Boolean);

    return parts.join('|');
}

/**
 * Berechnet die Ähnlichkeit zwischen zwei Strings (Levenshtein Distance)
 * @param {string} str1 - Erster String
 * @param {string} str2 - Zweiter String
 * @returns {number} Ähnlichkeitsscore (0-1)
 */
export function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Berechnet Levenshtein Distance
 * @param {string} str1 - Erster String
 * @param {string} str2 - Zweiter String
 * @returns {number} Edit Distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Formatiert einen Zeitstempel für Logging
 * @returns {string} Formatierter Zeitstempel
 */
export function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Erstellt Statistiken über eine Lead-Liste
 * @param {Array} leads - Array von Leads
 * @returns {Object} Statistik-Objekt
 */
export function generateLeadStatistics(leads) {
    return {
        total: leads.length,
        withEmail: leads.filter(l => l.email).length,
        withPhone: leads.filter(l => l.phone).length,
        withLinkedIn: leads.filter(l => l.linkedInUrl).length,
        byJobTitle: groupBy(leads, 'jobTitle'),
        byLocation: groupBy(leads, 'location'),
        byConfidence: groupBy(leads, 'confidence'),
        byDataSource: groupBy(leads, 'dataSource'),
        completionRate: {
            email: Math.round((leads.filter(l => l.email).length / leads.length) * 100),
            phone: Math.round((leads.filter(l => l.phone).length / leads.length) * 100),
            linkedIn: Math.round((leads.filter(l => l.linkedInUrl).length / leads.length) * 100),
        }
    };
}
