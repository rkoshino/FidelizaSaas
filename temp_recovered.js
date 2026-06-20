
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
            loginWithGoogleRedirect,
            getRedirectResult,
            logoutUser,
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            loginWithGoogle,
            increment
        } from "./config.js?v=2";
        import { awardPoints, deliverPrize, removePoint, getCard, findClient, acceptVendorInvite } from "./points-api.js?v=2";

        // Variáveis de Estado
        let empresaId = "";
        let inviteToken = "";
        let loggedVendedor = null;
        let metaConfig = { metaPontos: 10, descriçãoPremio: "Recompensa" };
        let visualConfig = {};
        
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
            document.addEventListener("keydown", onKey);
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
        document.getElementById("login-form").addEventListener("submit", async (e) => {
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
        document.getElementById("btn-login-google").addEventListener("click", async () => {
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
        document.getElementById("btn-logout").addEventListener("click", async () => {
            // B-02: desmonta totalmente (stop + clear) antes de deslogar.
            await teardownScanner();
            await logoutUser();
        });

        // --- Lógica do Scanner de Câmera (html5-qrcode) ---
        const btnStart = document.getElementById("btn-start-scanner");
        const btnStop = document.getElementById("btn-stop-scanner");
        const statusDot = document.getElementById("scanner-status-dot");

        btnStart.addEventListener("click", () => startScanner());
        btnStop.addEventListener("click", () => stopScanner());

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
        document.getElementById("btn-manual-submit").addEventListener("click", async () => {
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

        if (btnAddPoints) btnAddPoints.addEventListener("click", addPoints);
        if (btnRemovePoint) btnRemovePoint.addEventListener("click", removeOnePoint);
        if (btnNextClient) btnNextClient.addEventListener("click", resetPanel);

        if (btnDeliverPrize) {
            btnDeliverPrize.addEventListener("click", async () => {
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
                const tableBody = document.getElementById("clientes-table-body");
                if (tableBody) tableBody.innerHTML = "";

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

                    if (tableBody) {
                        const tr = document.createElement("tr");
                        tr.className = "hover:bg-stone-100 transition duration-150";
                        tr.innerHTML = `
                            <td class="col-check py-4 px-4 text-center"><input type="checkbox" data-id="${clientId}" data-name="${nome}" data-points="${pontos}" class="client-checkbox cursor-pointer w-4 h-4 rounded border-stone-200 bg-white text-indigo-600 focus:ring-indigo-500"></td>
                            <td data-label="Nome" class="py-4 px-4 font-medium text-stone-800">${nome}<br><span class="text-[10px] text-stone-400 font-normal">${client.email || ""}</span></td>
                            <td data-label="Pontuação" class="py-4 px-4 text-center font-bold font-outfit text-indigo-400">${pontos}</td>
                            <td data-label="Ações" class="col-actions py-4 px-4 text-right">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                    isWin
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                }">
                                    ${isWin ? `${premios} prêmios` : "Acumulando"}
                                </span>
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    }
                });

                if (!hasClientes && tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="py-12 text-center text-stone-500">
                                Nenhum cliente registrado.<br>
                            </td>
                        </tr>
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

    