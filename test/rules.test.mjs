/**
 * rules.test.mjs — testes das Firestore Security Rules contra o emulador.
 *
 * Cobre a camada de AUTORIZAÇÃO: quem pode ler/escrever o quê. Valida em
 * especial as correções de billing:
 *   - P0: allow create de empresas NÃO pode forjar billing (status/trial/asaas)
 *   - P1: campos protegidos imutáveis no update (incl. cpfCnpj)
 *   - multi-tenant: cartões de uma loja não vazam para outra
 *
 * Roda com: npm run test:rules  (firebase emulators:exec --only firestore)
 */

import { readFileSync } from "node:fs";
import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { PORTS, HOST, daysFromNow } from "./helpers.mjs";

let testEnv;

const OWNER = "owner-uid-1";
const OTHER = "other-uid-2";
const CLIENT = "client-uid-3";
const ADMIN = "admin-uid-4";

// Payload válido de criação de empresa (espelha onboarding.html).
function empresaCreateValida(extra = {}) {
  return {
    nomeEmpresa: "Loja Teste",
    emailComercial: "loja@teste.com",
    donoUid: OWNER,
    dataCadastro: Timestamp.now(),
    statusAssinatura: "trial",
    trialEndDate: Timestamp.fromDate(daysFromNow(30)),
    linkUnicoCliente: "loja-teste",
    metaConfig: { metaPontos: 10, descriçãoPremio: "Café grátis" },
    visualConfig: { corFundo: "#fff", emoji: "☕" },
    ...extra,
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: HOST,
      port: PORTS.firestore,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// db autenticado como uid (com claims opcionais, ex.: email para vendedor)
function asUser(uid, token = {}) {
  return testEnv.authenticatedContext(uid, token).firestore();
}
function asAnon() {
  return testEnv.unauthenticatedContext().firestore();
}
// Semeia dados ignorando as regras (estado pré-existente).
function seed(fn) {
  return testEnv.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

describe("empresas — create (guarda de billing, P0)", () => {
  test("dono cria com trial válido → permitido", async () => {
    const db = asUser(OWNER);
    await assertSucceeds(setDoc(doc(db, "empresas", OWNER), empresaCreateValida()));
  });

  test("forjar statusAssinatura:'active' no create → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(
      setDoc(doc(db, "empresas", OWNER), empresaCreateValida({ statusAssinatura: "active" }))
    );
  });

  test("trialEndDate no ano 3000 → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(
      setDoc(
        doc(db, "empresas", OWNER),
        empresaCreateValida({ trialEndDate: Timestamp.fromDate(new Date("3000-01-01")) })
      )
    );
  });

  test("smuggle de asaasSubscriptionId no create → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(
      setDoc(doc(db, "empresas", OWNER), empresaCreateValida({ asaasSubscriptionId: "sub_x" }))
    );
  });

  test("totalPremiosEntregues != 0 no create → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(
      setDoc(doc(db, "empresas", OWNER), empresaCreateValida({ totalPremiosEntregues: 999 }))
    );
  });

  test("criar doc de OUTRO uid → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(setDoc(doc(db, "empresas", OTHER), empresaCreateValida({ donoUid: OTHER })));
  });
});

describe("empresas — update (campos protegidos, P0/P1)", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "empresas", OWNER), {
        ...empresaCreateValida(),
        statusAssinatura: "active",
        asaasCustomerId: "cus_real",
        asaasSubscriptionId: "sub_real",
        cpfCnpj: "12345678909",
        totalPremiosEntregues: 5,
      });
    });
  });

  test("dono edita campo não-billing (nomeEmpresa) → permitido", async () => {
    const db = asUser(OWNER);
    await assertSucceeds(updateDoc(doc(db, "empresas", OWNER), { nomeEmpresa: "Novo Nome" }));
  });

  test("dono tenta mudar statusAssinatura → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    // seed = "active"; tentar trocar para outro valor deve falhar.
    await assertFails(updateDoc(doc(db, "empresas", OWNER), { statusAssinatura: "trial" }));
  });

  test("dono tenta mudar trialEndDate → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(
      updateDoc(doc(db, "empresas", OWNER), { trialEndDate: Timestamp.fromDate(daysFromNow(999)) })
    );
  });

  test("dono tenta sobrescrever cpfCnpj (PII, P1) → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(updateDoc(doc(db, "empresas", OWNER), { cpfCnpj: "00000000000" }));
  });

  test("dono tenta inflar totalPremiosEntregues → BLOQUEADO", async () => {
    const db = asUser(OWNER);
    await assertFails(updateDoc(doc(db, "empresas", OWNER), { totalPremiosEntregues: 99999 }));
  });

  test("superadmin pode mudar statusAssinatura → permitido", async () => {
    await seed((db) => setDoc(doc(db, "superadmins", ADMIN), { role: "admin" }));
    const db = asUser(ADMIN);
    await assertSucceeds(updateDoc(doc(db, "empresas", OWNER), { statusAssinatura: "canceled" }));
  });
});

