# Contrato de Billing — Tem Pontinho (Asaas / PIX)

> Documento-contrato para os agentes. Fixa nomes de campos, callables, payloads
> e regras para backend e frontend não divergirem. Provedor: **Asaas (produção)**.
> Plano: **R$ 10,00/mês**. Enforcement: **bloquear carimbos + paywall**.

## 1. Modelo de dados — `empresas/{empresaId}`

Campos existentes: `nomeEmpresa`, `emailComercial`, `donoUid`, `dataCadastro`,
`statusAssinatura`, `trialEndDate`, `linkUnicoCliente`, `slugsAntigos`,
`metaConfig`, `visualConfig`, `totalPremiosEntregues`.

Campos de billing (escrita **SÓ via Cloud Function / webhook**):
- `statusAssinatura`: `"trial" | "active" | "overdue" | "canceled"`
- `trialEndDate`: Timestamp (já existe; 30 dias no cadastro)
- `asaasCustomerId`: string — id do cliente no Asaas
- `asaasSubscriptionId`: string — id da assinatura no Asaas
- `proximoVencimento`: Timestamp — próxima data de cobrança
- `cpfCnpj`: string — coletado no checkout (Asaas exige p/ criar cliente)

**Campos protegidos (nunca graváveis pelo client):** `statusAssinatura`,
`trialEndDate`, `asaasCustomerId`, `asaasSubscriptionId`, `proximoVencimento`,
`totalPremiosEntregues`.

## 2. Regra de acesso (enforcement)

Empresa está LIBERADA para operar pontos se:
```
statusAssinatura == "active"
  OU (statusAssinatura == "trial" E trialEndDate > agora)
```
Caso contrário → BLOQUEADA. `awardPoints` e `deliverPrize` devem recusar com
`HttpsError("failed-precondition", "ASSINATURA_INATIVA")`. (Leituras/`getCard`/
`findClient` continuam liberadas para não quebrar a UI.)

## 3. Callables (região `southamerica-east1`)

### `createSubscription({ empresaId, cpfCnpj, telefone? })`
- Auth: **apenas o dono** (`request.auth.uid === empresaId`).
- Cria (ou reaproveita) o cliente no Asaas; cria assinatura PIX R$10/mês.
- Grava no doc: `asaasCustomerId`, `asaasSubscriptionId`, `cpfCnpj`.
- Retorna:
```js
{
  status,                // status da assinatura no Asaas
  subscriptionId,
  value: 10.0,
  pixCopiaECola,         // payload PIX copia-e-cola da 1ª cobrança
  pixQrCodeBase64,       // imagem QR (base64, sem prefixo data:)
  invoiceUrl             // fallback: link da fatura Asaas
}
```

## 4. Webhook HTTP: `asaasWebhook` (onRequest)
- Header obrigatório `asaas-access-token` === secret `ASAAS_WEBHOOK_TOKEN`.
  Se não bater → 401.
- Body: `{ event, payment }`. Mapear empresa por `payment.subscription`
  (== `asaasSubscriptionId`) ou por `payment.customer` (== `asaasCustomerId`).
- Eventos:
  - `PAYMENT_CONFIRMED` | `PAYMENT_RECEIVED` → `statusAssinatura="active"`,
    `proximoVencimento = payment.dueDate (+1 mês se aplicável)`.
  - `PAYMENT_OVERDUE` → `statusAssinatura="overdue"`.
  - `SUBSCRIPTION_DELETED` | `PAYMENT_DELETED` | `SUBSCRIPTION_INACTIVATED`
    → `statusAssinatura="canceled"`.
- Sempre responder `200` rápido (Asaas reenvia em caso de erro).

## 5. Secrets (Secret Manager) — já existentes / a criar
- `ASAAS_API_KEY` — **existe** (produção). Base URL: `https://api.asaas.com/v3`.
- `ASAAS_WEBHOOK_TOKEN` — **a criar pelo dono** + configurar no painel Asaas.
- Bind dos secrets nas functions que usam (`createSubscription`, `asaasWebhook`).

## 6. Frontend (dashboard.html)
- Trocar o **simulador fake** (`btn-stripe-checkout`, setTimeout) por chamada real
  a `createSubscription`. Form de checkout coleta **CPF/CNPJ** (e telefone opc.).
- Mostrar **QR Code PIX** (`pixQrCodeBase64`) + botão copiar (`pixCopiaECola`) +
  link `invoiceUrl`.
- Trocar **preço R$ 79,90 → R$ 10,00** em todos os lugares.
- Paywall: quando `statusAssinatura` ∈ {`overdue`,`canceled`} ou trial expirado,
  mostrar tela de pagamento e desabilitar ações de escrita. `onSnapshot` no doc
  da empresa: quando virar `active`, liberar automaticamente.
- Marca: o botão/aba dizem "Stripe" hoje → renomear para "Assinatura"/"Pagar com PIX".

## 7. Frontend (vendedor.html)
- Tratar o erro `ASSINATURA_INATIVA` de `awardPoints`/`deliverPrize` com mensagem
  amigável: "A assinatura desta loja está inativa. Avise o responsável."
