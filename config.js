import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    connectAuthEmulator,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider, 
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    setDoc,
    getDoc, 
    updateDoc, 
    deleteDoc,
    collection, 
    query, 
    where, 
    getDocs, 
    onSnapshot,
    increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

// Configuração padrão do Firebase (White-label)
// O usuário pode substituir este bloco pelas credenciais do seu próprio projeto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAH5BxqOq3KoF48Nkz43eZd9IZleBjckz8", // Chave demonstrativa (substituir por sua chave ativa)
    authDomain: "tempontinho.com",
    projectId: "nice-dreamks-fidelidade",
    storageBucket: "nice-dreamks-fidelidade.firebasestorage.app",
    messagingSenderId: "287947707168",
    appId: "1:287947707168:web:e6530a04124d9ed4ecfd45",
    measurementId: "G-9Z1VKST81Z"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);

// App Check — protege as Cloud Functions contra chamadas feitas fora do app
// (a config do Firebase é pública). Registre um site key reCAPTCHA v3 no
// Console do Firebase (App Check) e cole abaixo. Enquanto estiver vazio, o
// App Check fica DESATIVADO — e as callables (enforceAppCheck: true) vão
// RECUSAR as chamadas até este passo ser concluído e o enforcement ativado.
const APP_CHECK_SITE_KEY = ""; // TODO: colar o site key do reCAPTCHA v3
if (APP_CHECK_SITE_KEY) {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
    });
}

const auth = getAuth(app);
const db = getFirestore(app);

// --- Emulador Firebase (SOMENTE para testes E2E) ---------------------------
// Ativado apenas quando localStorage.USE_EMULATOR === "1" E o host é local.
// Em produção (tempontinho.com) nunca dispara, então é inócuo. Os testes
// Playwright setam a flag via addInitScript antes de carregar a página.
// Portas batem com firebase.json: auth 9099 · firestore 8085 · functions 5001.
try {
    const useEmu =
        typeof window !== "undefined" &&
        window.localStorage &&
        window.localStorage.getItem("USE_EMULATOR") === "1" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (useEmu) {
        const h = window.location.hostname;
        connectAuthEmulator(auth, `http://${h}:9099`, { disableWarnings: true });
        connectFirestoreEmulator(db, h, 8085);
        window.__USE_EMULATOR__ = true; // sinaliza para o points-api.js ligar Functions
        console.info("[config] Firebase apontando para os EMULADORES (modo teste).");
    }
} catch (e) {
    console.warn("[config] Falha ao conectar emuladores (ignorado):", e);
}

// Provedores de Autenticação Social
const googleProvider = new GoogleAuthProvider();

function prepareGoogleProvider({ selectAccount = false } = {}) {
    googleProvider.setCustomParameters(selectAccount ? { prompt: "select_account" } : {});
    return googleProvider;
}

// Helpers de Login (Popup - Desktop)
async function loginWithGoogle(options = {}) {
    try {
        const result = await signInWithPopup(auth, prepareGoogleProvider(options));
        return result.user;
    } catch (error) {
        console.error("Erro no login com Google: ", error);
        throw error;
    }
}

// Helpers de Login (Redirect - Mobile)
async function loginWithGoogleRedirect(options = {}) {
    try {
        await signInWithRedirect(auth, prepareGoogleProvider(options));
    } catch (error) {
        console.error("Erro no redirect do Google: ", error);
        throw error;
    }
}

async function logoutUser() {
    await signOut(auth);
}

// Exportando os módulos principais
export { 
    app, 
    auth, 
    db, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    collection, 
    query, 
    where, 
    getDocs, 
    onSnapshot,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    loginWithGoogle,
    loginWithGoogleRedirect,
    logoutUser,
    getRedirectResult,
    increment
};
