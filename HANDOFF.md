# HANDOFF — Tem Pontinho (continuação de sessão)

> **Para o próximo Claude:** leia este documento inteiro antes de qualquer ação.
> Ele contém tudo para dar seguimento sem o usuário precisar reexplicar.
> Atualize a TODO list no fim conforme as tarefas forem concluídas.
> Última atualização: 2026-06-21 (sessão: **billing endurecido + suíte de testes + merge da UI nova**).
> **⚠️ LEIA A SEÇÃO "SESSÃO 2026-06-21" LOGO ABAIXO PRIMEIRO** — muita coisa mudou
> (arquitetura do front virou módulos `js/`, suíte de testes nova, billing endurecido,
> tudo deployado e pushado pro `origin/main`).
> **Deploy production concluído** (`firebase deploy --only functions,hosting`) em `tempontinho.com` e
> `nice-dreamks-fidelidade.web.app`: tema claro oficial nas 7 telas, modais X-01, fundo do cliente fixo
> em creme `#F4EFE6`, e novo contrato de pontos/prêmio (cartão trava cheio, scan resgata, sobra entra só
> depois do resgate). **PR #2 mergeado em `main`**; produção e GitHub sincronizados.
> Deploy production concluído também para login/cadastro + equipe/vendedores
> (`firebase deploy --only functions,firestore,hosting`) em `tempontinho.com` e
> `nice-dreamks-fidelidade.web.app`.

## 🆕 SESSÃO 2026-06-25 — Morte do Dashboard & Polimentos Visuais

> **Todas as mudanças abaixo já estão deployadas no Firebase (`tempontinho.com`).**

### 1. 💀 Remoção do `dashboard.html` (Depreciação Completa)
O CEO decidiu centralizar a experiência do lojista 100% no celular. O antigo `dashboard.html` foi fisicamente deletado do projeto.
- **Roteamento atualizado:** Tanto o término do cadastro (`onboarding.html`) quanto o login (`login.html`) agora redirecionam qualquer proprietário diretamente para a página do vendedor (`vendedor.html`), focando a experiência inicial na câmera e no cartão.
- **Limpeza de UI:** Todos os links para o antigo dashboard (como o botão "Assinar" e o bloco "Assinatura e Planos") que ficavam na Visão Geral do `vendedor.html` foram removidos/ocultados.

### 2. 📸 Upload de Foto de Perfil Otimizado
- Implementado um sistema de upload de foto de perfil no menu "Editar Cartão" (`vendedor.html`) e no Passo 3 do `onboarding.html`.
- Para evitar sobrecarga no servidor e manter a performance, a imagem é **redimensionada e comprimida no navegador (para WebP)** e enviada diretamente como Base64 para o documento Firestore da loja, eliminando a necessidade de usar o Firebase Storage.
- A foto da empresa agora substitui dinamicamente o ícone/emoji padrão no topo da página do cliente (`cliente.html`) e do vendedor (`vendedor.html`).

### 3. 📝 Campo "Regra do Ponto" Adicionado
Para maior transparência com o consumidor, a mecânica de pontuação agora é explícita.
- Campo adicionado no Passo 2 do `onboarding.html` e no menu "Editar Cartão" do `vendedor.html` (ex: *"Você ganha 1 pontinho a cada R$ 30,00 gastos na loja"*).
- No `cliente.html`, essa regra é exibida elegantemente abaixo da meta de pontos, em um banner discreto com ícone de informação.

### 4. 🎨 Consolidação da Visão Geral do Vendedor
Os quatro painéis separados (Total de Clientes, Prêmios Pendentes, Prêmios Resgatados, Avaliações) na visão geral do `vendedor.html` foram unificados em uma única "caixa" (card) de métricas simplificada, melhorando muito a leitura e o uso do espaço no mobile. O botão "Adicionar Cliente Manualmente" foi movido para o topo da aba Visão Geral, correspondendo à aba Câmera. Correção também no layout do menu inferior que estava scrollando horizontalmente sem necessidade.

### 5. 🔑 Login Unificado e Múltiplas Lojas
- O `login.html` agora funciona como uma central de inteligência. Ao invés de botões separados para donos e atendentes na landing page, um único formulário de login varre as coleções `empresas` e `vendedores`.
- **Roteamento Expresso:** Se o usuário tem vínculo em apenas 1 local (dono ou atendente), o redirecionamento para a câmera é imediato.
- **Seletor de Lojas:** Se ele pertencer a mais de 1 loja (ex: dono em uma, atendente em outra), o login exibe uma interface limpa de múltipla escolha perguntando em qual loja ele quer entrar.

### 6. 🔒 UX e Segurança da Interface do Atendente
- Foi resolvido o "piscar" de duplo login no `vendedor.html` ocultando o formulário por padrão até que a autenticação valide que o usuário realmente não tem sessão.
- A aba de personalização do cartão (`tab-cartao`) e o menu inferior foram completamente ocultados e desabilitados via JavaScript para usuários que não são o dono da loja (papel `dono`). (No backend o Firestore já impedia a escrita).
- Incluído um botão "Voltar" orgânico no cabeçalho da aba "Divulgue", já que o atendente perdeu o menu inferior e antes ficava preso nessa tela sem conseguir retornar à câmera.

