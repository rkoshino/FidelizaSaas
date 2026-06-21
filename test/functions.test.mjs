/**
 * functions.test.mjs — testes de integração das Cloud Functions de pontos,
 * rodando contra o emulador (Auth + Firestore + Functions).
 *
 * Cobre o ciclo de pontos e o ENFORCEMENT de assinatura (assertAssinaturaAtiva):
 *   - awardPoints: crédito, conclusão de cartão (sobra), trava por prêmio pendente
 *   - deliverPrize: entrega + carry-over da sobra
 *   - setPoints / removePoint: ajustes
 *   - BLOQUEIO ASSINATURA_INATIVA em overdue/canceled/trial-expirado (award,
 *     deliver, setPoints, removePoint — inclui os P1 que adicionamos)
 *
 * Autenticação: criamos o usuário no Auth emulator; o uid gerado vira o
 * empresaId (dono). Assim o token tem auth.uid === empresaId (papel "dono").
 *
 * Roda com: npm run test:functions
 */

import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";

import { initializeApp as adminInit, deleteApp as adminDelete } from "firebase-admin/app";
import { getFirestore as adminFs, Timestamp } from "firebase-admin/firestore";

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

import { PROJECT_ID, REGION, PORTS, HOST, daysFromNow, forceEmulatorEnv } from "./helpers.mjs";

forceEmulatorEnv();

let adminApp, admin, clientApp, fns;
let empresaId; // === uid do dono
const CLIENTE = "cliente-pontos-1";

// Cria/atualiza a empresa com um dado statusAssinatura (e meta 10).
async function seedEmpresa(status = "active", extra = {}) {
  await admin.collection("empresas").doc(empresaId).set({
    nomeEmpresa: "Loja Pontos",
    emailComercial: "loja@pontos.com",
    donoUid: empresaId,
    statusAssinatura: status,
    trialEndDate: Timestamp.fromDate(daysFromNow(30)),
    metaConfig: { metaPontos: 10, descriçãoPremio: "Brinde" },
    visualConfig: {},
    totalPremiosEntregues: 0,
    ...extra,
  });
}

// Cria/atualiza o cartão do cliente.
async function seedCartao(data) {
  await admin
    .collection("empresas")
    .doc(empresaId)
    .collection("clientes")
    .doc(CLIENTE)
    .set({ clienteId: CLIENTE, nome: "Cli", email: "cli@x.com", pontos: 0, premiosPendentes: 0, ...data });
}

function getCartao() {
  return admin.collection("empresas").doc(empresaId).collection("clientes").doc(CLIENTE).get();
}

const call = (name, payload) => httpsCallable(fns, name)(payload).then((r) => r.data);

// Asserta que a callable rejeita e que a mensagem inclui um trecho.
async function assertRejeita(promise, trecho) {
  await assert.rejects(promise, (err) => {
    const msg = `${err.code || ""} ${err.message || ""}`;
    assert.ok(msg.includes(trecho), `esperava "${trecho}" no erro, veio: ${msg}`);
    return true;
  });
}

before(async () => {
  adminApp = adminInit({ projectId: PROJECT_ID }, "admin-fns");
  admin = adminFs(adminApp);

  clientApp = initializeApp({ apiKey: "fake-api-key", projectId: PROJECT_ID }, "client-fns");
  const auth = getAuth(clientApp);
  connectAuthEmulator(auth, `http://${HOST}:${PORTS.auth}`, { disableWarnings: true });
  fns = getFunctions(clientApp, REGION);
  connectFunctionsEmulator(fns, HOST, PORTS.functions);

  // Cria o dono no Auth emulator; o uid vira o empresaId.
  const cred = await createUserWithEmailAndPassword(auth, `dono+${Date.now()}@teste.com`, "senha123");
  empresaId = cred.user.uid;
});

after(async () => {
  if (adminApp) await adminDelete(adminApp);
});

