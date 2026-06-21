const fs = require('fs');
let code = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/js/vendedor.js', 'utf-8');

const lines = code.split('\n');
lines.forEach((l, i) => {
    // identify top level code
    if (!l.match(/^\s*\/\//) && !l.match(/^\s*function/) && !l.match(/^\s*window\./) && !l.match(/^\s*let /) && !l.match(/^\s*const /) && !l.match(/^\s*import /) && !l.match(/^\s*$/) && !l.match(/^\s*\}/) && !l.match(/^\s*\{/) && !l.startsWith('    ')) {
        console.log((i+1) + ': ' + l.trim());
    }
});
