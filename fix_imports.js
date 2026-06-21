const fs = require('fs');

['vendedor.js', 'cliente.js', 'dashboard.js'].forEach(f => {
    const filename = 'c:/Users/rkosh/Documents/nice-dreamks-fidelidade/js/' + f;
    let txt = fs.readFileSync(filename, 'utf-8');
    
    txt = txt.replace(/"\.\/config\.js/g, '"../config.js');
    txt = txt.replace(/"\.\/points-api\.js/g, '"../points-api.js');
    
    fs.writeFileSync(filename, txt);
    console.log('Fixed imports in ' + f);
});
