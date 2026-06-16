/**
 * billing.js — Tem Pontinho Billing (Asaas / PIX)
 *
 * Exporta:
 *   createSubscription (onCall)  — cria cliente+assinatura no Asaas, devolve QR PIX
 *   asaasWebhook       (onRequest) — recebe eventos do Asaas e atualiza statusAssinatura
 *
 * Secrets (Cloud Secret Manager):
 *   ASAAS_API_KEY        — chave de produção do Asaas (access_token)
 *   ASAAS_WEBHOOK_TOKEN  — token configurado no painel Asaas para validar webhooks
 */

"use strict";

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Secrets declarados — vinculados nas funções via opção `secrets`
const ASAAS_API_KEY = defineSecret("ASAAS_API_KEY");
const ASAAS_WEBHOOK_TOKEN = defineSecret("ASAAS_WEBHOOK_TOKEN");

const ASAAS_BASE = "https://api.asaas.com/v3";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  Helper: fetch contra a API Asaas                                   */
/* ------------------------------------------------------------------ */

/**
 * Faz uma requisição HTTP à API Asaas.
 * @param {string} path   Path a partir de ASAAS_BASE (ex.: "/customers")
 * @param {string} method Método HTTP (GET, POST, …)
 * @param {object|null} body  Payload JSON (opcional)
 * @param {string} apiKey    Valor do secret ASAAS_API_KEY
 * @returns {Promise<object>} Corpo da resposta JSON
 */
