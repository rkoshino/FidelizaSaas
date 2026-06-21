import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
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
    increment,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

// Configuração padrão do Firebase (White-label)
// O usuário pode substituir este bloco pelas credenciais do seu próprio projeto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAH5BxqOq3KoF48Nkz43eZd9IZleBjckz8", // Chave demonstrativa (substituir por sua chave ativa)
    authDomain: window.location.hostname || "tempontinho.com",
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
    increment,
    orderBy,
    limit
};
