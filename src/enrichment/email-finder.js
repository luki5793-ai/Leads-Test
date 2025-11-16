import axios from 'axios';

/**
 * Findet E-Mail-Adressen basierend auf Name und Firma
 * Nutzt gängige E-Mail-Muster für deutsche Unternehmen
 *
 * @param {Object} params - Parameter
 * @param {string} params.firstName - Vorname
 * @param {string} params.lastName - Nachname
 * @param {string} params.companyWebsite - Firmen-Website
 * @param {string} params.companyName - Firmenname
 * @returns {string|null} Gefundene E-Mail-Adresse oder null
 */
export async function findEmailAddresses({ firstName, lastName, companyWebsite, companyName }) {
    if (!firstName || !lastName || !companyWebsite) {
        return null;
    }

    try {
        // Domain extrahieren
        const domain = new URL(companyWebsite).hostname.replace('www.', '');

        // Normalisiere Namen (entferne Umlaute)
        const firstNormalized = normalizeGermanName(firstName.toLowerCase());
        const lastNormalized = normalizeGermanName(lastName.toLowerCase());

        // Häufige E-Mail-Muster für Deutschland (sortiert nach Häufigkeit)
        const patterns = [
            // Vorname.Nachname (am häufigsten)
            `${firstNormalized}.${lastNormalized}@${domain}`,

            // Vorname Nachname (ohne Punkt)
            `${firstNormalized}${lastNormalized}@${domain}`,

            // Erster Buchstabe Vorname + Nachname
            `${firstNormalized.charAt(0)}${lastNormalized}@${domain}`,

            // Erster Buchstabe Vorname + Punkt + Nachname
            `${firstNormalized.charAt(0)}.${lastNormalized}@${domain}`,

            // Nachname + Erster Buchstabe Vorname
            `${lastNormalized}${firstNormalized.charAt(0)}@${domain}`,

            // Nachname + Punkt + Erster Buchstabe Vorname
            `${lastNormalized}.${firstNormalized.charAt(0)}@${domain}`,

            // Nur Nachname
            `${lastNormalized}@${domain}`,

            // Nachname.Vorname (umgekehrt)
            `${lastNormalized}.${firstNormalized}@${domain}`,
        ];

        // Validiere E-Mail-Formate
        for (const email of patterns) {
            if (isValidEmailFormat(email)) {
                console.log(`📧 Generierte E-Mail: ${email}`);

                // Optional: Hier könnte eine E-Mail-Verifikations-API eingebunden werden
                // z.B. Hunter.io, ZeroBounce, NeverBounce, etc.
                // const isValid = await verifyEmailWithAPI(email);
                // if (isValid) return email;

                // Aktuell geben wir das wahrscheinlichste Muster zurück
                return email;
            }
        }

    } catch (error) {
        console.error('❌ Fehler beim Email-Finding:', error.message);
    }

    return null;
}

/**
 * Normalisiert deutsche Namen (ersetzt Umlaute)
 */
function normalizeGermanName(name) {
    return name
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z]/g, ''); // Entferne alle Nicht-Buchstaben
}

/**
 * Validiert E-Mail-Format
 */
function isValidEmailFormat(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Optional: E-Mail-Verifikation über externe API
 * Diese Funktion kann aktiviert werden, wenn ein API-Schlüssel vorhanden ist
 */
async function verifyEmailWithAPI(email) {
    // Beispiel mit Hunter.io (benötigt API-Key)
    /*
    const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
    if (!HUNTER_API_KEY) return false;

    try {
        const response = await axios.get('https://api.hunter.io/v2/email-verifier', {
            params: {
                email: email,
                api_key: HUNTER_API_KEY
            }
        });

        return response.data.data.status === 'valid';
    } catch (error) {
        console.error('Fehler bei E-Mail-Verifikation:', error.message);
        return false;
    }
    */

    // Aktuell keine externe Verifikation
    return true;
}

/**
 * Extrahiert E-Mail-Adressen aus Text
 * @param {string} text - Text zum Durchsuchen
 * @returns {Array} Array von gefundenen E-Mail-Adressen
 */
export function extractEmailsFromText(text) {
    if (!text) return [];

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];

    // Filtere generische E-Mails aus
    return matches.filter(email => {
        const lowerEmail = email.toLowerCase();
        return !lowerEmail.match(/info@|kontakt@|office@|admin@|webmaster@|noreply@|no-reply@|service@|support@/);
    });
}

/**
 * Bewertet die Wahrscheinlichkeit, dass eine E-Mail zu einer Person gehört
 * @param {string} email - E-Mail-Adresse
 * @param {string} firstName - Vorname
 * @param {string} lastName - Nachname
 * @returns {number} Score von 0-100
 */
export function scoreEmailMatch(email, firstName, lastName) {
    if (!email || !firstName || !lastName) return 0;

    let score = 0;
    const emailLower = email.toLowerCase();
    const firstLower = normalizeGermanName(firstName.toLowerCase());
    const lastLower = normalizeGermanName(lastName.toLowerCase());

    // Enthält Vornamen
    if (emailLower.includes(firstLower)) score += 40;

    // Enthält Nachnamen
    if (emailLower.includes(lastLower)) score += 40;

    // Enthält ersten Buchstaben des Vornamens
    if (emailLower.includes(firstLower.charAt(0))) score += 10;

    // Ist nicht generisch
    if (!emailLower.match(/info@|kontakt@|office@/)) score += 10;

    return Math.min(score, 100);
}