### 7. 🚀 Otimização de Conversão da Landing Page (`index.html`)
A landing page foi reescrita com foco Mobile-First para refletir a morte do Dashboard e o novo produto:
- O mockup simulado na tela inicial agora é idêntico ao `cliente.html` atual (incluindo Foto de Perfil da loja e banner da "Regra do Ponto"). O carimbo pula de forma animada via CSS (`@keyframes stamp-pop`).
- Adicionado o botão "Simular Cartão" na hero section, linkando diretamente para a experiência interativa `cliente.html?mock=true`.
- Alterada a copy das Funcionalidades para remover qualquer menção ao finado "Painel do Vendedor", enfatizando a **Gestão 100% no Celular**.
- Inclusão de um bloco de ROI ancorando o preço (vs Gráfica) e uma seção Sanfona (FAQ) abordando objeções.
- Adição de Sticky CTA "Começar 1º Mês Grátis" travado no rodapé para telas mobile.

## 🆕 SESSÃO 2026-06-21 — billing endurecido + suíte de testes + merge da UI nova

> **Tudo abaixo está DEPLOYADO em produção (`tempontinho.com`) e PUSHADO em `origin/main`.**
> `main` e `origin/main` em sincronia no commit de merge `a3148ad`.

### 0. ⚠️ MUDANÇA DE ARQUITETURA DO FRONTEND
O parceiro (agente "bot"/Gemini) **extraiu o JS inline para módulos**:
- `dashboard.html`, `vendedor.html`, `cliente.html` agora são **cascas** que carregam
  `js/dashboard.js`, `js/vendedor.js`, `js/cliente.js` (`<script type="module">`).
- `login.html` e `onboarding.html` **continuam com JS inline** (não foram extraídos).
- **Ao editar lógica de dashboard/vendedor/cliente, edite os `js/*.js`, NÃO o HTML.**
- Os módulos importam de `../points-api.js` e `../config.js` (raiz).

### 1. Billing endurecido (auditoria P0+P1) — commit `680db38`
Auditei o billing Asaas/PIX (já existia) e corrigi furos:
- **P0 rules:** `allow create` de `empresas` agora valida billing (`billingCreateValido`)
  — antes dava pra criar a empresa já com `statusAssinatura:"active"`/trial forjado e nunca pagar.
- **P0 idempotência:** `createSubscription` reaproveita assinatura existente (exceto `canceled`)
  — antes duplicava assinatura/cobrança PIX a cada clique/reload.
- **P0 paywall real:** guard em JS (`bloquearSeInativa`) no topo das mutações de pontos
  (o `disabled` do botão era contornável).
- **P1:** `setPoints`/`removePoint` agora exigem `assertAssinaturaAtiva`; webhook trata
  refund/chargeback→`canceled`; `proximoVencimento` usa `nextDueDate` autoritativo da assinatura;
  token do webhook em tempo constante; `cpfCnpj` protegido nas rules; validação real de CPF/CNPJ
  (mód-11); erros do checkout tratados por código; LGPD/Salvar-link fora do paywall;
  vendedor com banner de loja inativa + latch (para de martelar a callable).

### 2. Suíte de testes automatizada (NOVA) — commits `6baad9f`, `a0b5673`, `a7232fa`
Roda contra o **Firebase Emulator Suite** (isolado de produção, mock local do Asaas, sem chave real):
- `npm test` → 44 testes (rules + functions/pontos/enforcement + billing/webhook), projeto `demo-tempontinho`.
- `npm run test:e2e` → 6 testes em **browser real (Playwright/Chromium)**: dono (login+paywall+reativação
  em tempo real), vendedor (loja inativa trava UI), cliente (branding público). Projeto real
  `nice-dreamks-fidelidade` (pra casar com o `config.js`).
- `npm run test:all` → os **50**. Pré-req do e2e: `npx playwright install chromium` (1ª vez).
- Detalhes em **`test/README.md`**. **Padrão:** rodar `test:all` verde ANTES de deployar.
- `config.js`/`points-api.js` conectam aos emuladores só quando `localStorage.USE_EMULATOR==="1"`
  em host local (inócuo em produção). Hosting deixou de servir `test/`, `scripts/`, `package*.json`.

### 3. Merge da UI nova do parceiro — commit de merge `a3148ad`
O branch `origin/ui-vendor-updates` (refactor `js/` + UI nova + **histórico de atividade do vendedor**
em `vendedores/{uid}/logs`) foi **reconciliado** com os fixes acima:
- Backend aditivo, **sem regressão de segurança** (meu P0/billing + features deles convivem).
- **Re-apliquei meus 3 fixes de frontend** nos módulos extraídos (paywall/CPF em `js/dashboard.js`;
  banner inativa/latch em `js/vendedor.js` + `#inativa-banner` no `vendedor.html`).
- Removidos **~30 arquivos scratch** do processo de extração (extract.js, temp_*.js, script_0..9.js,
  test1/test2.js, old_vendedor.html, modals_tmp.html, etc.).

### 4. ⚠️ Coordenação git (causa raiz de um incidente — NÃO repetir)
Houve um episódio em que um deploy sobrescreveu o trabalho do outro porque cada dev deployava de
**cópia local divergente**. Regra agora: **`origin/main` é a fonte única da verdade**.
- **Antes de trabalhar/deployar: `git pull` (fetch+merge) do `origin/main`.**
- **Deploy SEMPRE do `main` sincronizado**, com `npm run test:all` verde.
- Push trava no osxkeychain → usar o helper do gh (`gh auth setup-git` antes do `git push`).
- **O parceiro precisa dar `git pull` no `main`** (o `ui-vendor-updates` dele já está mergeado lá).

