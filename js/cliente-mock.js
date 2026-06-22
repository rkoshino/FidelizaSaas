// js/cliente-mock.js
// Script de Mock para testes visuais do Cliente
console.log("Modo Mock Ativado. Autenticação ignorada.");

document.getElementById("login-screen").classList.add("hidden");
document.getElementById("app-screen").classList.remove("hidden");

// Configurações Falsas
const meta = 10;
const pontos = 4;
const premioDesc = "Recompensa";
const emoji = "🌟";
const bgColor = "#4f46e5";

// Elementos
const body = document.getElementById("body-container");
const appTitle = document.getElementById("app-title");
const clientName = document.getElementById("client-name");
const pointsCounter = document.getElementById("points-counter");
const pointsTarget = document.getElementById("points-target");
const prizeDesc = document.getElementById("prize-description");
const stampsGrid = document.getElementById("stamps-grid");
const loyaltyCard = document.getElementById("loyalty-card");

if(appTitle) appTitle.innerText = "Loja Fictícia (MOCK)";
if(clientName) clientName.innerText = "Cliente de Teste";
if(pointsCounter) pointsCounter.innerText = `${pontos} / ${meta}`;
if(pointsTarget) pointsTarget.innerText = meta;
if(prizeDesc) prizeDesc.innerText = premioDesc;

if(body) body.style.backgroundColor = bgColor;
if(loyaltyCard) loyaltyCard.style.backgroundColor = bgColor;

// Calc Brightness (theme-light or theme-dark)
const hexColor = bgColor.replace('#', '');
const r = parseInt(hexColor.substr(0, 2), 16) || 0;
const g = parseInt(hexColor.substr(2, 2), 16) || 0;
const b = parseInt(hexColor.substr(4, 2), 16) || 0;
const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
const isLightTheme = brightness > 155;

if(body) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(isLightTheme ? 'theme-light' : 'theme-dark');
}
if(loyaltyCard) {
    loyaltyCard.classList.remove('theme-light', 'theme-dark');
    loyaltyCard.classList.add(isLightTheme ? 'theme-light' : 'theme-dark');
}

// Generate Stamps
if(stampsGrid) {
    let cols = 5;
    if(meta <= 6) cols = 3;
    else if(meta <= 8) cols = 4;
    else if(meta > 10 && meta <= 12) cols = 4;
    else if(meta > 15) cols = 5;
    stampsGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    
    let html = '';
    for(let i=0; i<meta; i++) {
        const isStamped = i < pontos;
        let slotClass = isStamped 
            ? "bg-[var(--bg-glass)] border-transparent"
            : "bg-[var(--bg-glass)] text-[var(--text-muted)] border-[var(--border-glass)] border-2";
            
        html += `
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${slotClass}">
                ${isStamped ? emoji : ''}
            </div>
        `;
    }
    stampsGrid.innerHTML = html;
}

// Menu Toggle
const btnMenu = document.getElementById("btn-menu-toggle");
const menu = document.getElementById("account-menu");
if (btnMenu && menu) {
    btnMenu.addEventListener("click", () => {
        menu.classList.toggle("hidden");
    });
}

// QR Code falso
const qrBox = document.getElementById("qrcode-placeholder");
if (qrBox && typeof QRCode !== "undefined") {
    new QRCode(qrBox, {
        text: "MOCK-QR-CODE",
        width: 120,
        height: 120,
        correctLevel: QRCode.CorrectLevel.M
    });
} else if (qrBox) {
    qrBox.innerHTML = "<div class='w-[120px] h-[120px] bg-stone-200 flex items-center justify-center text-xs text-stone-500'>QR Code Aqui</div>";
}
