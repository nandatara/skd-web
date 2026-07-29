/**
 * Main Application Logic
 * Initializes components and handles user interactions
 */

(function() {
    'use strict';
    
    // Elements
    const searchInput = document.getElementById('searchInput');
    const devOutput = document.getElementById('devOutput');
    const iastOutput = document.getElementById('iastOutput');
    const slp1Output = document.getElementById('slp1Output');
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Input mode (exposed globally for HTML onclick)
    window.currentInputMode = 'devanagari';
    
    // Dictionary name → HTML element mapping
    const DICT_MAP = {
        'Wilson':          { badge: 'wilsonCount',     card: 'card-wilson',     body: 'body-wilson' },
        'Monier-Williams': { badge: 'mwCount',         card: 'card-monier',     body: 'body-monier' },
        'Apte':            { badge: 'apteCount',       card: 'card-apte',       body: 'body-apte' },
        'Apte Hindi':      { badge: 'apteHindiCount',  card: 'card-apteHindi',  body: 'body-apteHindi' },
        'Cappeller':       { badge: 'cappellerCount',  card: 'card-cappeller',   body: 'body-cappeller' },
        'McDonell':        { badge: 'mcdonellCount',   card: 'card-mcdonell',   body: 'body-mcdonell' },
        'Monier-Williams Extended': { badge: 'mwExtendedCount', card: 'card-mw-extended',   body: 'body-mw-extended' },
        'Lanman':          { badge: 'lanmanCount',   card: 'card-lanman',   body: 'body-lanman' },
        'Apte English-Sanskrit':          { badge: 'aeCount',   card: 'card-ae',   body: 'body-ae' },
        'Goldstücker':     { badge: 'goldstuckerCount',   card: 'card-goldstucker',   body: 'body-goldstucker' },
        'MW English-Sanskrit':          { badge: 'mweCount',   card: 'card-mwe',   body: 'body-mwe' },
        'Benfey':          { badge: 'benfeyCount',   card: 'card-benfey',   body: 'body-benfey' },
        'Bharati':         { badge: 'bharatiCount',   card: 'card-bharati',   body: 'body-bharati' },
        'MCI':             { badge: 'mciCount',   card: 'card-mci',   body: 'body-mci' },
        'INM':             { badge: 'inmCount',   card: 'card-inm',   body: 'body-inm' },
        'BHS':             { badge: 'bhsCount',   card: 'card-bhs',   body: 'body-bhs' },
        'IEG':             { badge: 'iegCount',   card: 'card-ieg',   body: 'body-ieg' },
        'ACC':             { badge: 'accCount',   card: 'card-acc',   body: 'body-acc' },
        'ARMH':             { badge: 'armhCount',   card: 'card-armh',   body: 'body-armh' },
        'VCP':             { badge: 'vcpCount',   card: 'card-vcp',   body: 'body-vcp' },
        'SHS':             { badge: 'shsCount',   card: 'card-shs',   body: 'body-shs' },
        'SKD':             { badge: 'skdCount',   card: 'card-skd',   body: 'body-skd' },
        'PWG':             { badge: 'pwgCount',   card: 'card-pwg',   body: 'body-pwg' },
        'GRA':             { badge: 'graCount',   card: 'card-gra',   body: 'body-gra' },
        'PW':             { badge: 'pwCount',   card: 'card-pw',   body: 'body-pw' },
        'CCS':             { badge: 'ccsCount',   card: 'card-ccs',   body: 'body-ccs' },
        'SCH':             { badge: 'schCount',   card: 'card-sch',   body: 'body-sch' },
        'BUR':             { badge: 'burCount',   card: 'card-bur',   body: 'body-bur' },
        'STC':             { badge: 'stcCount',   card: 'card-stc',   body: 'body-stc' },
        'MWE':             { badge: 'mweCount',   card: 'card-mwe',   body: 'body-mwe' },
        'AE':             { badge: 'aeCount',   card: 'card-ae',   body: 'body-ae' },
        'BOR':             { badge: 'borCount',   card: 'card-bor',   body: 'body-bor' },
        'PUI':             { badge: 'puiCount',   card: 'card-pui',   body: 'body-pui' },
        'PE':             { badge: 'peCount',   card: 'card-pe',   body: 'body-pe' },
        'PGN':             { badge: 'pgnCount',   card: 'card-pgn',   body: 'body-pgn' },
        'KRM':             { badge: 'krmCount',   card: 'card-krm',   body: 'body-krm' },
        'VEI':             { badge: 'veiCount',   card: 'card-vei',   body: 'body-vei' },
        'BOP':             { badge: 'bopCount',   card: 'card-bop',   body: 'body-bop' }

    };
    
    // Track loaded dictionaries
    const loadedDicts = new Set();
    
    // Debounce helper
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Set input mode (exposed to window for HTML onclick)
    window.setInputMode = function(mode) {
        window.currentInputMode = mode;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        const placeholders = {
            'devanagari': 'Enter word in Devanagari: राम',
            'iast': 'Enter word in IAST: rāma',
            'slp1': 'Enter word in SLP1: rAma'
        };
        searchInput.placeholder = placeholders[mode];
        searchInput.focus();
    };
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('Initializing Sanskrit Dictionary App...');
        
        // Automatically switch between local testing and production CDN
        const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

        const DATA_URL = IS_LOCAL 
            ? 'dictionaries' 
            : 'https://cdn.jsdelivr.net/gh/nandatara/skd-data/dictionaries';
        
        await window.DictionaryManager.initialize({
            'Wilson': {
                main: `${DATA_URL}/wil.json`,
                slp1Index: `${DATA_URL}/wil_slp1_index.json`
            },
            'Cappeller': {
                main: `${DATA_URL}/cae.json`,
                slp1Index: `${DATA_URL}/cae_slp1_index.json`
            },
            'Apte': {
                main: `${DATA_URL}/ap90.json`,
                slp1Index: `${DATA_URL}/ap90_slp1_index.json`
            },
            'Apte Hindi': {
                main: `${DATA_URL}/aptehindi.json`,
                slp1Index: `${DATA_URL}/aptehindi_slp1_index.json`
            },
            'Monier-Williams': {
                main: `${DATA_URL}/mw72.json`,
                slp1Index: `${DATA_URL}/mw72_slp1_index.json`
            },
            'McDonell': { 
                main: `${DATA_URL}/md.json`,            
                slp1Index: `${DATA_URL}/md_slp1_index.json` 
            },
            'Monier-Williams Extended': {
                main: `${DATA_URL}/mw-0.json`,
                slp1Index: `${DATA_URL}/mw_slp1_index.json`
            },
            'Lanman': { 
                main: `${DATA_URL}/lan.json`,            
                slp1Index: `${DATA_URL}/lan_slp1_index.json` 
            },
            'Apte English-Sanskrit': { 
                main: `${DATA_URL}/ae.json`,            
                slp1Index: `${DATA_URL}/ae_slp1_index.json` 
            },

            'Goldstücker': { 
                main: `${DATA_URL}/gst.json`,            
                slp1Index: `${DATA_URL}/gst_slp1_index.json` 
            },
            'MW English-Sanskrit': { 
                main: `${DATA_URL}/mwe.json`,            
                slp1Index: `${DATA_URL}/mwe_slp1_index.json` 
            },

            'Benfey': { 
                main: `${DATA_URL}/ben.json`,            
                slp1Index: `${DATA_URL}/ben_slp1_index.json` 
            },
            'Bharati': { 
                main: `${DATA_URL}/bharati.json`,            
                slp1Index: `${DATA_URL}/bharati_slp1_index.json` 
            },
            'MCI': { 
                main: `${DATA_URL}/mci.json`,            
                slp1Index: `${DATA_URL}/mci_slp1_index.json` 
            },
            'INM': { 
                main: `${DATA_URL}/inm.json`,            
                slp1Index: `${DATA_URL}/inm_slp1_index.json` 
            },
            'BHS': { 
                main: `${DATA_URL}/bhs.json`,            
                slp1Index: `${DATA_URL}/bhs_slp1_index.json` 
            },
            'IEG': { 
                main: `${DATA_URL}/ieg.json`,            
                slp1Index: `${DATA_URL}/ieg_slp1_index.json` 
            },
            'ACC': { 
                main: `${DATA_URL}/acc.json`,            
                slp1Index: `${DATA_URL}/acc_slp1_index.json` 
            },
            'ARMH': { 
                main: `${DATA_URL}/armh.json`,            
                slp1Index: `${DATA_URL}/armh_slp1_index.json` 
            },
            'VCP': { 
                main: `${DATA_URL}/vcp.json`,            
                slp1Index: `${DATA_URL}/vcp_slp1_index.json` 
            },
            'SHS': { 
                main: `${DATA_URL}/shs.json`,            
                slp1Index: `${DATA_URL}/shs_slp1_index.json` 
            },
            'SKD': { 
                main: `${DATA_URL}/skd.json`,            
                slp1Index: `${DATA_URL}/skd_slp1_index.json` 
            },
            'PWG': { 
                main: `${DATA_URL}/pwg.json`,            
                slp1Index: `${DATA_URL}/pwg_slp1_index.json` 
            },
            'GRA': { 
                main: `${DATA_URL}/gra.json`,            
                slp1Index: `${DATA_URL}/gra_slp1_index.json` 
            },
            'PW': { 
                main: `${DATA_URL}/pw.json`,            
                slp1Index: `${DATA_URL}/pw_slp1_index.json` 
            },
            'CCS': { 
                main: `${DATA_URL}/ccs.json`,            
                slp1Index: `${DATA_URL}/ccs_slp1_index.json` 
            },
            'SCH': { 
                main: `${DATA_URL}/sch.json`,            
                slp1Index: `${DATA_URL}/sch_slp1_index.json` 
            },
            'BUR': { 
                main: `${DATA_URL}/bur.json`,            
                slp1Index: `${DATA_URL}/bur_slp1_index.json` 
            },
            'STC': { 
                main: `${DATA_URL}/stc.json`,            
                slp1Index: `${DATA_URL}/stc_slp1_index.json` 
            },
            'MWE': { 
                main: `${DATA_URL}/mwe.json`,            
                slp1Index: `${DATA_URL}/mwe_slp1_index.json` 
            },
            'AE': { 
                main: `${DATA_URL}/ae.json`,            
                slp1Index: `${DATA_URL}/ae_slp1_index.json` 
            },
            'BOR': { 
                main: `${DATA_URL}/bor.json`,            
                slp1Index: `${DATA_URL}/bor_slp1_index.json` 
            },
            'PUI': { 
                main: `${DATA_URL}/pui.json`,            
                slp1Index: `${DATA_URL}/pui_slp1_index.json` 
            },
            'PE': { 
                main: `${DATA_URL}/pe.json`,            
                slp1Index: `${DATA_URL}/pe_slp1_index.json` 
            },
            'PGN': { 
                main: `${DATA_URL}/pgn.json`,            
                slp1Index: `${DATA_URL}/pgn_slp1_index.json` 
            },

            'KRM': { 
                main: `${DATA_URL}/krm.json`,            
                slp1Index: `${DATA_URL}/krm_slp1_index.json` 
            },
            'VEI': { 
                main: `${DATA_URL}/vei.json`,            
                slp1Index: `${DATA_URL}/vei_slp1_index.json` 
            },
            'BOP': { 
                main: `${DATA_URL}/bop.json`,            
                slp1Index: `${DATA_URL}/bop_slp1_index.json` 
            }

        });
        
        loadedDicts.add('Wilson');
        loadedDicts.add('Cappeller');
        loadedDicts.add('Apte');
        loadedDicts.add('Apte Hindi');
        loadedDicts.add('Monier-Williams');
        loadedDicts.add('McDonell');
        loadedDicts.add('Lanman');
        loadedDicts.add('Monier-Williams Extended');
        loadedDicts.add('Apte English-Sanskrit');
        loadedDicts.add('Goldstücker');
        loadedDicts.add('MW English-Sanskrit');
        loadedDicts.add('Benfey');
        loadedDicts.add('Bharati');
        loadedDicts.add('MCI');
        loadedDicts.add('INM');
        loadedDicts.add('BHS');
        loadedDicts.add('IEG');
        loadedDicts.add('ACC');
        loadedDicts.add('ARMH');
        loadedDicts.add('VCP');
        loadedDicts.add('SHS');
        loadedDicts.add('SKD');
        loadedDicts.add('PWG');
        loadedDicts.add('GRA');
        loadedDicts.add('PW');
        loadedDicts.add('CCS');
        loadedDicts.add('SCH');
        loadedDicts.add('BUR');
        loadedDicts.add('STC');
        loadedDicts.add('MWE');
        loadedDicts.add('AE');
        loadedDicts.add('BOR');
        loadedDicts.add('PUI');
        loadedDicts.add('PE');
        loadedDicts.add('PGN');
        loadedDicts.add('KRM');
        loadedDicts.add('VEI');
        loadedDicts.add('BOP');


        console.log('Loaded dictionaries:', Array.from(loadedDicts));
        
        updateDictionaryCounts();
        setupSearchHandler();
        attachToggleHandlers();
        window.setInputMode('devanagari');
        
        console.log('App initialized successfully');
    });
    
    // Update dictionary word counts display
    function updateDictionaryCounts() {
        for (const [dictName, info] of Object.entries(DICT_MAP)) {
            const el = document.getElementById(info.badge);
            if (!el) continue;
            
            if (loadedDicts.has(dictName)) {
                const count = window.DictionaryManager.getCount(dictName);
                el.textContent = `${count || 0} words`;
                el.classList.remove('no-match', 'has-match');
            } else {
                el.textContent = 'Not loaded';
                el.classList.add('no-match');
                el.classList.remove('has-match');
            }
        }
    }
    
    // Setup search input handler
    function setupSearchHandler() {
        let activeQuery = ''; 
        searchInput.addEventListener('input', debounce(async (e) => {
            const input = e.target.value.trim();
            
            if (!input) {
                devOutput.textContent = '-';
                iastOutput.textContent = '-';
                slp1Output.textContent = '-';
                resultsContainer.innerHTML = '<p class="placeholder-text">Start typing to search dictionaries</p>';
                resetAll();
                return;
            }
            
            try {
                const funcs = window.transliterateFunctions;
                let detected;
                
                switch(window.currentInputMode) {
                    case 'devanagari':
                        detected = funcs.detectAndTransliterate(input);
                        break;
                    case 'iast':
                        const devFromIAST = funcs.iastToDevanagari(input);
                        detected = {
                            dev: devFromIAST,
                            iast: input,
                            slp1: funcs.devanagariToSLP1(devFromIAST),
                            canonical: devFromIAST
                        };
                        break;
                    case 'slp1':
                        const devFromSLP1 = funcs.slp1ToDevanagari(input);
                        detected = {
                            dev: devFromSLP1,
                            iast: funcs.devanagariToIAST(devFromSLP1),
                            slp1: input,
                            canonical: devFromSLP1
                        };
                        break;
                }
                
                devOutput.textContent = detected.dev;
                iastOutput.textContent = detected.iast;
                slp1Output.textContent = detected.slp1;
                
                updateCardBadges({});
                collapseLogic({});
                
                const results = await window.DictionaryManager.prefixSearchSLP1(detected.slp1);

                 // If the user typed a new letter while the network was loading, stop processing this old request!
                if (input !== activeQuery) return; 
                
                updateCardBadges(results);
                collapseLogic(results);
                
                window.DictionaryManager.renderResultsInCards(results);
                
                const totalMatches = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
                if (totalMatches > 0) {
                    resultsContainer.innerHTML = `<div class="results-summary" style="padding:1rem;color:#1B3A5C">Found <strong>${totalMatches}</strong> entr${totalMatches === 1 ? 'y' : 'ies'}</div>`;
                } else {
                    resultsContainer.innerHTML = '<p class="placeholder-text">No entries found</p>';
                }
            } catch (err) {
                console.error('Search error:', err);
                devOutput.textContent = 'Error';
                iastOutput.textContent = 'Error';
                slp1Output.textContent = 'Error';
                resultsContainer.innerHTML = '<p class="placeholder-text" style="color:#C53030">Error during search</p>';
            }
        }, 600));
    }
    
    // Update count badges
    function updateCardBadges(results) {
        for (const [dictName, info] of Object.entries(DICT_MAP)) {
            const el = document.getElementById(info.badge);
            if (!el) continue;
            
            if (!loadedDicts.has(dictName)) {
                el.textContent = '—';
                el.classList.add('no-match');
                el.classList.remove('has-match');
                continue;
            }
            
            const count = (results[dictName] || []).length;
            
            if (count === 0) {
                el.textContent = '0';
                el.classList.add('no-match');
                el.classList.remove('has-match');
            } else if (count >= 50) {
                el.textContent = '50+';
                el.classList.add('has-match');
                el.classList.remove('no-match');
            } else {
                el.textContent = String(count);
                el.classList.add('has-match');
                el.classList.remove('no-match');
            }
        }
    }
    
    // Collapse/expand logic
    function collapseLogic(results) {
        for (const [dictName, info] of Object.entries(DICT_MAP)) {
            const cardEl = document.getElementById(info.card);
            if (!cardEl) continue;
            
            const hasMatches = results[dictName] && results[dictName].length > 0;
            cardEl.classList.toggle('collapsed', !hasMatches);
        }
    }
    
    // Reset everything when search is cleared
    function resetAll() {
        const cards = document.querySelectorAll('.dict-card');
        cards.forEach(card => card.classList.remove('collapsed'));
        updateDictionaryCounts();
        
        for (const [, info] of Object.entries(DICT_MAP)) {
            const el = document.getElementById(info.body);
            if (el) {
                el.innerHTML = '<p class="placeholder-text">Awaiting search...</p>';
            }
        }
    }
    
    // Manual toggle on header click
    function attachToggleHandlers() {
        const grid = document.querySelector('.dictionary-grid');
        if (!grid) return;
        
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.dict-card');
            if (!card) return;
            
            const badge = card.querySelector('.dict-count-badge');
            if (badge && (badge === e.target || badge.contains(e.target))) {
                return;
            }
            
            card.classList.toggle('collapsed');
        });
    }
})();