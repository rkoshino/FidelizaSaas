const fs = require('fs');
const path = require('path');

function extractLastInlineScript(filename, jsFilename) {
    let txt = fs.readFileSync(filename, 'utf-8');
    
    // Find all script tags
    const scripts = [];
    let start = 0;
    while ((start = txt.indexOf('<script', start)) !== -1) {
        const end = txt.indexOf('</script>', start) + 9;
        scripts.push({ start, end, content: txt.substring(start, end) });
        start = end;
    }
    
    // Find the last inline script
    let lastInline = null;
    for (let i = scripts.length - 1; i >= 0; i--) {
        if (!scripts[i].content.includes('src=')) {
            lastInline = scripts[i];
            break;
        }
    }
    
    if (lastInline) {
        // Extract the JS code inside the tag
        let jsCode = lastInline.content.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        // Trim leading/trailing whitespace
        jsCode = jsCode.trim();
        
        // Ensure js directory exists
        const jsDir = path.join(path.dirname(filename), 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir);
        }
        
        // Write JS file
        const jsPath = path.join(jsDir, jsFilename);
        fs.writeFileSync(jsPath, jsCode);
        
        // Replace script tag in HTML with external reference
        const newTag = `<script src="js/${jsFilename}?v=${Date.now()}"></script>`; // Added query string for cache busting
        txt = txt.substring(0, lastInline.start) + newTag + txt.substring(lastInline.end);
        
        fs.writeFileSync(filename, txt);
        console.log(`Successfully extracted ${jsFilename} from ${filename}`);
    } else {
        console.log(`No inline script found in ${filename}`);
    }
}

extractLastInlineScript('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', 'vendedor.js');
extractLastInlineScript('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/cliente.html', 'cliente.js');
extractLastInlineScript('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/dashboard.html', 'dashboard.js');
