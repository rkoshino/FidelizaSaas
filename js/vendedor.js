import { 
            auth, 
            db, 
            doc, 
            getDoc, 
            updateDoc, 
            collection, 
            query, 
            where, 
            getDocs, 
            onSnapshot,
            setDoc,
            deleteDoc,
            loginWithGoogleRedirect,
            getRedirectResult,
            logoutUser,
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            loginWithGoogle,
            increment
        } from "../config.js?v=2";
        import { awardPoints, deliverPrize, removePoint, getCard, findClient, acceptVendorInvite } from "../points-api.js?v=2";

        // Variáveis de Estado
        let empresaId = "";
        let inviteToken = "";
        let loggedVendedor = null;
        let metaConfig = { metaPontos: 10, descriçãoPremio: "Recompensa" };
        let visualConfig = {};
        let fullEmpresaData = null;
        let currentAjusteAction = "add";
        let writesBlocked = false;
        
        let targetClienteId = null;
        let targetClienteIds = [];
        let isBulkAjuste = false;

        let html5QrcodeScanner = null;
        let isScannerRunning = false;

        function showToast(message, type = "success") {
          const toast = document.getElementById("toast");
          const toastText = document.getElementById("toast-text");
          const toastIcon = document.getElementById("toast-icon");
          toastText.textContent = message;
          const configs = {
            success: { bg: "bg-indigo-600", icon: "fa-circle-check" },
            error:   { bg: "bg-red-600",    icon: "fa-circle-xmark" },
            warn:    { bg: "bg-amber-500",  icon: "fa-triangle-exclamation" },
          };
          const cfg = configs[type] || configs.success;
          toast.className = `fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ${cfg.bg}`;
          toastIcon.className = `fa-solid ${cfg.icon} text-base`;
          toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; toast.style.pointerEvents = "auto";
          clearTimeout(toast._hideTimer);
          toast._hideTimer = setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(-8px)"; toast.style.pointerEvents = "none"; }, 3500);
        }

        function confirmDialog({ title = "Confirmar", message = "", confirmText = "Confirmar", cancelText = "Cancelar", danger = false, keyword = null } = {}) {
          return new Promise((resolve) => {
            const modal = document.getElementById("modal-confirm");
            const elTitle = document.getElementById("confirm-title");
            const elMsg = document.getElementById("confirm-message");
            const elInput = document.getElementById("confirm-input");
            const btnOk = document.getElementById("confirm-ok");
            const btnCancel = document.getElementById("confirm-cancel");
            const iconWrap = document.getElementById("confirm-icon-wrap");
            const icon = document.getElementById("confirm-icon");
            elTitle.textContent = title; elMsg.textContent = message;
            btnOk.textContent = confirmText; btnCancel.textContent = cancelText;
            btnOk.className = `flex-1 min-h-[44px] rounded-xl text-white font-semibold transition ${danger ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"}`;
            iconWrap.className = `shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`;
            icon.className = `fa-solid ${danger ? "fa-trash-can" : "fa-triangle-exclamation"}`;
            if (keyword) { elInput.classList.remove("hidden"); elInput.value = ""; } else { elInput.classList.add("hidden"); }
            modal.classList.remove("hidden");
            if (keyword) setTimeout(() => elInput.focus(), 50);
            function cleanup(result) { modal.classList.add("hidden"); btnOk.onclick = null; btnCancel.onclick = null; modal.onclick = null; document.removeEventListener("keydown", onKey); resolve(result); }
            function accept() { if (keyword && elInput.value.trim() !== keyword) { cleanup(false); return; } cleanup(true); }
            function onKey(e) { if (e.key === "Escape") cleanup(false); if (e.key === "Enter" && !keyword) accept(); }
            btnOk.onclick = accept; btnCancel.onclick = () => cleanup(false);
            modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
            document?.addEventListener("keydown", onKey);
          });
        }

        // Tenta obter o ID da empresa pela query param com fallback de localStorage
        const urlParams = new URLSearchParams(window.location.search);
        empresaId = urlParams.get("empresa") || urlParams.get("empresaId") || urlParams.get("id") || localStorage.getItem("tempontinho_vendedor_empresa") || "";
        inviteToken = urlParams.get("convite") || "";

        if (empresaId) localStorage.setItem("tempontinho_vendedor_empresa", empresaId);
        if (inviteToken) document.getElementById("invite-hint")?.classList.remove("hidden");

        // Web Audio Sintetizador de Feedback Sonoro
        let audioCtx = null;

        function getPublicBaseUrl() {
            if (["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:") {
                return window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
            }
            return "https://tempontinho.com/";
        }
        
        function playSound(type) {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                // Reinicia se suspenso
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);

                if (type === "success") {
                    // Beep-Beep agradável de sucesso
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                    
                    setTimeout(() => {
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.connect(gain2);
                        gain2.connect(audioCtx.destination);
                        osc2.type = "sine";
                        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        osc2.start();
                        osc2.stop(audioCtx.currentTime + 0.15);
                    }, 120);
                } else if (type === "win") {
                    // Fanfarra / Chime especial de resgate de prêmio
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                    
                    const steps = [659.25, 783.99, 1046.50]; // E5, G5, C6
                    steps.forEach((freq, idx) => {
                        setTimeout(() => {
                            const o = audioCtx.createOscillator();
                            const g = audioCtx.createGain();
                            o.connect(g);
                            g.connect(audioCtx.destination);
                            o.type = "triangle";
                            o.frequency.setValueAtTime(freq, audioCtx.currentTime);
                            g.gain.setValueAtTime(0.1, audioCtx.currentTime);
                            o.start();
                            o.stop(audioCtx.currentTime + 0.2);
                        }, (idx + 1) * 100);
                    });
                } else if (type === "error") {
                    // Som de erro de baixa frequência
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.35);
                }
            } catch (err) {
                console.error("Falha ao tocar som de feedback", err);
            }
        }

        // Haptic Feedback de vibração
        function triggerVibration(pattern) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        }

        // Executa busca preliminar das regras e nome da empresa
        async function fetchCompanyBranding() {
            if (!empresaId) {
                // Se não tiver empresaId na URL, bloqueia login e mostra aviso com diagnóstico
                document.getElementById("login-empresa-nome").innerText = "Link de Vendedor Inválido";
                document.getElementById("login-form").outerHTML = `
                    <div class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs leading-relaxed text-left font-medium flex flex-col gap-2">
                        <div>
                            <i class="fa-solid fa-triangle-exclamation mr-1 text-sm"></i>
                            <strong>Erro:</strong> O link do vendedor está incompleto.
                        </div>
                        <div class="bg-red-100/50 p-2 rounded border border-red-200 font-mono text-xs break-all select-all">
                            URL Detectada: ${window.location.href}
                        </div>
                        <p>Por favor, use a URL completa fornecida no painel (ex: <code>vendedor.html?empresa=ID_DA_EMPRESA</code>).</p>
                    </div>
                `;
                return;
            }
            try {
                const docSnap = await getDoc(doc(db, "empresas", empresaId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    metaConfig = data.metaConfig;
                    visualConfig = data.visualConfig || {};
                    populateQtyOptions((metaConfig && metaConfig.metaPontos) || 10);

                    fullEmpresaData = data;
                    
                    const titleInput = document.getElementById("edit-theme-title");
                    if (titleInput) titleInput.value = data.visualConfig?.tituloPagina || "Seu Programa";
                    
                    const metaInput = document.getElementById("edit-meta-pontos");
                    if (metaInput) metaInput.value = data.metaConfig?.metaPontos || 10;
                    
                    const premioInput = document.getElementById("edit-premio-desc");
                    if (premioInput) premioInput.value = data.metaConfig?.descriçãoPremio || "Recompensa";
                    
                    const colorInput = document.getElementById("edit-theme-color");
                    if (colorInput) colorInput.value = data.visualConfig?.corFundo || "#4f46e5";
                    
                    const hexInput = document.getElementById("edit-theme-color-hex");
                    if (hexInput) hexInput.value = (data.visualConfig?.corFundo || "#4f46e5").toUpperCase();
                    
                    const fontInput = document.getElementById("edit-theme-font");
                    if (fontInput) fontInput.value = data.visualConfig?.fonte || "sans";
                    
                    const emojiInput = document.getElementById("edit-theme-emoji");
                    if (emojiInput) emojiInput.value = data.visualConfig?.emoji || "⭐";

                    if (typeof window.updatePreviewCartao === 'function') {
                        window.updatePreviewCartao();
                    }


                    // Exibe nome da empresa no topo e na tela de login
                    document.getElementById("empresa-nome").innerText = data.nomeEmpresa;
                    document.getElementById("login-empresa-nome").innerText = `Atendente - ${data.nomeEmpresa}`;

                    // $-01: banner de trial (mês grátis) — só durante o trial vigente.
                    const trialEnd = data.trialEndDate
                        ? (typeof data.trialEndDate.toDate === "function" ? data.trialEndDate.toDate() : new Date(data.trialEndDate))
                        : null;
                    const emTrial = (data.statusAssinatura === "trial") && trialEnd && trialEnd > new Date();
                    if (emTrial) {
                        const diffDays = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));
                        const daysEl = document.getElementById("trial-banner-days");
                        if (daysEl) daysEl.innerText = diffDays;
                        const banner = document.getElementById("trial-banner");
                        if (banner) banner.classList.replace("hidden", "flex");
                    }

                    // C-02: QR da página do cliente (novos clientes escaneiam para entrar)
                    const slug = data.linkUnicoCliente || empresaId;
                    if (slug && typeof QRCode !== "undefined") {
                        const base = getPublicBaseUrl();
                        const clienteUrl = `${base}cliente.html?link=${encodeURIComponent(slug)}`;
                        const qrBox = document.getElementById("cliente-qr");
                        const qrCard = document.getElementById("cliente-qr-card");
                        const qrLink = document.getElementById("cliente-qr-link");
                        if (qrBox && qrCard) {
                            qrBox.innerHTML = "";
                            new QRCode(qrBox, { text: clienteUrl, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
                            if (qrLink) qrLink.href = clienteUrl;
                            qrCard.classList.replace("hidden", "flex");
                        }
                        
                        // Populate Divulgue and Conta info se os elementos existirem
                        const overviewLinkCliente = document.getElementById("overview-link-cliente-url");
                        if (overviewLinkCliente) {
                            overviewLinkCliente.value = clienteUrl;
                            const btnCopyCliente = document.getElementById("btn-overview-copy-cliente");
                            if (btnCopyCliente) {
                                btnCopyCliente.onclick = () => {
                                    navigator.clipboard.writeText(clienteUrl);
                                    showToast("Link copiado!");
                                };
                            }
                        }
                        
                        const overviewWhatsapp = document.getElementById("overview-whatsapp-kit-text");
                        if (overviewWhatsapp) {
                            const premio = metaConfig?.descriçãoPremio || "um super prêmio";
                            overviewWhatsapp.value = `🎉 Olá! Lançamos nosso sistema de fidelidade digital!\n\nCadastre-se agora e comece a acumular pontos para ganhar ${premio}.\n\nAcesse seu cartão aqui: ${clienteUrl}`;
                            const btnCopyWhatsapp = document.getElementById("btn-overview-copy-whatsapp");
                            if (btnCopyWhatsapp) {
                                btnCopyWhatsapp.onclick = () => {
                                    navigator.clipboard.writeText(overviewWhatsapp.value);
                                    showToast("Texto copiado!");
                                };
                            }
                        }
                        
                        const overviewQrContainer = document.getElementById("overview-qrcode-placeholder");
                        if (overviewQrContainer && typeof QRCode !== "undefined") {
                            overviewQrContainer.innerHTML = "";
                            overviewQrContainer.className = "";
                            new QRCode(overviewQrContainer, {
                                text: clienteUrl,
                                width: 80,
                                height: 80,
                                correctLevel: QRCode.CorrectLevel.H
                            });
                        }
                        
                        // Populate Menu > Conta
                        const configCompanyName = document.getElementById("config-company-name");
                        if (configCompanyName) configCompanyName.value = data.nomeEmpresa || "";
                        const configOwnerEmail = document.getElementById("config-owner-email");
                        if (configOwnerEmail) configOwnerEmail.value = data.emailComercial || data.ownerEmail || "";
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar dados da empresa: ", err);
            }
        }

        // Branding não-bloqueante: um top-level await aqui travava o registro dos
        // listeners (botão de login) enquanto a init carregava — no mobile ficava "sem efeito".
        fetchCompanyBranding().catch((e) => console.error("Erro no branding:", e));

        function authErrorMessage(err) {
            const code = err && err.code;
            if (code === "auth/invalid-email") return "Digite um e-mail válido.";
            if (code === "auth/missing-password") return "Digite sua senha.";
            if (code === "auth/weak-password") return "Use uma senha com pelo menos 6 caracteres.";
            if (code === "auth/email-already-in-use") return "Este e-mail já tem conta. Entre com a senha correta ou use Google.";
            if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return inviteToken ? "Não foi possível entrar. Confira a senha ou crie uma senha para este convite." : "E-mail/senha incorretos ou atendente não autorizado.";
            if (code === "auth/popup-closed-by-user") return "Login cancelado antes de concluir.";
            if (code === "auth/network-request-failed") return "Falha de conexão. Verifique sua internet e tente novamente.";
            return "Não foi possível concluir o login. Tente novamente.";
        }

        // Lê o vínculo do vendedor; a regra nega leitura de doc inexistente, então
        // tratamos erro/inexistência como "ainda não vinculado" (e seguimos pro convite).
        async function safeGetVendor(ref) {
            try {
                const snap = await getDoc(ref);
                return snap.exists() ? snap.data() : null;
            } catch (_) {
                return null;
            }
        }

        function conviteErrMsg(err) {
            const m = String((err && err.message) || "");
            if (m.includes("já foi usado") || m.includes("cancelado")) return "Este convite já foi usado. Peça um novo ao dono da loja.";
            if (m.includes("não encontrado") || m.includes("expirado") || m.includes("inválido")) return "Convite inválido ou expirado. Peça um novo ao dono da loja.";
            if (m.includes("outra empresa")) return "Este e-mail já está vinculado a outra loja.";
            return "Não foi possível validar seu acesso de atendente. Tente novamente ou peça um novo convite.";
        }

        async function liberarVendedor(user) {
            if (user.uid === empresaId) {
                loggedVendedor = {
                    nomeVendedor: user.displayName || "Dono da loja",
                    email: user.email || "",
                    empresaId,
                    ativo: true,
                    papel: "dono"
                };
                document.getElementById("login-screen").classList.add("hidden");
                document.getElementById("app-screen").classList.remove("hidden");
                document.getElementById("vendedor-nome").innerText = loggedVendedor.nomeVendedor;
                // Exibir menu inferior se for o dono
                if (loggedVendedor.papel === "dono") {
                    document.getElementById("bottom-nav").classList.remove("hidden");
                    document.getElementById("bottom-nav").classList.add("block");
                    // Esconder o footer simples para não encavalar
                    document.getElementById("app-footer").classList.add("hidden");
                    
                    // Iniciar a escuta dos dados para preencher as abas do dono
                    if (typeof listenToData === "function") listenToData();
                }
                
                await teardownScanner();
                html5QrcodeScanner = new Html5Qrcode("reader");
                return;
            }

            const slug = user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
            // Chave COMPOSTA (empresa + e-mail): some a colisão global que dava
            // "este atendente não pertence a esta empresa".
            const vendedorRef = doc(db, "vendedores", `${empresaId}__${slug}`);

            let vData = await safeGetVendor(vendedorRef);

            // Sem vínculo nesta loja + tem convite → aceita via Cloud Function (Admin SDK).
            if (!vData && inviteToken) {
                try {
                    const res = await acceptVendorInvite({ empresaId, token: inviteToken });
                    const d = (res && res.data) || {};
                    // Confia no retorno da função (não depende de reler o doc logo após criar).
                    vData = { nomeVendedor: d.nomeVendedor || user.displayName || user.email, email: d.email || user.email, empresaId, ativo: true };
                    showToast("Convite aceito. Acesso de atendente ativado.", "success");
                } catch (err) {
                    console.error("Erro ao aceitar convite:", err);
                    showToast(conviteErrMsg(err), "error");
                    await logoutUser();
                    return;
                }
            }

            if (!vData) {
                showToast("Acesso negado. Peça ao dono da loja um convite de atendente.", "error");
                await logoutUser();
                return;
            }
            if (vData.ativo === false) {
                showToast("Seu acesso de atendente está pausado. Fale com o dono da loja.", "warn");
                await logoutUser();
                return;
            }

            loggedVendedor = vData;
            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("app-screen").classList.remove("hidden");
            document.getElementById("vendedor-nome").innerText = vData.nomeVendedor || user.displayName || user.email;
            await teardownScanner();
            html5QrcodeScanner = new Html5Qrcode("reader");
        }

        // Finaliza o fluxo de redirect do mobile SEM bloquear o módulo (IIFE).
        (async () => {
            try {
                await getRedirectResult(auth);
            } catch (err) {
                console.error("Erro ao recuperar resultado do redirecionamento:", err);
                showToast(authErrorMessage(err), "error");
            }
        })();

        // Gerenciamento da Autenticação do Vendedor
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    await liberarVendedor(user);
                } catch (err) {
                    console.error("Erro ao verificar vendedor:", err);
                    showToast("Não foi possível validar seu acesso de atendente. Tente novamente ou peça um novo convite.", "error");
                    await logoutUser();
                }
            } else {
                await teardownScanner();
                document.getElementById("login-screen").classList.remove("hidden");
                document.getElementById("app-screen").classList.add("hidden");
            }
        });

        // Form Login do Vendedor
        document.getElementById("login-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;
            const btn = document.getElementById("btn-login");

            if (!email) {
                showToast("Digite seu e-mail.", "warn");
                document.getElementById("email").focus();
                return;
            }
            if (!password) {
                showToast("Digite sua senha.", "warn");
                document.getElementById("password").focus();
                return;
            }

            btn.disabled = true;
            btn.innerText = "Verificando credenciais...";

            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                try {
                    if (inviteToken && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")) {
                        await createUserWithEmailAndPassword(auth, email, password);
                        return;
                    }

                    const cleanId = email.replace(/[^a-z0-9]/g, "_");
                    const vendedorSnap = await getDoc(doc(db, "vendedores", cleanId));
                    if (vendedorSnap.exists() && vendedorSnap.data().empresaId === empresaId && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")) {
                        await createUserWithEmailAndPassword(auth, email, password);
                        return;
                    }
                } catch (innerErr) {
                    console.error(innerErr);
                    showToast(authErrorMessage(innerErr), "error");
                    btn.disabled = false;
                    btn.innerText = "Entrar na câmera";
                    return;
                }

                console.error(err);
                showToast(authErrorMessage(err), "error");
                btn.disabled = false;
                btn.innerText = "Entrar na câmera";
            }
        });

        // Login Social Google
        document.getElementById("btn-login-google")?.addEventListener("click", async () => {
            const btn = document.getElementById("btn-login-google");
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Redirecionando...`;
            try {
                // Usando Redirect ao invés de Popup porque Popup é bloqueado por navegadores mobile in-app
                await loginWithGoogleRedirect();
            } catch (err) {
                console.error(err);
                showToast(authErrorMessage(err), "error");
                btn.innerHTML = originalText;
            }
        });

        // Logout
        document.getElementById("btn-logout")?.addEventListener("click", async () => {
            // B-02: desmonta totalmente (stop + clear) antes de deslogar.
            await teardownScanner();
            await logoutUser();
        });

        // --- Lógica do Scanner de Câmera (html5-qrcode) ---
        const btnStart = document.getElementById("btn-start-scanner");
        const btnStop = document.getElementById("btn-stop-scanner");
        const statusDot = document.getElementById("scanner-status-dot");

        btnStart?.addEventListener("click", () => startScanner());
        btnStop?.addEventListener("click", () => stopScanner());

        async function startScanner() {
            if (!html5QrcodeScanner) return;
            
            btnStart.disabled = true;
            btnStop.disabled = false;
            statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-ping";

            try {
                isScannerRunning = true;
                // facingMode: "environment" força o uso da Câmera Traseira por padrão!
                await html5QrcodeScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 220, height: 220 }
                    },
                    onScanSuccess,
                    onScanFailure
                );
            } catch (err) {
                console.error("Falha ao abrir a câmera: ", err);
                showAlert("error", "Falha na Câmera", "Verifique as permissões de câmera do seu navegador.");
                stopScanner();
            }
        }

        async function stopScanner() {
            if (!html5QrcodeScanner || !isScannerRunning) return;

            btnStart.disabled = false;
            btnStop.disabled = true;
            statusDot.className = "w-2 h-2 rounded-full bg-stone-300";

            try {
                await html5QrcodeScanner.stop();
                isScannerRunning = false;
            } catch (err) {
                console.error(err);
            }
        }

        // B-02: desmonta o scanner por completo (stop + clear + libera a instância).
        // Sem isto, ao relogar criávamos um novo Html5Qrcode sobre o <div id="reader">
        // que ainda continha o vídeo/canvas da sessão anterior → tela preta.
        async function teardownScanner() {
            if (!html5QrcodeScanner) return;
            try {
                if (isScannerRunning) {
                    await html5QrcodeScanner.stop();
                }
                await html5QrcodeScanner.clear(); // remove o vídeo/canvas do #reader
            } catch (err) {
                console.error("Erro ao desmontar o scanner:", err);
            } finally {
                isScannerRunning = false;
                html5QrcodeScanner = null;
                if (btnStart) btnStart.disabled = false;
                if (btnStop) btnStop.disabled = true;
                if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-stone-300";
            }
        }

        // --- Processamento da Leitura de QR Code ---
        
        // Evitar múltiplos processamentos repetitivos da mesma leitura rápida
        let isProcessing = false;

        async function onScanSuccess(decodedText) {
            const clientUid = decodedText.trim();
            // Trava anti-duplicação: a câmera dispara a leitura várias vezes com o QR na
            // frente. Processa 1 vez e só libera após um cooldown (evita pontuar/resgatar
            // em rajada na mesma aproximação).
            if (isProcessing) return;
            isProcessing = true;

            triggerVibration(100); // confirmação de captura
            await loadClient(clientUid);

            // Depois do cooldown, reaproximar o MESMO cliente já age de novo
            // (ex.: completar o cartão e, na sequência, resgatar o prêmio).
            setTimeout(() => {
                isProcessing = false;
            }, 2500);
        }

        function onScanFailure(error) {
            // Callback silencioso para não entupir o console
        }

        // Manual Submit Button
        document.getElementById("btn-manual-submit")?.addEventListener("click", async () => {
            const input = document.getElementById("manual-client-input");
            const val = input.value.trim();
            
            if (!val) {
                showToast("Por favor, digite o UID ou E-mail do cliente.", "warn");
                return;
            }

            document.getElementById("btn-manual-submit").disabled = true;
            
            let clientUid = val;

            // Se for um e-mail, resolve o cliente via Cloud Function (findClient)
            if (val.includes("@")) {
                try {
                    const r = await findClient({ empresaId, email: val.toLowerCase() });
                    if (!r.found) {
                        showAlert("error", "Erro de Busca", "Nenhum cliente cadastrado com este e-mail.");
                        playSound("error");
                        document.getElementById("btn-manual-submit").disabled = false;
                        return;
                    }
                    if (!r.temCartao) {
                        showAlert("error", "Sem cartão", "Cliente ainda não ativou o cartão desta loja.");
                        playSound("error");
                        document.getElementById("btn-manual-submit").disabled = false;
                        return;
                    }
                    clientUid = r.clienteId;
                } catch (err) {
                    console.error(err);
                    showAlert("error", "Erro de busca", "Não foi possível buscar este cliente. Tente novamente.");
                    playSound("error");
                    document.getElementById("btn-manual-submit").disabled = false;
                    return;
                }
            }

            await loadClient(clientUid);
            input.value = "";
            document.getElementById("btn-manual-submit").disabled = false;
        });

        // ---- Scan automático: QR age direto (pontua ou resgata) ----
        // Estado do cliente atualmente no painel.
        let panelClienteId = null;
        let currentClientName = "";
        let currentPremios = 0;

        const selectPointsQty = document.getElementById("scan-qty");
        const clientPanel = document.getElementById("client-panel");
        const prizeBox = document.getElementById("prize-box");
        const btnDeliverPrize = document.getElementById("btn-deliver-prize");
        const btnAddPoints = document.getElementById("btn-add-points");
        const btnRemovePoint = document.getElementById("btn-remove-point");
        const btnNextClient = document.getElementById("btn-next-client");

        const isInativaErr = (err) =>
            String(err && err.message).includes("ASSINATURA_INATIVA") ||
            String(err && err.code).includes("failed-precondition");

        // Scan/manual AGE DIRETO: resgata se houver prêmio pendente, senão credita a
        // quantidade selecionada no leitor. Sem etapa de confirmação (decisão de produto).
        async function loadClient(clientUid) {
            if (!empresaId) {
                showAlert("error", "Empresa não identificada", "Abra o link com ?empresa=ID.");
                playSound("error");
                return;
            }
            try {
                const card = await getCard({ empresaId, clienteId: clientUid });
                if (!card || !card.exists) {
                    resetPanel();
                    showAlert("error", "Sem cartão", "Este cliente ainda não ativou o cartão desta loja.");
                    playSound("error");
                    return;
                }
                currentClientName = card.nome || "Cliente";
                if ((card.premiosPendentes || 0) > 0) {
                    await autoRedeem(clientUid);   // cliente tem prêmio → resgate automático
                } else {
                    await autoAward(clientUid);    // sem prêmio → credita a quantidade do leitor
                }
            } catch (err) {
                console.error("Erro ao processar leitura:", err);
                resetPanel();
                showAlert("error", isInativaErr(err) ? "Loja com assinatura inativa" : "Erro ao processar",
                    isInativaErr(err) ? "A assinatura desta loja está inativa. Avise o responsável." : "Não foi possível processar a leitura. Tente novamente.");
                playSound("error");
            }
        }

        // Credita a quantidade selecionada. Se o backend recusar por prêmio pendente
        // (corrida com outro caixa), cai para o resgate automaticamente.
        async function autoAward(clientUid) {
            const qty = parseInt(selectPointsQty?.value || "1");
            try {
                const res = await awardPoints({ empresaId, clienteId: clientUid, qtd: qty });
                renderClientPanel(clientUid, res.pontos, res.premiosPendentes, currentClientName);
                if (res.premiosGanhos > 0) {
                    showAlert("win", "Cartão completo! 🎉", `+${qty} · cliente ganhou ${res.premiosGanhos} prêmio(s). O próximo scan resgata.`);
                    playSound("win");
                    triggerVibration([100, 50, 100, 50, 300]);
                } else {
                    showAlert("success", "Pontos adicionados", `+${qty} · agora ${res.pontos}/${res.meta}.`);
                    playSound("success");
                    triggerVibration(150);
                }
                showEmojiFeedback(qty);
                if (selectPointsQty) selectPointsQty.value = "1"; // Reset automático por segurança
            } catch (err) {
                if (String(err && err.message).includes("PREMIO_PENDENTE")) {
                    await autoRedeem(clientUid);
                    return;
                }
                throw err;
            }
        }

        // Resgate automático de 1 prêmio. No último prêmio o cartão renova com a sobra.
        async function autoRedeem(clientUid) {
            const r = await deliverPrize({ empresaId, clienteId: clientUid });
            renderClientPanel(clientUid, r.pontos, r.premiosPendentes, currentClientName);
            const msg = r.premiosPendentes > 0
                ? `Prêmio entregue! Ainda restam ${r.premiosPendentes} prêmio(s).`
                : "Prêmio entregue! Cartão renovado.";
            showAlert("win", "🎁 Prêmio entregue!", msg);
            playSound("win");
            triggerVibration([100, 50, 100, 50, 300]);
        }

        // Opções de pontos = múltiplos relativos à meta (x): 1, 2, 3, ⌊x/2⌋, x
        // (deduplicadas e ≤ x). O maior valor completa um cartão inteiro num scan.
        function populateQtyOptions(meta) {
            if (!selectPointsQty) return;
            const opts = [...new Set([1, 2, 3, Math.floor(meta / 2), meta])]
                .filter((n) => n >= 1 && n <= meta)
                .sort((a, b) => a - b);
            selectPointsQty.innerHTML = opts
                .map((n) => `<option value="${n}">+${n}${n === meta ? " (cartão)" : ""}</option>`)
                .join("");
            selectPointsQty.value = "1";
        }

        function renderClientPanel(clienteId, pontos, premiosPendentes, nome) {
            panelClienteId = clienteId;
            if (nome != null) currentClientName = nome;
            const meta = metaConfig.metaPontos || 10;
            if (clientPanel) clientPanel.classList.remove("hidden");
            const elName = document.getElementById("client-name");
            if (elName) elName.innerText = currentClientName || "Cliente";
            const elP = document.getElementById("client-points");
            const elM = document.getElementById("client-meta");
            if (elP && pontos != null) elP.innerText = pontos;
            if (elM) elM.innerText = meta;
            const prog = document.getElementById("client-progress");
            if (prog && pontos != null) prog.style.width = Math.min(100, Math.round((pontos / meta) * 100)) + "%";
            updatePrizeBox(premiosPendentes != null ? premiosPendentes : currentPremios);
        }

        function updatePrizeBox(premiosPendentes) {
            if (!prizeBox) return;
            if (premiosPendentes != null && premiosPendentes > 0) {
                currentPremios = premiosPendentes;
                prizeBox.classList.remove("hidden");
                prizeBox.classList.add("flex");
                const txt = document.getElementById("prize-count-text");
                if (txt) txt.innerText = `${premiosPendentes} prêmio(s) a entregar`;
                if (btnDeliverPrize) btnDeliverPrize.disabled = false;
            } else if (premiosPendentes != null) {
                currentPremios = 0;
                prizeBox.classList.add("hidden");
                prizeBox.classList.remove("flex");
            }
        }

        function resetPanel() {
            panelClienteId = null;
            currentClientName = "";
            currentPremios = 0;
            if (clientPanel) clientPanel.classList.add("hidden");
            updatePrizeBox(0);
        }

        // Ação manual opcional: adicionar pontos ao cliente carregado.
        async function addPoints() {
            if (!panelClienteId) return;
            const qtyToAdd = parseInt(selectPointsQty?.value || "1");
            if (btnAddPoints) btnAddPoints.disabled = true;
            try {
                const res = await awardPoints({ empresaId, clienteId: panelClienteId, qtd: qtyToAdd });
                renderClientPanel(panelClienteId, res.pontos, res.premiosPendentes, currentClientName);
                if (res.premiosGanhos > 0) {
                    showAlert("win", "Cartão completo!", `+${qtyToAdd} · ${res.premiosGanhos} cartão(ões) completo(s) · ${res.premiosPendentes} prêmio(s) a entregar · agora ${res.pontos}/${res.meta}.`);
                    playSound("win");
                    triggerVibration([100, 50, 100, 50, 300]);
                } else {
                    showAlert("success", "Pontos adicionados", `+${qtyToAdd} · cliente agora tem ${res.pontos}/${res.meta} pontos.`);
                    playSound("success");
                    triggerVibration(150);
                }
                showEmojiFeedback(qtyToAdd);
                if (selectPointsQty) selectPointsQty.value = "1"; // Reset automático por segurança
            } catch (err) {
                console.error("Erro ao adicionar pontos:", err);
                showAlert("error", isInativaErr(err) ? "Loja com assinatura inativa" : "Erro ao pontuar",
                    isInativaErr(err) ? "A assinatura desta loja está inativa. Avise o responsável." : "Não foi possível registrar os pontos. Tente novamente.");
                playSound("error");
            } finally {
                if (btnAddPoints) btnAddPoints.disabled = false;
            }
        }

        // Ação manual opcional: tirar 1 ponto (correção). Não altera prêmios pendentes.
        async function removeOnePoint() {
            if (!panelClienteId) return;
            if (btnRemovePoint) btnRemovePoint.disabled = true;
            try {
                const r = await removePoint({ empresaId, clienteId: panelClienteId });
                renderClientPanel(panelClienteId, r.pontos, currentPremios, currentClientName);
                showAlert("success", "Ponto removido", `Cliente agora tem ${r.pontos}/${metaConfig.metaPontos || 10}.`);
                playSound("success");
                triggerVibration(120);
            } catch (err) {
                console.error("Erro ao remover ponto:", err);
                showAlert("error", isInativaErr(err) ? "Loja com assinatura inativa" : "Erro ao remover",
                    isInativaErr(err) ? "A assinatura desta loja está inativa. Avise o responsável." : "Não foi possível remover o ponto. Tente novamente.");
                playSound("error");
            } finally {
                if (btnRemovePoint) btnRemovePoint.disabled = false;
            }
        }

        if (btnAddPoints) btnAddPoints?.addEventListener("click", addPoints);
        if (btnRemovePoint) btnRemovePoint?.addEventListener("click", removeOnePoint);
        if (btnNextClient) btnNextClient?.addEventListener("click", resetPanel);

        if (btnDeliverPrize) {
            btnDeliverPrize?.addEventListener("click", async () => {
                if (!panelClienteId) return;
                btnDeliverPrize.disabled = true; // idempotência: trava no clique
                try {
                    const r = await deliverPrize({ empresaId, clienteId: panelClienteId });
                    showAlert("win", "Prêmio entregue!", `Restam ${r.premiosPendentes} prêmio(s) pendente(s).`);
                    playSound("win");
                    triggerVibration([100, 50, 100, 50, 300]);
                    updatePrizeBox(r.premiosPendentes);
                } catch (err) {
                    console.error("Erro ao entregar prêmio:", err);
                    const isInativa = String(err.message).includes("ASSINATURA_INATIVA") || String(err.code).includes("failed-precondition");
                    if (isInativa) {
                        showAlert("error", "Loja com assinatura inativa", "A assinatura desta loja está inativa. Avise o responsável pelo estabelecimento.");
                    } else {
                        showAlert("error", "Erro ao entregar", "Não foi possível entregar o prêmio. Tente novamente.");
                    }
                    playSound("error");
                    btnDeliverPrize.disabled = false;
                }
            });
        }
        // Visual Emoji Feedback for Vendor
        function showEmojiFeedback(qty) {
            const emojiStr = visualConfig.emoji || "⭐";
            const popup = document.createElement("div");
            popup.innerHTML = qty > 1 ? `+${qty} <span class="ml-2">${emojiStr}</span>` : `+1 <span class="ml-2">${emojiStr}</span>`;
            popup.className = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold bg-white/95 backdrop-blur-md px-10 py-8 rounded-[3rem] shadow-2xl flex items-center justify-center z-[99999] transition-all duration-300 pointer-events-none scale-50 opacity-0 border-4 border-indigo-100 text-slate-800 drop-shadow-xl";
            document.body.appendChild(popup);
            
            popup.offsetWidth; // force reflow
            
            popup.classList.remove("opacity-0", "scale-50");
            popup.classList.add("opacity-100", "scale-110");
            
            setTimeout(() => {
                popup.classList.remove("opacity-100", "scale-110");
                popup.classList.add("opacity-0", "scale-150");
                setTimeout(() => popup.remove(), 300);
            }, 800);
        }

        // --- Manipulação da Área de Alertas na Interface ---
        function showAlert(type, title, message) {
            const card = document.getElementById("alert-card");
            const iconBox = document.getElementById("alert-icon-box");
            const titleEl = document.getElementById("alert-title");
            const messageEl = document.getElementById("alert-message");

            card.className = "p-4 rounded-2xl flex items-start gap-3 text-left transition-all duration-300 animate-fade-in";
            
            if (type === "success") {
                card.classList.add("bg-emerald-50", "border-2", "border-emerald-200", "text-emerald-700");
                iconBox.className = "w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg shrink-0";
                iconBox.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
            } else if (type === "win") {
                card.classList.add("bg-yellow-50", "border-2", "border-yellow-300", "text-yellow-700");
                iconBox.className = "w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 text-lg shrink-0";
                iconBox.innerHTML = '<i class="fa-solid fa-trophy animate-bounce"></i>';
            } else if (type === "error") {
                card.classList.add("bg-red-50", "border-2", "border-red-200", "text-red-600");
                iconBox.className = "w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-lg shrink-0";
                iconBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            }

            titleEl.innerText = title;
            messageEl.innerText = message;
            card.classList.remove("hidden");

            // Oculta feedback após 6 segundos
            setTimeout(() => {
                card.classList.add("hidden");
            }, 6000);
        }

        // --- Navegação Sub-Tabs ---
        window.openSubTab = function(subId) {
            const el = document.getElementById(subId);
            if (!el) return;
            el.classList.remove("hidden");
            // small delay to allow display:flex to apply before translating
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
            }, 300); // match duration-300
        };
        // --- Realtime Data Listeners ---
        function listenToData() {
            // Escuta Clientes
            const clientesQuery = query(collection(db, "empresas", empresaId, "clientes"));
            onSnapshot(clientesQuery, (snapshot) => {
                const listContainer = document.getElementById("clientes-list");
                if (listContainer) listContainer.innerHTML = "";

                let totalClientes = 0;
                let totalPontos = 0;
                let premiosDisponiveis = 0;

                let hasClientes = false;

                snapshot.forEach((docSnap) => {
                    const client = docSnap.data();
                    const clientId = docSnap.id;
                    const pontos = client.pontos || 0;
                    const premios = client.premiosPendentes || 0;
                    const nome = client.nome || client.nomeCompleto || "Sem nome";

                    hasClientes = true;
                    totalClientes++;
                    totalPontos += pontos;

                    window.clientesDataMap = window.clientesDataMap || {};
                    window.clientesDataMap[clientId] = client;

                    const isWin = premios > 0;
                    if (isWin) premiosDisponiveis += premios;

                    if (listContainer) {
                        const card = document.createElement("div");
                        card.className = "client-card glassmorphism p-4 rounded-2xl flex flex-col gap-3 border border-stone-200 hover:bg-stone-50 transition-colors";
                        card.dataset.name = nome;
                        card.dataset.email = client.email || "";
                        card.innerHTML = `
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-center gap-3 w-full">
                                    <div class="flex-1 min-w-0">
                                        <h4 class="font-bold text-stone-800 text-sm leading-tight truncate">${nome}</h4>
                                        <p class="text-[10px] text-stone-500 mt-0.5 truncate">${client.email || ""}</p>
                                    </div>
                                    <div class="text-right shrink-0 flex flex-col items-end">
                                        <span class="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Pontos</span>
                                        <span class="font-bold font-outfit text-indigo-500 text-lg leading-none">${pontos}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-2 border-t border-stone-100 pt-3 mt-1">
                                <span class="px-2.5 py-1 rounded-md text-[10px] font-semibold border ${isWin ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-stone-100 text-stone-500 border-stone-200'}">
                                    ${isWin ? `<i class="fa-solid fa-gift mr-1"></i> ${premios} prêmio${premios > 1 ? 's' : ''}` : "Acumulando"}
                                </span>
                                <div class="flex gap-2">
                                    <button onclick="openHistoricoModal('${clientId}', '${nome}')" class="w-8 h-8 flex items-center justify-center text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 border border-indigo-100 rounded-lg active:scale-95 shadow-sm" title="Ver Histórico"><i class="fa-solid fa-clock-rotate-left"></i></button>
                                    <button onclick="openAjustarModal('${clientId}', '${nome}', '${client.email || ''}', ${pontos})" class="w-8 h-8 flex items-center justify-center text-amber-600 hover:text-amber-800 transition bg-amber-50 border border-amber-100 rounded-lg active:scale-95 shadow-sm" title="Ajustar Pontos"><i class="fa-solid fa-pen"></i></button>
                                </div>
                            </div>
                        `;
                        listContainer.appendChild(card);
                    }
                });

                if (!hasClientes && listContainer) {
                    listContainer.innerHTML = `
                        <div class="glassmorphism p-8 rounded-2xl text-center text-stone-500 w-full">
                            Nenhum cliente participante ainda.
                        </div>
                    `;
                }

                // Atualiza contadores do Status
                if (document.getElementById("stat-total-clientes")) document.getElementById("stat-total-clientes").innerText = totalClientes;
                if (document.getElementById("stat-total-pontos")) document.getElementById("stat-total-pontos").innerText = totalPontos;
                if (document.getElementById("stat-premios-disponiveis")) document.getElementById("stat-premios-disponiveis").innerText = premiosDisponiveis;
            });

            // Escuta Vendedores
            const vendedoresQuery = query(collection(db, "vendedores"), where("empresaId", "==", empresaId));
            onSnapshot(vendedoresQuery, (snapshot) => {
                const grid = document.getElementById("vendedores-grid");
                if (grid) grid.innerHTML = "";

                let hasVendedores = false;

                snapshot.forEach((docSnap) => {
                    hasVendedores = true;
                    const vended = docSnap.data();
                    const vUid = docSnap.id;

                    if (grid) {
                        const card = document.createElement("div");
                        card.className = "glassmorphism p-5 rounded-2xl flex flex-col justify-between gap-4";
                        card.innerHTML = `
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 text-lg">
                                    <i class="fa-solid fa-user-tag"></i>
                                </div>
                                <div class="min-w-0">
                                    <h4 class="font-bold text-stone-800 text-sm leading-tight truncate">${vended.nomeVendedor || "Atendente"}</h4>
                                    <p class="text-[10px] text-stone-500 mt-0.5 break-all">${vended.email || ""}</p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center gap-2 border-t border-stone-200 pt-3">
                                <span class="text-[10px] font-bold uppercase tracking-wider ${vended.ativo !== false ? 'text-emerald-700' : 'text-stone-500'}">
                                    ${vended.ativo !== false ? 'Ativo' : 'Pausado'}
                                </span>
                                <div class="flex gap-2">
                                    <button onclick="window.openHistoricoVendedorModal('${vUid}', '${vended.nomeVendedor || "Atendente"}')" class="w-8 h-8 rounded-full border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-50 hover:text-indigo-600 transition-colors" title="Ver Histórico">
                                        <i class="fa-solid fa-clock-rotate-left"></i>
                                    </button>
                                    <button onclick="window.pausarVendedor('${vUid}', ${vended.ativo !== false})" class="w-8 h-8 rounded-full border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-50 hover:text-orange-500 transition-colors" title="${vended.ativo !== false ? 'Pausar Vendedor' : 'Retomar Vendedor'}">
                                        <i class="fa-solid ${vended.ativo !== false ? 'fa-pause' : 'fa-play'}"></i>
                                    </button>
                                    <button onclick="window.apagarVendedor('${vUid}')" class="w-8 h-8 rounded-full border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors" title="Remover Vendedor">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        grid.appendChild(card);
                    }
                });

                if (!hasVendedores && grid) {
                    grid.innerHTML = `
                        <div class="glassmorphism p-8 rounded-2xl text-center text-stone-500 col-span-full">
                            Nenhum vendedor registrado.
                        </div>
                    `;
                }
            });
        }

    

