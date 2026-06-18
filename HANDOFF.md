# HANDOFF — Tem Pontinho (continuação de sessão)

> **Para o próximo Claude:** leia este documento inteiro antes de qualquer ação.
> Ele contém tudo para dar seguimento sem o usuário precisar reexplicar.
> Atualize a TODO list no fim conforme as tarefas forem concluídas.
> Última atualização: 2026-06-18 (sessão: **V-03 TEMA CLARO** — paleta oficial creme/verde/terracota
> aplicada em TODAS as 7 telas (landing + logadas); **X-01 modais** em dashboard/cliente/vendedor;
> **PR #2 aberto** p/ main. Antes: A-01 + Onda 5 X-02p/X-03/X-05/X-07/C-06 + C-01 — DEPLOYADO.
> Depois: V-03 paleta v2 amendoado+teal na landing — DEPLOYADO; **A-02 (provedores Firebase) FEITO pelo
> dono; webhook Asaas CONFIGURADO pelo dono (token existente, sequencial, ativo)**. TRIAL-01 backend
> reescrito (avisos 15/7/3/1 dias às 10h BRT) — NÃO deployado, aguarda secret RESEND_API_KEY).

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
Branch **`fix/onda-0-bugs-p0`** (Onda 0 + Rodada 2 + Onda 1 + Onda 2 parcial + Onda 3 + **Fase B LIVE** +
Onda 4 + Onda 5 parcial; **ainda NÃO mergeado em `main`**). Hosting deployado; **Functions também
deployadas** (Fase B no ar com a chave Asaas nova — 2026-06-17).

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
1. **Configurar o webhook no painel Asaas** (tarefa do dono) — senão `PAYMENT_CONFIRMED` não vira
   `statusAssinatura: active` e o paywall não some sozinho. URL/token/eventos na seção "AGUARDANDO O CEO".
   Functions, preço R$19,90 e chave nova **já estão no ar** — pode fechar PIX real.
2. **V-03 (tema claro)** — NÃO iniciado. Migrar telas logadas (escuro) p/ tema claro. Bloqueado na
   **paleta** (CEO ainda vai decidir; D3 autoriza paleta clara neutra como placeholder). É a maior
   mudança visual restante — fazer junto com o logo definitivo (também ON HOLD) faz sentido.
3. **Onda 4** — feita quase toda e deployada (vendedor QR/atalho, reset de senha, termos, validação
   por campo, pickers, share wa.me, reforço home). **A-01 IMPLEMENTADA** (2026-06-17): onboarding dispara
   `sendEmailVerification` no cadastro por e-mail e o dashboard mostra banner cobrando confirmação +
   botão reenviar (só para provider `password` não verificado). **Falta só A-02** (config de provedores
   no console Firebase — tarefa de console).
4. **Onda 5** — feitas: X-06 confirmação, X-04 parcial aria, **X-03 (foco-visível global), X-05
   (loading/offline/erro no cliente), X-07 (reduced-motion), C-06 (empty state cliente novo) e X-02
   parcial (contraste nas telas escuras)** — todas em 2026-06-17. **X-01** (modais no lugar de
   alert/confirm) segue ADIADO de propósito (refactor amplo em fluxos destrutivos). **X-02 sweep
   completo** (contraste/tamanho de fonte em onboarding/index/login) foi deixado para acompanhar a
   V-03 (tema claro) e evitar retrabalho. **Tudo de 2026-06-17 ainda NÃO deployado** (aguardando
   `firebase deploy --only hosting`).

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
5. (Antigo) testar **login Google no mobile**.

### ▶️ PRÓXIMOS PASSOS — o que sobrou
1. **Webhook Asaas** (tarefa do dono — ver "AGUARDANDO O CEO") + **teste PIX ponta-a-ponta**
   (createSubscription → pagar → webhook vira `active` → paywall some). Já dá pra fechar PIX real.
2. ~~**V-03 (tema claro)**~~ ✅ **FEITA (2026-06-18)**. Paleta oficial aprovada pelo CEO (creme `#F4EFE6`
   + verde forest `#2A5A44` + terracota `#D96B43`, regra 60/30/10 — substitui a teal de teste) aplicada
   nas 7 telas: landing, login, cliente, dashboard, vendedor, onboarding, master-admin. Implementação:
   tokens `brand.*` + remap dos scales legados (indigo/emerald/teal→verde, amber/orange→terracota) na
   config inline + inversão de luminância no markup (scale `stone` nos neutros). Validada visualmente na
   landing (screenshot). **Ainda NÃO deployada** (aguarda `firebase deploy --only hosting`).
3. ~~A-01~~ ✅ FEITA (2026-06-17). Falta só **A-02** (provedores no console Firebase — tarefa de console).
4. **Onda 5 restante:** só **X-02 sweep completo** (acompanha V-03/tema claro). **X-01 ✅ FEITA
   (2026-06-18)**: `alert/confirm/prompt` nativos substituídos por `showToast`(success/error/warn) +
   `confirmDialog` (modal promise-based, com variante `danger` e `keyword` p/ a exclusão por palavra
   "APAGAR") em **dashboard, cliente e vendedor** (commit `cf05bb4`). **Ainda NÃO deployado** (aguarda
   `firebase deploy --only hosting`).
   ✅ Feitas E DEPLOYADAS em 2026-06-17: X-02 (parcial telas escuras), X-03, X-05, X-07, C-06, **C-01**
   (prévia de valor antes do login + Google 1-tap primário + FB/Apple escondidos por D4).
   📦 **PR aberto:** `fix/onda-0-bugs-p0` → `main` = https://github.com/rkoshino/FidelizaSaas/pull/2
   (33 commits; Ondas 0→5 + Fase B + X-01).
