# HANDOFF — Tem Pontinho (continuação de sessão)

> **Para o próximo Claude:** leia este documento inteiro antes de qualquer ação.
> Ele contém tudo para dar seguimento sem o usuário precisar reexplicar.
> Atualize a TODO list no fim conforme as tarefas forem concluídas.
> Última atualização: 2026-06-17.

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
Branch **`fix/onda-0-bugs-p0`** (Onda 0 + Rodada 2 + Onda 1 + Onda 2 parcial + Onda 3 + Fase B(código);
**ainda NÃO mergeado em `main`**). Commits: `9b673ed` (Onda 0) · `2b64b3b` (Rodada 2) · `157181c` (docs)
· **Onda 1** (mobile) · **Fase B + Onda 3** (preço/trial) · **Onda 2 parcial** (Outfit/jargão).

- **Onda 0 — bugs P0:** B-01, B-02, B-03, B-04, $-04, B-07.
- **Rodada 2 — feedback do CEO:** VEND-07, B-08, O-01, TRIAL-01, VEND-08.
- **Onda 1 — mobile (NOVO):** M-01 (barra de nav inferior no dashboard), M-02 (stats grid-cols-2,
  tabela de clientes vira cards via CSS+data-label, header desapertado, logout mobile), M-03/M-04
  (home sem overflow-x, Login sempre visível, cards flutuantes escondidos < sm), M-05 (alvos ≥44px).
- **Fase B + Onda 3 — preço/trial (NOVO):** $-03 (landing vira plano ÚNICO R$19,90/mês + 1º mês grátis,
  plano anual fictício REMOVIDO; dashboard e modal PIX R$19,90), $-05 (MRR = ativas×19.90), $-02
  (banner de contagem no dashboard DURANTE o trial), $-01 (banner de trial no vendedor).
  ⚠️ **`functions/billing.js` também foi alterado (value 19.90 + nextDueDate=trialEndDate) mas NÃO
  deployado** — deploy de Functions está GATED no OK do CEO + chave nova (ver abaixo).
- **Onda 2 parcial (NOVO):** V-02 (fonte Outfit carregada em dashboard/onboarding/cliente/vendedor —
  antes `font-outfit` não renderizava), V-06 (jargão removido: White Label, empresaId, instrução de
  dev no erro de link), V-01 (placeholder de logo já consistente no app; logo definitivo ON HOLD).
- Verificação: `node --check billing.js` + curl confirmando no ar (preço, nav mobile, Outfit, .md→404).
  **Falta teste runtime** (o CEO vai testar amanhã e dar o OK).

### ⏸️ ONDE PAREI EXATAMENTE
Onda 1, Onda 2 (parcial), Onda 3 e Fase B (código) **concluídas e deployadas em hosting**. Pendências:
1. **Deploy de Functions** (preço R$19,90 + chave Asaas nova) — GATED no OK do CEO. Enquanto não rodar,
   a produção AINDA cobra R$10 no Asaas, embora o frontend mostre R$19,90. **Não completar PIX real
   no teste antes desse deploy.**
2. **V-03 (tema claro)** — NÃO iniciado. Migrar telas logadas (escuro) p/ tema claro. Bloqueado na
   **paleta** (CEO ainda vai decidir; D3 autoriza paleta clara neutra como placeholder). É a maior
   mudança visual restante — fazer junto com o logo definitivo (também ON HOLD) faz sentido.
3. **Onda 4** — feita quase toda e deployada (vendedor QR/atalho, reset de senha, termos, validação
   por campo, pickers, share wa.me, reforço home). Faltam só **A-01** (verificação de e-mail — código
   pronto via `config.js`, falta ativar/usar) e **A-02** (config de provedores no console Firebase).
4. **Onda 5** — só itens leves feitos (X-06 confirmação, X-04 parcial aria). **X-01** (modais no lugar
   de alert/confirm) foi ADIADO de propósito (refactor amplo em fluxos destrutivos). Resto de polimento
   (contraste, foco, loading/offline, empty states) pendente.

