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
    clientesList.innerHTML = `
        <div class="glassmorphism p-4 rounded-2xl flex justify-between items-center text-left">
            <div><p class="font-bold text-stone-800 text-sm">João Fictício</p><p class="text-[10px] text-stone-500">joao@teste.com</p></div>
            <div class="text-right"><p class="font-bold text-indigo-600 text-xs">8 / 10 pts</p></div>
        </div>
        <div class="glassmorphism p-4 rounded-2xl flex justify-between items-center mt-3 text-left">
            <div><p class="font-bold text-stone-800 text-sm">Maria Fictícia</p><p class="text-[10px] text-stone-500">maria@teste.com</p></div>
            <div class="text-right"><p class="font-bold text-emerald-600 text-xs">Resgatar 1x</p></div>
        </div>
    `;
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
document.getElementById("overview-link-cliente-url").value = "https://tempontinho.com/cliente.html?link=loja-ficticia";
document.getElementById("overview-whatsapp-kit-text").value = "🎉 Olá! Acesse seu cartão fictício aqui: https://tempontinho.com/cliente.html";

document.getElementById("btn-logout")?.addEventListener("click", () => {
    showToast("Logout ignorado no modo Mock", "error");
});