5. **TRIAL-01 aviso 7 dias antes** — ✅ BACKEND PRONTO (`functions/notifications.js`,
   `subscriptionReminderCron` onSchedule **10:00 BRT**, avisos em **15/7/3/1 dias antes do vencimento**
   (trialEndDate p/ trial, proximoVencimento p/ active), dedupe em `lembretesVencimentoEnviados`).
   **Falta:** domínio Resend verificar + `firebase functions:secrets:set RESEND_API_KEY` + `firebase
   deploy --only functions`. Conta Resend criada e DNS já adicionado (passo a passo em "AGUARDANDO O CEO").
6. **V-03 tema claro** — teste de paleta na **landing** (`index.html`) via tokens no `tailwind.config`.
   v1 (creme/verde/laranja) REPROVADA. **v2 ATUAL: off-white amendoado `#F2EBDE` + tinta espresso
   `#2A2520` + contraste único teal `#0E6E63`, 3 cores, SEM degradê.** DEPLOYADO. Aguarda OK do CEO
   antes de migrar as telas logadas escuras (dashboard/vendedor/onboarding/master-admin/cliente) — o
   grosso restante do V-03. Obs.: o logo SVG (pássaro) ainda tem degradê azul, mas é ON HOLD (logo
   definitivo é tarefa à parte).
7. Em algum momento: **merge da `fix/onda-0-bugs-p0` em `main`** (a branch acumulou muita coisa).

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
- **GitHub:** `rkoshino/FidelizaSaas` (branch de trabalho atual: `main`, sincronizado).
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
- **Carry-over:** `total = pontos + qtd; premiosGanhos = floor(total/meta);
  pontos = total % meta`. Prêmios acumulam em `premiosPendentes`.
- **Camada client:** `points-api.js` (wrappers das callables + `ensureClientCard`
  + `listenCard`). UI: `cliente.html`, `vendedor.html`, `dashboard.html`.
- **Confete/banner do cliente** dispara em `premiosPendentes > 0` (não em pontos>=meta).

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
      escanear QR, validar carry-over (ex.: 9+4→1 prêmio, cartão 3/10), entrega de
      prêmio idempotente, isolamento entre empresas, paywall com trial expirado,
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
      - [~] **Onda 2 (marca/tema)** — V-02 (Outfit) e V-06 (jargão) feitas; V-01 placeholder já
            consistente. **V-03 (tema claro):** paleta v2 (amendoado+teal) aplicada como TESTE na landing
            e deployada; aguardando OK do CEO ("paleta em breve falaremos mais") antes de migrar as telas
            logadas escuras (o grosso restante).
      - [~] **Onda 4 (cadastro/auth)** — feitas: C-02/C-03/C-04 (vendedor: QR do cliente,
            reordenação, atalho painel), B-05 (reset de senha) + A-03 (termos no login), O-02/O-03/O-04/O-06
            (onboarding: copy, título pré-preenchido, validação por campo, aviso conta vendedor),
            O-05 (botão wa.me), V-04 (paleta curada), V-05 (emoji picker já existia), C-05 (reforço na home),
            **A-01 (verificação de e-mail — 2026-06-17, falta deploy).** **Falta:** A-02
            (config de provedores no console Firebase).
      - [~] **Onda 5 (polimento)** — feitas: X-06 (confirmação ao bloquear no master-admin), X-04 parcial
            (aria-label nos botões de fechar do dashboard), **X-03 (foco-visível global), X-05 (loading/
            offline/erro no cliente), X-07 (reduced-motion), C-06 (empty state cliente novo), X-02 parcial
            (contraste telas escuras) — todas 2026-06-17, falta deploy.** **Faltam:** X-01 (trocar
            alert/confirm nativos por modais — refactor amplo, ADIADO de propósito), X-02 sweep completo
            (com V-03), C-01 (reduzir fricção do cartão do cliente — experimento "L").
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
- [x] Rebrand Tem Pontinho; domínio + SSL; preço R$10
- [x] Fix do loop de login mobile (authDomain → tempontinho.com)
- [x] Tudo deployado e mergeado no `main`
- [x] **Auditoria de design completa** (web + mobile) → `docs/RELATORIO_DESIGN.md`
- [x] **Review do CEO organizado em backlog** → `docs/TAREFAS_CEO.md`
- [x] **Relatório master + plano de execução em ondas** → `docs/RELATORIO_FINAL.md` + `docs/PLANO_EXECUCAO.md`
- [x] **Organização da pasta:** docs movidos para `docs/`; `AI_CONTEXT.md` (desatualizado)
      e `PLANO_ACAO_DESIGN.md` (redundante) removidos; hosting deixou de servir `.md`;
      token do webhook removido do HANDOFF (estava em texto puro num doc público)
