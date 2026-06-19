// script.js

const listaFrases = [
    "Um gole de felicidade para animar o seu dia!",
    "Celebrando cada sabor com a Nice Dreamks.",
    "Mais um ponto, mais perto da sua recompensa.",
    "O sabor autêntico de Brasília em cada drink.",
    "Nice Dreamks: onde cada copo conta uma história."
];

let pontos = 0;
const phraseEl = document.querySelector('.nice-phrase-text');
const counterEl = document.querySelector('.lo-fi-counter');
const starsEl = document.querySelectorAll('.nice-point-star');
const winBannerEl = document.querySelector('.nice-win-banner');

function atualizarFraseAleatoria() {
    const indiceAleatorio = Math.floor(Math.random() * listaFrases.length);
    phraseEl.innerText = listaFrases[indiceAleatorio];
}

function atualizarInterface() {
    counterEl.innerText = `${pontos} / 10`;

    starsEl.forEach((star, index) => {
        if (index < pontos) {
            star.classList.remove('empty');
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
            star.classList.add('empty');
        }
    });

    if (pontos >= 10) {
        winBannerEl.classList.remove('hidden');
        phraseEl.innerText = "🏆 DRINK GRÁTIS DESBLOQUEADO! 🏆";
    } else {
        winBannerEl.classList.add('hidden');
        atualizarFraseAleatoria();
    }
}

// Para testar, clique na página e veja os pontos subirem
document.body.addEventListener('click', () => {
    if (pontos < 10) {
        pontos++;
    } else {
        pontos = 0;
    }
    atualizarInterface();
});

atualizarFraseAleatoria();
atualizarInterface();