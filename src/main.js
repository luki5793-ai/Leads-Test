import { Actor } from 'apify';
import { Dataset } from 'apify';
import { searchCompanies } from './scrapers/company-search.js';
import { scrapeCompanyWebsite } from './scrapers/website.js';
import { findEmailAddresses } from './enrichment/email-finder.js';
import { validateLead } from './enrichment/data-validator.js';
import { buildSearchQuery, deduplicateLeads } from './utils/helpers.js';

await Actor.main(async () => {
    console.log('🚀 B2B Lead Generator gestartet...');

    // Input abrufen
    const input = await Actor.getInput();
    const {
        jobTitles = [],
        locations = [],
        postalCodes = [],
        maxResults = 50,
        industries = [],
        companySize = 'any',
        searchEngine = 'google',
        enrichWithEmail = true,
        proxyConfiguration = { useApifyProxy: true }
    } = input;

    // Validierung
    if (!jobTitles || jobTitles.length === 0) {
        throw new Error('Mindestens ein Job-Titel muss angegeben werden');
    }
    if (!locations || locations.length === 0) {
        throw new Error('Mindestens ein Standort muss angegeben werden');
    }

    console.log(`📊 Suche nach ${jobTitles.length} Job-Titeln in ${locations.length} Standorten`);

    const leads = [];
    const processedCompanies = new Set();

    // Für jeden Job-Titel und Standort suchen
    for (const jobTitle of jobTitles) {
        for (const location of locations) {
            console.log(`🔍 Suche: ${jobTitle} in ${location}`);

            // Suchquery erstellen
            const searchQuery = buildSearchQuery(jobTitle, location, industries);

            // Unternehmen suchen
            const companies = await searchCompanies({
                query: searchQuery,
                location,
                maxResults: Math.ceil(maxResults / (jobTitles.length * locations.length)),
                searchEngine,
                proxyConfiguration
            });

            console.log(`✅ ${companies.length} Unternehmen gefunden`);

            // Jedes Unternehmen verarbeiten
            for (const company of companies) {
                if (processedCompanies.has(company.website)) {
                    continue;
                }
                processedCompanies.add(company.website);

                try {
                    console.log(`🏢 Verarbeite: ${company.name}`);

                    // Website scrapen
                    const companyData = await scrapeCompanyWebsite({
                        url: company.website,
                        companyName: company.name,
                        targetJobTitles: jobTitles,
                        proxyConfiguration
                    });

                    // Leads aus Unternehmensdaten extrahieren
                    for (const contact of companyData.contacts || []) {
                        const lead = {
                            salutation: contact.salutation || determineSalutation(contact.firstName),
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            company: company.name,
                            location: location,
                            postalCode: company.postalCode || extractPostalCode(company.address),
                            email: contact.email || null,
                            phone: contact.phone || company.phone || null,
                            jobTitle: contact.jobTitle || jobTitle,
                            linkedInUrl: contact.linkedIn || null,
                            companyWebsite: company.website,
                            dataSource: contact.source || 'Company Website',
                            confidence: calculateConfidence(contact),
                            scrapedAt: new Date().toISOString()
                        };

                        // E-Mail-Anreicherung wenn gewünscht und noch keine E-Mail vorhanden
                        if (enrichWithEmail && !lead.email) {
                            const email = await findEmailAddresses({
                                firstName: lead.firstName,
                                lastName: lead.lastName,
                                companyWebsite: company.website,
                                companyName: company.name
                            });
                            if (email) {
                                lead.email = email;
                                lead.dataSource = 'Enriched';
                            }
                        }

                        // Lead validieren
                        if (validateLead(lead, postalCodes)) {
                            leads.push(lead);
                            console.log(`✅ Lead hinzugefügt: ${lead.firstName} ${lead.lastName} (${lead.email || 'keine E-Mail'})`);
                        }

                        // Limit prüfen
                        if (leads.length >= maxResults) {
                            break;
                        }
                    }

                    if (leads.length >= maxResults) {
                        break;
                    }

                } catch (error) {
                    console.error(`❌ Fehler bei ${company.name}:`, error.message);
                }
            }

            if (leads.length >= maxResults) {
                break;
            }
        }

        if (leads.length >= maxResults) {
            break;
        }
    }

    // Duplikate entfernen
    const uniqueLeads = deduplicateLeads(leads);

    console.log(`\n📈 Zusammenfassung:`);
    console.log(`   Gesamt gefundene Leads: ${leads.length}`);
    console.log(`   Einzigartige Leads: ${uniqueLeads.length}`);
    console.log(`   Mit E-Mail: ${uniqueLeads.filter(l => l.email).length}`);
    console.log(`   Mit Telefon: ${uniqueLeads.filter(l => l.phone).length}`);

    // Leads speichern
    await Dataset.pushData(uniqueLeads);

    // Summary speichern
    await Actor.setValue('SUMMARY', {
        totalLeads: uniqueLeads.length,
        withEmail: uniqueLeads.filter(l => l.email).length,
        withPhone: uniqueLeads.filter(l => l.phone).length,
        byJobTitle: groupBy(uniqueLeads, 'jobTitle'),
        byLocation: groupBy(uniqueLeads, 'location'),
        generatedAt: new Date().toISOString()
    });

    console.log('✅ Actor erfolgreich abgeschlossen!');
});

// Hilfsfunktionen
function determineSalutation(firstName) {
    // Einfache Heuristik basierend auf häufigen Namen
    const maleNames = ['thomas', 'michael', 'andreas', 'peter', 'wolfgang', 'klaus', 'jürgen', 'stefan', 'christian', 'markus', 'alexander', 'matthias', 'martin', 'daniel', 'frank'];
    const femaleNames = ['sabine', 'petra', 'andrea', 'martina', 'claudia', 'stefanie', 'julia', 'katharina', 'christina', 'nicole', 'anna', 'maria', 'sandra', 'melanie', 'sarah'];

    if (!firstName) return 'Herr/Frau';

    const lowerName = firstName.toLowerCase();
    if (maleNames.includes(lowerName)) return 'Herr';
    if (femaleNames.includes(lowerName)) return 'Frau';

    // Bei a-Endung oft weiblich
    if (lowerName.endsWith('a')) return 'Frau';

    return 'Herr/Frau';
}

function extractPostalCode(address) {
    if (!address) return null;
    const match = address.match(/\b(\d{5})\b/);
    return match ? match[1] : null;
}

function calculateConfidence(contact) {
    let score = 0;
    if (contact.email) score += 40;
    if (contact.phone) score += 20;
    if (contact.linkedIn) score += 20;
    if (contact.jobTitle) score += 20;

    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

function groupBy(array, key) {
    return array.reduce((result, item) => {
        const value = item[key];
        result[value] = (result[value] || 0) + 1;
        return result;
    }, {});
}
