// js/vendedor-mock.js
// Script de Mock para testes visuais e alterações de UI do Vendedor
// Sem conexões com Firebase, apenas dados estáticos e interações simuladas.

console.log("Modo Mock Ativado. Autenticação ignorada.");

// 1. Bypass Login Screen -> App Screen
document.getElementById("login-screen").classList.add("hidden");
document.getElementById("app-screen").classList.remove("hidden");

// 2. Preencher dados do vendedor (como se fosse o dono)
document.getElementById("empresa-nome").innerText = "Loja Fictícia (MOCK)";
document.getElementById("vendedor-nome").innerText = "Dono (Testes UI)";
document.getElementById("login-empresa-nome").innerText = "Loja Fictícia (MOCK)";
document.getElementById("bottom-nav").classList.remove("hidden");
document.getElementById("bottom-nav").classList.add("block");
document.getElementById("app-footer").classList.add("hidden");

// Setup Select Options
const selectPointsQty = document.getElementById("scan-qty");
if (selectPointsQty) {
    selectPointsQty.innerHTML = [1, 2, 3, 5, 10].map(n => `<option value="${n}">+${n}</option>`).join("");
}

// 3. Sistema de Notificações
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toast-text");
    const toastIcon = document.getElementById("toast-icon");
    toastText.textContent = message;
    
    if (type === "error") {
        toast.className = `fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white bg-red-600`;
        toastIcon.className = `fa-solid fa-circle-xmark text-base`;
    } else {
        toast.className = `fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white bg-indigo-600`;
        toastIcon.className = `fa-solid fa-circle-check text-base`;
    }
    
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-8px)";
    }, 3000);
}

function showAlert(type, title, msg) {
    const box = document.getElementById("alert-card");
    const iconBox = document.getElementById("alert-icon-box");
    document.getElementById("alert-title").innerText = title;
    document.getElementById("alert-message").innerText = msg;
    box.classList.remove("hidden");
    box.className = "p-4 rounded-2xl flex items-start gap-3 text-left transition-all duration-300 mt-2";
    
    if (type === 'success') {
        box.classList.add("bg-emerald-50", "border", "border-emerald-200", "text-emerald-700");
        iconBox.innerHTML = `<i class="fa-solid fa-check"></i>`;
        iconBox.className = "w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 bg-emerald-100 text-emerald-600";
    } else if (type === 'win') {
        box.classList.add("bg-amber-50", "border", "border-amber-200", "text-amber-700");
        iconBox.innerHTML = `<i class="fa-solid fa-gift"></i>`;
        iconBox.className = "w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 bg-amber-100 text-amber-600";
    } else {
        box.classList.add("bg-red-50", "border", "border-red-200", "text-red-700");
        iconBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
        iconBox.className = "w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 bg-red-100 text-red-600";
    }
}

// 4. Lógica Fictícia de Pontuação
let clientPoints = 2;
let clientMeta = 10;
let prizeCount = 0;

function updateClientPanel() {
    document.getElementById("client-panel").classList.remove("hidden");
    document.getElementById("client-points").innerText = clientPoints;
    document.getElementById("client-meta").innerText = clientMeta;
    document.getElementById("client-progress").style.width = `${(clientPoints / clientMeta) * 100}%`;
    
    const prizeBox = document.getElementById("prize-box");
    if (prizeBox) {
        if (prizeCount > 0) {
            prizeBox.classList.remove("hidden");
            prizeBox.classList.add("flex");
            document.getElementById("prize-count-text").innerText = `${prizeCount} prêmio(s) a entregar`;
        } else {
            prizeBox.classList.add("hidden");
            prizeBox.classList.remove("flex");
        }
    }
}

document.getElementById("btn-manual-submit")?.addEventListener("click", () => {
    document.getElementById("client-name").innerText = "Cliente Fictício M.";
    
    const qty = parseInt(selectPointsQty?.value || "1");
    clientPoints += qty;
    
    if (clientPoints >= clientMeta) {
        let prêmiosGanhos = Math.floor(clientPoints / clientMeta);
        prizeCount += prêmiosGanhos;
        clientPoints = clientPoints % clientMeta;
        showAlert("win", "Cartão Completo! 🎉", `Cliente completou a meta e ganhou ${prêmiosGanhos} prêmio(s).`);
    } else {
        showAlert("success", "Pontos adicionados", `+${qty} ponto(s) adicionados com sucesso.`);
    }
    
    updateClientPanel();
});

document.getElementById("btn-deliver-prize")?.addEventListener("click", () => {
    if (prizeCount > 0) {
        prizeCount--;
        showAlert("win", "🎁 Prêmio entregue!", "Tudo certo! Marquei como entregue.");
        updateClientPanel();
    }
});