### 5. Pendências desta frente (validação manual)
- **Teste PIX ponta-a-ponta real** (createSubscription → pagar → webhook vira `active` → paywall some).
  Webhook validado vivo (401 sem token) na URL configurada no Asaas
  (`…cloudfunctions.net/asaasWebhook`, que é alias 2ª-gen do serviço — não precisa mexer).
- **UI nova do parceiro NÃO coberta por teste automatizado**: histórico do vendedor, animações de
  vitória, tema dinâmico, lista de clientes em cards, geração/cópia de convite, modais. **Validar à mão.**
- **App Check** segue pendente (reCAPTCHA site key) — ver TODO do lado do Claude.

---

## 📚 Documentação do projeto (comece aqui)

Toda a documentação interna fica em **`docs/`** (e NÃO é servida no hosting — ver
nota de segurança abaixo). Ordem de leitura recomendada para entender o roadmap atual:

1. **`docs/RELATORIO_FINAL.md`** — visão master que cruza a auditoria de design com o
   review do CEO. **É o melhor ponto de partida.** Tem o mapa de ~40 problemas (IDs
   `B-01`, `M-01`, `$-03`…) e as **5 decisões estratégicas pendentes do CEO**.
2. **`docs/PLANO_EXECUCAO.md`** — o plano operacional em 6 ondas (0 a 5), com tarefas,
   critério de aceite, estimativa e dependências. **É o que executar.**
3. **`docs/TAREFAS_CEO.md`** — backlog do review do CEO (checkboxes rastreáveis).
4. **`docs/RELATORIO_DESIGN.md`** — auditoria de design detalhada, tela a tela.
5. **`docs/PLANO_BILLING.md`** — contrato de billing Asaas/PIX (referência técnica).
6. **`docs/PLANO_ACAO.md`** — plano antigo de refatoração de pontos (histórico, concluído;
   restam só itens de segurança: App Check e expor branding público — ver §6 dele).

---

## 📍 ESTADO ATUAL — leia isto primeiro (atualizado 2026-06-17)

### Decisões do CEO (já respondidas — detalhe em `docs/PLANO_EXECUCAO.md §0`)
- **Preço:** R$ 19,90/mês + **1º mês grátis** (o trial de 30 dias É o mês grátis). Pagar antes
  do fim do trial é permitido, mas o **mês pago só começa a valer ao fim dos 30 dias**
  → no billing: `createSubscription.nextDueDate = trialEndDate`.
- **Logo:** ON HOLD — padronizar o **placeholder atual**; tarefa do logo definitivo fica aberta.
- **Tema do app:** **claro** (paleta ainda a decidir → usar paleta clara neutra como placeholder).
- **Auth:** só **Google + e-mail/senha** (Apple/Facebook fora do MVP).
- **Cartão do cliente:** mínimo de movimentos pra contabilizar o ponto.
- **Mandato-mestra:** *"MVP mínimo e completo funcional antes de luxos."*

### ✅ Concluído e DEPLOYADO em produção (`tempontinho.com`)
Branch **`main`** (PR #2 mergeado em 2026-06-18; Onda 0 + Rodada 2 + Onda 1 + Onda 2 parcial + Onda 3 +
**Fase B LIVE** + Onda 4 + Onda 5 parcial). Hosting deployado; **Functions também deployadas**
(Fase B no ar com a chave Asaas nova — 2026-06-17; fluxo scan/prêmio no ar — 2026-06-18).

- **Onda 0 — bugs P0:** B-01, B-02, B-03, B-04, $-04, B-07.
- **Rodada 2 — feedback do CEO:** VEND-07, B-08, O-01, TRIAL-01, VEND-08.
- **Onda 1 — mobile (NOVO):** M-01 (barra de nav inferior no dashboard), M-02 (stats grid-cols-2,
  tabela de clientes vira cards via CSS+data-label, header desapertado, logout mobile), M-03/M-04
  (home sem overflow-x, Login sempre visível, cards flutuantes escondidos < sm), M-05 (alvos ≥44px).
- **Fase B + Onda 3 — preço/trial (NOVO):** $-03 (landing vira plano ÚNICO R$19,90/mês + 1º mês grátis,
  plano anual fictício REMOVIDO; dashboard e modal PIX R$19,90), $-05 (MRR = ativas×19.90), $-02
  (banner de contagem no dashboard DURANTE o trial), $-01 (banner de trial no vendedor).
  ✅ **`functions/billing.js` (value 19.90 + nextDueDate=trialEndDate) DEPLOYADO em produção**
  (2026-06-17, junto com a rotação da `ASAAS_API_KEY` p/ a versão 2). Frontend e backend agora
  cobram R$19,90 de forma consistente.
- **Onda 2 parcial (NOVO):** V-02 (fonte Outfit carregada em dashboard/onboarding/cliente/vendedor —
  antes `font-outfit` não renderizava), V-06 (jargão removido: White Label, empresaId, instrução de
  dev no erro de link), V-01 (placeholder de logo já consistente no app; logo definitivo ON HOLD).
- Verificação: `node --check billing.js` + curl confirmando no ar (preço, nav mobile, Outfit, .md→404).
  **Falta teste runtime** (o CEO vai testar amanhã e dar o OK).

