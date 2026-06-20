const fs = require('fs');
let txt = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', 'utf-8');
const startId = '<div id="edit-cartao-container"';
const startIdx = txt.indexOf(startId);
if (startIdx === -1) {
    console.log('Not found');
    process.exit(1);
}
const endString = '</form></div>';
const endIdx = txt.indexOf(endString, startIdx) + endString.length;
const formContent = txt.substring(startIdx, endIdx);

fs.writeFileSync('form-extract.html', formContent);

// Remove the inline form from its current position
txt = txt.substring(0, startIdx) + txt.substring(endIdx);
fs.writeFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', txt);

console.log('Extracted and removed inline form.');
