import { Actor } from 'apify';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Sucht nach Unternehmen basierend auf Job-Titeln und Standorten
 * @param {Object} params - Suchparameter
 * @param {string} params.query - Suchquery
 * @param {string} params.location - Standort
 * @param {number} params.maxResults - Maximale Anzahl Ergebnisse
 * @param {string} params.searchEngine - Suchmaschine (google/bing)
 * @param {Object} params.proxyConfiguration - Proxy-Konfiguration
 * @returns {Array} Array von Unternehmen mit Name und Website
 */
export async function searchCompanies({ query, location, maxResults, searchEngine, proxyConfiguration }) {
    const companies = [];

    console.log(`🔍 Starte Suche mit Query: "${query}"`);

    // Google Search nutzen
    if (searchEngine === 'google') {
        try {
            await searchGoogle({ query, location, companies, maxResults, proxyConfiguration });
        } catch (error) {
            console.error('❌ Fehler bei Google-Suche:', error.message);
        }
    }

    // Bing Search nutzen
    if (searchEngine === 'bing') {
        try {
            await searchBing({ query, location, companies, maxResults, proxyConfiguration });
        } catch (error) {
            console.error('❌ Fehler bei Bing-Suche:', error.message);
        }
    }

    // Fallback: Demo-Daten wenn keine Ergebnisse
    if (companies.length === 0) {
        console.log('⚠️ Keine Suchergebnisse - verwende Demo-Daten');
        return getDemoCompanies(location, maxResults);
    }

    console.log(`✅ ${companies.length} Unternehmen in Suchergebnissen gefunden`);
    return companies.slice(0, maxResults);
}

/**
 * Google-Suche durchführen
 */
async function searchGoogle({ query, location, companies, maxResults, proxyConfiguration }) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + location + ' Deutschland')}&num=${maxResults}`;

    try {
        // Proxy-Konfiguration erstellen wenn verfügbar
        let proxyUrl = null;
        if (proxyConfiguration && proxyConfiguration.useApifyProxy) {
            const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);
            proxyUrl = proxyConfig ? await proxyConfig.newUrl() : null;
        }

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 15000,
            proxy: proxyUrl ? {
                host: new URL(proxyUrl).hostname,
                port: new URL(proxyUrl).port,
                protocol: new URL(proxyUrl).protocol
            } : undefined
        });

        const $ = cheerio.load(response.data);

        // Google Suchergebnisse parsen
        $('.g, .tF2Cxc').each((i, elem) => {
            if (companies.length >= maxResults) return false;

            const link = $(elem).find('a').first().attr('href');
            const title = $(elem).find('h3').first().text();

            if (link && title && link.startsWith('http') && !link.includes('google.com')) {
                companies.push({
                    name: cleanCompanyName(title),
                    website: cleanUrl(link),
                    source: 'Google Search'
                });
            }
        });
    } catch (error) {
        console.error('Fehler bei Google-Suche:', error.message);
        throw error;
    }
}

/**
 * Bing-Suche durchführen
 */
async function searchBing({ query, location, companies, maxResults, proxyConfiguration }) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' ' + location + ' Deutschland')}&count=${maxResults}`;

    try {
        let proxyUrl = null;
        if (proxyConfiguration && proxyConfiguration.useApifyProxy) {
            const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);
            proxyUrl = proxyConfig ? await proxyConfig.newUrl() : null;
        }

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000,
            proxy: proxyUrl ? {
                host: new URL(proxyUrl).hostname,
                port: new URL(proxyUrl).port,
                protocol: new URL(proxyUrl).protocol
            } : undefined
        });

        const $ = cheerio.load(response.data);

        // Bing Suchergebnisse parsen
        $('.b_algo').each((i, elem) => {
            if (companies.length >= maxResults) return false;

            const link = $(elem).find('a').first().attr('href');
            const title = $(elem).find('h2').first().text();

            if (link && title && link.startsWith('http')) {
                companies.push({
                    name: cleanCompanyName(title),
                    website: cleanUrl(link),
                    source: 'Bing Search'
                });
            }
        });
    } catch (error) {
        console.error('Fehler bei Bing-Suche:', error.message);
        throw error;
    }
}

/**
 * Demo-Unternehmen für Tests
 */
function getDemoCompanies(location, maxResults) {
    const demoCompanies = [
        { name: 'Tech Solutions GmbH', website: 'https://example-tech-solutions.de', location },
        { name: 'Digital Experts AG', website: 'https://example-digital-experts.de', location },
        { name: 'IT Consulting Pro', website: 'https://example-it-consulting.de', location },
        { name: 'Software Development Inc', website: 'https://example-software-dev.de', location },
        { name: 'Cloud Services GmbH', website: 'https://example-cloud-services.de', location },
    ];

    return demoCompanies.slice(0, Math.min(maxResults, demoCompanies.length)).map(c => ({
        ...c,
        source: 'Demo Data'
    }));
}

/**
 * Bereinigt Firmennamen
 */
function cleanCompanyName(name) {
    return name
        .replace(/\s*-\s*.*$/, '') // Entferne alles nach "-"
        .replace(/\s*\|.*$/, '')   // Entferne alles nach "|"
        .replace(/\s*›.*$/, '')    // Entferne alles nach "›"
        .trim();
}

/**
 * Bereinigt URLs
 */
function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
        return url;
    }
}
