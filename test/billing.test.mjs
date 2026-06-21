/**
 * billing.test.mjs — testes de billing (Asaas/PIX) contra o emulador.
 *
 * Um MOCK do Asaas sobe na porta 9100 (billing.js aponta para lá via
 * ASAAS_BASE_URL em functions/.env.demo-tempontinho). Assim testamos sem
 * tocar a API real do Asaas nem precisar de chave de sandbox.
 *
 * Cobre:
 *   createSubscription:
 *     - 1ª chamada cria assinatura e devolve PIX
 *     - 2ª chamada (idempotência, P0): NÃO cria assinatura nova
 *     - após cancelamento: cria assinatura nova (reassinatura)
 *   asaasWebhook:
 *     - token inválido → 401 (sem alterar status)
 *     - PAYMENT_CONFIRMED → active + proximoVencimento (nextDueDate autoritativo)
 *     - PAYMENT_OVERDUE → overdue
 *     - PAYMENT_REFUNDED → canceled (P1)
 *     - evento desconhecido → 200 sem alterar
 *
 * Roda com: npm run test:billing
 */

import { createServer } from "node:http";
import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";

import { initializeApp as adminInit, deleteApp as adminDelete } from "firebase-admin/app";
import { getFirestore as adminFs, Timestamp } from "firebase-admin/firestore";

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

import {
  PROJECT_ID,
  REGION,
  PORTS,
  HOST,
  daysFromNow,
  functionUrl,
  forceEmulatorEnv,
} from "./helpers.mjs";

forceEmulatorEnv();

let adminApp, admin, clientApp, fns, mockServer;
let ownerId;

// --- Mock do Asaas ---------------------------------------------------------
const mock = {
  requests: [], // log de { method, path }
  reset() {
    this.requests = [];
  },
  count(method, pathPrefix) {
    return this.requests.filter((r) => r.method === method && r.path.startsWith(pathPrefix)).length;
  },
};

function startMockAsaas() {
  return new Promise((resolve) => {
    mockServer = createServer((req, res) => {
      const { method, url } = req;
      mock.requests.push({ method, path: url });
      const json = (obj) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      // Rotas usadas por billing.js
      if (method === "POST" && url === "/customers") return json({ id: "cus_mock" });
      if (method === "POST" && url === "/subscriptions")
        return json({ id: "sub_mock", status: "ACTIVE" });
      if (method === "GET" && /^\/subscriptions\/[^/]+\/payments/.test(url))
        return json({ data: [{ id: "pay_mock", status: "PENDING", invoiceUrl: "http://inv/mock" }] });
      if (method === "GET" && /^\/subscriptions\/[^/]+$/.test(url))
        return json({ id: "sub_mock", status: "ACTIVE", nextDueDate: "2026-08-15" });
      if (method === "GET" && /^\/payments\/[^/]+\/pixQrCode/.test(url))
        return json({ payload: "PIXCOPIACOLA123", encodedImage: "QkFTRTY0SU1H" });
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ errors: [{ description: "mock: rota não mapeada" }] }));
    });
    mockServer.listen(PORTS.asaasMock, HOST, resolve);
  });
}

const callAs = (name, payload) => httpsCallable(fns, name)(payload).then((r) => r.data);

async function seedEmpresa(id, fields = {}) {
  await admin.collection("empresas").doc(id).set({
    nomeEmpresa: "Loja Billing",
    emailComercial: "loja@billing.com",
    donoUid: id,
    statusAssinatura: "trial",
    trialEndDate: Timestamp.fromDate(daysFromNow(30)),
    metaConfig: { metaPontos: 10, descriçãoPremio: "x" },
    visualConfig: {},
    ...fields,
  });
}

function empresaData(id) {
  return admin.collection("empresas").doc(id).get().then((s) => s.data());
}

async function postWebhook(body, token = "test-webhook-token") {
  const res = await fetch(functionUrl("asaasWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "asaas-access-token": token },
    body: JSON.stringify(body),
  });
  return res;
}

before(async () => {
  await startMockAsaas();

  adminApp = adminInit({ projectId: PROJECT_ID }, "admin-billing");
  admin = adminFs(adminApp);

  clientApp = initializeApp({ apiKey: "fake-api-key", projectId: PROJECT_ID }, "client-billing");
  const auth = getAuth(clientApp);
  connectAuthEmulator(auth, `http://${HOST}:${PORTS.auth}`, { disableWarnings: true });
  fns = getFunctions(clientApp, REGION);
  connectFunctionsEmulator(fns, HOST, PORTS.functions);

  const cred = await createUserWithEmailAndPassword(auth, `dono.billing+${Date.now()}@teste.com`, "senha123");
  ownerId = cred.user.uid;
});

