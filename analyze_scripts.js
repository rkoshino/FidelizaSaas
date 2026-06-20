const fs = require('fs');

function analyzeFile(filename) {
    const txt = fs.readFileSync(filename, 'utf-8');
    const scripts = [];
    let start = 0;
    while ((start = txt.indexOf('<script', start)) !== -1) {
        const end = txt.indexOf('</script>', start) + 9;
        const tag = txt.substring(start, end);
        scripts.push(tag);
        start = end;
    }
    
    console.log(`\n=== ${filename} ===`);
    scripts.forEach((s, i) => {
        const isInline = !s.includes('src=');
        const lines = s.split('\n').length;
        console.log(`Script ${i}: ${isInline ? 'INLINE' : 'EXTERNAL'} - ${lines} lines`);
    });
}

analyzeFile('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html');
analyzeFile('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/cliente.html');
analyzeFile('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/dashboard.html');
