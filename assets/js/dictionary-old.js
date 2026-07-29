/**
 * Dictionary Manager v2.1 - Supports chunked files + SLP1 index
 */

class DictionaryManager {
    constructor() {
        this.dictionaries = new Map();
        this.loaded = false;
    }

    /**
     * Load a dictionary (single file OR array of chunks)
     * @param {string} name - Dictionary name
     * @param {string|array} sources - JSON file path(s)
     * @param {string|null} slpIndexSource - Optional SLP1 index path
     */
    async loadDictionary(name, sources, slpIndexSource) {
        // Normalize to array
        if (!Array.isArray(sources)) {
            sources = [sources];
        }

        const words = {};
        const text = {};
        
        for (const source of sources) {
            try {
                const response = await fetch(source);
                const data = await response.json();
                
                // Merge words index
                Object.assign(words, data.data.words);
                
                // Merge text entries
                Object.assign(text, data.data.text);
            } catch (err) {
                console.warn(`Failed to load chunk ${source}:`, err);
            }
        }
        
        // Load SLP1 index if provided
        let words_slp1 = null;
        if (slpIndexSource) {
            try {
                const response = await fetch(slpIndexSource);
                const slpData = await response.json();
                words_slp1 = slpData;
                console.log(`Loaded ${name} SLP1 index: ${Object.keys(words_slp1).length} entries`);
            } catch (err) {
                console.warn(`Failed to load SLP1 index ${slpIndexSource}:`, err);
            }
        }
        
        this.dictionaries.set(name, { words, text, words_slp1 });
        console.log(`Loaded ${name}: ${Object.keys(words).length} words`);
        return true;
    }

    /**
     * Initialize multiple dictionaries
     * @param {object} dictionaryConfig - { 'Wilson': { main: 'wil.json', slp1Index: 'wil_slp1_index.json' } }
     *                                  or { 'Wilson': 'wil.json' } for backward compatibility
     */
    async initialize(dictionaryConfig) {
        const promises = Object.entries(dictionaryConfig).map(([name, config]) => {
            // Handle both old string format and new object format
            if (typeof config === 'string') {
                // Old format: just pass as main source, no slp1 index
                return this.loadDictionary(name, config, null);
            } else {
                // New format: { main: '...', slp1Index: '...' }
                return this.loadDictionary(name, config.main, config.slp1Index);
            }
        });
        await Promise.all(promises);
        this.loaded = true;
    }

    /**
     * Search a word across all dictionaries (exact match, existing method)
     */
    search(canonicalWord) {
        const results = {};
        
        for (const [name, dict] of this.dictionaries.entries()) {
            if (dict.words[canonicalWord]) {
                const entryIds = dict.words[canonicalWord].split(',');
                const matches = [];
                
                for (const id of entryIds) {
                    const entry = dict.text[id];
                    if (entry) {
                        matches.push({
                            entryId: id,
                            headword: canonicalWord,
                            definition: entry[0],
                            page: entry[1],
                            entryNum: entry[2]
                        });
                    }
                }
                
                if (matches.length > 0) {
                    results[name] = matches;
                }
            }
        }
        
        return results;
    }

/**
 * Prefix search using SLP1 index
 * Scans for words starting with given prefix
 * Handles both array-format and string-format text entries
 */
prefixSearchSLP1(prefix) {
    const results = {};
    
    for (const [name, dict] of this.dictionaries.entries()) {
        if (!dict.words_slp1) continue;
        
        const matches = [];
        
        for (const [slp1Key, devKey] of Object.entries(dict.words_slp1)) {
            // Case-sensitive prefix match (SLP1 is case-sensitive!)
            if (slp1Key.startsWith(prefix)) {
                const entryIds = dict.words[devKey]?.split(',');
                if (!entryIds) continue;
                
                for (const id of entryIds) {
                    const entry = dict.text[id];
                    if (!entry) continue;
                    
                    if (Array.isArray(entry)) {
                        matches.push({
                            entryId: id,
                            headword: devKey,
                            definition: entry[0],
                            page: entry[1],
                            entryNum: entry[2],
                            slp1Key: slp1Key
                        });
                    } else {
                        matches.push({
                            entryId: id,
                            headword: devKey,
                            definition: entry,
                            page: null,
                            entryNum: null,
                            slp1Key: slp1Key
                        });
                    }
                }
            }
        }
        
        if (matches.length > 0) {
            results[name] = matches;
        }
    }
    
    return results;
}

/** Count entries matching prefix in a specific dictionary **/
    countPrefixMatches(dictName, prefix) {
        const dict = this.dictionaries.get(dictName);
        if (!dict || !dict.words_slp1) return 0;
        
        let count = 0;
        for (const slp1Key of Object.keys(dict.words_slp1)) {
            if (slp1Key.startsWith(prefix)) {
                count++;
            }
        }
        return count;
    }
        getCount(dictName) {
            const dict = this.dictionaries.get(dictName);
            return dict ? Object.keys(dict.words).length : 0;
        }