### ⏸️ ONDE PAREI EXATAMENTE
Onda 1, Onda 2 (parcial), Onda 3, Onda 4, Onda 5 (parcial) e **Fase B** concluídas e deployadas
(hosting + Functions). Pendências:
1. ✅ **Webhook Asaas configurado pelo dono**. Falta só teste PIX ponta-a-ponta:
   `createSubscription` → pagar → webhook vira `statusAssinatura: active` → paywall some.
2. ~~**V-03 (tema claro)**~~ ✅ **FEITA E DEPLOYADA (2026-06-18)**. Paleta oficial creme/verde/terracota
   aplicada nas 7 telas. O cliente ignora `visualConfig.corFundo` para manter o fundo creme padrão.
3. **Onda 4** — feita quase toda e deployada (vendedor QR/atalho, reset de senha, termos, validação
   por campo, pickers, share wa.me, reforço home). **A-01 IMPLEMENTADA** (2026-06-17): onboarding dispara
   `sendEmailVerification` no cadastro por e-mail e o dashboard mostra banner cobrando confirmação +
   botão reenviar (só para provider `password` não verificado). **A-02 FEITA pelo dono** (Google +
   e-mail/senha ativos; Facebook/Apple fora do MVP).
4. **Onda 5** — feitas: X-06 confirmação, X-04 parcial aria, **X-01 modais**, **X-03 (foco-visível global), X-05
   (loading/offline/erro no cliente), X-07 (reduced-motion), C-06 (empty state cliente novo) e X-02
   parcial (contraste nas telas escuras)**. **X-02 sweep completo** foi parcialmente coberto pela migração
   do tema claro. **Tema/modais/scan/prêmio já deployados** em 2026-06-18.

### ⛳ AGUARDANDO O CEO (humano) — bloqueios/pendências
1. **Testar a build atual** (Onda 0→5 + Fase B) em produção e dar feedback/ajustes. Fazer **hard refresh**.
2. ✅ **`ASAAS_API_KEY` rotacionada** (versão 2) e Functions redeployadas em 2026-06-17 — a versão antiga
   foi destruída no mesmo fluxo. Nada pendente aqui.
3. ✅ **Fase B (preço R$ 19,90) DEPLOYADA** — billing.js no ar com value 19.90 + nextDueDate=trialEndDate.
4. ✅ **Webhook Asaas CONFIGURADO** (2026-06-17, pelo dono): URL do `asaasWebhook`, token = valor
   EXISTENTE do secret `ASAAS_WEBHOOK_TOKEN` (sem regenerar → sem redeploy), tipo de envio **Sequencial**,
   webhook **ativo**, fila de sincronização ativada, eventos `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`/
   `PAYMENT_OVERDUE` (+ assinatura cancelada/inativada). **Falta só o teste PIX ponta-a-ponta.**

5. ✅ **A-02 — Provedores de login CONFIGURADOS** (2026-06-17, pelo dono): Google + E-mail/senha ativos
   no Console Firebase (Apple/Facebook fora por D4). A-01 (verificação) e B-05 (reset) já operam.

6. ✅ **TRIAL-01 — Resend LIVE** (2026-06-17): domínio `tempontinho.com` Verified (região sa-east-1),
   secret `RESEND_API_KEY` criado e `subscriptionReminderCron` DEPLOYADO (avisos 15/7/3/1 dias às 10h BRT).
   Remetente `avisos@tempontinho.com`. **Pendência de segurança:** a API key foi colada no chat — o dono
   deve **rotacioná-la** no Resend (criar outra, `firebase functions:secrets:set RESEND_API_KEY` com a
   nova, redeploy de functions, revogar a antiga). **Falta testar** o envio real (ver lado do Claude).
7. **Testar login/cadastro do dono em produção**: e-mail/senha sem senha deve mostrar erro PT-BR;
   e-mail/senha incorreto deve sugerir cadastro; Google com conta sem empresa deve pedir confirmação
   antes de criar cadastro/trial.
8. **Teste manual do novo fluxo de scan/prêmio**: vendedor seleciona quantidade rápida, escaneia QR do
   cliente; sem prêmio pendente o scan pontua automaticamente; ao completar o cartão, o cliente vê prêmio
   pendente; próximo scan do vendedor resgata automaticamente; no último resgate, o cartão rasga/renova e
   `pontosSobra` entra ponto a ponto.

### ▶️ PRÓXIMOS PASSOS — o que sobrou
1. **Teste PIX ponta-a-ponta** (createSubscription → pagar → webhook vira `active` → paywall some).
   Já dá pra fechar PIX real; webhook Asaas já foi configurado pelo dono.
2. ~~**V-03 (tema claro)**~~ ✅ **FEITA (2026-06-18)**. Paleta oficial aprovada pelo CEO (creme `#F4EFE6`
   + verde forest `#2A5A44` + terracota `#D96B43`, regra 60/30/10 — substitui a teal de teste) aplicada
   nas 7 telas: landing, login, cliente, dashboard, vendedor, onboarding, master-admin. Implementação:
   tokens `brand.*` + remap dos scales legados (indigo/emerald/teal→verde, amber/orange→terracota) na
   config inline + inversão de luminância no markup (scale `stone` nos neutros). **Deployada em produção
   em 2026-06-18** junto com functions.
