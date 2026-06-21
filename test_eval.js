const fs = require('fs');
let code = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/js/vendedor.js', 'utf-8');
code = code.replace(/import\s+.*?from\s+['"].*?['"];/gs, '');

const mockWindow = {
    AudioContext: function() { this.state = 'suspended'; },
    webkitAudioContext: function() { this.state = 'suspended'; }
};

const wrapped = `(function(window, document, navigator, console, localStorage, Html5Qrcode, QRCode) { 
    ${code} 
})`;

try {
    eval(wrapped)(mockWindow, {}, {}, console, {getItem:()=>null}, {get:()=>null}, function(){}, function(){});
    console.log('Parsed and ran globals successfully!');
} catch(e) {
    console.error('Error during execution:', e);
}