describe("awardPoints", () => {
  beforeEach(async () => {
    await seedEmpresa("active");
    await seedCartao({ pontos: 0, premiosPendentes: 0 });
  });

  test("credita pontos abaixo da meta", async () => {
    const r = await call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 3 });
    assert.equal(r.pontos, 3);
    assert.equal(r.premiosGanhos, 0);
  });

  test("conclui o cartão e guarda a sobra (8 + 3, meta 10 → cheio + sobra 1)", async () => {
    await seedCartao({ pontos: 8, premiosPendentes: 0 });
    const r = await call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 3 });
    assert.equal(r.pontos, 10);
    assert.equal(r.premiosGanhos, 1);
    assert.equal(r.sobra, 1);
    const snap = await getCartao();
    assert.equal(snap.data().pontosSobra, 1);
    assert.equal(snap.data().premiosPendentes, 1);
  });

  test("trava: não pontua com prêmio pendente", async () => {
    await seedCartao({ pontos: 10, premiosPendentes: 1 });
    await assertRejeita(call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 1 }), "PREMIO_PENDENTE");
  });
});

describe("enforcement de assinatura (assertAssinaturaAtiva)", () => {
  beforeEach(async () => {
    await seedCartao({ pontos: 2, premiosPendentes: 0 });
  });

  for (const status of ["overdue", "canceled"]) {
    test(`awardPoints BLOQUEADO com status ${status}`, async () => {
      await seedEmpresa(status);
      await assertRejeita(call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 1 }), "ASSINATURA_INATIVA");
    });
  }

  test("awardPoints BLOQUEADO com trial expirado", async () => {
    await seedEmpresa("trial", { trialEndDate: Timestamp.fromDate(daysFromNow(-1)) });
    await assertRejeita(call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 1 }), "ASSINATURA_INATIVA");
  });

  test("awardPoints LIBERADO em trial válido", async () => {
    await seedEmpresa("trial", { trialEndDate: Timestamp.fromDate(daysFromNow(5)) });
    const r = await call("awardPoints", { empresaId, clienteId: CLIENTE, qtd: 1 });
    assert.equal(r.pontos, 3);
  });

  test("setPoints BLOQUEADO com status canceled (P1)", async () => {
    await seedEmpresa("canceled");
    await assertRejeita(
      call("setPoints", { empresaId, clienteId: CLIENTE, pontos: 5, motivo: "x" }),
      "ASSINATURA_INATIVA"
    );
  });

  test("removePoint BLOQUEADO com status overdue (P1)", async () => {
    await seedEmpresa("overdue");
    await assertRejeita(call("removePoint", { empresaId, clienteId: CLIENTE }), "ASSINATURA_INATIVA");
  });
});

describe("deliverPrize + setPoints + removePoint (loja ativa)", () => {
  beforeEach(async () => {
    await seedEmpresa("active");
  });

  test("deliverPrize: entrega 1 prêmio e injeta a sobra no novo cartão", async () => {
    await seedCartao({ pontos: 10, premiosPendentes: 1, pontosSobra: 2 });
    const r = await call("deliverPrize", { empresaId, clienteId: CLIENTE });
    assert.equal(r.premiosPendentes, 0);
    assert.equal(r.pontos, 2); // carry-over da sobra
    const emp = await admin.collection("empresas").doc(empresaId).get();
    assert.equal(emp.data().totalPremiosEntregues, 1);
  });

  test("deliverPrize sem prêmio pendente → rejeita", async () => {
    await seedCartao({ pontos: 3, premiosPendentes: 0 });
    await assertRejeita(call("deliverPrize", { empresaId, clienteId: CLIENTE }), "prêmios a entregar");
  });

  test("setPoints ajusta a pontuação", async () => {
    await seedCartao({ pontos: 1, premiosPendentes: 0 });
    const r = await call("setPoints", { empresaId, clienteId: CLIENTE, pontos: 7, motivo: "ajuste" });
    assert.equal(r.pontos, 7);
  });

  test("removePoint decrementa (piso 0)", async () => {
    await seedCartao({ pontos: 0, premiosPendentes: 0 });
    const r = await call("removePoint", { empresaId, clienteId: CLIENTE });
    assert.equal(r.pontos, 0);
  });
});