### ⛳ AGUARDANDO O CEO (humano) — bloqueios/pendências
1. **Testar Onda 0 + Rodada 2** (em andamento) → dar feedback (ajustes) ou **bandeira verde**.
2. **Rotacionar a `ASAAS_API_KEY`** (foi exposta) e me mandar a nova chave — instruções completas
   já passadas ao CEO (gerar nova no painel Asaas → Configurações → Integrações → Chave de API;
   a antiga invalida na hora; **não** colar em arquivo, só mandar na conversa). Depois EU faço:
   `firebase functions:secrets:set ASAAS_API_KEY` + `firebase deploy --only functions` + teste PIX.
3. **Bandeira verde para a Fase B (preço R$ 19,90)** — ela mexe em `functions/billing.js` e exige
   **deploy de Functions** (Asaas real, ação sensível). Não fazer sem o OK.
4. (Antigos, ainda abertos) configurar o **webhook no painel Asaas**; testar **login Google no mobile**.

### ▶️ PRÓXIMOS PASSOS (quando liberado) — ordem sugerida
1. Retomar **M-01** (acima) → resto da **Onda 1 (mobile):** M-02 (reflow/tabela em cards),
   M-03 (overflow horizontal da home), M-04, M-05. Tudo frontend, sem deploy sensível.
2. **Fase B — preço R$ 19,90** (com green flag): `functions/billing.js` (`value:10.0`→`19.90`,
   `nextDueDate=trialEndDate`) + copy `$-03` (`index.html`, `dashboard.html` modal PIX R$10,
   `master-admin.html` MRR `*49`). Deploy hosting é seguro; deploy de Functions só com OK.
3. **Onda 2 — marca/tema:** placeholder padronizado + migrar telas logadas pro **tema claro**
   (V-03) — **parcialmente bloqueada na paleta** (CEO ainda vai decidir). V-02 (fonte Outfit) e
   V-06 (jargão) podem ir.
4. Pendência da TRIAL-01: implementar o **aviso real de 7 dias antes** (notificação/e-mail).

### 🔧 Notas operacionais
- **Git push trava** no `git-credential-osxkeychain` neste ambiente. Use o helper do gh:
  `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin HEAD:<branch>`
  (ver memória `git-push-via-gh-helper`). O `gh` está autenticado com escopo `repo`.
- **Versionamento:** commitar padronizado (conventional + IDs do plano) ao fechar cada bloco
  (preferência permanente do CEO — ver memória `versioning-on-block-completion`).
- Deploys feitos na sessão: vários `firebase deploy --only hosting` (frontend). Nenhum deploy de
  Functions feito ainda nesta fase.

---

> **⚠️ Segurança de hosting (corrigido nesta sessão):** o `firebase.json` usava
> `"public": "."` e servia a raiz inteira — `HANDOFF.md` e outros `.md` ficavam
> **públicos** em `tempontinho.com/<arquivo>.md`. Adicionado `"**/*.md"` e `"docs/**"`
> ao `ignore` do hosting. **Faça `firebase deploy --only hosting` para a correção valer
> em produção** (até lá, o HANDOFF antigo ainda pode estar acessível no ar).

## O que é o projeto

**Tem Pontinho** — SaaS de cartão fidelidade digital (pontos/carimbos) para
pequenos comércios. Filosofia: mínimo e sólido, barato (assinatura **R$ 19,90/mês**,
1º mês grátis — código já em R$19,90; deploy de Functions pendente do OK do CEO).
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
    Auth: só o dono. ⚠️ Código já em R$19,90 mas **NÃO deployado** (deploy de Functions
    pendente do OK do CEO + chave nova; produção ainda roda R$10 até lá).
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