describe("empresas — read público (branding do cliente)", () => {
  beforeEach(async () => {
    await seed((db) => setDoc(doc(db, "empresas", OWNER), empresaCreateValida()));
  });
  test("anônimo lê empresa (branding) → permitido", async () => {
    const db = asAnon();
    await assertSucceeds(getDoc(doc(db, "empresas", OWNER)));
  });
});

describe("cartões empresas/{id}/clientes/{id} — auto-cadastro e isolamento", () => {
  beforeEach(async () => {
    await seed((db) => setDoc(doc(db, "empresas", OWNER), empresaCreateValida()));
  });

  test("cliente cria o próprio cartão zerado (0/0) → permitido", async () => {
    const db = asUser(CLIENT);
    await assertSucceeds(
      setDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), {
        clienteId: CLIENT,
        nome: "Fulano",
        email: "fulano@x.com",
        pontos: 0,
        premiosPendentes: 0,
      })
    );
  });

  test("cliente cria cartão já com pontos > 0 (fraude) → BLOQUEADO", async () => {
    const db = asUser(CLIENT);
    await assertFails(
      setDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), {
        clienteId: CLIENT,
        pontos: 5,
        premiosPendentes: 0,
      })
    );
  });

  test("cliente NÃO pode dar update no próprio cartão (só Functions) → BLOQUEADO", async () => {
    await seed((db) =>
      setDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), {
        clienteId: CLIENT,
        pontos: 0,
        premiosPendentes: 0,
      })
    );
    const db = asUser(CLIENT);
    await assertFails(updateDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), { pontos: 99 }));
  });

  test("dono lê cartão do próprio cliente → permitido", async () => {
    await seed((db) =>
      setDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), { clienteId: CLIENT, pontos: 3, premiosPendentes: 0 })
    );
    const db = asUser(OWNER);
    await assertSucceeds(getDoc(doc(db, "empresas", OWNER, "clientes", CLIENT)));
  });

  test("estranho NÃO lê cartão de cliente de outra loja → BLOQUEADO", async () => {
    await seed((db) =>
      setDoc(doc(db, "empresas", OWNER, "clientes", CLIENT), { clienteId: CLIENT, pontos: 3, premiosPendentes: 0 })
    );
    const db = asUser(OTHER);
    await assertFails(getDoc(doc(db, "empresas", OWNER, "clientes", CLIENT)));
  });
});

describe("clientes/{uid} — perfil do consumidor", () => {
  test("dono do perfil lê/escreve o próprio → permitido", async () => {
    const db = asUser(CLIENT);
    await assertSucceeds(setDoc(doc(db, "clientes", CLIENT), { nome: "X", email: "x@x.com" }));
  });
  test("outro usuário NÃO lê perfil alheio → BLOQUEADO", async () => {
    await seed((db) => setDoc(doc(db, "clientes", CLIENT), { nome: "X" }));
    const db = asUser(OTHER);
    await assertFails(getDoc(doc(db, "clientes", CLIENT)));
  });
});

describe("vendedores — criados só pelo dono", () => {
  test("dono cria vendedor vinculado à própria empresa → permitido", async () => {
    const db = asUser(OWNER);
    await assertSucceeds(
      setDoc(doc(db, "vendedores", `${OWNER}__vend`), {
        nomeVendedor: "Vend",
        email: "vend@x.com",
        empresaId: OWNER,
        ativo: true,
      })
    );
  });
  test("usuário aleatório NÃO cria vendedor para empresa alheia → BLOQUEADO", async () => {
    const db = asUser(OTHER);
    await assertFails(
      setDoc(doc(db, "vendedores", `${OWNER}__vend`), {
        nomeVendedor: "Vend",
        email: "vend@x.com",
        empresaId: OWNER,
        ativo: true,
      })
    );
  });
  test("vendedor lê o próprio doc pelo e-mail do token → permitido", async () => {
    await seed((db) =>
      setDoc(doc(db, "vendedores", `${OWNER}__vend`), { email: "vend@x.com", empresaId: OWNER, ativo: true })
    );
    const db = asUser("vend-auth-uid", { email: "vend@x.com" });
    await assertSucceeds(getDoc(doc(db, "vendedores", `${OWNER}__vend`)));
  });
});