3. ~~A-01~~ ✅ FEITA (2026-06-17). ~~A-02~~ ✅ FEITA pelo dono (provedores Google + e-mail/senha).
4. **Onda 5 restante:** só **X-02 auditoria visual final** (manual, pós-tema claro). **X-01 ✅ FEITA
   (2026-06-18)**: `alert/confirm/prompt` nativos substituídos por `showToast`(success/error/warn) +
   `confirmDialog` (modal promise-based, com variante `danger` e `keyword` p/ a exclusão por palavra
   "APAGAR") em **dashboard, cliente e vendedor**. **Deployada em produção em 2026-06-18**.
   ✅ Feitas E DEPLOYADAS em 2026-06-17/18: X-02 (parcial + sweep adicional em login/cliente/vendedor),
   X-03, X-05, X-07, C-06, **C-01**
   (prévia de valor antes do login + Google 1-tap primário) e **D4/CAD-01 final** (Facebook/Apple removidos
   do onboarding/cliente/config; aviso de termos do Google no onboarding).
   📦 **PR #2 mergeado em `main`**: https://github.com/rkoshino/FidelizaSaas/pull/2.
5. **TRIAL-01 aviso 7 dias antes** — ✅ BACKEND PRONTO E DEPLOYADO (`functions/notifications.js`,
   `subscriptionReminderCron` onSchedule **10:00 BRT**, avisos em **15/7/3/1 dias antes do vencimento**
   (trialEndDate p/ trial, proximoVencimento p/ active), dedupe em `lembretesVencimentoEnviados`).
   Resend está live; falta rotacionar a API key exposta no chat e testar envio real.
6. ~~**V-03 tema claro**~~ ✅ FEITO E DEPLOYADO. Paleta oficial atual: creme `#F4EFE6`, verde `#2A5A44`,
   terracota `#D96B43`, tinta `#2A2520`. Obs.: o logo SVG (pássaro) ainda tem degradê azul, mas é ON HOLD
   (logo definitivo é tarefa à parte).
7. ~~**Merge da `fix/onda-0-bugs-p0` em `main`**~~ ✅ FEITO em 2026-06-18 via PR #2.

8. **Novo fluxo de pontos/prêmio** ✅ **FEITO E DEPLOYADO (2026-06-18)**:
   - Backend (`functions/index.js`): `awardPoints` recusa pontuar se `premiosPendentes > 0`; ao completar,
     mantém `pontos = meta`, incrementa `premiosPendentes` e guarda a sobra em `pontosSobra`.
   - Backend (`deliverPrize`): resgata 1 prêmio; quando zera os pendentes, renova o cartão com
     `pontos = pontosSobra` e limpa `pontosSobra`.
   - Vendedor (`vendedor.html`): scan age direto; se não há prêmio, credita a quantidade do seletor rápido;
     se há prêmio, resgata automaticamente. Há trava anti-duplicação de leitura.
   - Cliente (`cliente.html`): banner/animação de prêmio pendente, animação de resgate, cartão rasgando,
     novo cartão entrando e sobra animando ponto a ponto.

9. **Login/cadastro + equipe/vendedores** ✅ **FEITO E DEPLOYADO (2026-06-18)**:
   - Login do dono: Google novo pede confirmação antes de criar empresa/trial; e-mail/senha incorreto sugere cadastro.
   - Equipe: “Novo Vendedor” gera convite; atendente aceita com Google ou e-mail/senha e cai no scanner.
   - Dashboard: lista vendedores com Pausar/Retomar e Apagar.
   - Backend: `acceptVendorInvite` cria vínculo de vendedor ativo; Functions bloqueiam vendedor pausado.
   - PT-BR: validações nativas substituídas nos formulários principais e mensagens técnicas removidas dos fluxos testados.

### 🔧 Notas operacionais
- **Git push trava** no `git-credential-osxkeychain` neste ambiente. Use o helper do gh:
  `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin HEAD:<branch>`
  (ver memória `git-push-via-gh-helper`). O `gh` está autenticado com escopo `repo`.
- **Versionamento:** commitar padronizado (conventional + IDs do plano) ao fechar cada bloco
  (preferência permanente do CEO — ver memória `versioning-on-block-completion`).
- Deploys de hosting: `firebase deploy --only hosting` (global CLI 13.6.0 serve).
- ⚠️ **Deploy de FUNCTIONS exige node ≥20**: o `firebase` global é 13.6.0 sobre **node v18** e RECUSA
  o runtime `nodejs22` ("Cannot deploy function with runtime nodejs22"). Use o node do Homebrew (v23):
  `cd functions/.. && PATH="/opt/homebrew/bin:$PATH" npx -y firebase-tools@latest deploy --only functions`.
  (firebase-tools 15 precisa de node ≥20; o node padrão do shell é v18 — por isso o prefixo de PATH.)
- Política de limpeza do Artifact Registry (gcf-artifacts) ativada em southamerica-east1: remove imagens
  com +3 dias (resolve o aviso de custo). Comando: `... functions:artifacts:setpolicy --location southamerica-east1 --days 3 --force`.

---

> **⚠️ Segurança de hosting (corrigido nesta sessão):** o `firebase.json` usava
> `"public": "."` e servia a raiz inteira — `HANDOFF.md` e outros `.md` ficavam
> **públicos** em `tempontinho.com/<arquivo>.md`. Adicionado `"**/*.md"` e `"docs/**"`
> ao `ignore` do hosting. **Faça `firebase deploy --only hosting` para a correção valer
> em produção** (até lá, o HANDOFF antigo ainda pode estar acessível no ar).

## O que é o projeto

**Tem Pontinho** — SaaS de cartão fidelidade digital (pontos/carimbos) para
pequenos comércios. Filosofia: mínimo e sólido, barato (assinatura **R$ 19,90/mês**,
1º mês grátis — já LIVE em produção desde 2026-06-17).
O cliente só mostra um QR; toda ação fica na mão do vendedor.