- `ASAAS_API_KEY` — chave de **produção** do Asaas. ⚠️ **Foi exposta em texto puro
  numa conversa anterior — precisa ser rotacionada** (tarefa do dono no painel Asaas;
  depois é só rodar `firebase functions:secrets:set ASAAS_API_KEY` e redeploy das functions).
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
- [ ] **Rotacionar a `ASAAS_API_KEY`** (foi exposta) — instruções já passadas: painel Asaas →
      Configurações → Integrações → Chave de API → gerar nova (a antiga invalida na hora) →
      **mandar a nova chave na conversa** (não colar em arquivo). O Claude faz o resto.
- [ ] **Testar login Google no MOBILE** em `tempontinho.com` (o redirect URI foi corrigido —
      confirmar que loga e PERMANECE logado).
- [ ] **Configurar o webhook no painel Asaas** (responsável: sócio). Em
      Configurações → Integrações → Webhooks:
      URL = `https://southamerica-east1-nice-dreamks-fidelidade.cloudfunctions.net/asaasWebhook`;
      Token = valor de `ASAAS_WEBHOOK_TOKEN` (rodar `firebase functions:secrets:access ASAAS_WEBHOOK_TOKEN`);
      Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE` + cancelamento/
      inativação de assinatura. (Status atual: provavelmente AINDA NÃO feito.)
- [ ] **Rotacionar a chave de produção do Asaas** (foi exposta). Gerar nova no painel
      e avisar o Claude para atualizar o secret + redeploy.
- [ ] **(Se for ativar App Check)** registrar um site key reCAPTCHA v3 no console e
      passar o valor para o Claude.

### Do lado do CLAUDE (assistente)
- [ ] **Atualizar `ASAAS_API_KEY`** assim que o dono rotacionar (set secret + `firebase
      deploy --only functions`).
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
- [ ] **Limpeza:** apagar imagens de build do GCR que geram aviso de custo
      (`https://console.cloud.google.com/gcr/images/nice-dreamks-fidelidade/us/gcf`).
- [~] **Executar o roadmap de design/produto** (`docs/PLANO_EXECUCAO.md`), marcando progresso
      em `docs/TAREFAS_CEO.md`:
      - [x] **Onda 0** (bugs P0) — feita e deployada.
      - [x] **Rodada 2** (feedback do CEO: VEND-07, B-08, O-01, TRIAL-01, VEND-08) — feita e deployada.
      - [x] **Onda 1 (mobile)** — M-01..M-05 feitas e deployadas (hosting).
      - [x] **Fase B (preço R$ 19,90)** — CÓDIGO feito (billing.js + copy). **Deploy de Functions
            PENDENTE** (gated no OK do CEO + chave nova). Copy/preço já no ar via hosting.
      - [x] **Onda 3 (trial/MRR)** — $-01/$-02/$-03/$-05 feitas e deployadas (hosting).
      - [~] **Onda 2 (marca/tema)** — V-02 (Outfit) e V-06 (jargão) feitas; V-01 placeholder já
            consistente. **V-03 (tema claro) PENDENTE** — bloqueada na paleta (CEO decide).
      - [~] **Onda 4 (cadastro/auth)** — feitas e deployadas: C-02/C-03/C-04 (vendedor: QR do cliente,
            reordenação, atalho painel), B-05 (reset de senha) + A-03 (termos no login), O-02/O-03/O-04/O-06
            (onboarding: copy, título pré-preenchido, validação por campo, aviso conta vendedor),
            O-05 (botão wa.me), V-04 (paleta curada), V-05 (emoji picker já existia), C-05 (reforço na home).
            **Faltam:** A-01 (verificação de e-mail — config.js já exporta sendEmailVerification), A-02
            (config de provedores no console Firebase), O-01 (botão Voltar — já existia).
      - [~] **Onda 5 (polimento)** — feitas: X-06 (confirmação ao bloquear no master-admin), X-04 parcial
            (aria-label nos botões de fechar do dashboard). **Faltam:** X-01 (trocar alert/confirm nativos
            por modais — refactor amplo, mexe em fluxos destrutivos; ADIADO de propósito), X-02 (contraste),
            X-03 (foco de teclado), X-05 (loading/offline no cliente), X-07 (prefers-reduced-motion),
            C-01/C-06 (fricção/empty states).
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