async function asaasRequest(path, method, body, apiKey) {
  const url = `${ASAAS_BASE}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawBody: text };
  }

  if (!res.ok) {
    const msg = (json.errors && json.errors[0] && json.errors[0].description)
      || json.description
      || `Asaas HTTP ${res.status}`;
    console.error(`[Asaas] ${method} ${path} → ${res.status}:`, text);
    throw new HttpsError("internal", `Asaas error: ${msg}`);
  }

  return json;
}

/* ------------------------------------------------------------------ */
/*  createSubscription                                                  */
/* ------------------------------------------------------------------ */

/**
 * Callable: createSubscription({ empresaId, cpfCnpj, telefone? })
 *
 * Auth: somente o dono (request.auth.uid === empresaId).
 *
 * Fluxo:
 *   1. Valida auth e argumentos.
 *   2. Cria (ou reaproveita) cliente no Asaas.
 *   3. Cria assinatura PIX R$ 10/mês.
 *   4. Busca a 1ª cobrança da assinatura.
 *   5. Busca o QR PIX da cobrança.
 *   6. Persiste asaasCustomerId, asaasSubscriptionId, cpfCnpj no doc da empresa.
 *   7. Retorna shape do contrato §3.
 */
exports.createSubscription = onCall(
  { secrets: [ASAAS_API_KEY] },
  async (request) => {
    /* --- Auth --- */
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login para continuar.");
    }
    const { empresaId, cpfCnpj, telefone } = request.data || {};

    if (request.auth.uid !== empresaId) {
      throw new HttpsError("permission-denied", "Apenas o dono da empresa pode criar assinatura.");
    }

    /* --- Valida argumentos --- */
    if (typeof empresaId !== "string" || !empresaId) {
      throw new HttpsError("invalid-argument", "empresaId inválido.");
    }
    if (typeof cpfCnpj !== "string" || !cpfCnpj) {
      throw new HttpsError("invalid-argument", "cpfCnpj é obrigatório.");
    }

    const apiKey = ASAAS_API_KEY.value();
    const db = getFirestore();

    /* --- Lê doc da empresa --- */
    const empRef = db.collection("empresas").doc(empresaId);
    const empSnap = await empRef.get();
    if (!empSnap.exists) {
      throw new HttpsError("not-found", "Empresa não encontrada.");
    }
    const empData = empSnap.data();

    /* --- 1. Cria ou reutiliza cliente Asaas --- */
    let asaasCustomerId = empData.asaasCustomerId || null;

    if (!asaasCustomerId) {
      const customerPayload = {
        name: empData.nomeEmpresa || "Empresa sem nome",
        email: empData.emailComercial || "",
        cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      };
      if (telefone && typeof telefone === "string") {
        customerPayload.mobilePhone = telefone.replace(/\D/g, "");
      }
      const customer = await asaasRequest("/customers", "POST", customerPayload, apiKey);
      asaasCustomerId = customer.id;
    }

    /* --- 2. Cria assinatura PIX --- */
    // nextDueDate = hoje (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const nextDueDate = `${yyyy}-${mm}-${dd}`;

    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: "PIX",
      value: 10.0,
      cycle: "MONTHLY",
      nextDueDate,
      description: "Tem Pontinho - Plano Mensal",
    };

    const subscription = await asaasRequest("/subscriptions", "POST", subscriptionPayload, apiKey);
    const asaasSubscriptionId = subscription.id;

    /* --- 3. Busca a 1ª cobrança da assinatura (com retry) ---
     * O Asaas pode gerar a cobrança da assinatura de forma assíncrona; a
     * primeira chamada pode voltar vazia. Tentamos algumas vezes com pausa. */
    let firstPayment = null;
    for (let tentativa = 0; tentativa < 5 && !firstPayment; tentativa++) {
      if (tentativa > 0) await sleep(1200);
      const paymentsResp = await asaasRequest(
        `/subscriptions/${asaasSubscriptionId}/payments`,
        "GET",
        null,
        apiKey
      );
      const payments = paymentsResp.data || [];
      if (payments.length) firstPayment = payments[0];
    }
    if (!firstPayment) {
      throw new HttpsError("unavailable", "A cobrança PIX ainda está sendo gerada. Tente novamente em alguns segundos.");
    }
    const paymentId = firstPayment.id;
    const invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || null;

    /* --- 4. Busca QR PIX (com retry: o QR pode não estar pronto de imediato) --- */
    let pixCopiaECola = null;
    let pixQrCodeBase64 = null;
    for (let tentativa = 0; tentativa < 5 && !pixCopiaECola; tentativa++) {
      if (tentativa > 0) await sleep(1200);
      const pixResp = await asaasRequest(
        `/payments/${paymentId}/pixQrCode`,
        "GET",
        null,
        apiKey
      );
      pixCopiaECola = pixResp.payload || null;
      pixQrCodeBase64 = pixResp.encodedImage || null;
    }

    /* --- 5. Persiste no Firestore --- */
    await empRef.update({
      asaasCustomerId,
      asaasSubscriptionId,
      cpfCnpj: cpfCnpj.replace(/\D/g, ""),
    });

    /* --- 6. Retorna shape do contrato §3 --- */
    return {
      status: subscription.status,
      subscriptionId: asaasSubscriptionId,
      value: 10.0,
      pixCopiaECola,
      pixQrCodeBase64,
      invoiceUrl,
    };
  }
);

/* ------------------------------------------------------------------ */
/*  asaasWebhook                                                        */
/* ------------------------------------------------------------------ */

/**
 * HTTP webhook recebido do Asaas.
 *
 * Valida o header `asaas-access-token` contra o secret ASAAS_WEBHOOK_TOKEN.
 * Mapeia empresa por asaasSubscriptionId ou asaasCustomerId.
 * Atualiza statusAssinatura conforme o evento.
 * Responde 200 o mais rápido possível.
 */
exports.asaasWebhook = onRequest(
  { secrets: [ASAAS_WEBHOOK_TOKEN] },
  async (req, res) => {
    /* --- Validação do token --- */
    const receivedToken = req.headers["asaas-access-token"];
    const expectedToken = ASAAS_WEBHOOK_TOKEN.value();

    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn("[asaasWebhook] Token inválido ou ausente.");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body || {};
    const event = body.event || "";
    const payment = body.payment || {};

    console.log(`[asaasWebhook] Evento: ${event}, paymentId: ${payment.id}`);

    /* --- Resolve a empresa --- */
    let empresaRef = null;
    try {
      const db = getFirestore();

      // Tenta por asaasSubscriptionId primeiro
      if (payment.subscription) {
        const q1 = await db
          .collection("empresas")
          .where("asaasSubscriptionId", "==", payment.subscription)
          .limit(1)
          .get();
        if (!q1.empty) empresaRef = q1.docs[0].ref;
      }

      // Fallback: por asaasCustomerId
      if (!empresaRef && payment.customer) {
        const q2 = await db
          .collection("empresas")
          .where("asaasCustomerId", "==", payment.customer)
          .limit(1)
          .get();
        if (!q2.empty) empresaRef = q2.docs[0].ref;
      }

      if (!empresaRef) {
        console.warn("[asaasWebhook] Empresa não encontrada para o evento.", { event, payment });
        // Mesmo sem empresa, respondemos 200 para o Asaas não reenviar indefinidamente
        res.status(200).json({ ok: true, warning: "empresa_nao_encontrada" });
        return;
      }

      /* --- Mapeia evento → statusAssinatura --- */
      const updatePayload = {};

      if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
        updatePayload.statusAssinatura = "active";

        // proximoVencimento: dueDate da cobrança + 1 mês (se disponível)
        if (payment.dueDate) {
          try {
            const due = new Date(payment.dueDate);
            due.setMonth(due.getMonth() + 1);
            updatePayload.proximoVencimento = Timestamp.fromDate(due);
          } catch (err) {
            console.warn("[asaasWebhook] Erro ao calcular proximoVencimento:", err);
          }
        }
      } else if (event === "PAYMENT_OVERDUE") {
        updatePayload.statusAssinatura = "overdue";
      } else if (
        event === "SUBSCRIPTION_DELETED" ||
        event === "PAYMENT_DELETED" ||
        event === "SUBSCRIPTION_INACTIVATED"
      ) {
        updatePayload.statusAssinatura = "canceled";
      } else {
        // Evento não mapeado — ignora silenciosamente
        console.log(`[asaasWebhook] Evento não mapeado, ignorando: ${event}`);
        res.status(200).json({ ok: true, info: "evento_nao_mapeado" });
        return;
      }

      await empresaRef.update(updatePayload);
      console.log(`[asaasWebhook] Empresa atualizada:`, updatePayload);
    } catch (err) {
      // Erro interno transitório (ex.: falha ao gravar no Firestore). Responde
      // 500 de propósito: o Asaas reenfileira e reenvia o evento, então um
      // pagamento confirmado não se perde se a gravação falhar momentaneamente.
      console.error("[asaasWebhook] Erro interno:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
      return;
    }

    res.status(200).json({ ok: true });
  }
);