- **Repo local:** `/Users/claytonborges/WORK/FidelizaSaas` (NÃO é o portfólio em
  `ClaytonBorgesDev-portfolio-final` — não confunda; o `AGENTS.md`/`CLAUDE.md`
  sobre "not the Next.js you know" é do portfólio, não daqui).
- **GitHub:** `rkoshino/FidelizaSaas` (branch de trabalho atual: `main`; PR #2 mergeado).
- **Stack:** HTML + JS ES Modules **vanilla** (sem build step), TailwindCSS via CDN,
  Firebase SDK 10.8.0.
- **Firebase:** projeto `nice-dreamks-fidelidade`, Functions v2 (Node 22, CommonJS),
  região `southamerica-east1`. Plano Blaze ativo.
- **Domínio:** `tempontinho.com` (apex, SSL ativo) + `www.tempontinho.com`
  (CNAME → 301 para apex). Também acessível em `nice-dreamks-fidelidade.web.app`.
- **CLI:** `firebase` autenticado como `claytonborgesdev@gmail.com`. `gcloud` está
  instalado mas SEM auth válida (invalid_grant) — não conte com ele para tokens.

## Arquitetura (essencial)

- **Mutações de pontos = só via Cloud Functions** (Admin SDK). O client nunca
  escreve pontos. Functions em `functions/index.js`:
  `awardPoints`, `deliverPrize`, `removePoint`, `setPoints`, `getCard`,
  `findClient`, `deleteMyData`.
- **Modelo de dados multi-tenant:** `empresas/{empresaId}/clientes/{clienteId}` =
  `{ clienteId, nome, email, pontos, premiosPendentes, atualizadoEm }`; logs em
  subcoleção `.../logs/{logId}`. Perfil do consumidor em `clientes/{uid}`.
- **Carry-over postergado:** se `pontos + qtd` completa o cartão, `awardPoints` trava o cartão cheio
  (`pontos = meta`), incrementa `premiosPendentes` e salva `pontosSobra = total % meta`. Enquanto houver
  prêmio pendente, o cliente não recebe novos pontos; o próximo scan do vendedor resgata o prêmio.
  Quando o último prêmio pendente é resgatado, `deliverPrize` renova o cartão e injeta `pontosSobra`.
- **Camada client:** `points-api.js` (wrappers das callables + `ensureClientCard`
  + `listenCard`). UI: `cliente.html`, `vendedor.html`, `dashboard.html`.
- **Confete/banner do cliente** dispara em `premiosPendentes > 0`; resgate dispara banner, rasgo do cartão,
  novo cartão e animação da sobra.

## Billing (Asaas / PIX) — IMPLEMENTADO E NO AR

- `functions/billing.js`:
  - `createSubscription({ empresaId, cpfCnpj, telefone })` — cria cliente +
    assinatura PIX **R$19,90/mês** no Asaas (`nextDueDate=trialEndDate`: o mês pago
    só começa ao fim do trial), devolve QR + copia-e-cola (com retry p/ latência).
    Auth: só o dono. ✅ **R$19,90 LIVE em produção** (deployado 2026-06-17 com a chave nova).
  - `asaasWebhook` (HTTP) — valida header `asaas-access-token` e atualiza
    `statusAssinatura` nos eventos de pagamento.
    **URL:** `https://southamerica-east1-nice-dreamks-fidelidade.cloudfunctions.net/asaasWebhook`
- **Enforcement:** `assertAssinaturaAtiva()` em `index.js` faz `awardPoints` e
  `deliverPrize` recusarem com `HttpsError("failed-precondition","ASSINATURA_INATIVA")`
  quando o trial expirou ou está inadimplente. Libera se `statusAssinatura=="active"`
  OU (`"trial"` E `trialEndDate > agora`).
- **Paywall** no `dashboard.html` via `onSnapshot` no doc da empresa (bloqueia botões
  de escrita + banner; reabilita automático quando vira `active`).
- **Regras (`firestore.rules`):** dono NÃO pode alterar campos de billing
  (`statusAssinatura`, `trialEndDate`, `asaasCustomerId`, `asaasSubscriptionId`,
  `proximoVencimento`, `totalPremiosEntregues`) — só Admin SDK/webhook. (Antes o
  dono conseguia se auto-promover a Pro — furo corrigido.)
- **Contrato completo:** ver `docs/PLANO_BILLING.md`. **Plano de refatoração:** `docs/PLANO_ACAO.md`.

## Secrets (Secret Manager) — já configurados

- `ASAAS_API_KEY` — chave de **produção** do Asaas. ✅ **Rotacionada em 2026-06-17** (versão 2 no
  Secret Manager; a versão exposta antiga foi destruída no redeploy). Functions já usam a nova.
- `ASAAS_WEBHOOK_TOKEN` — armazenado no Secret Manager (valor REMOVIDO deste doc por
  segurança — estava em texto puro num arquivo que era servido publicamente). Para
  recuperar o valor: `firebase functions:secrets:access ASAAS_WEBHOOK_TOKEN`.
  O mesmo valor deve estar no painel Asaas como token do webhook.

## Auth (corrigido nesta sessão)

- `config.js` → `authDomain: "tempontinho.com"` (era `*.web.app`). Isso corrigiu o
  **loop de login no mobile** (signInWithRedirect cross-domain perdia a sessão).
- Pré-requisito já feito no GCP (client OAuth "Web client auto created"):
  - Authorized JavaScript origins: `https://tempontinho.com`
  - Authorized redirect URIs: `https://tempontinho.com/__/auth/handler`
- Domínios autorizados no Firebase Auth: inclui `tempontinho.com` e `www.tempontinho.com`.
- `config.js` é servido com `no-cache` (mudanças propagam na hora).

## App Check — NÃO ATIVO (pendência de segurança)

- `config.js`: `APP_CHECK_SITE_KEY = ""` (vazio → App Check desligado).
- `functions/index.js`: `setGlobalOptions({ ..., enforceAppCheck: false })`.
- `functions/billing.js`: as funções não exigem App Check.
- Para ativar: registrar reCAPTCHA v3 no console (App Check), colar o site key em
  `APP_CHECK_SITE_KEY`, mudar `enforceAppCheck` para `true` (index.js E billing.js
  se quiser proteger createSubscription) e redeployar functions + hosting.

## Como deployar (cuidado com o secret no deploy)

- `firebase deploy --only hosting` — frontend (config.js, .html). Não precisa secret.
- `firebase deploy --only firestore` — rules + indexes.
- `firebase deploy --only functions` — **exige que TODOS os secrets referenciados
  existam** (mesmo com `--only` parcial o Firebase analisa tudo e pede o valor
  interativamente, travando deploy em background). Os dois secrets já existem, então
  o deploy de functions funciona normalmente agora.
- **Não** rodar deploy de functions em background com secret faltando (trava no prompt).

## Verificação rápida (sanity checks por curl)

```
curl -s "https://tempontinho.com/config.js" | grep authDomain         # deve ser tempontinho.com
curl -s "https://tempontinho.com/points-api.js?v=2" | grep -c createSubscription   # >=1
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://southamerica-east1-nice-dreamks-fidelidade.cloudfunctions.net/asaasWebhook   # 401 sem token (esperado)
```

---

## TODO LIST

### Do lado do DONO/SÓCIO (humano)
- [~] **Testar Onda 0 + Rodada 2 em produção** (EM ANDAMENTO — 2026-06-17). Roteiro nos
      relatórios; dar **feedback (ajustes)** ou **bandeira verde** para liberar o próximo bloco.
      Fazer **hard refresh** antes de testar (cache de HTML do navegador).
- [x] **Rotacionar a `ASAAS_API_KEY`** ✅ 2026-06-17 — feito pelo dono via
      `firebase functions:secrets:set ASAAS_API_KEY` (versão 2; antiga destruída no redeploy).
- [ ] **Testar login Google no MOBILE** em `tempontinho.com` (o redirect URI foi corrigido —
      confirmar que loga e PERMANECE logado).
- [ ] **Testar login/cadastro/equipe em produção**: login sem senha em PT-BR; conta inexistente sugere
      cadastro; Google sem empresa pede confirmação; convite de vendedor aceita Google/e-mail; pausar
      bloqueia acesso; apagar remove acesso.
- [ ] **Testar scan/prêmio no runtime real**: cenário 9+4 → cartão 10/10 + 1 prêmio pendente +
      `pontosSobra=3`; próximo scan resgata; cliente vê cartão novo com 3 pontos entrando.
- [x] **Configurar o webhook no painel Asaas** ✅ 2026-06-17 — token existente, Sequencial, ativo,
      eventos de cobrança/assinatura marcados. (Falta só o teste PIX ponta-a-ponta — lado do Claude.)
- [x] **A-02 — Provedores Google + E-mail/senha no Console Firebase** ✅ 2026-06-17.
- [x] **TRIAL-01 / Resend** ✅ 2026-06-17 — domínio verificado, secret criado, cron deployado.
      **Falta:** rotacionar a API key (foi colada no chat) e testar um envio real.
- [x] **Limpeza GCR/Artifact Registry** ✅ 2026-06-17 — política de retenção de 3 dias ativada.
- [ ] **(Se for ativar App Check)** registrar um site key reCAPTCHA v3 no console e
      passar o valor para o Claude.

### Do lado do CLAUDE (assistente)
- [x] **Atualizar `ASAAS_API_KEY` + redeploy de Functions** ✅ 2026-06-17 — Fase B (R$19,90 +
      nextDueDate=trialEndDate) foi ao ar junto com a rotação da chave; webhook verificado (401 sem token).
- [ ] **Teste ponta-a-ponta funcional** (após webhook ativo): login vendedor + cliente,
      escanear QR, validar carry-over postergado (ex.: 9+4→cartão 10/10 + 1 prêmio pendente +
      sobra 3 guardada; próximo scan resgata e renova com 3/10), isolamento entre empresas, paywall com trial expirado,
      e `deleteMyData` (confirmar que a query collectionGroup `clientes`/`clienteId`
      funciona sem índice composto — se reclamar, criar via link do erro).
- [ ] **Teste de pagamento real/sandbox** do fluxo PIX (createSubscription → pagar →
      webhook vira `active` → paywall some). Evitar criar assinatura real à toa.
- [ ] **App Check** (quando o dono fornecer o site key): preencher `APP_CHECK_SITE_KEY`
      em `config.js`, `enforceAppCheck: true` em `functions/index.js` (e billing.js se
      desejado), redeploy. Testar que o app continua logando.
- [x] **Limpeza:** política de retenção (3 dias) no Artifact Registry `gcf-artifacts` ✅ 2026-06-17
      (some o aviso de custo; imagens antigas são apagadas automaticamente).
- [~] **Executar o roadmap de design/produto** (`docs/PLANO_EXECUCAO.md`), marcando progresso
      em `docs/TAREFAS_CEO.md`:
      - [x] **Onda 0** (bugs P0) — feita e deployada.
      - [x] **Rodada 2** (feedback do CEO: VEND-07, B-08, O-01, TRIAL-01, VEND-08) — feita e deployada.
      - [x] **Onda 1 (mobile)** — M-01..M-05 feitas e deployadas (hosting).
      - [x] **Fase B (preço R$ 19,90)** — ✅ DEPLOYADA em 2026-06-17 (billing.js + copy no ar;
            Functions redeployadas com a chave nova). Frontend e backend consistentes em R$19,90.
      - [x] **Onda 3 (trial/MRR)** — $-01/$-02/$-03/$-05 feitas e deployadas (hosting).
      - [x] **Onda 2 (marca/tema)** — V-02 (Outfit), V-06 (jargão) e V-01 placeholder feitas.
            **V-03 (tema claro)** feita e deployada em 2026-06-18 nas 7 telas com paleta oficial
            creme/verde/terracota.
      - [~] **Onda 4 (cadastro/auth)** — feitas: C-02/C-03/C-04 (vendedor: QR do cliente,
            reordenação, atalho painel), B-05 (reset de senha) + A-03 (termos no login), O-02/O-03/O-04/O-06
            (onboarding: copy, título pré-preenchido, validação por campo, aviso conta vendedor),
            O-05 (botão wa.me), V-04 (paleta curada), V-05 (emoji picker já existia), C-05 (reforço na home),
            **A-01 (verificação de e-mail) deployada**, **A-02 feita pelo dono** e **D4/CAD-01 final**
            concluído: Facebook/Apple removidos; onboarding mantém só Google + e-mail/senha com aviso de termos.
      - [~] **Onda 5 (polimento)** — feitas e deployadas: X-01 (modais), X-03, X-05, X-07, C-06,
            C-01 e X-02 parcial + sweep adicional em login/cliente/vendedor. **Falta:** auditoria visual
            final de contraste/leitura em device real pós-tema claro.
- [x] **Login/cadastro + equipe/vendedores** — feito e deployado: login do dono separa
      entrar/criar conta, Google novo pede confirmação antes do trial, erros principais em PT-BR,
      convites de vendedor, aceite via callable, pausar/retomar/apagar vendedor e bloqueio de vendedor
      pausado nas Functions. Documentado em `docs/PLANO_LOGIN_EQUIPE.md`.
- [ ] **Backlog de polimento (pós-launch):** Tailwind via build (hoje CDN dá warning em
      prod), PWA/manifest, auditoria de acessibilidade (ver `docs/RELATORIO_DESIGN.md`),
      manter o `README` atualizado.
- [ ] **(Opcional)** adicionar `www.tempontinho.com` como domínio próprio no Hosting se
      quiser servir direto em vez do 301.

### Status consolidado (já concluído nesta sessão)
- [x] Engine de pontos server-side + multi-tenant + carry-over + fluxo de prêmio
- [x] LGPD delete server-side, movido para kebab no cliente
- [x] Billing Asaas/PIX (createSubscription + webhook) + enforcement + paywall
- [x] Rules endurecidas (anti auto-promoção a Pro) + índice
- [x] Rebrand Tem Pontinho; domínio + SSL; preço R$19,90
- [x] Fix do loop de login mobile (authDomain → tempontinho.com)
- [x] Tudo deployado e mergeado em `main` via PR #2
- [x] **Auditoria de design completa** (web + mobile) → `docs/RELATORIO_DESIGN.md`
- [x] **Review do CEO organizado em backlog** → `docs/TAREFAS_CEO.md`
- [x] **Relatório master + plano de execução em ondas** → `docs/RELATORIO_FINAL.md` + `docs/PLANO_EXECUCAO.md`
- [x] **Organização da pasta:** docs movidos para `docs/`; `AI_CONTEXT.md` (desatualizado)
      e `PLANO_ACAO_DESIGN.md` (redundante) removidos; hosting deixou de servir `.md`;
      token do webhook removido do HANDOFF (estava em texto puro num doc público)

### Status consolidado — sessão 2026-06-21 (ver seção "🆕 SESSÃO 2026-06-21" no topo)
- [x] **Billing endurecido** (auditoria P0+P1): rules create-guard, idempotência do
      `createSubscription`, paywall real, enforcement em set/removePoint, webhook refund→canceled,
      validação CPF/CNPJ — `680db38`. **Deployado.**
- [x] **Suíte de testes automatizada** (50): `npm test` (44, emulador) + `npm run test:e2e`
      (6, Playwright). `test/README.md`. — `6baad9f`/`a0b5673`/`a7232fa`.
- [x] **Refactor `js/` do parceiro mergeado** (dashboard/vendedor/cliente em módulos) + UI nova
      + histórico de vendedor, com meus fixes re-aplicados; ~30 scratch files removidos — merge `a3148ad`.
      **Deployado e pushado em `origin/main`.**
- [ ] **Teste PIX real ponta-a-ponta** (manual) — pendente.
- [ ] **Validar à mão a UI nova do parceiro** (histórico vendedor, animações, cards, convites) — sem
      cobertura automatizada.
- [ ] **Parceiro: `git pull` no `main`** antes de continuar (evita nova divergência).
