// Loads CSV files from /data and exposes
// loadPropertyCatalog() -> Promise resolving when loaded
// getPropertyCategory(key) and getPropertyItem(key, slug)

const PropertyLoader = (function () {
    const catalog = {};
    const meta = {
        flats: { label: 'Luxury Flats', pagePath: 'flats.html', categoryKey: 'flats', intro: 'Premium residential flats in high-growth locations with modern amenities and clear documentation.' },
        villas: { label: 'Premium Villas', pagePath: 'villas.html', categoryKey: 'villas', intro: 'Spacious villas designed for privacy, comfort, and long-term investment value.' },
        plots: { label: 'Open Plots', pagePath: 'plots.html', categoryKey: 'plots', intro: 'Investment-ready plots with approval support, clear documentation, and strong future value.' },
        'farm-lands': { label: 'Farm Lands', pagePath: 'farm-lands.html', categoryKey: 'farm-lands', intro: 'Agricultural and 111 GO lands with proper guidance for long-term investment and use.' }
    };

    function parseCSV(text) {
        // Simple CSV parser that handles quoted fields and commas inside quotes
        const rows = [];
        let cur = '';
        let inQuotes = false;
        let row = [];
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const nxt = text[i+1];
            if (ch === '"') {
                if (inQuotes && nxt === '"') { // escaped quote
                    cur += '"';
                    i++; // skip next
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (ch === ',' && !inQuotes) {
                row.push(cur);
                cur = '';
                continue;
            }
            if ((ch === '\n' || ch === '\r') && !inQuotes) {
                // handle CRLF
                if (cur !== '' || row.length > 0) {
                    row.push(cur);
                    rows.push(row);
                    row = [];
                    cur = '';
                }
                // skip following LF if CRLF
                if (ch === '\r' && text[i+1] === '\n') i++;
                continue;
            }
            cur += ch;
        }
        // push last
        if (cur !== '' || row.length > 0) {
            row.push(cur);
            rows.push(row);
        }
        // normalize rows: remove empty trailing rows
        return rows.filter(r => r.length > 1 || (r.length===1 && r[0].trim() !== ''));
    }

    function csvToObjects(text) {
        const rows = parseCSV(text);
        if (!rows || rows.length < 1) return [];
        const headers = rows[0].map(h => h.trim());
        const objs = [];
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = (r[j] || '').trim();
            }
            objs.push(obj);
        }
        return objs;
    }

    async function fetchCSV(name) {
        const path = `data/${name}.csv`;
        const res = await fetch(path, {cache: 'no-store'});
        if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
        const text = await res.text();
        return csvToObjects(text);
    }

    function normalizeImageList(value) {
        if (!value) return [];
        return String(value)
            .split('|')
            .map(s => s.trim())
            .map(s => s.replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
            .filter((s, index, arr) => arr.indexOf(s) === index);
    }

    function getImageList(row) {
        const candidates = [row.image, row.images, row.imageGallery, row.gallery, row.imageList];
        for (let i = 1; i <= 10; i++) {
            candidates.push(row[`image${i}`]);
        }
        const flattened = candidates.flatMap(normalizeImageList);
        return flattened.length ? flattened : (row.image ? [row.image] : []);
    }

    async function load() {
        const categories = Object.keys(meta);
        for (const key of categories) {
            try {
                const rows = await fetchCSV(key);
                const items = rows.map(r => {
                    const images = getImageList(r);
                    const propertyId = r.propertyId || r.slug || r.title || '';
                    const baseKey = `${key}:${propertyId}`;
                    const urlKey = hashString(baseKey);
                    return {
                        slug: r.slug || (r.propertyId || '').toLowerCase().replace(/[^a-z0-9\-]/gi,'-'),
                        urlKey,
                        title: r.title || '',
                        propertyId: r.propertyId || '',
                        location: r.location || '',
                        googleMaps: r.googleMaps || r.googleMaps || r.mapLink || '',
                        priceRange: r.priceRange || r.price || '',
                        availability: r.availability || '',
                        additionalDetails: r.additionalDetails || r.additional || '',
                        highlights: (r.highlights || '').split('|').map(s => s.trim()).filter(Boolean),
                        image: images[0] || '',
                        images: images
                    };
                });
                catalog[key] = Object.assign({}, meta[key], { items, intro: meta[key].intro });
            } catch (err) {
                console.warn('PropertyLoader: failed loading', key, err);
                catalog[key] = Object.assign({}, meta[key], { items: [] });
            }
        }
        window.propertyCatalog = catalog;
        return catalog;
    }

    function hashString(value) {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
            hash ^= code;
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function getCategory(key) {
        return catalog[key] || catalog['flats'] || { items: [] };
    }

    function getItem(key, slug) {
        const cat = getCategory(key);
        return (cat.items || []).find(i => i.slug === slug) || (cat.items && cat.items[0]) || null;
    }

    function getItemByKey(key, urlKey) {
        const cat = getCategory(key);
        return (cat.items || []).find(i => i.urlKey === urlKey || i.slug === urlKey) || (cat.items && cat.items[0]) || null;
    }

    return {
        loadPropertyCatalog: load,
        getPropertyCategory: getCategory,
        getPropertyItem: getItem,
        getPropertyItemByKey: getItemByKey,
        hashString: hashString
    };
})();

// expose helpers on window for legacy code
window.loadPropertyCatalog = PropertyLoader.loadPropertyCatalog;
window.getPropertyCategory = PropertyLoader.getPropertyCategory;
window.getPropertyItem = PropertyLoader.getPropertyItem;
window.getPropertyItemByKey = PropertyLoader.getPropertyItemByKey;