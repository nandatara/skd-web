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
                
                // BULLETPROOF PARSING: Check for old format (data.data.words) OR new format (data.data)
                const wordsData = data.data?.words || data.data || data;
                Object.assign(words, wordsData);
                
                // Text might not exist in the router file (mw-0.json)
                if (data.data?.text) {
                    Object.assign(text, data.data.text);
                }
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
     * Scans for words starting with given prefix and lazily fetches chunks if needed
     */
    async prefixSearchSLP1(prefix) {
        const results = {};
        
        for (const [name, dict] of this.dictionaries.entries()) {
            if (!dict.words_slp1) continue;
            
            const matches = [];
            const chunkedDicts = ['Monier-Williams Extended', 'Apte Hindi', 'SKD', 'VCP', 'Monier-Williams', 'PW', 'PWG'];
            const isChunked = chunkedDicts.includes(name); 

            for (const [slp1Key, devKey] of Object.entries(dict.words_slp1)) {
                if (slp1Key.startsWith(prefix)) {
                    const entryIds = dict.words[devKey]?.split(',');
                    if (!entryIds) continue;
                    
                    // Flag if this is a perfect match to the user's input
                    const isExactMatch = slp1Key === prefix;
                    
                    for (const id of entryIds) {
                        if (isChunked) {
                            await this.fetchChunkedDictionary(name, id);
                        }
                        
                        const entry = dict.text[id];
                        if (!entry) continue;
                        
                        if (Array.isArray(entry)) {
                            matches.push({
                                entryId: id,
                                headword: devKey,
                                definition: entry[0],
                                page: entry[1],
                                entryNum: entry[2],
                                slp1Key: slp1Key,
                                isExact: isExactMatch // Store the flag
                            });
                        } else {
                            matches.push({
                                entryId: id,
                                headword: devKey,
                                definition: entry,
                                page: null,
                                entryNum: null,
                                slp1Key: slp1Key,
                                isExact: isExactMatch // Store the flag
                            });
                        }
                    }
                }
            }
            
            if (matches.length > 0) {
                // Sort results: Exact matches first, then alphabetically by SLP1 key
                matches.sort((a, b) => {
                    if (a.isExact && !b.isExact) return -1;
                    if (!a.isExact && b.isExact) return 1;
                    return a.slp1Key.localeCompare(b.slp1Key);
                });
                
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
            
            if (totalCount <= 1) {
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
/**
     * Render results grouped by dictionary, with live counts per card (NEW METHOD)
     */
/**
     * Render results grouped by dictionary, with live counts per card
     */
/**
     * Render results grouped by dictionary, with live counts per card
     */
    renderResultsInCards(results, initialDisplay = 1, maxLimit = 25) {
        const cardIds = {
            'Monier-Williams': 'body-monier',
            'Apte': 'body-apte',
            'Apte Hindi': 'body-apteHindi',
            'Wilson': 'body-wilson',
            'Cappeller': 'body-cappeller',
            'McDonell': 'body-mcdonell',
            'Monier-Williams Extended': 'body-mw-extended',
            'Lanman': 'body-lanman',
            'Apte English-Sanskrit': 'body-ae',
            'Goldstücker': 'body-goldstucker',
            'MW English-Sanskrit': 'body-mwe',
            'Benfey': 'body-benfey',
            'Bharati': 'body-bharati',
            'MCI': 'body-mci',
            'INM': 'body-inm',
            'BHS': 'body-bhs',
            'IEG': 'body-ieg',
            'ACC': 'body-acc',
            'ARMH': 'body-armh',
            'VCP': 'body-vcp',
            'SHS': 'body-shs',
            'SKD': 'body-skd',
            'PWG': 'body-pwg',
            'GRA': 'body-gra',
            'PW': 'body-pw',
            'CCS': 'body-ccs',
            'SCH': 'body-sch',
            'BUR': 'body-bur',
            'STC': 'body-stc',
            'MWE': 'body-mwe',
            'AE': 'body-ae',
            'BOR': 'body-bor',
            'PUI': 'body-pui',
            'PE': 'body-pe',
            'PGN': 'body-pgn',
            'KRM': 'body-krm',
            'VEI': 'body-vei',
            'BOP': 'body-bop'

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
            
            // Limit how many we inject into the DOM to prevent browser lag on huge result sets
            const displayEntries = entries.slice(0, maxLimit);
            const color = this.getDictColor(dictName);
            
            let html = `<p style="color:#718096;margin-bottom:0.75rem"><em>${count} match${count === 1 ? '' : 'es'}</em></p>`;
            html += `<div class="entries-list">`;
            
            for (let i = 0; i < displayEntries.length; i++) {
                const entry = displayEntries[i];
                
                // Tag entries after the first one with 'extra-entry' and hide them
                const isExtra = i >= initialDisplay;
                const hiddenStyle = isExtra ? 'display:none;' : '';
                const extraClass = isExtra ? 'extra-entry' : '';
                
                html += `<div class="entry-wrapper ${extraClass}" style="${hiddenStyle}">`;
                html += this.formatEntryCard(entry, i, dictName);
                html += `</div>`;
            }
            html += `</div>`; // Close entries-list
            
            // Add the "Show More / Show Less" toggle button ONLY ONCE
            if (count > initialDisplay) {
                const unrenderedCount = count - displayEntries.length;
                
                html += `<div class="expand-controls" style="text-align:center; margin-top:1rem;">
                            <button type="button" data-expanded="false" onclick="
                                const extras = this.closest('.dict-body').querySelectorAll('.extra-entry'); 
                                const isExpanded = this.getAttribute('data-expanded') === 'true';
                                
                                if (isExpanded) {
                                    // Collapse back to single entry
                                    extras.forEach(el => el.style.display = 'none');
                                    this.innerHTML = 'Show more matches ▾';
                                    this.setAttribute('data-expanded', 'false');
                                } else {
                                    // Expand to show extra entries 
                                    extras.forEach(el => el.style.display = '');
                                    this.innerHTML = 'Show less ▴';
                                    this.setAttribute('data-expanded', 'true');
                                }
                            " style="background-color:transparent; border:1px solid ${color}; color:${color}; padding:0.5rem 1rem; border-radius:6px; cursor:pointer; font-weight:bold; transition:all 0.2s;">
                                Show more matches ▾
                            </button>
                         </div>`;
                         
                if (unrenderedCount > 0) {
                    html += `<p style="text-align:center; color:${color}; margin-top:0.75rem; font-size:0.85rem;"><em>+ ${unrenderedCount} more not shown (refine search)</em></p>`;
                }
            }
            
            bodyEl.innerHTML = html;
        }
    }      
    formatEntry(entry, dictName) {
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
        
        // Generate an "Exact Match" badge if the flag is true
        const exactBadge = entry.isExact 
            ? `<span style="background-color:${color}; color:white; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.75rem; margin-left:0.75rem; vertical-align:middle; text-transform:uppercase; letter-spacing:0.5px;">Exact Match</span>` 
            : '';
        
        return `<div class="entry-card" style="margin-bottom:1rem;padding:1rem;background:#f7f9fa;border-radius:8px;border-left:3px solid ${color}">
                    <div style="margin-bottom:0.5rem;">
                        <strong style="color:${color}; font-size:1.1rem;">${entry.headword}</strong>
                        <span style="color:#718096; font-size:0.9rem; margin-left:0.5rem;">(Entry ${index+1})</span>
                        ${exactBadge}
                    </div>
                    ${definition}${pageInfo}
                </div>`;
    }
    getDictColor(name) {
        const colors = {
            'Monier-Williams': '#2C5282',
            'Apte': '#2D3748',
            'Apte Hindi': '#276749',
            'Wilson': '#5B21B6',
            'Cappeller': '#742A2A',
            'MCDonell': '#8B4789',
            'Monier-Williams Extended': '#1A365D',
            'Lanman': '#319795',
            'Apte English-Sanskrit': '#5A67D8',
            'Goldstücker': '#D97706',
            'MW English-Sanskrit': '#E11D48',
            'Benfey': '#16A34A',
            'Bharati': '#974C5E',
            'MCI': '#2F4C39',
            'INM': '#A16AD1',
            'BHS': '#9BCC9E',
            'IEG': '#D05C39',
            'ACC': '#3D426B',
            'ARMH': '#EF9967',
            'VCP': '#BBA151',
            'SHS': '#BCBC82',
            'SKD': '#D69759',
            'PWG': '#CFAC94',
            'GRA': '#D3B8A1',
            'PW': '#E56E90',
            'CCS': '#EB618F',
            'SCH': '#75655A',
            'BUR': '#9AE2E3',
            'STC': '#E99FAA',
            'MWE': '#63B7B7',
            'AE': '#D3C7A2',
            'BOR': '#944547',
            'PUI': '#9ECB91',
            'PE': '#6ECDDB',
            'PGN': '#E5C768',
            'KRM': '#D05C39',
            'VEI': '#FFA38C',
            'BOP': '#A2CFDD'

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
/**
     * Dynamically fetch and cache a specific chunk for ANY chunked dictionary
     */
    async fetchChunkedDictionary(dictName, id) {
        const dict = this.dictionaries.get(dictName);
        if (!dict) return null;

        // Map dictionaries to their prefix and specific chunk size
        const dictConfig = {
            'Monier-Williams Extended': { prefix: 'mw', size: 60000 },
            'Apte Hindi':           { prefix: 'aptehindi', size: 60000 },
            'SKD':                  { prefix: 'skd', size: 60000 },
            'VCP':                  { prefix: 'vcp', size: 60000 },
            
            // The heavier dictionaries using smaller chunks
            'Monier-Williams':      { prefix: 'mw72', size: 30000 },
            'PW':                   { prefix: 'pw', size: 30000 },
            'PWG':                  { prefix: 'pwg', size: 30000 }
        };

        const config = dictConfig[dictName];
        if (!config) return null; 

        const numericId = parseInt(id, 10);
        
        // Calculate chunk index dynamically based on the specific dictionary's size limit
        const chunkIndex = Math.ceil(numericId / config.size);
        const chunkName = `${config.prefix}-${chunkIndex}`;
        
        if (!dict.loadedChunks) {
            dict.loadedChunks = new Set();
        }
        
        if (!dict.loadedChunks.has(chunkName)) {
            dict.loadedChunks.add(chunkName);
            
            console.log(`Downloading missing chunk: ${chunkName}.json...`);
            try {
                const base = this.baseUrl || 'dictionaries';
                const response = await fetch(`${base}/${chunkName}.json`);
                
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const chunkData = await response.json();
                
                // Bulletproof parsing
                const textData = chunkData.data?.text || chunkData.data || chunkData;
                Object.assign(dict.text, textData);
                
            } catch (err) {
                console.error(`Failed to load ${chunkName}:`, err);
                return null;
            }
        }
        
        return dict.text[id];
    }}

// Global instance
window.DictionaryManager = new DictionaryManager();