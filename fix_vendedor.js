const fs = require('fs');
let lines = fs.readFileSync('vendedor.html', 'utf8').split('\n');
lines.splice(505, 369, '    </main>', '');
let code = lines.join('\n');
code = code.replace(/<button onclick="switchAppTab/g, '<button type="button" onclick="switchAppTab');
fs.writeFileSync('vendedor.html', code);
console.log("Done");
