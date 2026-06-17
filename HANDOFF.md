# HANDOFF — Tem Pontinho (continuação de sessão)

> **Para o próximo Claude:** leia este documento inteiro antes de qualquer ação.
> Ele contém tudo para dar seguimento sem o usuário precisar reexplicar.
> Atualize a TODO list no fim conforme as tarefas forem concluídas.
> Última atualização: 2026-06-16.

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

> **Próxima sessão — onde retomar:** as **5 decisões do CEO foram respondidas** (registradas
> em `docs/PLANO_EXECUCAO.md §0`): preço **R$ 19,90/mês + 1º mês grátis**; logo **on hold**
> (padronizar placeholder atual, tarefa do logo em aberto); tema **claro** (paleta a decidir);
> auth **só Google + e-mail** (+ pedido de um meio de testar cadastro sem criar e-mail novo —
> `T-DEV`, baixa prioridade); cartão do cliente **mínimo de movimentos**. Mandato-mestra do CEO:
> *"MVP mínimo e completo funcional antes de luxos."*
>
> **Onda 0 (bugs P0) CONCLUÍDA e deployada** (B-01, B-02, B-03, B-04, $-04, B-07). CEO testou:
> **B-02 confirmado OK**; trouxe feedback → **Rodada 2 CONCLUÍDA e deployada** (commit `2b64b3b`):
> - **VEND-07**: scan do vendedor agora é deliberado (1 leitura → painel via `getCard` → ações).
> - **B-08**: cadastro com e-mail já existente não sobrescreve mais (redireciona ao dashboard / CTA login).
> - **O-01**: botão Voltar no onboarding (passo 3→2). **TRIAL-01**: card das condições do trial.
> - **VEND-08**: QR de acesso do vendedor na aba Equipe do dashboard.
>
> Tudo verificado por syntax-check (`node --check`) e confirmado no ar. **Falta teste runtime** do
> CEO na Rodada 2. Branch: `fix/onda-0-bugs-p0` (Onda 0 + Rodada 2). **Push:** o osxkeychain trava;
> usar o helper do gh (ver memória `git-push-via-gh-helper`).
>
> **Próximo (aguardando feedback do CEO sobre a Rodada 2):** **Fase B = preço R$ 19,90** — inclui
> `functions/billing.js` (hoje `value:10.0`) e o CEO já definiu `nextDueDate = trialEndDate` (mês pago
> só vale após os 30 dias). Depois Onda 1 (mobile). Pendências menores: TRIAL-01 falta o aviso real
> de 7 dias antes (notificação/e-mail). Sequência completa em `docs/PLANO_EXECUCAO.md`.

> **⚠️ Segurança de hosting (corrigido nesta sessão):** o `firebase.json` usava
> `"public": "."` e servia a raiz inteira — `HANDOFF.md` e outros `.md` ficavam
> **públicos** em `tempontinho.com/<arquivo>.md`. Adicionado `"**/*.md"` e `"docs/**"`
> ao `ignore` do hosting. **Faça `firebase deploy --only hosting` para a correção valer
> em produção** (até lá, o HANDOFF antigo ainda pode estar acessível no ar).

## O que é o projeto

**Tem Pontinho** — SaaS de cartão fidelidade digital (pontos/carimbos) para
pequenos comércios. Filosofia: mínimo e sólido, barato (assinatura **R$ 10/mês**).
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
    assinatura PIX R$10/mês no Asaas, devolve QR + copia-e-cola (com retry p/
    latência). Auth: só o dono.
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
- [ ] **Testar login Google no MOBILE** em `tempontinho.com` (era o último item em
      aberto; o redirect URI foi corrigido — confirmar que loga e PERMANECE logado).
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
- [ ] **Executar o roadmap de design/produto:** seguir `docs/PLANO_EXECUCAO.md` por ondas
      (começar pela Onda 0 — bugs P0, incl. `B-01`/CAD-05). Marcar progresso em
      `docs/TAREFAS_CEO.md`.
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
