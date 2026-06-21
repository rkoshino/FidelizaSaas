/**
 * e2e.test.mjs — testes ponta-a-ponta em browser real (Playwright/Chromium)
 * contra o Firebase Emulator Suite (Auth + Firestore + Functions + Hosting).
 *
 * Prova, no navegador de verdade, o fluxo dono:
 *   1. Login por e-mail/senha (login.html) → redireciona ao dashboard.
 *   2. Paywall aparece quando a assinatura está em atraso (overdue).
 *   3. Reativar a assinatura (via Admin SDK, simulando o webhook) esconde o
 *      paywall EM TEMPO REAL (onSnapshot) — sem reload.
 *   4. Com assinatura ativa, ao recarregar, o paywall não aparece e o badge
 *      "ativo" é exibido.
 *
 * As páginas falam com o emulador porque config.js conecta aos emuladores
 * quando localStorage.USE_EMULATOR === "1" (setado aqui via addInitScript).
 *
 * Roda com: npm run test:e2e
 */

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

import { initializeApp as adminInit, deleteApp as adminDelete } from "firebase-admin/app";
import { getFirestore as adminFs, Timestamp } from "firebase-admin/firestore";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { chromium } from "playwright";

import { PORTS, HOST, daysFromNow, forceEmulatorEnv } from "./helpers.mjs";

forceEmulatorEnv();

// O browser carrega config.js, que tem o projectId REAL hardcoded. Para o app,
// o Admin SDK e o emulador falarem do MESMO projeto, o e2e usa esse id (e o
// script test:e2e roda o emulador com --project=nice-dreamks-fidelidade).
const E2E_PROJECT = "nice-dreamks-fidelidade";

const BASE = `http://${HOST}:${PORTS.hosting || 5050}`;
const OWNER_UID = "owner-e2e";
const OWNER_EMAIL = "owner.e2e@teste.com";
const OWNER_PASS = "senha123";
const CLIENTE = "cliente-e2e";

let adminApp, admin, auth, browser, context, page, staticServer;

// Static server próprio (evita o bug do superstatic no hosting emulator).
// Serve os arquivos do repo a partir do cwd, com MIME correto p/ ES modules.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
function startStaticServer(root, port) {
  return new Promise((resolve) => {
    staticServer = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
        const file = join(root, rel || "index.html");
        const body = await readFile(file);
        res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
      }
    });
    staticServer.listen(port, HOST, resolve);
  });
}

async function setEmpresaStatus(status, extra = {}) {
  await admin.collection("empresas").doc(OWNER_UID).set(
    {
      nomeEmpresa: "Loja E2E",
      emailComercial: OWNER_EMAIL,
      donoUid: OWNER_UID,
      statusAssinatura: status,
      trialEndDate: Timestamp.fromDate(daysFromNow(-1)), // trial já expirado p/ não mascarar
      metaConfig: { metaPontos: 10, descriçãoPremio: "Brinde" },
      visualConfig: { corFundo: "#F4EFE6", emoji: "☕", tituloPagina: "Loja E2E" },
      linkUnicoCliente: "loja-e2e",
      totalPremiosEntregues: 0,
      ...extra,
    },
    { merge: true }
  );
}

before(async () => {
  await startStaticServer(process.cwd(), PORTS.hosting);

  adminApp = adminInit({ projectId: E2E_PROJECT }, "admin-e2e");
  admin = adminFs(adminApp);
  auth = adminAuth(adminApp);

  // Usuário dono no Auth emulator com uid fixo == empresaId, e-mail verificado.
  try {
    await auth.deleteUser(OWNER_UID);
  } catch { /* ainda não existe */ }
  await auth.createUser({
    uid: OWNER_UID,
    email: OWNER_EMAIL,
    password: OWNER_PASS,
    emailVerified: true,
  });

  // Empresa começa EM ATRASO (paywall deve aparecer).
  await setEmpresaStatus("overdue");
  // Um cartão de cliente, para o dashboard ter dados.
  await admin
    .collection("empresas")
    .doc(OWNER_UID)
    .collection("clientes")
    .doc(CLIENTE)
    .set({ clienteId: CLIENTE, nome: "Cli E2E", email: "cli.e2e@x.com", pontos: 3, premiosPendentes: 0 });

  browser = await chromium.launch();
  context = await browser.newContext();
  // Liga o modo emulador ANTES de qualquer script da página rodar.
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("USE_EMULATOR", "1");
    } catch { /* ignore */ }
  });
  page = await context.newPage();
  // Erros de página ajudam a diagnosticar quebras de JS nas telas.
  page.on("pageerror", (e) => console.log("PAGEERR:", e.message));
});

after(async () => {
  if (browser) await browser.close();
  if (staticServer) await new Promise((r) => staticServer.close(r));
  if (adminApp) await adminDelete(adminApp);
});

describe("E2E dono — login, paywall e reativação em tempo real", () => {
  test("login por e-mail/senha redireciona para o dashboard", async () => {
    await page.goto(`${BASE}/login.html`, { waitUntil: "domcontentloaded" });
    await page.fill("#owner-email", OWNER_EMAIL);
    await page.fill("#owner-password", OWNER_PASS);
    await page.click("#btn-submit-login");
    await page.waitForURL(/dashboard\.html/, { timeout: 20000 });
    assert.match(page.url(), /dashboard\.html/);
  });

  test("paywall aparece com assinatura em atraso (overdue)", async () => {
    await page.locator("#paywall-banner").waitFor({ state: "visible", timeout: 20000 });
    const motivo = (await page.locator("#paywall-motivo").innerText()).trim();
    assert.equal(motivo, "Pagamento em atraso");
  });

  test("reativar a assinatura esconde o paywall em tempo real (onSnapshot)", async () => {
    // Simula o webhook do Asaas confirmando o pagamento.
    await setEmpresaStatus("active");
    await page.locator("#paywall-banner").waitFor({ state: "hidden", timeout: 20000 });
    // Badge "ativo" deve aparecer.
    await page.locator("#active-badge").waitFor({ state: "visible", timeout: 20000 });
  });

  test("com assinatura ativa, recarregar não mostra paywall", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    // dá um tempo para o onSnapshot processar e mantém o paywall escondido
    await page.locator("#active-badge").waitFor({ state: "visible", timeout: 20000 });
    assert.equal(await page.locator("#paywall-banner").isVisible(), false);
  });
});
