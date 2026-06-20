
        import {
            auth,
            db,
            doc,
            getDoc,
            signInWithEmailAndPassword,
            sendPasswordResetEmail,
            loginWithGoogle,
            loginWithGoogleRedirect,
            logoutUser,
            getRedirectResult
        } from "./config.js?v=3";

        const authForm = document.getElementById("auth-form");
        const emailInput = document.getElementById("owner-email");
        const passwordInput = document.getElementById("owner-password");
        const btnSubmitLogin = document.getElementById("btn-submit-login");
        const helpCard = document.getElementById("login-help-card");
        const createWithEmail = document.getElementById("btn-create-with-email");

        const toast = document.getElementById("toast");
        const toastText = document.getElementById("toast-text");
        const OWNER_GOOGLE_PENDING_KEY = "tempontinho_owner_google_pending";

        function showToast(message) {
            toastText.innerText = message;
            toast.classList.remove("hidden");
            toast.classList.add("flex");
            setTimeout(() => {
                toast.classList.add("hidden");
                toast.classList.remove("flex");
            }, 3000);
        }

        function authErrorMessage(err) {
            const code = err && err.code;
            if (code === "auth/invalid-email") return "Digite um e-mail válido.";
            if (code === "auth/missing-password") return "Digite sua senha.";
            if (code === "auth/too-many-requests") return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
            if (code === "auth/popup-closed-by-user") return "Login cancelado antes de concluir.";
            if (code === "auth/network-request-failed") return "Falha de conexão. Verifique sua internet e tente novamente.";
            return "Não foi possível concluir o login. Confira os dados e tente novamente.";
        }

        function updateCreateAccountLinks() {
            const email = emailInput.value.trim();
            const url = email ? `onboarding.html?email=${encodeURIComponent(email)}` : "onboarding.html";
            createWithEmail.href = url;
            document.getElementById("btn-create-account").href = url;
        }

        emailInput.addEventListener("input", updateCreateAccountLinks);

        async function companyExists(uid) {
            const snap = await getDoc(doc(db, "empresas", uid));
            return snap.exists() && !!snap.data().linkUnicoCliente;
        }

        function askCreateGoogleAccount() {
            return new Promise((resolve) => {
                const modal = document.getElementById("modal-create-google");
                const btnCancel = document.getElementById("btn-cancel-google-create");
                const btnConfirm = document.getElementById("btn-confirm-google-create");
                modal.classList.remove("hidden");
                const cleanup = (result) => {
                    modal.classList.add("hidden");
                    btnCancel.onclick = null;
                    btnConfirm.onclick = null;
                    resolve(result);
                };
                btnCancel.onclick = () => cleanup(false);
                btnConfirm.onclick = () => cleanup(true);
            });
        }

        let routingSessionPromise = null;
        async function routeOwnerSession(user, { allowCreatePrompt = false } = {}) {
            if (routingSessionPromise) return routingSessionPromise;

            routingSessionPromise = (async () => {
                try {
                    if (await companyExists(user.uid)) {
                        showToast("Sessão encontrada! Redirecionando...");
                        sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                        setTimeout(() => {
                            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                            if (isMobile) {
                                window.location.href = `./vendedor.html?empresa=${user.uid}`;
                            } else {
                                window.location.href = `./dashboard.html?empresa=${user.uid}`;
                            }
                        }, 600);
                        return "redirecting";
                    }

                    if (!allowCreatePrompt) return "no-company";

                    const wantsCreate = await askCreateGoogleAccount();
                    if (wantsCreate) {
                        sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                        window.location.href = "./onboarding.html?continue=google";
                        return "redirecting";
                    }

                    await logoutUser();
                    showToast("Cadastro cancelado. Nenhuma empresa foi criada.");
                    return "cancelled";
                } catch (err) {
                    console.error("Erro ao rotear sessão da empresa:", err);
                    showToast("Não foi possível validar sua empresa. Tente novamente.");
                    return "error";
                } finally {
                    if (allowCreatePrompt) {
                        sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                    }
                    routingSessionPromise = null;
                }
            })();

            return routingSessionPromise;
        }

        // Roteia o dono assim que há sessão (volta de redirect no mobile OU sessão
        // persistida). Se a sessão atual for só de cliente, não abre criação de empresa
        // automaticamente; o prompt de criação só aparece após clique explícito no Google.
        auth.onAuthStateChanged(async (user) => {
            const pendingGoogleLogin = sessionStorage.getItem(OWNER_GOOGLE_PENDING_KEY) === "1";
            if (user) await routeOwnerSession(user, { allowCreatePrompt: pendingGoogleLogin });
        });

        // Finaliza o redirect do mobile SEM bloquear o módulo. IMPORTANTE: um
        // `await getRedirectResult` no topo do módulo trava o registro dos listeners
        // abaixo (o clique do botão Google) enquanto o Auth inicializa — no celular,
        // que é mais lento, o botão "ficava sem efeito". Por isso roda em IIFE.
        (async () => {
            let pendingGoogleLogin = false;
            let redirectedUser = null;
            try {
                const result = await getRedirectResult(auth);
                pendingGoogleLogin = sessionStorage.getItem(OWNER_GOOGLE_PENDING_KEY) === "1";
                redirectedUser = result?.user || (pendingGoogleLogin ? auth.currentUser : null);
                if (redirectedUser) {
                    await routeOwnerSession(redirectedUser, { allowCreatePrompt: true });
                }
            } catch (err) {
                console.error("Erro no redirecionamento:", err);
                showToast(authErrorMessage(err));
            } finally {
                if (!pendingGoogleLogin || redirectedUser) {
                    sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                }
            }
        })();

        // Email / Senha Login
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            helpCard.classList.add("hidden");
            updateCreateAccountLinks();
            if (!email) {
                showToast("Digite seu e-mail.");
                emailInput.focus();
                return;
            }
            if (!password) {
                showToast("Digite sua senha.");
                passwordInput.focus();
                return;
            }

            btnSubmitLogin.disabled = true;
            btnSubmitLogin.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Acessando...`;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // O onAuthStateChanged vai capturar e redirecionar
            } catch (err) {
                console.error(err);
                showToast(authErrorMessage(err));
                helpCard.classList.remove("hidden");
                btnSubmitLogin.disabled = false;
                btnSubmitLogin.innerText = "Acessar Painel";
            }
        });

        // B-05: Reset de senha real
        document.getElementById("btn-forgot-password").addEventListener("click", async () => {
            const email = emailInput.value.trim();
            if (!email) {
                showToast("Digite seu e-mail no campo acima primeiro.");
                emailInput.focus();
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                showToast("Enviamos um link de redefinição para seu e-mail.");
            } catch (err) {
                console.error(err);
                // Não revela se o e-mail existe (privacidade), mas avisa erros de formato.
                if (err.code === "auth/invalid-email") {
                    showToast("E-mail inválido. Confira e tente de novo.");
                } else {
                    showToast("Se o e-mail estiver cadastrado, o link foi enviado.");
                }
            }
        });

        // Google Login — popup no desktop, redirect no mobile
        document.getElementById("btn-login-google").addEventListener("click", async () => {
            const btn = document.getElementById("btn-login-google");
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando...`;
            try {
                sessionStorage.setItem(OWNER_GOOGLE_PENDING_KEY, "1");
                const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    await loginWithGoogleRedirect({ selectAccount: true });
                } else {
                    const user = await loginWithGoogle({ selectAccount: true });
                    const result = await routeOwnerSession(user, { allowCreatePrompt: true });
                    if (result !== "redirecting") {
                        sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                }
            } catch (err) {
                console.error(err);
                showToast(authErrorMessage(err));
                sessionStorage.removeItem(OWNER_GOOGLE_PENDING_KEY);
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    