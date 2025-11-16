import validator from 'email-validator';

/**
 * Validiert einen Lead und prüft ob alle Pflichtfelder vorhanden sind
 * @param {Object} lead - Lead-Objekt
 * @param {Array} postalCodeFilter - PLZ-Filter (optional)
 * @returns {boolean} true wenn Lead valide ist
 */
export function validateLead(lead, postalCodeFilter = []) {
    // Pflichtfelder prüfen
    if (!lead.firstName || !lead.lastName || !lead.company) {
        console.log(`⚠️ Lead unvollständig: ${lead.firstName} ${lead.lastName}`);
        return false;
    }

    // Namen validieren (mindestens 2 Zeichen)
    if (lead.firstName.length < 2 || lead.lastName.length < 2) {
        console.log(`⚠️ Name zu kurz: ${lead.firstName} ${lead.lastName}`);
        return false;
    }

    // Ungültige Namen ausschließen
    if (isInvalidName(lead.firstName, lead.lastName)) {
        console.log(`⚠️ Ungültiger Name: ${lead.firstName} ${lead.lastName}`);
        return false;
    }

    // E-Mail validieren falls vorhanden
    if (lead.email) {
        if (!validator.validate(lead.email)) {
            console.log(`⚠️ Ungültige E-Mail: ${lead.email}`);
            lead.email = null; // Ungültige E-Mail entfernen statt Lead abzulehnen
        }
    }

    // PLZ-Filter anwenden
    if (postalCodeFilter.length > 0 && lead.postalCode) {
        const matchesFilter = postalCodeFilter.some(prefix =>
            lead.postalCode.startsWith(prefix)
        );
        if (!matchesFilter) {
            console.log(`⚠️ PLZ nicht im Filter: ${lead.postalCode}`);
            return false;
        }
    }

    // Telefonnummer formatieren falls vorhanden
    if (lead.phone) {
        lead.phone = formatPhoneNumber(lead.phone);
    }

    // PLZ validieren und formatieren
    if (lead.postalCode) {
        lead.postalCode = formatPostalCode(lead.postalCode);
        if (!isValidGermanPostalCode(lead.postalCode)) {
            console.log(`⚠️ Ungültige PLZ: ${lead.postalCode}`);
            lead.postalCode = null;
        }
    }

    return true;
}

/**
 * Formatiert deutsche Telefonnummern
 * @param {string} phone - Telefonnummer
 * @returns {string} Formatierte Telefonnummer
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;

    // Entferne alle Nicht-Ziffern außer + am Anfang
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Deutsche Nummer normalisieren
    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
    } else if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = '+49' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
        cleaned = '+49' + cleaned;
    }

    return cleaned;
}

/**
 * Formatiert deutsche Postleitzahlen
 * @param {string} postalCode - PLZ
 * @returns {string} Formatierte PLZ
 */
function formatPostalCode(postalCode) {
    if (!postalCode) return null;

    // Entferne alle Nicht-Ziffern
    const cleaned = postalCode.replace(/\D/g, '');

    // Deutsche PLZ sind 5-stellig
    if (cleaned.length === 5) {
        return cleaned;
    }

    // Wenn zu kurz, mit Nullen auffüllen
    if (cleaned.length < 5) {
        return cleaned.padStart(5, '0');
    }

    // Wenn zu lang, erste 5 Ziffern nehmen
    return cleaned.substring(0, 5);
}

/**
 * Validiert deutsche Postleitzahl
 * @param {string} postalCode - PLZ
 * @returns {boolean} true wenn gültig
 */
function isValidGermanPostalCode(postalCode) {
    if (!postalCode) return false;

    // Deutsche PLZ: 5 Ziffern, 01000 bis 99999
    const plzRegex = /^[0-9]{5}$/;
    if (!plzRegex.test(postalCode)) {
        return false;
    }

    const plzNumber = parseInt(postalCode, 10);
    return plzNumber >= 1000 && plzNumber <= 99999;
}

/**
 * Prüft ob ein Name ungültig ist
 * @param {string} firstName - Vorname
 * @param {string} lastName - Nachname
 * @returns {boolean} true wenn Name ungültig
 */
function isInvalidName(firstName, lastName) {
    const invalidWords = [
        'herr', 'frau', 'dr', 'prof', 'gmbh', 'ag', 'kg', 'ohg',
        'sie', 'uns', 'über', 'mehr', 'ihr', 'unser', 'ihre',
        'tel', 'fax', 'mail', 'email', 'web', 'www', 'http',
        'impressum', 'kontakt', 'datenschutz', 'agb', 'news',
        'home', 'about', 'team', 'karriere', 'jobs', 'service'
    ];

    const firstLower = firstName.toLowerCase();
    const lastLower = lastName.toLowerCase();

    // Prüfe gegen ungültige Wörter
    if (invalidWords.includes(firstLower) || invalidWords.includes(lastLower)) {
        return true;
    }

    // Namen sollten hauptsächlich Buchstaben enthalten
    const letterRegex = /^[a-zA-ZäöüßÄÖÜ\-\s]+$/;
    if (!letterRegex.test(firstName) || !letterRegex.test(lastName)) {
        return true;
    }

    return false;
}

/**
 * Berechnet einen Qualitätsscore für einen Lead
 * @param {Object} lead - Lead-Objekt
 * @returns {Object} Score-Objekt mit Bewertung
 */
export function calculateLeadQuality(lead) {
    let score = 0;
    const details = [];

    // E-Mail vorhanden (40 Punkte)
    if (lead.email) {
        score += 40;
        details.push('E-Mail vorhanden');
    }

    // Telefon vorhanden (20 Punkte)
    if (lead.phone) {
        score += 20;
        details.push('Telefon vorhanden');
    }

    // LinkedIn vorhanden (20 Punkte)
    if (lead.linkedInUrl) {
        score += 20;
        details.push('LinkedIn-Profil vorhanden');
    }

    // Job-Titel vorhanden (10 Punkte)
    if (lead.jobTitle) {
        score += 10;
        details.push('Job-Titel vorhanden');
    }

    // PLZ vorhanden (5 Punkte)
    if (lead.postalCode) {
        score += 5;
        details.push('PLZ vorhanden');
    }

    // Firmen-Website vorhanden (5 Punkte)
    if (lead.companyWebsite) {
        score += 5;
        details.push('Firmen-Website vorhanden');
    }

    // Qualitätskategorie bestimmen
    let quality;
    if (score >= 80) quality = 'high';
    else if (score >= 50) quality = 'medium';
    else quality = 'low';

    return {
        score,
        quality,
        details
    };
}

/**
 * Bereinigt Lead-Daten
 * @param {Object} lead - Lead-Objekt
 * @returns {Object} Bereinigtes Lead-Objekt
 */
export function sanitizeLead(lead) {
    return {
        ...lead,
        firstName: lead.firstName?.trim(),
        lastName: lead.lastName?.trim(),
        company: lead.company?.trim(),
        email: lead.email?.toLowerCase().trim(),
        phone: lead.phone ? formatPhoneNumber(lead.phone) : null,
        postalCode: lead.postalCode ? formatPostalCode(lead.postalCode) : null,
        location: lead.location?.trim(),
        jobTitle: lead.jobTitle?.trim(),
    };
}
