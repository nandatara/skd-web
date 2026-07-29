// assets/js/transliterate.js - Fixed version with uppercase SLP1 support

var IAST_TO_DEV = [['ā','आ'],['ī','ई'],['ū','ऊ'],['ṝ','ॠ'],['ḹ','ॡ'],['ḷ','ऌ'],['ai','ऐ'],['au','औ'],['kh','ख'],['gh','घ'],['ch','छ'],['jh','झ'],['ṭh','ठ'],['ḍh','ढ'],['th','थ'],['dh','ध'],['ph','फ'],['bh','भ'],['ṅ','ङ'],['ñ','ञ'],['ṭ','ट'],['ḍ','ड'],['ṇ','ण'],['ś','श'],['ṣ','ष'],['ṃ','ं'],['ḥ','ः'],['ṁ','ँ'],['a','अ'],['i','इ'],['u','उ'],['ṛ','ऋ'],['e','ए'],['o','ओ'],['k','क'],['g','ग'],['c','च'],['j','ज'],['t','त'],['d','द'],['n','न'],['p','प'],['b','ब'],['m','म'],['y','य'],['r','र'],['l','ल'],['v','व'],['s','स'],['h','ह']];

var DEV_TO_IAST_FULL = {'अ':'a','आ':'ā','इ':'i','ई':'ī','उ':'u','ऊ':'ऊ','ऋ':'ṛ','ॠ':'ṝ','ऌ':'ḷ','ॡ':'ḹ','ए':'e','ऐ':'ai','ओ':'o','औ':'au','क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ṅ','च':'c','छ':'ch','ज':'j','झ':'jh','ञ':'ñ','ट':'ṭ','ठ':'ṭh','ड':'ḍ','ढ':'ḍh','ण':'ṇ','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'ś','ष':'ṣ','स':'s','ह':'h','ं':'ṃ','ः':'ḥ','ँ':'m̐','्':''};

var SLP1_TO_DEV = [['O','औ'],['E','ऐ'],['RR','ॠ'],['lR','ऌ'],['lRR','ॡ'],['A','आ'],['I','ई'],['U','ऊ'],['f','ऋ'],['F','ॠ'],['x','ऌ'],['X','ॡ'],['e','ए'],['o','ओ'],['N','ङ'],['Y','ञ'],['w','ट'],['W','ठ'],['q','ड'],['Q','ढ'],['R','ण'],['z','ष'],['S','श'],['M','ं'],['H','ः'],['~','ँ'],['a','अ'],['i','इ'],['u','उ'],['k','क'],['K','ख'],['g','ग'],['G','घ'],['c','च'],['C','छ'],['j','ज'],['J','झ'],['t','त'],['T','थ'],['d','द'],['D','ध'],['n','न'],['p','प'],['P','फ'],['b','ब'],['B','भ'],['m','म'],['y','य'],['r','र'],['l','ल'],['v','व'],['s','स'],['h','ह']];

const DEV_TO_SLP1_FULL = {'अ':'a','आ':'A','इ':'i','ई':'I','उ':'u','ऊ':'U','ऋ':'f','ॠ':'RR','ऌ':'lR','ॡ':'lRR','ए':'e','ऐ':'E','ओ':'o','औ':'O','क':'k','ख':'K','ग':'g','घ':'G','ङ':'N','च':'c','छ':'C','ज':'j','झ':'J','ञ':'Y','ट':'w','ठ':'W','ड':'q','ढ':'Q','ण':'R','त':'t','थ':'T','द':'d','ध':'D','न':'n','प':'p','फ':'P','ब':'b','भ':'B','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'S','ष':'z','स':'s','ह':'h','ं':'M','ः':'H','ँ':'~','्':''};

function devanagariToIAST(dev) {
    const matraMap = {'ा':'ā','ि':'i','ी':'ī','ु':'u','ू':'ū','ृ':'ṛ','ॄ':'ṝ','ॢ':'ḷ','ॣ':'ḹ','े':'e','ै':'ai','ो':'o','ौ':'au'};
    const isConsonant = ch => ch.charCodeAt(0) >= 0x0915 && ch.charCodeAt(0) <= 0x0939;
    const isVowel = ch => 'अआइईउऊऋॠऌॡएऐओऔ'.includes(ch);
    
    let out = '';
    for (let i = 0; i < dev.length; i++) {
        const ch = dev[i];
        
        if (ch === '्') continue;
        
        if (matraMap[ch]) {
            out += matraMap[ch];
            continue;
        }
        
        if (isVowel(ch)) {
            out += DEV_TO_IAST_FULL[ch] || '';
            continue;
        }
        
        if (isConsonant(ch)) {
            out += DEV_TO_IAST_FULL[ch] || '';
            const next = dev[i + 1];
            if (!matraMap[next] && next !== '्' && !isVowel(next)) {
                out += 'a';
            }
            continue;
        }
        
        out += DEV_TO_IAST_FULL[ch] || ch;
    }
    return out;
}

function devanagariToSLP1(dev) {
    const matraMap = {'ा':'A','ि':'i','ी':'I','ु':'u','ू':'U','ृ':'f','ॄ':'RR','ॢ':'lR','ॣ':'lRR','े':'e','ै':'E','ो':'o','ौ':'O'};
    const isConsonant = ch => ch.charCodeAt(0) >= 0x0915 && ch.charCodeAt(0) <= 0x0939;
    const isVowel = ch => 'अआइईउऊऋॠऌॡएऐओऔ'.includes(ch);
    
    let out = '';
    for (let i = 0; i < dev.length; i++) {
        const ch = dev[i];
        
        if (ch === '्') continue;
        
        if (matraMap[ch]) {
            out += matraMap[ch];
            continue;
        }
        
        if (isVowel(ch)) {
            out += DEV_TO_SLP1_FULL[ch] || '';
            continue;
        }
        
        if (isConsonant(ch)) {
            out += DEV_TO_SLP1_FULL[ch] || '';
            const next = dev[i + 1];
            if (!matraMap[next] && next !== '्' && !isVowel(next)) {
                out += 'a';
            }
            continue;
        }
        
        out += DEV_TO_SLP1_FULL[ch] || ch;
    }
    return out;
}

function iastToDevanagari(iast) {
    let tokens = [], i = 0;
    while (i < iast.length) {
        if (iast[i] === ' ' || iast[i] === '\n' || iast[i] === ',') { 
            tokens.push({type:'space', val: iast[i]}); 
            i++; 
            continue; 
        }
        let matched = false;
        for (const [iastCh, devCh] of IAST_TO_DEV) {
            if (iast.substring(i, i + iastCh.length) === iastCh) { 
                tokens.push({type:'char', val: devCh}); 
                i += iastCh.length; 
                matched = true; 
                break; 
            }
        }
        if (!matched) { 
            tokens.push({type:'char', val: iast[i]}); 
            i++; 
        }
    }
    const isDevConsonant = c => c.charCodeAt(0) >= 0x0915 && c.charCodeAt(0) <= 0x0939;
    const isDevVowel = c => 'अआइईउऊऋॠऌॡएऐओऔ'.includes(c);
    const vowelToMatra = {'अ':null,'आ':'ा','इ':'ि','ई':'ी','उ':'ु','ऊ':'ू','ऋ':'ृ','ॠ':'ॄ','ऌ':'ॢ','ॡ':'ॣ','ए':'े','ऐ':'ै','ओ':'ो','औ':'ौ'};
    let dev = '', prevWasConsonant = false;
    for (let j = 0; j < tokens.length; j++) {
        const tk = tokens[j];
        if (tk.type === 'space') { dev += tk.val; prevWasConsonant = false; continue; }
        const c = tk.val;
        if (isDevConsonant(c)) { if (prevWasConsonant) dev += '्'; dev += c; prevWasConsonant = true; }
        else if (isDevVowel(c)) { if (prevWasConsonant) { if (vowelToMatra[c]) dev += vowelToMatra[c]; } else { dev += c; } prevWasConsonant = false; }
        else if (c === 'ं' || c === 'ः' || c === 'ँ') { dev += c; prevWasConsonant = false; }
        else { dev += c; prevWasConsonant = false; }
    }
    return dev;
}

function slp1ToDevanagari(slp) {
    const sorted = [...SLP1_TO_DEV].sort((a,b) => b[0].length - a[0].length);
    let tokens = [], i = 0;
    while (i < slp.length) {
        if (slp[i] === ' ' || slp[i] === '\n' || slp[i] === ',') { 
            tokens.push({type:'space', val: slp[i]}); 
            i++; 
            continue; 
        }
        let matched = false;
        for (const [slpCh, devCh] of sorted) {
            if (slp.substring(i, i + slpCh.length) === slpCh) { 
                tokens.push({type:'char', val: devCh}); 
                i += slpCh.length; 
                matched = true; 
                break; 
            }
        }
        if (!matched) { 
            tokens.push({type:'char', val: slp[i]}); 
            i++; 
        }
    }
    const isDevConsonant = c => c.charCodeAt(0) >= 0x0915 && c.charCodeAt(0) <= 0x0939;
    const isDevVowel = c => 'अआइईउऊऋॠऌॡएऐओऔ'.includes(c);
    const vowelToMatra = {'अ':null,'आ':'ा','इ':'ि','ई':'ी','उ':'ु','ऊ':'ू','ऋ':'ृ','ॠ':'ॄ','ऌ':'ॢ','ॡ':'ॣ','ए':'े','ऐ':'ै','ओ':'ो','औ':'ौ'};
    let dev = '', prevWasConsonant = false;
    for (let j = 0; j < tokens.length; j++) {
        const tk = tokens[j];
        if (tk.type === 'space') { dev += tk.val; prevWasConsonant = false; continue; }
        const c = tk.val;
        if (isDevConsonant(c)) { if (prevWasConsonant) dev += '्'; dev += c; prevWasConsonant = true; }
        else if (isDevVowel(c)) { if (prevWasConsonant) { if (vowelToMatra[c]) dev += vowelToMatra[c]; } else { dev += c; } prevWasConsonant = false; }
        else if (c === 'ं' || c === 'ः' || c === 'ँ') { dev += c; prevWasConsonant = false; }
        else { dev += c; prevWasConsonant = false; }
    }
    return dev;
}

function detectAndTransliterate(text) {
    if (!text || !text.trim()) {
        return { dev: '', iast: '', slp1: '', canonical: '' };
    }
    text = text.trim();

    // Devanagari input (Unicode characters U+0900-U+097F)
    if (/[\u0900-\u097F]/.test(text)) {
        return { 
            dev: text, 
            iast: devanagariToIAST(text), 
            slp1: devanagariToSLP1(text), 
            canonical: text 
        };
    }

    // Detect IAST by checking for diacritics OR common IAST digraphs
    const hasDiacritics = /[\u0100-\u017F\u1E00-\u1EFF]/.test(text);
    const hasIASTDigraphs = /\b(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|ṇ|ś|ṣ|ṛ|ṝ|ḷ|ḹ)\b/i.test(text.replace(/\s/g, ''));
    
    if (hasDiacritics || hasIASTDigraphs) {
        const dev = iastToDevanagari(text);
        return { 
            dev: dev, 
            iast: text, 
            slp1: devanagariToSLP1(dev), 
            canonical: dev 
        };
    }

    // Pure ASCII without IAST digraphs → SLP1
    const dev = slp1ToDevanagari(text);
    return { 
        dev: dev, 
        iast: devanagariToIAST(dev), 
        slp1: text, 
        canonical: dev 
    };
}
window.SanskritTransliterator = { 
    detectAndTransliterate: detectAndTransliterate 
};

// Export all functions for explicit mode handling
window.transliterateFunctions = {
    detectAndTransliterate: detectAndTransliterate,
    devanagariToIAST: devanagariToIAST,
    devanagariToSLP1: devanagariToSLP1,
    iastToDevanagari: iastToDevanagari,
    slp1ToDevanagari: slp1ToDevanagari
};