after(async () => {
  if (adminApp) await adminDelete(adminApp);
  if (mockServer) await new Promise((r) => mockServer.close(r));
});

describe("createSubscription — idempotência (P0)", () => {
  beforeEach(() => mock.reset());

  test("1ª chamada cria assinatura e retorna PIX", async () => {
    await seedEmpresa(ownerId, { statusAssinatura: "trial" });
    const r = await callAs("createSubscription", { empresaId: ownerId, cpfCnpj: "12345678909" });
    assert.equal(r.subscriptionId, "sub_mock");
    assert.equal(r.pixCopiaECola, "PIXCOPIACOLA123");
    assert.equal(r.value, 19.9);
    assert.equal(mock.count("POST", "/subscriptions"), 1, "deve criar exatamente 1 assinatura");
    // IDs persistidos no doc (evita estado órfão)
    const d = await empresaData(ownerId);
    assert.equal(d.asaasSubscriptionId, "sub_mock");
    assert.equal(d.asaasCustomerId, "cus_mock");
  });

  test("2ª chamada NÃO cria assinatura nova (reaproveita)", async () => {
    // doc já tem asaasSubscriptionId (da etapa anterior / seed)
    await seedEmpresa(ownerId, { statusAssinatura: "active", asaasSubscriptionId: "sub_mock", asaasCustomerId: "cus_mock" });
    const r = await callAs("createSubscription", { empresaId: ownerId, cpfCnpj: "12345678909" });
    assert.equal(r.subscriptionId, "sub_mock");
    assert.equal(r.pixCopiaECola, "PIXCOPIACOLA123");
    assert.equal(mock.count("POST", "/subscriptions"), 0, "NÃO deve criar assinatura nova");
    assert.equal(mock.count("POST", "/customers"), 0, "NÃO deve criar cliente novo");
  });

  test("após cancelamento, cria assinatura nova (reassinatura)", async () => {
    await seedEmpresa(ownerId, { statusAssinatura: "canceled", asaasSubscriptionId: "sub_old", asaasCustomerId: "cus_mock" });
    await callAs("createSubscription", { empresaId: ownerId, cpfCnpj: "12345678909" });
    assert.equal(mock.count("POST", "/subscriptions"), 1, "deve criar assinatura nova ao reassinar");
  });
});

describe("asaasWebhook — autenticação e mapeamento de status", () => {
  const EMP = "emp-webhook";

  beforeEach(async () => {
    mock.reset();
    await seedEmpresa(EMP, { statusAssinatura: "trial", asaasSubscriptionId: "sub_wh", asaasCustomerId: "cus_wh" });
  });

  test("token inválido → 401 e status inalterado", async () => {
    const res = await postWebhook(
      { event: "PAYMENT_CONFIRMED", payment: { subscription: "sub_wh", id: "p1", dueDate: "2026-07-10" } },
      "token-errado"
    );
    assert.equal(res.status, 401);
    const d = await empresaData(EMP);
    assert.equal(d.statusAssinatura, "trial");
  });

  test("PAYMENT_CONFIRMED → active + proximoVencimento (nextDueDate autoritativo)", async () => {
    const res = await postWebhook({
      event: "PAYMENT_CONFIRMED",
      payment: { subscription: "sub_wh", id: "p1", dueDate: "2026-07-10" },
    });
    assert.equal(res.status, 200);
    const d = await empresaData(EMP);
    assert.equal(d.statusAssinatura, "active");
    assert.ok(d.proximoVencimento, "proximoVencimento deve ser gravado");
    assert.equal(d.proximoVencimento.toDate().getUTCFullYear(), 2026);
  });

  test("PAYMENT_OVERDUE → overdue", async () => {
    const res = await postWebhook({ event: "PAYMENT_OVERDUE", payment: { subscription: "sub_wh", id: "p2" } });
    assert.equal(res.status, 200);
    assert.equal((await empresaData(EMP)).statusAssinatura, "overdue");
  });

  test("PAYMENT_REFUNDED → canceled (P1)", async () => {
    const res = await postWebhook({ event: "PAYMENT_REFUNDED", payment: { subscription: "sub_wh", id: "p3" } });
    assert.equal(res.status, 200);
    assert.equal((await empresaData(EMP)).statusAssinatura, "canceled");
  });

  test("evento desconhecido → 200 e status inalterado", async () => {
    const res = await postWebhook({ event: "PAYMENT_ANYTHING_ELSE", payment: { subscription: "sub_wh", id: "p4" } });
    assert.equal(res.status, 200);
    assert.equal((await empresaData(EMP)).statusAssinatura, "trial");
  });
});
