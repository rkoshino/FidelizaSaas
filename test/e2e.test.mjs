/**
 * e2e.test.mjs — testes ponta-a-ponta em browser real (Playwright/Chromium)
 * contra o Firebase Emulator Suite (Auth + Firestore + Functions).
 *
 * Cenários (cada um em contexto/sessão isolada):
 *   DONO (login.html → dashboard.html):
 *     1. Login por e-mail/senha → redireciona ao dashboard.
 *     2. Paywall aparece com assinatura em atraso (overdue).
 *     3. Reativar a assinatura (simulando o webhook) esconde o paywall EM
 *        TEMPO REAL (onSnapshot), sem reload.
 *     4. Recarregar com active não mostra paywall.
 *   VENDEDOR (vendedor.html):
 *     5. Login do atendente numa loja inativa → banner de loja inativa visível
 *        e botões de pontuação desabilitados (fix P1 do vendedor).
 *   CLIENTE (cliente.html):
 *     6. Branding público da loja renderiza por ?link=slug (sem login).
 *
 * As páginas falam com o emulador porque config.js/points-api.js conectam aos
 * emuladores quando localStorage.USE_EMULATOR === "1" (setado aqui).
 * Um static server local serve os arquivos (evita bug do hosting emulator).
 *
 * Roda com: npm run test:e2e   (--project=nice-dreamks-fidelidade)
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

// O browser carrega config.js, que tem o projectId REAL hardcoded. Para app,
// Admin SDK e emulador usarem o MESMO projeto, o e2e roda com esse id (ver
// script test:e2e: --project=nice-dreamks-fidelidade).
const E2E_PROJECT = "nice-dreamks-fidelidade";
const BASE = `http://${HOST}:${PORTS.hosting}`;

// --- Dono ---
const OWNER_UID = "owner-e2e";
const OWNER_EMAIL = "owner.e2e@teste.com";
const OWNER_PASS = "senha123";
// --- Vendedor (loja separada, inativa) ---
const VEND_EMPRESA = "loja-vend-e2e";
const VEND_EMAIL = "vend.e2e@teste.com";
const VEND_PASS = "senha123";
const VEND_TITULO = "Loja Vendedor E2E";
const VEND_LINK = "loja-vend-e2e";

let adminApp, admin, auth, browser, staticServer;

/* ---------- static server (serve o repo, MIME correto p/ ES modules) ------- */
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

/* ---------- helpers ---------- */
function emailSlug(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

async function seedEmpresa(id, status, extra = {}) {
  await admin.collection("empresas").doc(id).set(
    {
      nomeEmpresa: extra.nomeEmpresa || "Loja E2E",
      emailComercial: "loja@e2e.com",
      donoUid: id,
      statusAssinatura: status,
      trialEndDate: Timestamp.fromDate(daysFromNow(-1)), // trial expirado p/ não mascarar
      metaConfig: { metaPontos: 10, descriçãoPremio: "Brinde" },
      visualConfig: { corFundo: "#2A5A44", emoji: "☕", tituloPagina: "Loja E2E" },
      linkUnicoCliente: id,
      totalPremiosEntregues: 0,
      ...extra,
    },
    { merge: true }
  );
}

const setStatus = (id, status) =>
  admin.collection("empresas").doc(id).set({ statusAssinatura: status }, { merge: true });

// Cria um contexto/página isolado já em modo emulador.
async function newPage() {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("USE_EMULATOR", "1");
    } catch { /* ignore */ }
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERR:", e.message));
  return page;
}

before(async () => {
  await startStaticServer(process.cwd(), PORTS.hosting);

  adminApp = adminInit({ projectId: E2E_PROJECT }, "admin-e2e");
  admin = adminFs(adminApp);
  auth = adminAuth(adminApp);

  // --- Dono ---
  try { await auth.deleteUser(OWNER_UID); } catch { /* ainda não existe */ }
  await auth.createUser({ uid: OWNER_UID, email: OWNER_EMAIL, password: OWNER_PASS, emailVerified: true });
  await seedEmpresa(OWNER_UID, "overdue", { nomeEmpresa: "Loja Dono E2E" });
  await admin
    .collection("empresas").doc(OWNER_UID).collection("clientes").doc("cli-e2e")
    .set({ clienteId: "cli-e2e", nome: "Cli", email: "cli@x.com", pontos: 3, premiosPendentes: 0 });

  // --- Vendedor (loja inativa separada) ---
  const vend = await auth.createUser({ email: VEND_EMAIL, password: VEND_PASS, emailVerified: true });
  await seedEmpresa(VEND_EMPRESA, "overdue", {
    nomeEmpresa: "Loja Vendedor E2E",
    linkUnicoCliente: VEND_LINK,
    visualConfig: { corFundo: "#2A5A44", emoji: "🍔", tituloPagina: VEND_TITULO },
  });
  await admin
    .collection("vendedores").doc(`${VEND_EMPRESA}__${emailSlug(VEND_EMAIL)}`)
    .set({ nomeVendedor: "Atendente E2E", email: VEND_EMAIL, uid: vend.uid, empresaId: VEND_EMPRESA, ativo: true });

  browser = await chromium.launch();
});

after(async () => {
  if (browser) await browser.close();
  if (staticServer) await new Promise((r) => staticServer.close(r));
  if (adminApp) await adminDelete(adminApp);
});

describe("E2E dono — login, paywall e reativação em tempo real", () => {
  let page;
  before(async () => {
    await setStatus(OWNER_UID, "overdue");
    page = await newPage();
  });
  after(async () => { await page.context().close(); });

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
    await setStatus(OWNER_UID, "active"); // simula o webhook do Asaas
    await page.locator("#paywall-banner").waitFor({ state: "hidden", timeout: 20000 });
    await page.locator("#active-badge").waitFor({ state: "visible", timeout: 20000 });
  });

  test("com assinatura ativa, recarregar não mostra paywall", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#active-badge").waitFor({ state: "visible", timeout: 20000 });
    assert.equal(await page.locator("#paywall-banner").isVisible(), false);
  });
});

describe("E2E vendedor — loja inativa bloqueia a operação", () => {
  let page;
  before(async () => { page = await newPage(); });
  after(async () => { await page.context().close(); });

  test("atendente entra mas vê banner de inativa e botões desabilitados", async () => {
    await page.goto(`${BASE}/vendedor.html?empresa=${VEND_EMPRESA}`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", VEND_EMAIL);
    await page.fill("#password", VEND_PASS);
    await page.click("#btn-login");

    // Entrou no app (login validou o vínculo de atendente).
    await page.locator("#app-screen").waitFor({ state: "visible", timeout: 20000 });
    // Banner de loja inativa visível.
    await page.locator("#inativa-banner").waitFor({ state: "visible", timeout: 20000 });
    // Botões de pontuação travados (fix P1).
    assert.equal(await page.locator("#btn-start-scanner").isDisabled(), true);
    assert.equal(await page.locator("#btn-manual-submit").isDisabled(), true);
  });
});

describe("E2E cliente — branding público renderiza sem login", () => {
  let page;
  before(async () => { page = await newPage(); });
  after(async () => { await page.context().close(); });

  test("cliente.html?link=slug carrega o título da loja", async () => {
    await page.goto(`${BASE}/cliente.html?link=${VEND_LINK}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (titulo) => document.getElementById("app-title")?.textContent?.includes(titulo),
      VEND_TITULO,
      { timeout: 20000 }
    );
    const titulo = (await page.locator("#app-title").textContent()).trim();
    assert.equal(titulo, VEND_TITULO);
  });
});
