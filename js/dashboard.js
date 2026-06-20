import { 
            auth, 
            db, 
            doc, 
            getDoc, 
            setDoc, 
            updateDoc, 
            collection, 
            query, 
            where, 
            getDocs, 
            logoutUser,
            onSnapshot,
            deleteDoc,
            sendEmailVerification
        } from "./config.js?v=2";
        import { setPoints, awardPoints, removePoint, createSubscription } from "./points-api.js?v=2";

        // --- Toast de notificação ---
        window.showToast = function(message, type = "success") {
            const existing = document.getElementById("toast-notification");
            if (existing) existing.remove();

            const toast = document.createElement("div");
            toast.id = "toast-notification";
            const colorClass = type === "error"
                ? "bg-red-900/90 border-red-500/40 text-red-200"
                : type === "warn"
                ? "bg-amber-900/90 border-amber-500/40 text-amber-100"
                : "bg-brand-green text-white border-brand-green";
            toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl border backdrop-blur-md text-sm font-medium shadow-2xl transition-all duration-300 opacity-0 translate-y-2 ${colorClass}`;
            toast.innerText = message;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove("opacity-0", "translate-y-2");
                toast.classList.add("opacity-100", "translate-y-0");
            });

            setTimeout(() => {
                toast.classList.add("opacity-0", "translate-y-2");
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };

        // --- Modal de confirmação (substitui confirm/prompt nativos) ---
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
            iconWrap.className = `shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-400"}`;
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

        // Variáveis Locais
        let empresaId = "";
        let targetClienteId = "";
        let targetClienteIds = [];
        let isBulkAjuste = false;
        let currentAjusteAction = "add"; // add, remove, zero
        let metaCampanha = 10;
        let visualConfig = {};
        let writesBlocked = false; // $-04: estado do paywall (reaplica em re-renders)
        let fullEmpresaData = null;
        let qrCodeFlyerInstance = null;

        function getPublicBaseUrl() {
            if (["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:") {
                return window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
            }
            return "https://tempontinho.com/";
        }

        // Recupera empresaId pela query URL
        const urlParams = new URLSearchParams(window.location.search);
        empresaId = urlParams.get("empresa");

        // Se não tiver empresa logada na query, tenta pegar no Auth
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                if (!empresaId) {
                    empresaId = user.uid;
                }
                
                // Preenche dados do rodapé lateral
                document.getElementById("user-display-name").innerText = user.displayName || "Empresário";
                document.getElementById("user-email").innerText = user.email;
                document.getElementById("user-avatar").innerText = (user.displayName || "E").charAt(0).toUpperCase();

                // A-01: cobra confirmação de e-mail para contas criadas por e-mail/senha.
                checkEmailVerification(user);

                // Busca dados da empresa
                await loadEmpresaData();
                // Assina escuta em tempo real dos clientes e vendedores
                listenToData();
                // Assina status da assinatura em tempo real (paywall + badges)
                listenEmpresaStatus();
            } else {
                // Redireciona se não estiver logado
                window.location.href = "./login.html";
            }
        });

        // A-01: banner de verificação de e-mail (só para login por e-mail/senha não confirmado).
        function checkEmailVerification(user) {
            const alertEl = document.getElementById("verify-email-alert");
            if (!alertEl) return;
            const isPasswordUser = (user.providerData || []).some(p => p.providerId === "password");
            if (isPasswordUser && !user.emailVerified) {
                document.getElementById("verify-email-address").innerText = user.email || "";
                alertEl.classList.remove("hidden");
            } else {
                alertEl.classList.add("hidden");
            }
        }
        document.getElementById("btn-resend-verification")?.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            const original = btn.innerText;
            btn.innerText = "Enviando...";
            try {
                await sendEmailVerification(auth.currentUser);
                showToast("Link de confirmação reenviado. Confira sua caixa de entrada.");
            } catch (err) {
                console.error(err);
                showToast("Não foi possível reenviar agora. Tente novamente em instantes.", "error");
            } finally {
                btn.disabled = false;
                btn.innerText = original;
            }
        });

        // Efetua Logout
        const handleLogout = async () => {
            await logoutUser();
            window.location.href = "./login.html";
        };
        document.getElementById("btn-logout").addEventListener("click", handleLogout);
        document.getElementById("btn-logout-mobile")?.addEventListener("click", handleLogout);

        // Carrega dados da empresa no Firestore
        async function loadEmpresaData() {
            try {
                const docRef = doc(db, "empresas", empresaId);
                const docSnap = await docRef.get ? await docRef.get() : await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    fullEmpresaData = data;
                    visualConfig = data.visualConfig || {};
                    metaCampanha = data.metaConfig?.metaPontos || 10;

                    // Atualiza elementos estáticos
                    document.getElementById("summary-meta-pontos").innerText = metaCampanha;
                    document.getElementById("summary-premio").innerText = data.metaConfig?.descriçãoPremio || "Prêmio";
                    document.getElementById("stat-premios-entregues").innerText = data.totalPremiosEntregues || 0;
                    
                    // Configura URLs do modal de links e visão geral
                    const baseUrl = getPublicBaseUrl();
                    const linkSlug = data.linkUnicoCliente || data.donoUid;
                    const clientUrl = `${baseUrl}cliente.html?link=${linkSlug}`;
                    const vendorUrl = `${baseUrl}vendedor.html?empresa=${empresaId}`;
                    
                    // Modais originais (mantidos por segurança caso existam)
                    const promoClientUrl = document.getElementById("promo-client-url");
                    if (promoClientUrl) promoClientUrl.value = clientUrl;
                    const promoVendorUrl = document.getElementById("promo-vendor-url");
                    if (promoVendorUrl) promoVendorUrl.value = vendorUrl;
                           // Preenche dados laterais e modal
                    document.getElementById("config-company-name").value = data.nomeEmpresa || "";
                    document.getElementById("config-company-slug").value = data.linkUnicoCliente || "";
                    document.getElementById("config-owner-email").value = data.emailComercial || "";

                    // Novos campos na Visão Geral
                    document.getElementById("overview-link-cliente-url").value = clientUrl;
                    document.getElementById("overview-link-vendedor-url").value = vendorUrl;
                    
                    const premio = data.metaConfig?.descriçãoPremio || "um super prêmio";
                    document.getElementById("overview-whatsapp-kit-text").value = `🎉 Olá! Lançamos nosso sistema de fidelidade digital!\n\nCadastre-se agora e comece a acumular pontos para ganhar ${premio}.\n\nAcesse seu cartão aqui: ${clientUrl}`;

                    // Gerar QR Code da Visão Geral
                    const overviewQrContainer = document.getElementById("overview-qrcode-placeholder");
                    overviewQrContainer.innerHTML = "";
                    overviewQrContainer.className = ""; // Remover as classes de placeholder
                    new QRCode(overviewQrContainer, {
                        text: clientUrl,
                        width: 120,
                        height: 120,
                        colorDark: "#0f172a", // slate-900
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    // Botões do Cabeçalho
                    document.getElementById("btn-header-pagina-cliente").onclick = () => window.open(clientUrl, '_blank');
                    document.getElementById("btn-header-camera-vendedor").onclick = () => window.open(vendorUrl, '_blank');
                    document.getElementById("btn-header-copiar-camera").onclick = () => {
                        navigator.clipboard.writeText(vendorUrl);
                        showToast("Link da câmera copiado!");
                    };

                    // Botões da aba Clientes
                    const btnClientesPagina = document.getElementById("btn-clientes-pagina-cliente");
                    if(btnClientesPagina) btnClientesPagina.onclick = () => window.open(clientUrl, '_blank');
                    
                    const btnClientesCopiar = document.getElementById("btn-clientes-copiar-cliente");
                    if(btnClientesCopiar) btnClientesCopiar.onclick = () => {
                        navigator.clipboard.writeText(clientUrl);
                        showToast("Link do cliente copiado!");
                    };

                    // Botões da aba Equipe
                    const btnEquipeCamera = document.getElementById("btn-equipe-camera-vendedor");
                    if(btnEquipeCamera) btnEquipeCamera.onclick = () => window.open(vendorUrl, '_blank');
                    
                    // Preencher aba Sua Conta
                    const inputCompanyName = document.getElementById("config-company-name");
                    const inputOwnerEmail = document.getElementById("config-owner-email");
                    if(inputCompanyName) inputCompanyName.value = data.nomeEmpresa || "";
                    if(inputOwnerEmail) inputOwnerEmail.value = data.ownerEmail || "";

                    // Botões de Copiar da Visão Geral
                    document.getElementById("btn-overview-copy-cliente").onclick = () => {
                        navigator.clipboard.writeText(clientUrl);
                        showToast("Link do cliente copiado!");
                    };
                    document.getElementById("btn-overview-copy-vendedor").onclick = () => {
                        navigator.clipboard.writeText(vendorUrl);
                        showToast("Link do vendedor copiado!");
                    };
                    document.getElementById("btn-overview-copy-whatsapp").onclick = () => {
                        navigator.clipboard.writeText(document.getElementById("overview-whatsapp-kit-text").value);
                        showToast("Kit do WhatsApp copiado!");
                    };
                }
            } catch (err) {
                console.error("Erro ao ler dados da empresa: ", err);
            }
        }

        // Assinatura em tempo real para Clientes e Vendedores
        function listenToData() {
            // Escuta Clientes — subcoleção já escopada à empresa (multi-tenant)
            const clientesQuery = collection(db, "empresas", empresaId, "clientes");
            onSnapshot(clientesQuery, (snapshot) => {
                const tableBody = document.getElementById("clientes-table-body");
                tableBody.innerHTML = "";

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

                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-stone-100 transition duration-150";
                    tr.innerHTML = `
                        <td class="col-check py-4 px-6 text-center"><input type="checkbox" data-id="${clientId}" data-name="${nome}" data-points="${pontos}" onchange="updateBulkBar()" class="client-checkbox cursor-pointer w-4 h-4 rounded border-stone-200 bg-white text-indigo-600 focus:ring-indigo-500"></td>
                        <td data-label="Nome" class="py-4 px-6 font-medium text-stone-800">${nome}</td>
                        <td data-label="E-mail" class="py-4 px-6 text-stone-500">${client.email || ""}</td>
                        <td data-label="Pontuação" class="py-4 px-6 text-center font-bold font-outfit text-indigo-400">${pontos} / ${metaCampanha}</td>
                        <td data-label="Status" class="py-4 px-6 text-center">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                isWin
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }">
                                ${isWin ? `${premios} prêmio(s) a entregar` : "Acumulando"}
                            </span>
                        </td>
                        <td data-label="Ações" class="col-actions py-4 px-6 text-right">
                            <div class="flex gap-2 justify-end">
                                <button onclick="openHistoricoModal('${clientId}', '${nome}')" class="text-xs bg-white hover:bg-emerald-50 hover:text-brand-green hover:border-emerald-200 text-stone-500 font-semibold px-3 py-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-stone-200 transition" title="Ver Histórico">
                                    <i class="fa-solid fa-list-ul"></i>
                                </button>
                                <button onclick="openAjustarModal('${clientId}', '${nome}', '${client.email || ""}', ${pontos})" class="text-xs bg-white hover:bg-emerald-50 hover:text-brand-green hover:border-emerald-200 text-stone-500 font-semibold px-3 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-lg border border-stone-200 transition">
                                    Ajustar
                                </button>
                                <button onclick="resetClientePontos('${clientId}', '${nome}')" class="text-xs bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-stone-500 font-semibold px-3 py-1.5 min-h-[44px] inline-flex items-center justify-center rounded-lg border border-stone-200 transition">
                                    Zerar
                                </button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });

                if (!hasClientes) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="py-12 text-center text-stone-500">
                                Nenhum cliente ativo registrado no seu programa ainda.<br>
                                <span class="text-[10px] text-indigo-400 mt-2 block">Compartilhe o link do cliente para começar!</span>
                            </td>
                        </tr>
                    `;
                }

                // Atualiza contadores do dashboard
                document.getElementById("stat-total-clientes").innerText = totalClientes;
                document.getElementById("stat-total-pontos").innerText = totalPontos;
                document.getElementById("stat-premios-disponiveis").innerText = premiosDisponiveis;

                // $-04: reaplica o paywall aos botões recém-renderizados da tabela.
                setWriteButtonsDisabled(writesBlocked);
            });

            // Escuta Vendedores
            const vendedoresQuery = query(collection(db, "vendedores"), where("empresaId", "==", empresaId));
            onSnapshot(vendedoresQuery, (snapshot) => {
                const grid = document.getElementById("vendedores-grid");
                grid.innerHTML = "";

                let hasVendedores = false;

                snapshot.forEach((docSnap) => {
                    hasVendedores = true;
                    const vended = docSnap.data();
                    const vUid = docSnap.id;

                    const card = document.createElement("div");
                    card.className = "glassmorphism p-5 rounded-2xl flex flex-col justify-between gap-4";
                    card.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 text-lg">
                                <i class="fa-solid fa-user-tag"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-stone-800 text-sm leading-tight truncate">${vended.nomeVendedor || "Atendente"}</h4>
                                <p class="text-xs text-stone-500 mt-0.5 break-all">${vended.email || ""}</p>
                            </div>
                        </div>
                        <div class="flex justify-between items-center gap-2 border-t border-stone-200 pt-3">
                            <span class="text-xs font-bold uppercase tracking-wider ${vended.ativo !== false ? 'text-emerald-700' : 'text-stone-500'}">
                                ${vended.ativo !== false ? 'Ativo' : 'Pausado'}
                            </span>
                            <div class="flex items-center gap-2">
                                <button onclick="pausarVendedor('${vUid}', ${vended.ativo !== false})" class="text-xs text-stone-700 hover:text-brand-green font-semibold px-2 py-1.5 rounded border border-stone-200 hover:bg-stone-50 transition">
                                    ${vended.ativo !== false ? 'Pausar' : 'Retomar'}
                                </button>
                                <button onclick="apagarVendedor('${vUid}')" class="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1.5 rounded border border-red-200 hover:bg-red-50 transition">
                                    Apagar
                                </button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });

                if (!hasVendedores) {
                    grid.innerHTML = `
                        <div class="glassmorphism p-8 rounded-2xl text-center text-stone-500 col-span-full">
                            Nenhum vendedor registrado nesta empresa. Clique em <strong>Novo Vendedor</strong> para gerar um convite.
                        </div>
                    `;
                }

                // $-04: reaplica o paywall aos botões recém-renderizados.
                setWriteButtonsDisabled(writesBlocked);
            });
        }

        // --- Modals e Funções de Escrita no Firestore ---

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
        justificativaInput.addEventListener("input", validateAjusteForm);

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
        document.getElementById("btn-confirm-ajuste").addEventListener("click", async () => {
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
            if (!empresaId || !auth.currentUser) {
                showToast("Dados da empresa ainda não carregados. Aguarde um instante.", "warn");
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
                document.getElementById("btn-copy-vendor-invite").onclick = async () => {
                    const copied = await copyTextSafe(inviteUrl);
                    showToast(copied ? "Convite copiado!" : "Copie o link selecionado.", copied ? "success" : "warn");
                    input.select();
                };
                const copied = await copyTextSafe(inviteUrl);
                showToast(copied ? "Convite de vendedor criado e copiado." : "Convite de vendedor criado. Copie o link exibido.", copied ? "success" : "warn");
            } catch (err) {
                console.error(err);
                showToast("Erro ao gerar convite. Verifique sua conexão e tente novamente.", "error");
            }
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
        document.getElementById("btn-stripe-checkout").addEventListener("click", () => {
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

        document.getElementById("btn-pix-submit").addEventListener("click", async () => {
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

        document.getElementById("btn-pix-copiar").addEventListener("click", () => {
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
        document.getElementById("edit-theme-color").addEventListener("input", (e) => {
            document.getElementById("edit-theme-color-hex").value = e.target.value.toUpperCase();
        });
        document.getElementById("edit-theme-color-hex").addEventListener("input", (e) => {
            let val = e.target.value;
            if (val.startsWith("#") && val.length === 7) {
                document.getElementById("edit-theme-color").value = val.toLowerCase();
            }
        });

        // Submit edit campaign rules
        document.getElementById("edit-campanha-form").addEventListener("submit", async (e) => {
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
                closeEditarCampanhaModal();
                await loadEmpresaData();
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
            qrCodeFlyerInstance = new QRCode(qrContainer, {
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
        document.getElementById("search-cliente").addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll("#clientes-table-body tr");
            
            rows.forEach(row => {
                const name = row.cells[0]?.textContent.toLowerCase() || "";
                const email = row.cells[1]?.textContent.toLowerCase() || "";
                
                if (name.includes(query) || email.includes(query)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });

        // --- Configurações da Conta ---
        const btnSaveCompany = document.getElementById("btn-save-company-name");
        if (btnSaveCompany) {
            btnSaveCompany.addEventListener("click", async () => {
                const newName = document.getElementById("config-company-name").value.trim();
                if (!newName) { showToast("O nome não pode ser vazio.", "warn"); return; }
                
                const oldText = btnSaveCompany.innerText;
                btnSaveCompany.innerText = "Salvando...";
                try {
                    const empRef = doc(db, "empresas", empresaId);
                    await updateDoc(empRef, { nomeEmpresa: newName });
                    showToast("Nome da empresa atualizado!", "success");
                    await loadEmpresaData(); // Reload UI
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
            document.getElementById("config-company-slug").addEventListener("input", (e) => {
                e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            });

            btnSaveSlug.addEventListener("click", async () => {
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
                        await loadEmpresaData(); // Isso também regera os links exibidos e o Flyer!
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
            btnDeleteController.addEventListener("click", async () => {
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