    /**
     * Render results with dropdown for <11 entries
     */
    renderResults(results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        const totalMatches = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalMatches === 0) {
            container.innerHTML = '<p class="placeholder-text">No entries found</p>';
            return;
        }

        let html = `<div class="results-summary" style="padding:1rem;margin-bottom:1.5rem;color:#1B3A5C">Found <strong>${totalMatches}</strong> entr${totalMatches === 1 ? 'y' : 'ies'}</div>`;
        
        for (const [dictName, entries] of Object.entries(results)) {
            const totalCount = entries.length;
            const dictColors = {
                'Monier-Williams': '#2C5282',
                'Apte': '#2D3748',
                'Apte Hindi': '#276749',
                'Wilson': '#5B21B6',
                'Cappeller': '#742A2A'
            };
            const color = dictColors[dictName] || '#1B3A5C';
            
            html += `<div class="dictionary-section" style="margin-bottom:1.5rem;padding:1.5rem;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.08)">`;
            html += `<h4 style="margin:0 0 1rem;color:${color};border-bottom:2px solid ${color}20;padding-bottom:0.5rem">${dictName} (${totalCount})</h4>`;
            
            if (totalCount <= 10) {
                // Dropdown for small result sets
                html += `<select onchange="document.getElementById('${dictName}-display').innerHTML = this.value" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid ${color}40;font-size:1rem">`;
                html += `<option value="">Select an entry...</option>`;
                
                for (let i = 0; i < totalCount; i++) {
                    const entry = entries[i];
                    const preview = this.escapeHtml(entry.definition).substring(0, 100).trim() + '...';
                    const fullEntry = this.formatEntry(entry, dictName);
                    html += `<option value="${fullEntry}">Entry ${i+1}: ${preview}</option>`;
                }
                html += `</select>`;
                html += `<div id="${dictName}-display" class="entry-display" style="margin-top:1rem;padding:1rem;background:${color}10;border-radius:8px"></div>`;
            } else {
                // List for larger sets (first 5 only)
                html += `<p><em style="color:#718096">${totalCount} entries total</em></p>`;
                html += `<div class="entries-list">`;
                
                for (let i = 0; i < Math.min(5, totalCount); i++) {
                    const entry = entries[i];
                    html += this.formatEntryCard(entry, i, dictName);
                }
                
                if (totalCount > 5) {
                    html += `<p class="more-link" style="text-align:center;color:${color};margin-top:1rem"><em>+ ${totalCount - 5} more entries - refine search</em></p>`;
                }
                html += `</div>`;
            }
            
            html += `</div>`;
        }
        
