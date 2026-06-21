const fs = require('fs');

['vendedor.html', 'cliente.html', 'dashboard.html'].forEach(f => {
    const filename = 'c:/Users/rkosh/Documents/nice-dreamks-fidelidade/' + f;
    let txt = fs.readFileSync(filename, 'utf-8');
    
    // Replace <script src="js/vendedor.js?v=XXX"></script> with <script type="module" src="js/vendedor.js?v=XXX"></script>
    txt = txt.replace(/<script src="js\/([^"]+)"><\/script>/g, '<script type="module" src="js/$1"></script>');
    
    fs.writeFileSync(filename, txt);
    console.log('Fixed module tag in ' + f);
});
