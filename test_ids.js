const fs = require('fs');
const html = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', 'utf-8');

const ids = [
    'historico-cliente-nome',
    'historico-lista',
    'modal-historico',
    'modal-ajuste-nome',
    'modal-ajuste-email',
    'modal-ajuste-pontos-atuais',
    'ajuste-quantidade-pontos',
    'ajuste-justificativa',
    'btn-confirm-ajuste',
    'modal-ajustar-pontos',
    'btn-action-add',
    'btn-action-remove',
    'btn-action-zero',
    'input-pontos-container'
];

ids.forEach(id => {
    if (!html.includes('id="' + id + '"')) {
        console.log('Missing ID:', id);
    }
});
console.log('Done checking IDs');
