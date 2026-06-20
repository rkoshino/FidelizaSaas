const fs = require('fs');
const html = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', 'utf-8');
const lines = html.split('\n');

let tagStack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let openMatch;
    const openRegex = /<div([^>]*?)>/g;
    while ((openMatch = openRegex.exec(line)) !== null) {
        let idMatch = openMatch[1].match(/id="([^"]+)"/);
        let id = idMatch ? idMatch[1] : null;
        tagStack.push({ line: i + 1, id });
        if (id === 'edit-cartao-container') {
            console.log('Found edit-cartao-container at line', i + 1);
            console.log('Current stack of IDs:');
            console.log(tagStack.filter(t => t.id).map(t => t.id).join(' -> '));
            process.exit(0);
        }
    }
    
    const closeMatch = line.match(/<\/div>/g);
    if (closeMatch) {
        for (let j = 0; j < closeMatch.length; j++) {
            tagStack.pop();
        }
    }
}
