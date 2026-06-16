import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
    GoogleAuthProvider, 
    FacebookAuthProvider, 
    OAuthProvider,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
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

// Provedores de Autenticação Social
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// Helpers de Login (Popup - Desktop)
async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Erro no login com Google: ", error);
        throw error;
    }
}

async function loginWithFacebook() {
    try {
        const result = await signInWithPopup(auth, facebookProvider);
        return result.user;
    } catch (error) {
        console.error("Erro no login com Facebook: ", error);
        throw error;
    }
}

async function loginWithApple() {
    try {
        const result = await signInWithPopup(auth, appleProvider);
        return result.user;
    } catch (error) {
        console.error("Erro no login com Apple: ", error);
        throw error;
    }
}

// Helpers de Login (Redirect - Mobile)
async function loginWithGoogleRedirect() {
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Erro no redirect do Google: ", error);
        throw error;
    }
}

async function loginWithFacebookRedirect() {
    try {
        await signInWithRedirect(auth, facebookProvider);
    } catch (error) {
        console.error("Erro no redirect do Facebook: ", error);
        throw error;
    }
}

async function loginWithAppleRedirect() {
    try {
        await signInWithRedirect(auth, appleProvider);
    } catch (error) {
        console.error("Erro no redirect da Apple: ", error);
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
    loginWithGoogle,
    loginWithFacebook,
    loginWithApple,
    loginWithGoogleRedirect,
    loginWithFacebookRedirect,
    loginWithAppleRedirect,
    logoutUser,
    getRedirectResult,
    increment
};
