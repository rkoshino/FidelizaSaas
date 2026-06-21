# Testes automatizados — Tem Pontinho

Testes de integração contra o **Firebase Emulator Suite** (Auth + Firestore +
Functions). Não tocam produção: rodam no projeto `demo-tempontinho` e usam um
**mock local do Asaas** (porta 9100) — nenhuma chave real é necessária.

## Pré-requisitos
- Node 18+ e Java 11+ (o emulador do Firestore exige JRE)
- `firebase-tools` (já usado no projeto): `npx firebase --version`
- `npm install` na raiz (instala `firebase`, `firebase-admin`, `@firebase/rules-unit-testing`)

## Rodar
```bash
npm test            # tudo: rules + functions + billing (44 testes)
npm run test:rules      # só as Security Rules (Firestore)
npm run test:functions  # callables de pontos + enforcement de assinatura
npm run test:billing    # createSubscription (idempotência) + webhook Asaas
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

## Portas (firebase.json → emulators)
auth `9099` · functions `5001` · firestore `8085` · mock Asaas `9100`.
Se alguma colidir, ajuste em `firebase.json` e `test/helpers.mjs`.

## Limitações (cobertura manual)
- Fluxo de **browser real** (login Google popup, onboarding visual, paywall na
  tela) não é coberto — exigiria E2E (ex.: Playwright).
- Teste **ponta-a-ponta contra o Asaas sandbox** (chave real, PIX de verdade)
  é manual.
