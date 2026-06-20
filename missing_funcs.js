let isBulkAjuste = false;
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
            const btn = document.ge
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

        
