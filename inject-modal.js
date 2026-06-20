const fs = require('fs');

let html = fs.readFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', 'utf-8');
const formContent = fs.readFileSync('form-extract.html', 'utf-8');

// The original formContent has `<div id="edit-cartao-container" ...><form ...>...</form></div>`
// I'll replace the outer div with my modal shell.

let innerForm = formContent.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');

const modalHtml = `
<!-- MODAL DE EDIÇÃO DE CARTÃO -->
<div id="modal-edit-cartao" class="fixed inset-0 z-[100] hidden bg-stone-900/40 backdrop-blur-sm items-center justify-center p-4">
    <div class="bg-brand-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <button onclick="toggleEditCard()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-700 transition">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <h3 class="text-xl font-bold font-outfit text-stone-800">Editar Cartão</h3>
        <p class="text-xs text-stone-500">Altere o visual que seus clientes vão ver no celular deles.</p>
        \n${innerForm}\n
    </div>
</div>
`;

// Insert the modal at the end of the body, before the modals
const modalContainerStart = html.indexOf('<!-- Modais -->');
if (modalContainerStart !== -1) {
    html = html.substring(0, modalContainerStart) + modalHtml + '\n' + html.substring(modalContainerStart);
} else {
    // Fallback if <!-- Modais --> is not found
    const bodyEnd = html.lastIndexOf('</body>');
    html = html.substring(0, bodyEnd) + modalHtml + '\n' + html.substring(bodyEnd);
}

// Update `toggleEditCard()` to toggle `modal-edit-cartao` AND use 'flex' instead of just removing 'hidden'.
html = html.replace(
    /window\.toggleEditCard = function\(\) \{[\s\S]*?\};/,
    `window.toggleEditCard = function() {
    const el = document.getElementById('modal-edit-cartao');
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};`
);

fs.writeFileSync('c:/Users/rkosh/Documents/nice-dreamks-fidelidade/vendedor.html', html);
console.log('Modal injected!');
