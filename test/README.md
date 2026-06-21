# Testes automatizados — Tem Pontinho

Testes de integração contra o **Firebase Emulator Suite** (Auth + Firestore +
Functions). Não tocam produção: rodam no projeto `demo-tempontinho` e usam um
**mock local do Asaas** (porta 9100) — nenhuma chave real é necessária.

## Pré-requisitos
- Node 18+ e Java 11+ (o emulador do Firestore exige JRE)
- `firebase-tools` (já usado no projeto): `npx firebase --version`
- `npm install` na raiz (instala `firebase`, `firebase-admin`,
  `@firebase/rules-unit-testing`, `playwright`)
- Para o E2E, baixe o navegador uma vez: `npx playwright install chromium`

## Rodar
```bash
npm test            # rápido: rules + functions + billing (44 testes, sem browser)
npm run test:rules      # só as Security Rules (Firestore)
npm run test:functions  # callables de pontos + enforcement de assinatura
npm run test:billing    # createSubscription (idempotência) + webhook Asaas
npm run test:e2e        # E2E em browser real (Playwright): login + paywall
npm run test:all        # tudo: npm test + test:e2e (48 testes)
```
O hook `pretest` cria automaticamente `functions/.secret.local` (valores dummy)
caso não exista — sem ele o emulador trava pedindo o secret.

## O que cada suíte cobre
- **test/rules.test.mjs** — autorização/segurança: guarda de criação de
  `empresas` (não dá pra forjar `statusAssinatura`/`trialEndDate`), imutabilidade
  dos campos de billing no update (incl. `cpfCnpj`), auto-cadastro do cartão
  (0/0), isolamento multi-tenant, perfis e vendedores.
- **test/functions.test.mjs** — `awardPoints` (crédito, conclusão de cartão com
  sobra, trava por prêmio pendente), `deliverPrize` (carry-over), `setPoints`,
  `removePoint`, e o **bloqueio `ASSINATURA_INATIVA`** em overdue/canceled/trial
  expirado (inclui `setPoints`/`removePoint`).
- **test/billing.test.mjs** — `createSubscription`: 1ª chamada cria, 2ª
  reaproveita (idempotência), e recria após cancelamento; `asaasWebhook`:
  rejeição de token, `PAYMENT_CONFIRMED→active`, `PAYMENT_OVERDUE→overdue`,
  `PAYMENT_REFUNDED→canceled`, evento desconhecido ignorado.
- **test/e2e.test.mjs** — browser real (Chromium): login por e-mail/senha em
  `login.html` → redireciona ao dashboard; paywall aparece com `overdue`;
  reativar a assinatura (simulando o webhook) esconde o paywall em tempo real
  (onSnapshot); reload com `active` não mostra paywall. As páginas falam com o
  emulador porque `config.js`/`points-api.js` conectam aos emuladores quando
  `localStorage.USE_EMULATOR === "1"` (setado pelo teste). Um static server
  local serve os arquivos (evita um bug do hosting emulator/superstatic).

  > Nota: o E2E roda com `--project=nice-dreamks-fidelidade` (o projectId real
  > do `config.js`) para que browser, Admin SDK e emulador usem o MESMO projeto.
  > As demais suítes usam o projeto isolado `demo-tempontinho`.

## Portas
auth `9099` · functions `5001` · firestore `8085` (firebase.json) · static
server E2E `5055` · mock Asaas `9100` (test/helpers.mjs). Se alguma colidir,
ajuste em `firebase.json` e `test/helpers.mjs`. (Obs.: 8080 e 5050 costumam
estar ocupadas nesta máquina; por isso 8085 e 5055.)

## Limitações (cobertura manual)
- **Login Google (popup)** e o **wizard de onboarding** não são automatizados —
  o E2E cobre login por e-mail/senha e o paywall do dashboard.
- **Vendedor/cliente em browser** ainda não têm E2E (a lógica está coberta por
  rules + functions). Dá pra estender `e2e.test.mjs` no mesmo molde.
- Teste **ponta-a-ponta contra o Asaas sandbox** (chave real, PIX de verdade)
  é manual.
