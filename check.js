const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mainMatch = html.match(/<main[\s\S]*?<\/main>/);
let code = mainMatch[0];
let depth = 0;
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let open = (line.match(/<div\b/g) || []).length;
    let close = (line.match(/<\/div>/g) || []).length;
    depth += (open - close);
    if (line.includes('id="step-panel-') || line.includes('lg:col-span-')) {
        console.log(i + ': ' + line.trim() + ' [Depth After: ' + depth + ']');
    }
}