        container.innerHTML = html;
    }

    /**
     * Render results grouped by dictionary, with live counts per card (NEW METHOD)
     */
    renderResultsInCards(results, maxPerCard = 10) {
    const cardIds = {
        'Monier-Williams': 'body-monier',
        'Apte': 'body-apte',
        'Apte Hindi': 'body-apteHindi',
        'Wilson': 'body-wilson',
        'Cappeller': 'body-cappeller',
        'McDonell': 'body-mcdonell'
    };
    
    const dictNames = Object.keys(cardIds);
    
    for (const dictName of dictNames) {
        const bodyId = cardIds[dictName];
        const bodyEl = document.getElementById(bodyId);
        if (!bodyEl) continue;
        
        const entries = results[dictName] || [];
        const count = entries.length;
        
        if (count === 0) {
            bodyEl.innerHTML = '<p class="placeholder-text">No matches</p>';
            continue;
        }
        
        const displayEntries = entries.slice(0, maxPerCard);
        
        let html = `<p style="color:#718096;margin-bottom:0.75rem"><em>${count} match${count === 1 ? '' : 'es'} (showing ${Math.min(count, maxPerCard)})</em></p>`;
        html += `<div class="entries-list">`;
        
        for (let i = 0; i < displayEntries.length; i++) {
            const entry = displayEntries[i];
            html += this.formatEntryCard(entry, i, dictName);
        }
        
        if (count > maxPerCard) {
            html += `<p class="more-link" style="text-align:center;color:${this.getDictColor(dictName)};margin-top:1rem"><em>+ ${count - maxPerCard} more — refine search</em></p>`;
        }
        
        html += `</div>`;
        bodyEl.innerHTML = html;
    }
}    formatEntry(entry, dictName) {
        return `<div style="background:#fff;padding:1.5rem;border-radius:8px;border-left:4px solid ${this.getDictColor(dictName)}"><h5 style="margin:0 0 0.5rem;color:${this.getDictColor(dictName)}">${entry.headword} (Entry ${entry.entryNum})</h5><p style="margin:0;line-height:1.6">${this.escapeHtml(entry.definition)}</p><small style="display:block;margin-top:0.75rem;color:#718096">Page ${entry.page}</small></div>`;
    }

    formatEntryCard(entry, index, dictName) {
    const color = this.getDictColor(dictName);
    const pageInfo = entry.page ? `<br><small style="color:#718096">Page ${entry.page}</small>` : '';
    
    // Truncate long definitions
    let definition = this.escapeHtml(entry.definition);
    if (definition.length > 400) {
        definition = definition.substring(0, 400) + '...';
    }
    
    return `<div class="entry-card" style="margin-bottom:1rem;padding:1rem;background:#f7f9fa;border-radius:8px;border-left:3px solid ${color}"><strong style="color:${color}">Entry ${index+1}:</strong> ${definition}${pageInfo}</div>`;
}
    getDictColor(name) {
        const colors = {
            'Monier-Williams': '#2C5282',
            'Apte': '#2D3748',
            'Apte Hindi': '#276749',
            'Wilson': '#5B21B6',
            'Cappeller': '#742A2A'
        };
        return colors[name] || '#1B3A5C';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Dynamically fetch and cache a specific chunk for Monier-Williams Extended
     * Uses mathematical routing: chunk = Math.ceil(id / 60000)
     */
    async fetchMwExtendedChunk(id) {
        const dictName = 'Monier-Williams Extended';
        const dict = this.dictionaries.get(dictName);
        
        // If the dictionary index hasn't been loaded yet, abort
        if (!dict) return null;

        // 1. Mathematical Routing
        const numericId = parseInt(id, 10);
        const chunkIndex = Math.ceil(numericId / 60000);
        const chunkName = `mw-${chunkIndex}`;
        
        // 2. Initialize a Set to track downloaded chunks if it doesn't exist
        if (!dict.loadedChunks) {
            dict.loadedChunks = new Set();
        }
        
        // 3. Fetch the chunk dynamically if we haven't already
        if (!dict.loadedChunks.has(chunkName)) {
            console.log(`Downloading missing chunk: ${chunkName}.json...`);
            try {
                // Adjust this path if your dictionaries are stored elsewhere
                const response = await fetch(`dictionaries/${chunkName}.json`);
                const chunkData = await response.json();
                
                // Merge the newly downloaded definitions into our existing text cache
                Object.assign(dict.text, chunkData.data);
                
                // Mark this chunk as loaded so we never fetch it twice
                dict.loadedChunks.add(chunkName);
            } catch (err) {
                console.error(`Failed to load ${chunkName}:`, err);
                return null;
            }
        }
        
        // 4. Return the specific definition text
        return dict.text[id];
    }
}

// Global instance
window.DictionaryManager = new DictionaryManager();