// Abrir Modal de Histórico de Carimbos
        window.openHistoricoModal = async function(clientId, clientName) {
            document.getElementById("historico-cliente-nome").innerText = clientName || "Sem Nome";
            const historicoLista = document.getElementById("historico-lista");
            historicoLista.innerHTML = `<div class="text-center text-stone-500 py-6 text-xs">Carregando histórico...</div>`;
            document.getElementById("modal-historico").classList.remove("hidden");

            try {
                // Logs ficam na subcoleção do cartão (gravados pelas Cloud Functions)
                const logsRef = collection(db, "empresas", empresaId, "clientes", clientId, "logs");
                const snap = await getDocs(logsRef);

                if (snap.empty) {
                    historicoLista.innerHTML = `<div class="text-center text-stone-500 py-6 text-xs">Nenhum registro no histórico.</div>`;
                    return;
                }

                const logs = snap.docs.map(d => d.data());
                logs.sort((a, b) => (b.data?.toMillis?.() || 0) - (a.data?.toMillis?.() || 0));

                historicoLista.innerHTML = logs.map(log => {
                    const dateObj = log.data?.toDate ? log.data.toDate() : new Date();
                    const dateStr = dateObj.toLocaleDateString('pt-BR');
                    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    const desc = log.tipo === "resgate"
                        ? `<i class="fa-solid fa-gift text-yellow-400 mr-1.5"></i> Prêmio entregue`
                        : log.tipo === "remocao"
                        ? `<i class="fa-solid fa-minus text-red-600 mr-1.5"></i> -1 Ponto`
                        : log.tipo === "ajuste"
                        ? `<i class="fa-solid fa-pen text-amber-400 mr-1.5"></i> Ajuste manual (${log.qtd ?? 0})`
                        : `<i class="fa-solid fa-stamp text-indigo-400 mr-1.5"></i> +${log.qtd || 1} Ponto(s)`;
                    const sub = log.motivo ? `Motivo: ${log.motivo}` : `Vendedor: ${log.vendedor || "Sistema"}`;

                    return `
                        <div class="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center text-xs">
                            <div class="flex flex-col gap-1">
                                <span class="text-stone-800 font-medium">${desc}</span>
                                <span class="text-stone-500 text-[10px]">${sub}</span>
                            </div>
                            <div class="text-right flex flex-col gap-0.5">
                                <span class="text-stone-500">${dateStr}</span>
                                <span class="text-stone-500 text-[10px]">${timeStr}</span>
                            </div>
                        </div>
                    `;
                }).join("");
            } catch (err) {
                console.error("Erro ao carregar histórico:", err);
                historicoLista.innerHTML = `<div class="text-center text-red-600 py-6 text-xs">Erro ao carregar histórico.</div>`;
            }
        };

        window.closeHistoricoModal = function() {
            document.getElementById("modal-historico").classList.add("hidden");
        };

        // Abrir Modal de Histórico do Vendedor
        window.openHistoricoVendedorModal = async function(vUid, vName) {
            document.getElementById("historico-vendedor-nome").innerText = vName || "Atendente";
            const historicoLista = document.getElementById("historico-vendedor-lista");
            historicoLista.innerHTML = `<div class="text-center text-stone-500 py-6 text-xs">Carregando atividades...</div>`;
            document.getElementById("modal-historico-vendedor").classList.remove("hidden");

            try {
                const logsRef = collection(db, "vendedores", vUid, "logs");
                const snap = await getDocs(query(logsRef, orderBy("data", "desc"), limit(50)));

                if (snap.empty) {
                    historicoLista.innerHTML = `<div class="text-center text-stone-500 py-6 text-xs">Nenhuma atividade recente registrada.</div>`;
                    return;
                }

                const logs = snap.docs.map(d => d.data());

                historicoLista.innerHTML = logs.map(log => {
                    const dateObj = log.data?.toDate ? log.data.toDate() : new Date();
                    const dateStr = dateObj.toLocaleDateString('pt-BR');
                    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    const desc = log.tipo === "resgate"
                        ? `<i class="fa-solid fa-gift text-yellow-400 mr-1.5"></i> Resgatou prêmio`
                        : log.tipo === "remocao"
                        ? `<i class="fa-solid fa-minus text-red-600 mr-1.5"></i> Removeu ponto`
                        : log.tipo === "ajuste"
                        ? `<i class="fa-solid fa-pen text-amber-400 mr-1.5"></i> Ajuste manual (${log.qtd ?? 0})`
                        : `<i class="fa-solid fa-stamp text-indigo-400 mr-1.5"></i> Adicionou ${log.qtd || 1} Ponto(s)`;
                    const sub = `Para: ${log.clienteNome || "Cliente"}`;

                    return `
                        <div class="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center text-xs">
                            <div class="flex flex-col gap-1">
                                <span class="text-stone-800 font-medium">${desc}</span>
                                <span class="text-stone-500 text-[10px]">${sub}</span>
                            </div>
                            <div class="text-right flex flex-col gap-0.5">
                                <span class="text-stone-500">${dateStr}</span>
                                <span class="text-stone-500 text-[10px]">${timeStr}</span>
                            </div>
                        </div>
                    `;
                }).join("");
            } catch (err) {
                console.error("Erro ao carregar histórico do vendedor:", err);
                historicoLista.innerHTML = `<div class="text-center text-red-600 py-6 text-xs">Erro ao carregar atividades.</div>`;
            }
        };

        window.closeHistoricoVendedorModal = function() {
            document.getElementById("modal-historico-vendedor").classList.add("hidden");
        };


        // Abrir Modal de Feature Pro
        window.openProFeatureModal = function(featureName) {
            document.getElementById("pro-feature-name").innerText = featureName || "Recurso Premium";
            document.getElementById("modal-pro-feature").classList.remove("hidden");
        };

        window.closeProFeatureModal = function() {
            document.getElementById("modal-pro-feature").classList.add("hidden");
        };

        // Abrir Modal de Ajuste de Pontos
        window.openAjustarModal = function(clientId, nome, email, pontosAtuais) {
            isBulkAjuste = false;
            targetClienteId = clientId;
            document.getElementById("modal-ajuste-nome").innerText = nome;
            document.getElementById("modal-ajuste-email").innerText = email;
            document.getElementById("modal-ajuste-pontos-atuais").innerText = pontosAtuais;
            
            // Reseta inputs do modal
            document.getElementById("ajuste-quantidade-pontos").value = 1;
            document.getElementById("ajuste-justificativa").value = "";
            document.getElementById("btn-confirm-ajuste").disabled = true;

            setAjusteAction("add");
            
            document.getElementById("modal-ajustar-pontos").classList.remove("hidden");
        };

        window.closeAjustarModal = function() {
            document.getElementById("modal-ajustar-pontos").classList.add("hidden");
        };

        // Gerenciamento da Ação Ativa do Modal
        window.setAjusteAction = function(action) {
            currentAjusteAction = action;
            const btnAdd = document.getElementById("btn-action-add");
            const btnRemove = document.getElementById("btn-action-remove");
            const btnZero = document.getElementById("btn-action-zero");
            const pointsContainer = document.getElementById("input-pontos-container");

            // Reseta classes
            [btnAdd, btnRemove, btnZero].forEach(btn => {
                btn.className = "flex-grow py-2.5 rounded-lg border-2 border-stone-200 bg-transparent text-stone-500 font-bold text-xs transition";
            });

            if (action === "add") {
                btnAdd.className = "flex-grow py-2.5 rounded-lg border-2 border-indigo-600 bg-indigo-600/10 font-bold text-xs text-indigo-700 transition";
                pointsContainer.classList.remove("hidden");
            } else if (action === "remove") {
                btnRemove.className = "flex-grow py-2.5 rounded-lg border-2 border-amber-600 bg-amber-600/10 font-bold text-xs text-amber-700 transition";
                pointsContainer.classList.remove("hidden");
            } else if (action === "zero") {
                btnZero.className = "flex-grow py-2.5 rounded-lg border-2 border-red-600 bg-red-600/10 font-bold text-xs text-red-700 transition";
                pointsContainer.classList.add("hidden");
            }
            
            validateAjusteForm();
        };

        // Visual Emoji Feedback for Dashboard
        window.showEmojiFeedback = function(qty) {
            const emojiStr = window.metaConfig?.brandEmoji || "⭐";
            const popup = document.createElement("div");
            popup.innerHTML = qty > 1 ? `+${qty} <span class="ml-2">${emojiStr}</span>` : `+1 <span class="ml-2">${emojiStr}</span>`;
            popup.className = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold bg-white/95 backdrop-blur-md px-10 py-8 rounded-[3rem] shadow-2xl flex items-center justify-center z-[99999] transition-all duration-300 pointer-events-none scale-50 opacity-0 border-4 border-indigo-100 text-slate-800 drop-shadow-xl";
            document.body.appendChild(popup);
            
            popup.offsetWidth; // force reflow
            
            popup.classList.remove("opacity-0", "scale-50");
            popup.classList.add("opacity-100", "scale-110");
            
            setTimeout(() => {
                popup.classList.remove("opacity-100", "scale-110");
                popup.classList.add("opacity-0", "scale-150");
                setTimeout(() => popup.remove(), 300);
            }, 800);
        };

        // Validação da justificativa antes de habilitar submissão
        const justificativaInput = document.getElementById("ajuste-justificativa");
        justificativaInput?.addEventListener("input", validateAjusteForm);

        function validateAjusteForm() {
            const justificativaLength = justificativaInput.value.trim().length;
            const btnConfirm = document.getElementById("btn-confirm-ajuste");
            
            if (justificativaLength >= 5) {
                btnConfirm.disabled = false;
            } else {
                btnConfirm.disabled = true;
            }
        }

        // Submissão do Ajuste de Pontos
        document.getElementById("btn-confirm-ajuste")?.addEventListener("click", async () => {
            const btnConfirm = document.getElementById("btn-confirm-ajuste");
            btnConfirm.disabled = true;
            btnConfirm.innerText = "Salvando...";

            try {
                // Aplica o ajuste via Cloud Function (server-side, auditado):
                //  add  -> awardPoints (carry-over + prêmio)
                //  remove/zero -> setPoints (valor absoluto, com justificativa)
                const aplicarAjusteCliente = async (cid, pontosAtuais) => {
                    const qty = parseInt(document.getElementById("ajuste-quantidade-pontos").value) || 1;
                    const motivo = justificativaInput.value.trim();
                    if (currentAjusteAction === "add") {
                        await awardPoints({ empresaId, clienteId: cid, qtd: qty });
                    } else if (currentAjusteAction === "remove") {
                        await setPoints({ empresaId, clienteId: cid, pontos: Math.max(0, pontosAtuais - qty), motivo });
                    } else if (currentAjusteAction === "zero") {
                        await setPoints({ empresaId, clienteId: cid, pontos: 0, motivo });
                    }
                };

                // Cartão travado (prêmio pendente): awardPoints recusa com PREMIO_PENDENTE.
                // No "add" tratamos isso com mensagem clara (e, no lote, pulando o cliente).
                const isPremioPendente = (e) => String(e && (e.message || e.code) || "").includes("PREMIO_PENDENTE");
                if (isBulkAjuste) {
                    let ajustados = 0;
                    const bloqueados = [];
                    for (const cid of targetClienteIds) {
                        const atual = (window.clientesDataMap?.[cid]?.pontos) || 0;
                        try {
                            await aplicarAjusteCliente(cid, atual);
                            ajustados++;
                        } catch (e) {
                            if (currentAjusteAction === "add" && isPremioPendente(e)) {
                                bloqueados.push(window.clientesDataMap?.[cid]?.nome || "cliente");
                            } else {
                                throw e;
                            }
                        }
                    }
                    if (bloqueados.length) {
                        showToast(`${ajustados} ajustado(s). ${bloqueados.length} com prêmio pendente foram pulados — resgate o prêmio antes de pontuar.`, ajustados ? "warn" : "error");
                    } else {
                        showToast("Pontuação ajustada com sucesso para os clientes selecionados!", "success");
                    }
                    const allCheckbox = document.getElementById("select-all-clients");
                    if (allCheckbox) allCheckbox.checked = false;
                    toggleSelectAll(allCheckbox);
                } else {
                    const atual = (window.clientesDataMap?.[targetClienteId]?.pontos) || 0;
                    try {
                        await aplicarAjusteCliente(targetClienteId, atual);
                    } catch (e) {
                        if (currentAjusteAction === "add" && isPremioPendente(e)) {
                            showToast("Este cliente tem prêmio pendente. Resgate o prêmio antes de adicionar pontos.", "warn");
                            closeAjustarModal();
                            return;
                        }
                        throw e;
                    }
                    showToast("Pontuação ajustada com sucesso!", "success");

                    if (currentAjusteAction === "add") {
                        const addQty = parseInt(document.getElementById("ajuste-quantidade-pontos").value) || 1;
                        showEmojiFeedback(addQty);
                    }
                }
                closeAjustarModal();
            } catch (err) {
                console.error(err);
                const premioPend = String(err && (err.message || err.code) || "").includes("PREMIO_PENDENTE");
                showToast(premioPend ? "Cliente com prêmio pendente — resgate antes de pontuar." : "Erro ao ajustar pontos. Tente novamente.", "error");
            } finally {
                btnConfirm.disabled = false;
                btnConfirm.innerText = "Confirmar Ajuste";
            }
        });

        // --- Gerenciamento de Equipe (Vendedores) ---
        window.openAddVendedorModal = function() {
            gerarConviteVendedor();
        };

        // Liga "Novo Vendedor" via addEventListener (mais confiável que onclick inline).
        document.getElementById("btn-novo-vendedor")?.addEventListener("click", () => gerarConviteVendedor());

        function buildVendorInviteUrl(token) {
            const baseUrl = getPublicBaseUrl();
            return `${baseUrl}vendedor.html?empresa=${encodeURIComponent(empresaId)}&convite=${encodeURIComponent(token)}`;
        }

        async function copyTextSafe(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                return false;
            }
        }

        window.gerarConviteVendedor = async function() {
            const btn = document.getElementById("btn-novo-vendedor");
            if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
            
            if (!empresaId || !auth.currentUser) {
                if(typeof showToast === 'function') showToast("Dados da empresa ainda não carregados. Aguarde um instante.", "warn");
                if(btn) btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Convidar Vendedor';
                return;
            }
            try {
                const token = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");
                await setDoc(doc(db, "empresas", empresaId, "convitesVendedores", token), {
                    empresaId,
                    ativo: true,
                    criadoPor: auth.currentUser.uid,
                    criadoEm: new Date(),
                });
                const inviteUrl = buildVendorInviteUrl(token);
                const card = document.getElementById("vendor-invite-card");
                const input = document.getElementById("vendor-invite-url");
                input.value = inviteUrl;
                card.classList.remove("hidden");
                
                // Remove readonly temporariamente para mobile conseguir selecionar
                input.removeAttribute('readonly');
                
                document.getElementById("btn-copy-vendor-invite").onclick = async () => {
                    const copied = await copyTextSafe(inviteUrl);
                    if(typeof showToast === 'function') showToast(copied ? "Convite copiado!" : "Copie o link selecionado.", copied ? "success" : "warn");
                    input.select();
                    input.setSelectionRange(0, 99999);
                };
                const copied = await copyTextSafe(inviteUrl);
                if(typeof showToast === 'function') showToast(copied ? "Convite de vendedor criado e copiado." : "Convite de vendedor criado. Copie o link exibido.", copied ? "success" : "warn");
            } catch (err) {
                console.error(err);
                if(typeof showToast === 'function') showToast("Erro ao gerar convite. Verifique sua conexão e tente novamente.", "error");
            }
            
            if(btn) btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Convidar Vendedor';
        };

        window.pausarVendedor = async function(vUid, estaAtivo) {
            const acao = estaAtivo ? "pausar" : "retomar";
            if (!(await confirmDialog({
                title: `${estaAtivo ? "Pausar" : "Retomar"} vendedor`,
                message: estaAtivo ? "Este vendedor ficará temporariamente sem acesso à câmera." : "Este vendedor voltará a acessar a câmera.",
                confirmText: estaAtivo ? "Pausar" : "Retomar"
            }))) return;
            try {
                await updateDoc(doc(db, "vendedores", vUid), { ativo: !estaAtivo, atualizadoEm: new Date() });
                showToast(estaAtivo ? "Vendedor pausado." : "Vendedor retomado.", "success");
            } catch (err) {
                console.error(err);
                showToast(`Erro ao ${acao} vendedor. Tente novamente.`, "error");
            }
        };

        window.apagarVendedor = async function(vUid) {
            if (!(await confirmDialog({ title: "Apagar vendedor", message: "Deseja apagar este vendedor da equipe? Ele perderá o acesso à câmera desta empresa.", confirmText: "Apagar", danger: true }))) return;
            try {
                await deleteDoc(doc(db, "vendedores", vUid));
                showToast("Vendedor apagado.", "success");
            } catch (err) {
                console.error(err);
                showToast("Erro ao apagar vendedor. Tente novamente.", "error");
            }
        };

        // --- Links de Promoção ---
        window.openPromoLinks = function() {
            document.getElementById("modal-promo-links").classList.remove("hidden");
        };

        window.closePromoLinks = function() {
            document.getElementById("modal-promo-links").classList.add("hidden");
        };

        window.copyPromoUrl = function(inputId) {
            const urlInput = document.getElementById(inputId);
            navigator.clipboard.writeText(urlInput.value);
            showToast("URL copiada!", "success");
        };

        // --- Checkout PIX (createSubscription) ---
        document.getElementById("btn-stripe-checkout")?.addEventListener("click", () => {
            openPixCheckoutModal();
        });

        window.openPixCheckoutModal = function() {
            document.getElementById("modal-pix-checkout").classList.remove("hidden");
            document.getElementById("pix-checkout-form-step").classList.remove("hidden");
            document.getElementById("pix-result-step").classList.add("hidden");
            document.getElementById("pix-cpfcnpj").value = "";
            document.getElementById("pix-telefone").value = "";
            document.getElementById("pix-cpfcnpj-error").classList.add("hidden");
            const btn = document.getElementById("btn-pix-submit");
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-qrcode mr-1"></i> Gerar cobrança PIX`;
        };

        window.closePixCheckoutModal = function() {
            document.getElementById("modal-pix-checkout").classList.add("hidden");
        };

        // Validação CPF/CNPJ: apenas dígitos, 11 ou 14 caracteres
        function validarCpfCnpj(valor) {
            const digits = valor.replace(/\D/g, "");
            return digits.length === 11 || digits.length === 14;
        }

        document.getElementById("btn-pix-submit")?.addEventListener("click", async () => {
            const cpfCnpjRaw = document.getElementById("pix-cpfcnpj").value.trim();
            const telefoneRaw = document.getElementById("pix-telefone").value.trim();
            const errEl = document.getElementById("pix-cpfcnpj-error");

            if (!validarCpfCnpj(cpfCnpjRaw)) {
                errEl.classList.remove("hidden");
                return;
            }
            errEl.classList.add("hidden");

            const cpfCnpj = cpfCnpjRaw.replace(/\D/g, "");
            const telefone = telefoneRaw.replace(/\D/g, "") || undefined;

            const btn = document.getElementById("btn-pix-submit");
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Gerando cobrança...`;

            try {
                const result = await createSubscription({ empresaId, cpfCnpj, telefone });

                // Mostra resultado
                document.getElementById("pix-checkout-form-step").classList.add("hidden");
                document.getElementById("pix-result-step").classList.remove("hidden");

                // QR Code Base64
                const qrImg = document.getElementById("pix-qr-image");
                qrImg.src = `data:image/png;base64,${result.pixQrCodeBase64}`;

                // Copia-e-cola
                document.getElementById("pix-copia-cola").value = result.pixCopiaECola;

                // Link da fatura
                const linkFatura = document.getElementById("pix-invoice-link");
                linkFatura.href = result.invoiceUrl;

            } catch (err) {
                console.error("Erro ao gerar cobrança PIX:", err);
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-qrcode mr-1"></i> Gerar cobrança PIX`;
                showToast("Erro ao gerar cobrança PIX. Tente novamente.", "error");
            }
        });

        document.getElementById("btn-pix-copiar")?.addEventListener("click", () => {
            const val = document.getElementById("pix-copia-cola").value;
            navigator.clipboard.writeText(val).then(() => {
                showToast("Código PIX copiado!");
            });
        });

        // --- Paywall: onSnapshot no doc da empresa para reagir em tempo real ---
        function listenEmpresaStatus() {
            const empRef = doc(db, "empresas", empresaId);
            onSnapshot(empRef, (snap) => {
                if (!snap.exists()) return;
                const data = snap.data();
                const status = data.statusAssinatura;
                const trialEnd = data.trialEndDate ? data.trialEndDate.toDate() : null;

                const agora = new Date();
                const isActive = status === "active" ||
                    (status === "trial" && trialEnd && trialEnd > agora);

                const paywall = document.getElementById("paywall-banner");

                if (!isActive) {
                    // Mostrar paywall
                    paywall.classList.remove("hidden");
                    // Atualizar texto do motivo
                    const motivo = (status === "overdue") ? "Pagamento em atraso" :
                                   (status === "canceled") ? "Assinatura cancelada" :
                                   "Período de teste encerrado";
                    document.getElementById("paywall-motivo").innerText = motivo;
                    // Desabilitar botões de escrita
                    setWriteButtonsDisabled(true);
                } else {
                    // Liberar
                    paywall.classList.add("hidden");
                    setWriteButtonsDisabled(false);
                }

                // Atualizar badges
                const trialAlert = document.getElementById("trial-alert");
                if (status === "active") {
                    document.getElementById("active-badge").classList.remove("hidden");
                    document.getElementById("trial-badge").classList.add("hidden");
                    trialAlert.classList.add("hidden");
                } else {
                    document.getElementById("active-badge").classList.add("hidden");
                    document.getElementById("trial-badge").classList.remove("hidden");

                    const diffDays = trialEnd
                        ? Math.max(0, Math.ceil((trialEnd - agora) / (1000 * 60 * 60 * 24)))
                        : 0;
                    const el = document.getElementById("trial-days-left");
                    if (el) el.innerText = diffDays;

                    // $-02: durante o trial, mostra o banner amigável de contagem.
                    // Expirado, o paywall já assume o bloqueio — esconde o alerta.
                    if (isActive && status === "trial") {
                        trialAlert.classList.remove("hidden");
                    } else {
                        trialAlert.classList.add("hidden");
                    }
                }
            });
        }

        // Seletores dos botões de ação de escrita do dashboard
        const WRITE_BUTTON_SELECTORS = [
            "#btn-confirm-ajuste",
            ".client-checkbox",
            "#select-all-clients",
        ];
        const WRITE_BUTTON_IDS_STATIC = [
            "btn-overview-copy-cliente", // não é escrita, mas deixar; só botões de mutação abaixo:
        ];

        function setWriteButtonsDisabled(disabled) {
            // $-04: bloqueia TODAS as ações de escrita quando a assinatura está inativa.
            // Exceção deliberada: o fluxo de assinatura/PIX (btn-pix-submit e o CTA
            // "Pagar com PIX") permanece ativo — é justamente o que regulariza a conta.
            writesBlocked = disabled;

            // onclick-based — inclui botões gerados dinamicamente (tabela de clientes
            // e lista de vendedores), por isso esta função é reaplicada após cada render.
            // Gestão de equipe (Novo Vendedor / pausar / apagar) NÃO entra no paywall:
            // é administração de conta, não escrita de pontos. O bloqueio de pontuar fica
            // no backend (assertAssinaturaAtiva). Só pontos/campanha são travados aqui.
            const onclickSelectors = [
                "[onclick^='openAjustarModal']",        // Ajustar pontos
                "[onclick^='resetClientePontos']",      // Zerar pontos
                "[onclick^='openBulkAjustarModal']",    // Ajuste em massa
                "[onclick^='bulkResetPoints']",         // Zerar em massa
                "[onclick^='openEditarCampanhaModal']"  // Editar Regras
            ].join(", ");

            // id-based — botões estáticos de escrita.
            const idButtons = [
                "btn-save-company-slug",         // Salvar Link (slug)
                "btn-delete-controller-account", // Apagar conta (LGPD)
                "btn-confirm-ajuste"             // Confirmar ajuste no modal
            ];

            const els = [
                ...document.querySelectorAll(onclickSelectors),
                ...idButtons.map(id => document.getElementById(id)).filter(Boolean)
            ];

            els.forEach(btn => {
                btn.disabled = disabled;
                if (disabled) {
                    btn.title = "Assinatura inativa — regularize para continuar operando";
                    btn.classList.add("opacity-40", "cursor-not-allowed");
                } else {
                    btn.title = "";
                    btn.classList.remove("opacity-40", "cursor-not-allowed");
                }
            });
        }

        // --- Gerenciamento Visual de Abas ---
        window.switchTab = function(tabName) {
            // Abas
            const tabBtnDash = document.getElementById("tab-btn-dashboard");
            const tabBtnClientes = document.getElementById("tab-btn-clientes");
            const tabBtnEquipe = document.getElementById("tab-btn-equipe");
            const tabBtnStripe = document.getElementById("tab-btn-stripe");

            // Conteúdos
            const contentDash = document.getElementById("tab-content-dashboard");
            const contentClientes = document.getElementById("tab-content-clientes");
            const contentEquipe = document.getElementById("tab-content-equipe");
            const contentStripe = document.getElementById("tab-content-stripe");

            // Reseta cores dos botões das abas
            [tabBtnDash, tabBtnClientes, tabBtnEquipe, tabBtnStripe].forEach(btn => {
                btn.className = "flex items-center gap-3 px-4 py-3 rounded-xl text-stone-500 hover:text-brand-green hover:bg-stone-100 font-medium text-sm transition-all duration-200";
            });

            // Reseta exibições de conteúdos
            [contentDash, contentClientes, contentEquipe, contentStripe].forEach(content => {
                content.classList.add("hidden");
            });

            // Define aba ativa
            const activeBtn = document.getElementById(`tab-btn-${tabName}`);
            activeBtn.className = "flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm transition-all duration-200";

            // Define conteúdo ativo
            const activeContent = document.getElementById(`tab-content-${tabName}`);
            activeContent.classList.remove("hidden");

            // Sincroniza a barra de navegação inferior (mobile)
            ["dashboard", "clientes", "equipe", "stripe"].forEach(t => {
                const mBtn = document.getElementById(`mtab-btn-${t}`);
                if (!mBtn) return;
                mBtn.classList.toggle("text-indigo-400", t === tabName);
                mBtn.classList.toggle("text-stone-500", t !== tabName);
            });

            // Define título da página
            const pageTitle = document.getElementById("page-title");
            if (tabName === "dashboard") pageTitle.innerText = "Visão Geral";
            if (tabName === "clientes") pageTitle.innerText = "Painel de Clientes";
            if (tabName === "equipe") pageTitle.innerText = "Gerenciar Equipe";
            if (tabName === "stripe") pageTitle.innerText = "Minha Assinatura";
        };

        // --- Seleção em Massa de Clientes (Bulk Actions) ---
        window.toggleSelectAll = function(master) {
            const checkboxes = document.querySelectorAll(".client-checkbox");
            checkboxes.forEach(cb => {
                const row = cb.closest("tr");
                if (row && row.style.display !== "none") {
                    cb.checked = master.checked;
                }
            });
            updateBulkBar();
        };

        window.updateBulkBar = function() {
            const checkboxes = document.querySelectorAll(".client-checkbox:checked");
            const count = checkboxes.length;
            const bar = document.getElementById("bulk-actions-bar");
            const countEl = document.getElementById("selected-count");
            
            if (count > 0) {
                countEl.innerText = count;
                bar.classList.remove("hidden");
            } else {
                bar.classList.add("hidden");
                const allCheckbox = document.getElementById("select-all-clients");
                if (allCheckbox) allCheckbox.checked = false;
            }
        };

        window.openBulkAjustarModal = function() {
            const checkboxes = document.querySelectorAll(".client-checkbox:checked");
            targetClienteIds = Array.from(checkboxes).map(cb => cb.getAttribute("data-id"));
            isBulkAjuste = true;

            document.getElementById("modal-ajuste-nome").innerText = `${targetClienteIds.length} Clientes Selecionados`;
            document.getElementById("modal-ajuste-email").innerText = "Ação em massa";
            document.getElementById("modal-ajuste-pontos-atuais").innerText = "-";
            
            document.getElementById("ajuste-quantidade-pontos").value = 1;
            document.getElementById("ajuste-justificativa").value = "";
            document.getElementById("btn-confirm-ajuste").disabled = true;

            setAjusteAction("add");
            document.getElementById("modal-ajustar-pontos").classList.remove("hidden");
        };

        window.bulkResetPoints = async function() {
            const checkboxes = document.querySelectorAll(".client-checkbox:checked");
            const ids = Array.from(checkboxes).map(cb => cb.getAttribute("data-id"));
            
            if (!(await confirmDialog({ title: "Zerar pontuação", message: `Deseja realmente zerar a pontuação de ${ids.length} clientes selecionados nesta empresa?`, confirmText: "Zerar", danger: true }))) return;
            try {
                for (const cid of ids) {
                    await setPoints({ empresaId, clienteId: cid, pontos: 0, motivo: "Zerado em massa pelo painel" });
                }
                showToast("Pontuação dos clientes selecionados zerada com sucesso!", "success");
                const allCheckbox = document.getElementById("select-all-clients");
                if (allCheckbox) allCheckbox.checked = false;
                toggleSelectAll(allCheckbox);
            } catch (err) {
                console.error(err);
                showToast("Erro ao zerar pontuação. Tente novamente.", "error");
            }
        };

        // --- Resetar/Zerar Pontos de Cliente ---
        window.resetClientePontos = async function(clientId, clientName) {
            if (!(await confirmDialog({ title: "Zerar pontuação", message: `Deseja realmente zerar a pontuação de "${clientName}" nesta empresa?`, confirmText: "Zerar", danger: true }))) return;
            try {
                await setPoints({ empresaId, clienteId: clientId, pontos: 0, motivo: "Zerado pelo painel" });
                showToast("Pontuação zerada com sucesso!", "success");
            } catch (err) {
                console.error(err);
                showToast("Erro ao zerar pontuação. Tente novamente.", "error");
            }
        };

        // --- Modals da Campanha ---
        window.openEditarCampanhaModal = function() {
            if (!fullEmpresaData) {
                showToast("Dados da empresa ainda não carregados do Firebase. Por favor, aguarde um instante.", "warn");
                return;
            }
            document.getElementById("edit-theme-title").value = fullEmpresaData.visualConfig?.tituloPagina || "";
            document.getElementById("edit-meta-pontos").value = fullEmpresaData.metaConfig?.metaPontos || 10;
            document.getElementById("edit-premio-desc").value = fullEmpresaData.metaConfig?.descriçãoPremio || "";
            document.getElementById("edit-theme-color").value = fullEmpresaData.visualConfig?.corFundo || "#4f46e5";
            document.getElementById("edit-theme-color-hex").value = fullEmpresaData.visualConfig?.corFundo || "#4f46e5";
            document.getElementById("edit-theme-font").value = fullEmpresaData.visualConfig?.fonte || "sans";
            
            const currentEmoji = fullEmpresaData.visualConfig?.emoji || "⭐";
            document.getElementById("edit-theme-emoji").value = currentEmoji;
            
            document.getElementById("modal-editar-campanha").classList.remove("hidden");
        };

        window.closeEditarCampanhaModal = function() {
            document.getElementById("modal-editar-campanha").classList.add("hidden");
        };

        // Color input sync in edit modal
        document.getElementById("edit-theme-color")?.addEventListener("input", (e) => {
            document.getElementById("edit-theme-color-hex").value = e.target.value.toUpperCase();
        });
        document.getElementById("edit-theme-color-hex")?.addEventListener("input", (e) => {
            let val = e.target.value;
            if (val.startsWith("#") && val.length === 7) {
                document.getElementById("edit-theme-color").value = val.toLowerCase();
            }
        });

        // Submit edit campaign rules
        document.getElementById("edit-campanha-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!(await confirmDialog({ title: "Mudar campanha", message: "Tem certeza que quer mudar? Isso atualizará a campanha e a identidade visual sem resetar os carimbos existentes de seus clientes.", confirmText: "Mudar", danger: false }))) return;
            try {
                const docRef = doc(db, "empresas", empresaId);
                await updateDoc(docRef, {
                    metaConfig: {
                        metaPontos: parseInt(document.getElementById("edit-meta-pontos").value) || 10,
                        descriçãoPremio: document.getElementById("edit-premio-desc").value.trim()
                    },
                    visualConfig: {
                        tituloPagina: document.getElementById("edit-theme-title").value.trim(),
                        corFundo: document.getElementById("edit-theme-color").value,
                        fonte: document.getElementById("edit-theme-font").value,
                        emoji: document.getElementById("edit-theme-emoji").value
                    }
                });
                showToast("Campanha atualizada com sucesso!", "success");
                if (typeof toggleEditCard === 'function') toggleEditCard();
            } catch (err) {
                console.error(err);
                showToast("Erro ao salvar campanha. Verifique os dados e tente novamente.", "error");
            }
        });

        // --- Flyer Modals ---
        window.openFlyerModal = function() {
            if (!fullEmpresaData) {
                showToast("Dados da empresa ainda não carregados do Firebase. Por favor, aguarde um instante.", "warn");
                return;
            }
            
            // Set styles dynamically based on visual config
            const previewEl = document.getElementById("flyer-a4-preview");
            
            const activeFont = fullEmpresaData.visualConfig?.fonte || "sans";
            // Only update font class, preserve other classes
            previewEl.className = `w-[320px] min-h-[420px] py-8 px-4 bg-white text-slate-900 flex flex-col justify-center items-center text-center shadow-2xl relative rounded-md select-none font-${activeFont} border-4 border-dashed border-slate-200`;
            
            document.getElementById("flyer-company-name").innerText = fullEmpresaData.visualConfig?.tituloPagina || fullEmpresaData.nomeEmpresa;
            document.getElementById("flyer-prize-desc").innerText = fullEmpresaData.metaConfig?.descriçãoPremio || "Prêmio";
            
            // Generate QR Code inside Flyer
            const baseUrl = getPublicBaseUrl();
            const linkSlug = fullEmpresaData.linkUnicoCliente || fullEmpresaData.donoUid;
            const targetUrl = `${baseUrl}cliente.html?link=${linkSlug}`;
            
            const qrContainer = document.getElementById("flyer-qrcode-placeholder");
            qrContainer.innerHTML = "";
            const qrCodeFlyerInstance = new QRCode(qrContainer, {
                text: targetUrl,
                width: 140,
                height: 140,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M
            });

            document.getElementById("modal-flyer-divulgacao").classList.remove("hidden");
        };

        window.downloadFlyerPng = async function() {
            const btn = document.getElementById("btn-download-png");
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Gerando...`;
            btn.disabled = true;

            try {
                const element = document.getElementById("flyer-a4-preview");
                const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
                const link = document.createElement("a");
                link.download = "Flyer_Divulgacao.png";
                link.href = canvas.toDataURL("image/png");
                link.click();
            } catch (err) {
                console.error(err);
                showToast("Erro ao gerar a imagem do Flyer.", "error");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };

        window.closeFlyerModal = function() {
            document.getElementById("modal-flyer-divulgacao").classList.add("hidden");
        };

        // Filtro de Busca de Clientes
        document.getElementById("search-cliente")?.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll("#clientes-list > .client-card");
            
            cards.forEach(card => {
                const name = card.dataset.name?.toLowerCase() || "";
                const email = card.dataset.email?.toLowerCase() || "";
                
                if (name.includes(query) || email.includes(query)) {
                    card.style.display = "";
                } else {
                    card.style.display = "none";
                }
            });
        });

        // --- Configurações da Conta ---
        const btnSaveCompany = document.getElementById("btn-save-company-name");
        if (btnSaveCompany) {
            btnSaveCompany?.addEventListener("click", async () => {
                const newName = document.getElementById("config-company-name").value.trim();
                if (!newName) { showToast("O nome não pode ser vazio.", "warn"); return; }
                
                const oldText = btnSaveCompany.innerText;
                btnSaveCompany.innerText = "Salvando...";
                try {
                    const empRef = doc(db, "empresas", empresaId);
                    await updateDoc(empRef, { nomeEmpresa: newName });
                    showToast("Nome da empresa atualizado!", "success");
                    // await loadEmpresaData(); // Reload UI
                } catch (e) {
                    console.error("Erro ao salvar nome da empresa:", e);
                    showToast("Erro ao salvar o nome da empresa. Tente novamente.", "error");
                } finally {
                    btnSaveCompany.innerText = oldText;
                }
            });
        }

        const btnSaveSlug = document.getElementById("btn-save-company-slug");
        if (btnSaveSlug) {
            document.getElementById("config-company-slug")?.addEventListener("input", (e) => {
                e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            });

            btnSaveSlug?.addEventListener("click", async () => {
                const newSlug = document.getElementById("config-company-slug").value.trim();
                if (!newSlug) { showToast("O link não pode ser vazio.", "warn"); return; }
                
                const oldText = btnSaveSlug.innerText;
                btnSaveSlug.innerText = "Verificando...";
                
                try {
                    // Verifica se o slug já está em uso
                    const q1 = query(collection(db, "empresas"), where("linkUnicoCliente", "==", newSlug));
                    const q2 = query(collection(db, "empresas"), where("slugsAntigos", "array-contains", newSlug));
                    
                    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                    
                    let isTaken = false;
                    snap1.forEach(d => { if (d.id !== empresaId) isTaken = true; });
                    snap2.forEach(d => { if (d.id !== empresaId) isTaken = true; });

                    if (isTaken) {
                        showToast("Este link já está em uso por outra empresa. Escolha outro.", "warn");
                        return;
                    }

                    // Se não está em uso e for diferente do atual, salvamos o antigo no array
                    if (fullEmpresaData.linkUnicoCliente !== newSlug) {
                        const oldSlug = fullEmpresaData.linkUnicoCliente;
                        let aliases = fullEmpresaData.slugsAntigos || [];
                        if (oldSlug && !aliases.includes(oldSlug)) {
                            aliases.push(oldSlug);
                        }

                        const empRef = doc(db, "empresas", empresaId);
                        await updateDoc(empRef, { 
                            linkUnicoCliente: newSlug,
                            slugsAntigos: aliases
                        });
                        showToast("Link atualizado com sucesso! Códigos QR antigos funcionarão normalmente.", "success");
                        // await loadEmpresaData();
                    } else {
                        showToast("Este já é o seu link atual.", "warn");
                    }
                } catch (e) {
                    console.error("Erro ao salvar link da empresa:", e);
                    showToast("Erro ao salvar o link da empresa. Tente novamente.", "error");
                } finally {
                    btnSaveSlug.innerText = oldText;
                }
            });
        }

        const btnDeleteController = document.getElementById("btn-delete-controller-account");
        if (btnDeleteController) {
            btnDeleteController?.addEventListener("click", async () => {
                const confirmMsg = "ATENÇÃO CONTROLADOR (LGPD):\n\nVocê está prestes a apagar todos os dados da sua empresa. Isso removerá o programa de fidelidade e impedirá o acesso aos dados dos seus clientes.\n\nEsta ação é IRREVERSÍVEL. Digite 'APAGAR' para confirmar:";
                const ok = await confirmDialog({ title: "Excluir conta", message: confirmMsg, confirmText: "Excluir", danger: true, keyword: "APAGAR" });
                if (!ok) { showToast("Ação cancelada.", "warn"); return; }

                btnDeleteController.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Apagando...';
                try {
                    const empRef = doc(db, "empresas", empresaId);
                    await deleteDoc(empRef);
                    
                    try {
                        await auth.currentUser.delete();
                    } catch(e) {
                        console.warn("Auth user não deletado. Os dados públicos foram apagados.");
                    }
                    
                    showToast("Sua conta e dados foram removidos permanentemente.", "success");
                    await logoutUser();
                } catch (e) {
                    console.error("Erro ao apagar conta:", e);
                    showToast("Erro ao apagar conta. Tente novamente.", "error");
                    btnDeleteController.innerHTML = '<i class="fa-solid fa-trash-can"></i> Apagar Minha Conta e Dados';
                }
            });
        }

    


window.downloadFlyerPdf = function() {
    window.print();
};

window.downloadFlyerPng = async function() {
    const el = document.getElementById("flyer-capture-area");
    if(!el) return;
    try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = 'flyer-tempontinho.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch(e) {
        console.error("Erro png:", e);
        alert("Erro ao baixar. Tente PDF.");
    }
};

window.copiarLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        if(typeof showToast === 'function') showToast("Link copiado para a área de transferência!", "success");
    }).catch(e => {
        console.error(e);
        alert("Erro ao copiar o link.");
    });
};

window.updatePreviewCartao = function() {
    const meta = document.getElementById('edit-meta-pontos').value || 10;
    const premio = document.getElementById('edit-premio-desc').value || "Recompensa";
    const bg = document.getElementById('edit-theme-color').value || "#4f46e5";
    const title = document.getElementById('edit-theme-title').value || "Seu Programa";
    const emoji = document.getElementById('edit-theme-emoji').value || "🌟";
    
    const container = document.getElementById('preview-cartao-container');
    container.style.backgroundColor = bg;
    
    document.getElementById('preview-title').innerText = title;
    document.getElementById('preview-premio').innerText = premio;
    document.getElementById('preview-meta-txt').innerText = meta;
    document.getElementById('preview-points-counter').innerText = "2 / " + meta;
    
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

document?.addEventListener('DOMContentLoaded', () => {
    const inputs = ['edit-meta-pontos', 'edit-premio-desc', 'edit-theme-color', 'edit-theme-title', 'edit-theme-emoji'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el?.addEventListener('input', window.updatePreviewCartao);
        }
    });
});





window.toggleEditCard = function() {
    const el = document.getElementById('modal-edit-cartao');
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};

window.isBulkAjuste = false;