document.getElementById("btn-remove-point")?.addEventListener("click", () => {
    if (clientPoints > 0) {
        clientPoints--;
        showToast("Ponto removido (correção)", "success");
        updateClientPanel();
    }
});

document.getElementById("btn-next-client")?.addEventListener("click", () => {
    document.getElementById("client-panel").classList.add("hidden");
    document.getElementById("alert-card").classList.add("hidden");
    document.getElementById("manual-client-input").value = "";
    showToast("Pronto para o próximo cliente");
});

// 5. Preencher as outras abas (Status, Menu) com dados falsos
document.getElementById("stat-total-clientes").innerText = "42";
document.getElementById("stat-total-pontos").innerText = "350";
document.getElementById("stat-premios-disponiveis").innerText = "5";
document.getElementById("stat-premios-entregues").innerText = "12";

const clientesList = document.getElementById("clientes-list");
if (clientesList) {
    const clients = [
        { nome: "Cliente Fidelidade", email: "kksjhashsad@ashuhsua.com", pontos: 1, premios: 0 },
        { nome: "Vanessa Santos", email: "vss.vanessasantos@gmail.com", pontos: 1, premios: 0 },
        { nome: "Rodrigo Koshino", email: "admin@tempontinho.com", pontos: 10, premios: 1 }
    ];
    
    let html = "";
    clients.forEach((client, idx) => {
        const isWin = client.premios > 0;
        html += `
            <div class="client-card glassmorphism p-4 rounded-2xl flex flex-col gap-3 border border-stone-200 hover:bg-stone-50 transition-colors mt-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 w-full">
                        <div class="flex-1 min-w-0 text-left">
                            <h4 class="font-bold text-stone-800 text-sm leading-tight truncate">${client.nome}</h4>
                            <p class="text-[10px] text-stone-500 mt-0.5 truncate">${client.email}</p>
                        </div>
                        <div class="text-right shrink-0 flex flex-col items-end">
                            <span class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Pontos</span>
                            <span class="font-bold font-outfit text-indigo-500 text-lg leading-none">${client.pontos}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2 border-t border-stone-100 pt-3 mt-1">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-semibold border ${isWin ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-stone-100 text-stone-500 border-stone-200'}">
                        ${isWin ? `<i class="fa-solid fa-gift mr-1"></i> ${client.premios} prêmio` : "Acumulando"}
                    </span>
                    <div class="flex gap-2">
                        <button onclick="showToast('Histórico mockado')" class="w-8 h-8 flex items-center justify-center text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 border border-indigo-100 rounded-lg active:scale-95 shadow-sm" title="Ver Histórico"><i class="fa-solid fa-clock-rotate-left"></i></button>
                        <button onclick="showToast('Ajustar mockado')" class="w-8 h-8 flex items-center justify-center text-amber-600 hover:text-amber-800 transition bg-amber-50 border border-amber-100 rounded-lg active:scale-95 shadow-sm" title="Ajustar Pontos"><i class="fa-solid fa-pen"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    clientesList.innerHTML = html;
}

const vendedoresGrid = document.getElementById("vendedores-grid");
if (vendedoresGrid) {
    vendedoresGrid.innerHTML = `
        <div class="glassmorphism p-4 rounded-2xl flex justify-between items-center text-left">
            <div><p class="font-bold text-stone-800 text-sm">Dono (Testes UI)</p><p class="text-[10px] text-stone-500">dono@teste.com</p></div>
            <span class="text-[10px] font-bold text-white bg-emerald-500 px-2 py-1 rounded-lg">Admin</span>
        </div>
    `;
}

// Interações da Câmera (Falsas)
let cameraDot = document.getElementById("scanner-status-dot");
document.getElementById("btn-start-scanner")?.addEventListener("click", () => {
    document.getElementById("btn-start-scanner").disabled = true;
    document.getElementById("btn-stop-scanner").disabled = false;
    if(cameraDot) cameraDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-ping";
    showToast("Câmera Iniciada (Mock)");
    
    // Simular leitura após 3 segundos
    setTimeout(() => {
        if (!document.getElementById("btn-start-scanner").disabled) return;
        document.getElementById("manual-client-input").value = "QR Code lido!";
        document.getElementById("btn-manual-submit").click();
    }, 3000);
});

document.getElementById("btn-stop-scanner")?.addEventListener("click", () => {
    document.getElementById("btn-start-scanner").disabled = false;
    document.getElementById("btn-stop-scanner").disabled = true;
    if(cameraDot) cameraDot.className = "w-2 h-2 rounded-full bg-stone-300";
    showToast("Câmera Parada (Mock)", "success");
});

// Setup básico dos links
document.getElementById("overview-link-cliente-url").value = "https://tempontinho.com/cliente.html?link=loja-ficticia&mock=true";
document.getElementById("overview-whatsapp-kit-text").value = "🎉 Olá! Acesse seu cartão fictício aqui: https://tempontinho.com/cliente.html?link=loja-ficticia&mock=true";

document.getElementById("btn-logout")?.addEventListener("click", () => {
    showToast("Logout ignorado no modo Mock", "error");
});

// --- Navegação Sub-Tabs ---
window.openSubTab = function(subId) {
    const el = document.getElementById(subId);
    if (!el) return;
    el.classList.remove("hidden");
    setTimeout(() => {
        el.classList.remove("translate-x-full");
    }, 10);
};

window.closeSubTab = function(subId) {
    const el = document.getElementById(subId);
    if (!el) return;
    el.classList.add("translate-x-full");
    setTimeout(() => {
        el.classList.add("hidden");
    }, 300);
};

window.toggleEditCard = function() {
    const el = document.getElementById('modal-edit-cartao');
    if (!el) return;
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};

window.updatePreviewCartao = function() {
    const meta = document.getElementById('edit-meta-pontos')?.value || 10;
    const premio = document.getElementById('edit-premio-desc')?.value || "Recompensa";
    const bg = document.getElementById('edit-theme-color')?.value || "#4f46e5";
    const title = document.getElementById('edit-theme-title')?.value || "Seu Programa";
    const emoji = document.getElementById('edit-theme-emoji')?.value || "🌟";
    
    const container = document.getElementById('preview-cartao-container');
    if (!container) return;
    container.style.backgroundColor = bg;
    
    if(document.getElementById('preview-title')) document.getElementById('preview-title').innerText = title;
    if(document.getElementById('preview-premio')) document.getElementById('preview-premio').innerText = premio;
    if(document.getElementById('preview-meta-txt')) document.getElementById('preview-meta-txt').innerText = meta;
    if(document.getElementById('preview-points-counter')) document.getElementById('preview-points-counter').innerText = "2 / " + meta;
    
    // Calc Brightness (theme-light or theme-dark)
    const hexColor = bg.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16) || 0;
    const g = parseInt(hexColor.substr(2, 2), 16) || 0;
    const b = parseInt(hexColor.substr(4, 2), 16) || 0;
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const isLightTheme = brightness > 155;
    
    container.classList.remove('theme-light', 'theme-dark');
    container.classList.add(isLightTheme ? 'theme-light' : 'theme-dark');
    
    const grid = document.getElementById('preview-stamps-grid');
    if (!grid) return;
    
    let cols = 5;
    if(meta <= 6) cols = 3;
    else if(meta <= 8) cols = 4;
    else if(meta > 10 && meta <= 12) cols = 4;
    else if(meta > 15) cols = 5;
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    
    let html = '';
    for(let i=0; i<meta; i++) {
        const isStamped = i < 2; // EXEMPLIFICANDO COM 2 PONTOS
        
        let slotClass = isStamped 
            ? "bg-[var(--bg-glass)] border-transparent"
            : "bg-[var(--bg-glass)] text-[var(--text-muted)] border-[var(--border-glass)] border-2";
            
        html += `
            <div class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-lg md:text-xl transition-all duration-300 ${slotClass}">
                ${isStamped ? emoji : ''}
            </div>
        `;
    }
    grid.innerHTML = html;
};

// Initial update call
setTimeout(() => {
    if(window.updatePreviewCartao) window.updatePreviewCartao();
}, 500);

const inputs = ['edit-meta-pontos', 'edit-premio-desc', 'edit-theme-color', 'edit-theme-title', 'edit-theme-emoji'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', window.updatePreviewCartao);
});

// Dummy listeners para botões das subtabs
document.getElementById("btn-novo-vendedor")?.addEventListener("click", () => {
    document.getElementById("vendor-invite-card").classList.toggle("hidden");
    document.getElementById("vendor-invite-url").value = "https://tempontinho.com/vendedor.html?convite=123mock456";
    showToast("Link de convite gerado!");
});

document.getElementById("btn-save-company-name")?.addEventListener("click", () => {
    const newName = document.getElementById("config-company-name").value;
    if(newName) {
        document.getElementById("empresa-nome").innerText = newName;
        showToast("Nome da empresa salvo!");
    }
});

document.getElementById("btn-delete-controller-account")?.addEventListener("click", () => {
    showAlert("error", "Exclusão de Conta", "Você clicou para apagar a conta (Ação Mockada).");
});

document.getElementById("btn-copy-vendor-invite")?.addEventListener("click", () => {
    showToast("Link de convite copiado!");
});

document.getElementById("btn-overview-copy-cliente")?.addEventListener("click", () => {
    showToast("Link do cliente copiado!");
});

document.getElementById("btn-overview-copy-whatsapp")?.addEventListener("click", () => {
    showToast("Texto para WhatsApp copiado!");
});
