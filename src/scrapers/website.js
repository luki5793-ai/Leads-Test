import { PlaywrightCrawler } from 'apify';
import * as cheerio from 'cheerio';

/**
 * Scrapt Unternehmenswebsite nach Kontaktinformationen
 * @param {Object} params - Scraping-Parameter
 * @param {string} params.url - Website-URL
 * @param {string} params.companyName - Firmenname
 * @param {Array} params.targetJobTitles - Gesuchte Job-Titel
 * @param {Object} params.proxyConfiguration - Proxy-Konfiguration
 * @returns {Object} Unternehmensdaten mit Kontakten
 */
export async function scrapeCompanyWebsite({ url, companyName, targetJobTitles, proxyConfiguration }) {
    const contacts = [];
    const emails = new Set();
    const phones = new Set();

    console.log(`🌐 Scrape Website: ${url}`);

    try {
        const crawler = new PlaywrightCrawler({
            proxyConfiguration,
            maxRequestsPerCrawl: 5,
            maxConcurrency: 1,
            requestHandlerTimeoutSecs: 60,
            navigationTimeoutSecs: 30,

            requestHandler: async ({ page, request, enqueueLinks }) => {
                console.log(`📄 Verarbeite Seite: ${request.url}`);

                try {
                    // Warte bis Seite geladen ist
                    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
                        console.log('⚠️ Timeout beim Laden, fahre trotzdem fort');
                    });

                    const content = await page.content();
                    const $ = cheerio.load(content);

                    // Relevante Seiten zur Queue hinzufügen
                    await enqueueLinks({
                        selector: 'a[href*="impressum"], a[href*="kontakt"], a[href*="team"], a[href*="about"], a[href*="ueber-uns"], a[href*="about-us"], a[href*="management"]',
                        limit: 4
                    }).catch(() => {
                        // Ignoriere Fehler beim Enqueuen
                    });

                    // Text-Content extrahieren
                    const bodyText = $('body').text();

                    // E-Mails extrahieren
                    const emailMatches = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
                    emailMatches.forEach(email => {
                        // Filter out common non-personal emails
                        if (!email.match(/info@|kontakt@|office@|admin@|webmaster@|noreply@|no-reply@/i)) {
                            emails.add(email.toLowerCase());
                        }
                    });

                    // Telefonnummern extrahieren
                    const phoneMatches = bodyText.match(/(\+49|0049|0)\s*\d{2,5}[\s\-\/()]*\d{3,}[\s\-\/()]*\d{2,}/g) || [];
                    phoneMatches.forEach(phone => phones.add(phone));

                    // Kontakte mit Job-Titeln finden
                    findContactsInText($, bodyText, targetJobTitles, contacts);

                    // Strukturierte Kontakte in speziellen Bereichen suchen
                    findContactsInStructure($, targetJobTitles, contacts);

                } catch (error) {
                    console.error(`❌ Fehler beim Scrapen von ${request.url}:`, error.message);
                }
            },

            failedRequestHandler: async ({ request }) => {
                console.error(`❌ Request fehlgeschlagen: ${request.url}`);
            },
        });

        await crawler.run([url]);

        // Emails und Phones zu Kontakten hinzufügen
        if (contacts.length > 0) {
            const emailArray = Array.from(emails);
            const phoneArray = Array.from(phones);

            contacts.forEach((contact, index) => {
                if (!contact.email && emailArray[index]) {
                    contact.email = emailArray[index];
                }
                if (!contact.phone && phoneArray[index]) {
                    contact.phone = phoneArray[index];
                }
            });
        }

        // Wenn keine spezifischen Kontakte gefunden, erstelle generische Kontakte
        if (contacts.length === 0 && (emails.size > 0 || phones.size > 0)) {
            targetJobTitles.forEach((jobTitle, index) => {
                const emailArray = Array.from(emails);
                const phoneArray = Array.from(phones);

                if (emailArray[index] || phoneArray[index]) {
                    contacts.push({
                        firstName: null,
                        lastName: null,
                        jobTitle: jobTitle,
                        email: emailArray[index] || null,
                        phone: phoneArray[index] || null,
                        source: 'Company Website',
                        salutation: null
                    });
                }
            });
        }

        console.log(`✅ ${contacts.length} Kontakte auf Website gefunden`);

    } catch (error) {
        console.error(`❌ Fehler beim Website-Scraping für ${url}:`, error.message);
    }

    return {
        contacts: contacts.slice(0, 5), // Max 5 Kontakte pro Firma
        companyName
    };
}

/**
 * Sucht Kontakte im Text basierend auf Job-Titeln
 */
function findContactsInText($, text, targetJobTitles, contacts) {
    for (const jobTitle of targetJobTitles) {
        // Regex für Job-Titel + Name Pattern
        const jobTitleLower = jobTitle.toLowerCase();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.toLowerCase().includes(jobTitleLower)) {
                // Suche nach Namen in dieser Zeile oder den nächsten 2 Zeilen
                for (let j = 0; j <= 2 && i + j < lines.length; j++) {
                    const searchLine = lines[i + j];
                    const nameMatch = searchLine.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\s+([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\b/);

                    if (nameMatch && nameMatch[1] && nameMatch[2]) {
                        // Validiere dass es ein echter Name ist (nicht "Sie Uns" etc.)
                        if (isValidName(nameMatch[1], nameMatch[2])) {
                            contacts.push({
                                firstName: nameMatch[1],
                                lastName: nameMatch[2],
                                jobTitle: jobTitle,
                                email: null,
                                phone: null,
                                source: 'Company Website',
                                salutation: null
                            });
                            break;
                        }
                    }
                }
            }
        }
    }
}

/**
 * Sucht Kontakte in strukturierten HTML-Elementen
 */
function findContactsInStructure($, targetJobTitles, contacts) {
    // Suche in Team/Management Sections
    $('.team, .management, .about, .kontakt, [class*="team"], [class*="management"]').each((i, section) => {
        const sectionText = $(section).text();

        for (const jobTitle of targetJobTitles) {
            if (sectionText.toLowerCase().includes(jobTitle.toLowerCase())) {
                // Suche nach Namen in diesem Abschnitt
                const nameMatch = sectionText.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\s+([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\b/);

                if (nameMatch && isValidName(nameMatch[1], nameMatch[2])) {
                    // Suche nach Email in diesem Abschnitt
                    const emailMatch = $(section).text().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

                    contacts.push({
                        firstName: nameMatch[1],
                        lastName: nameMatch[2],
                        jobTitle: jobTitle,
                        email: emailMatch ? emailMatch[0] : null,
                        phone: null,
                        source: 'Company Website',
                        salutation: null
                    });
                }
            }
        }
    });
}

/**
 * Validiert ob es sich um einen echten Namen handelt
 */
function isValidName(firstName, lastName) {
    const invalidWords = [
        'sie', 'uns', 'über', 'mehr', 'ihr', 'unser', 'ihre',
        'tel', 'fax', 'mail', 'web', 'www', 'http', 'https',
        'impressum', 'kontakt', 'datenschutz', 'agb', 'news'
    ];

    const firstLower = firstName.toLowerCase();
    const lastLower = lastName.toLowerCase();

    // Namen sollten mindestens 2 Zeichen haben
    if (firstName.length < 2 || lastName.length < 2) {
        return false;
    }

    // Prüfe gegen ungültige Wörter
    if (invalidWords.includes(firstLower) || invalidWords.includes(lastLower)) {
        return false;
    }

    return true;
}
