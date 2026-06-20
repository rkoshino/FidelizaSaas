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

    