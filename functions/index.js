/**
 * Tem Pontinho — Cloud Functions (lógica de pontos server-side).
 *
 * Toda mutação de pontos/prêmios passa por aqui. O client NUNCA escreve
 * `pontos`/`premiosPendentes` direto no Firestore (ver firestore.rules).
 * Isso fecha duas falhas críticas:
 *   1. Cliente dar pontos a si mesmo (fraude).
 *   2. Lojista A ler/editar clientes do Lojista B (vazamento PII / LGPD).
 *
 * Modelo de dados (multi-tenant, partição por empresa):
 *   empresas/{empresaId}/clientes/{clienteId}  -> { nome, email, pontos, premiosPendentes, atualizadoEm }
 *   empresas/{empresaId}/clientes/{clienteId}/logs/{logId} -> { tipo, qtd, vendedor, motivo, data }
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");



initializeApp();
const db = getFirestore();

// Região Brasil. App Check temporariamente NÃO obrigatório para a fase de
// teste (ainda não há site key reCAPTCHA configurado em config.js).
// PENDÊNCIA PRÉ-LANÇAMENTO: registrar reCAPTCHA v3, preencher APP_CHECK_SITE_KEY
// em config.js e voltar enforceAppCheck para true.
setGlobalOptions({ region: "southamerica-east1", enforceAppCheck: false });

const QTD_MAX = 50; // teto de pontos por scan (anti-abuso de client adulterado)

/* ----------------------------- Helpers ----------------------------- */

// Garante que o chamador é o DONO da empresa ou um VENDEDOR ativo dela.
// Vendedor é resolvido pelo e-mail do token (a coleção `vendedores` é
// chaveada por e-mail-slug, então a validação tem de ser server-side).
async function assertAutorizado(request, empresaId) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");

  // Dono da empresa.
  if (auth.uid === empresaId) return { papel: "dono", nome: "Dono", uid: auth.uid };

  // Vendedor: precisa existir um doc em `vendedores` com o e-mail do token
  // E vinculado a esta empresa.
  const email = (auth.token && auth.token.email ? auth.token.email : "").toLowerCase();
  if (email) {
    const snap = await db
      .collection("vendedores")
      .where("email", "==", email)
      .where("empresaId", "==", empresaId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const v = snap.docs[0].data();
      if (v.ativo !== false) {
        return { papel: "vendedor", nome: v.nomeVendedor || email, uid: snap.docs[0].id };
      }
    }
  }
  throw new HttpsError("permission-denied", "Você não tem acesso a esta empresa.");
}

async function lerMeta(empresaId) {
  const empSnap = await db.collection("empresas").doc(empresaId).get();
  if (!empSnap.exists) throw new HttpsError("not-found", "Empresa não encontrada.");
  const emp = empSnap.data();
  const meta = Number(emp.metaConfig && emp.metaConfig.metaPontos);
  if (!Number.isFinite(meta) || meta <= 0) {
    throw new HttpsError("failed-precondition", "Meta de pontos da empresa está inválida.");
  }
  return { meta: Math.floor(meta), premio: (emp.metaConfig && emp.metaConfig.descriçãoPremio) || "Prêmio" };
}

function validarIds(empresaId, clienteId) {
  if (typeof empresaId !== "string" || !empresaId) throw new HttpsError("invalid-argument", "empresaId inválido.");
  if (typeof clienteId !== "string" || !clienteId) throw new HttpsError("invalid-argument", "clienteId inválido.");
}

function cartaoRef(empresaId, clienteId) {
  return db.collection("empresas").doc(empresaId).collection("clientes").doc(clienteId);
}

function emailSlug(email) {
  return String(email || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * assertAssinaturaAtiva(empresaId)
 *
 * Verifica se a empresa está autorizada a operar pontos (contrato §2):
 *   - statusAssinatura === "active"
 *   - OU statusAssinatura === "trial" E trialEndDate > agora
 *
 * Se bloqueada, lança HttpsError("failed-precondition", "ASSINATURA_INATIVA").
 * Deve ser chamada dentro de awardPoints e deliverPrize após assertAutorizado.
 */
async function assertAssinaturaAtiva(empresaId) {
  const empSnap = await db.collection("empresas").doc(empresaId).get();
  if (!empSnap.exists) throw new HttpsError("not-found", "Empresa não encontrada.");
  const emp = empSnap.data();
  const status = emp.statusAssinatura || "trial";

  if (status === "active") return; // liberada

  if (status === "trial") {
    const trialEnd = emp.trialEndDate; // Firestore Timestamp ou null
    if (trialEnd) {
      const trialEndMs = trialEnd.toMillis ? trialEnd.toMillis() : Number(trialEnd);
      if (Date.now() < trialEndMs) return; // trial ainda válido
    }
  }

  // Qualquer outro status (overdue, canceled) ou trial expirado → bloqueia
  throw new HttpsError("failed-precondition", "ASSINATURA_INATIVA");
}

/* ----------------------------- Callables ----------------------------- */

/**
 * awardPoints({ empresaId, clienteId, qtd }) — credita pontos se não houver prêmio pendente.
 * Ao completar o cartão, trava em meta/meta e guarda a sobra em `pontosSobra`.
 * Transação atômica (evita lost update em double-scan).
 */
exports.awardPoints = onCall(async (request) => {
  const { empresaId, clienteId } = request.data || {};
  let { qtd } = request.data || {};
  validarIds(empresaId, clienteId);
  qtd = Math.floor(Number(qtd));
  if (!Number.isFinite(qtd) || qtd < 1 || qtd > QTD_MAX) {
    throw new HttpsError("invalid-argument", `qtd deve ser um inteiro entre 1 e ${QTD_MAX}.`);
  }

  const caller = await assertAutorizado(request, empresaId);
  await assertAssinaturaAtiva(empresaId);
  const { meta } = await lerMeta(empresaId);
  const ref = cartaoRef(empresaId, clienteId);

  const resultado = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Cartão do cliente não encontrado.");
    const data = snap.data();
    const pendentesAtuais = Number(data.premiosPendentes) || 0;
    // Cartão travado: enquanto houver prêmio pendente não se pontua — o cliente
    // precisa resgatar o prêmio antes de voltar a acumular (decisão de produto).
    if (pendentesAtuais > 0) {
      throw new HttpsError("failed-precondition", "PREMIO_PENDENTE");
    }
    const pontosAtuais = Number(data.pontos) || 0;
    const total = pontosAtuais + qtd;
    const premiosGanhos = Math.floor(total / meta);
    const sobra = total % meta; // reservada p/ entrar no PRÓXIMO cartão só após o resgate

    if (premiosGanhos > 0) {
      // Completou o cartão: trava cheio (meta/meta) e guarda a sobra em pontosSobra.
      tx.update(ref, {
        pontos: meta,
        premiosPendentes: FieldValue.increment(premiosGanhos),
        pontosSobra: sobra,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(ref, {
        pontos: total,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }
    const logData = {
      tipo: "carimbo",
      qtd,
      premiosGanhos,
      vendedor: caller.nome,
      data: FieldValue.serverTimestamp(),
    };
    tx.set(ref.collection("logs").doc(), logData);
    if (caller.uid && caller.papel === "vendedor") {
      tx.set(db.collection("vendedores").doc(caller.uid).collection("logs").doc(), {
        ...logData,
        clienteNome: data.nome || data.nomeCompleto || "Cliente",
        clienteId,
        empresaId
      });
    }
    return {
      pontos: premiosGanhos > 0 ? meta : total,
      premiosGanhos,
      sobra: premiosGanhos > 0 ? sobra : 0,
      meta,
    };
  });

  // Lê o total de pendentes pós-transação para devolver ao client.
  const after = await ref.get();
  return { ...resultado, premiosPendentes: Number(after.data().premiosPendentes) || 0 };
});

/**
 * deliverPrize({ empresaId, clienteId }) — entrega 1 prêmio pendente.
 * Exige premiosPendentes > 0; decrementa 1 e incrementa o contador da empresa.
 * No último prêmio pendente, zera o cartão e injeta `pontosSobra` no novo cartão.
 */
exports.deliverPrize = onCall(async (request) => {
  const { empresaId, clienteId } = request.data || {};
  validarIds(empresaId, clienteId);
  const caller = await assertAutorizado(request, empresaId);
  await assertAssinaturaAtiva(empresaId);
  const ref = cartaoRef(empresaId, clienteId);
  const empRef = db.collection("empresas").doc(empresaId);

  const resultado = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Cartão do cliente não encontrado.");
    const data = snap.data();
    const pendentes = Number(data.premiosPendentes) || 0;
    if (pendentes <= 0) throw new HttpsError("failed-precondition", "Cliente não tem prêmios a entregar.");

    const novoPendentes = pendentes - 1;
    const update = { premiosPendentes: novoPendentes, atualizadoEm: FieldValue.serverTimestamp() };
    let pontos = Number(data.pontos) || 0;
    if (novoPendentes === 0) {
      // Último prêmio resgatado: zera o cartão e injeta a sobra reservada (carry-over
      // postergado) — é isso que o cliente vê entrar ponto a ponto no novo cartão.
      const sobra = Number(data.pontosSobra) || 0;
      update.pontos = sobra;
      update.pontosSobra = 0;
      pontos = sobra;
    }
    tx.update(ref, update);
    tx.update(empRef, { totalPremiosEntregues: FieldValue.increment(1) });
    const logData = {
      tipo: "resgate",
      vendedor: caller.nome,
      data: FieldValue.serverTimestamp(),
    };
    tx.set(ref.collection("logs").doc(), logData);
    if (caller.uid && caller.papel === "vendedor") {
      tx.set(db.collection("vendedores").doc(caller.uid).collection("logs").doc(), {
        ...logData,
        clienteNome: data.nome || data.nomeCompleto || "Cliente",
        clienteId,
        empresaId
      });
    }
    return { premiosPendentes: novoPendentes, pontos };
  });

  return resultado;
});

/**
 * removePoint({ empresaId, clienteId }) — correção do vendedor: -1 ponto (mín. 0).
 */
exports.removePoint = onCall(async (request) => {
  const { empresaId, clienteId } = request.data || {};
  validarIds(empresaId, clienteId);
  const caller = await assertAutorizado(request, empresaId);
  await assertAssinaturaAtiva(empresaId);
  const ref = cartaoRef(empresaId, clienteId);

  const pontos = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Cartão do cliente não encontrado.");
    const atuais = Number(snap.data().pontos) || 0;
    const novo = Math.max(0, atuais - 1);
    tx.update(ref, { pontos: novo, atualizadoEm: FieldValue.serverTimestamp() });
    const logData = { tipo: "remocao", vendedor: caller.nome, data: FieldValue.serverTimestamp() };
    tx.set(ref.collection("logs").doc(), logData);
    if (caller.uid && caller.papel === "vendedor") {
      tx.set(db.collection("vendedores").doc(caller.uid).collection("logs").doc(), {
        ...logData,
        clienteNome: snap.data().nome || snap.data().nomeCompleto || "Cliente",
        clienteId,
        empresaId
      });
    }
    return novo;
  });

  return { pontos };
});

/**
 * setPoints({ empresaId, clienteId, pontos, motivo }) — ajuste manual do DONO
 * (com auditoria). Não aplica carry-over (é override administrativo).
 */
exports.setPoints = onCall(async (request) => {
  const { empresaId, clienteId, motivo } = request.data || {};
  let { pontos } = request.data || {};
  validarIds(empresaId, clienteId);
  if (request.auth.uid !== empresaId) {
    throw new HttpsError("permission-denied", "Apenas o dono da empresa pode ajustar pontos manualmente.");
  }
  await assertAssinaturaAtiva(empresaId);
  const { meta } = await lerMeta(empresaId);
  pontos = Math.floor(Number(pontos));
  if (!Number.isFinite(pontos) || pontos < 0 || pontos >= meta) {
    throw new HttpsError("invalid-argument", `pontos deve ser inteiro entre 0 e ${meta - 1}.`);
  }
  const ref = cartaoRef(empresaId, clienteId);
  await ref.update({
    pontos,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  await ref.collection("logs").doc().set({
    tipo: "ajuste",
    qtd: pontos,
    motivo: typeof motivo === "string" ? motivo.slice(0, 200) : "",
    data: FieldValue.serverTimestamp(),
  });
  return { pontos };
});

/**
 * getCard({ empresaId, clienteId }) — leitura do cartão para o STAFF
 * (dono/vendedor). Necessária porque o vendedor não é dono nem cliente e,
 * pelas regras, não pode ler o doc do cartão diretamente.
 */
exports.getCard = onCall(async (request) => {
  const { empresaId, clienteId } = request.data || {};
  validarIds(empresaId, clienteId);
  await assertAutorizado(request, empresaId);
  const snap = await cartaoRef(empresaId, clienteId).get();
  if (!snap.exists) return { exists: false };
  const d = snap.data();
  return {
    exists: true,
    nome: d.nome || "",
    email: d.email || "",
    pontos: Number(d.pontos) || 0,
    premiosPendentes: Number(d.premiosPendentes) || 0,
  };
});

/**
 * findClient({ empresaId, email }) — busca o cliente por e-mail (fallback do
 * vendedor quando não há QR). Resolve o uid server-side sem expor a base.
 */
exports.findClient = onCall(async (request) => {
  const { empresaId, email } = request.data || {};
  if (typeof empresaId !== "string" || !empresaId) throw new HttpsError("invalid-argument", "empresaId inválido.");
  if (typeof email !== "string" || !email) throw new HttpsError("invalid-argument", "email inválido.");
  await assertAutorizado(request, empresaId);

  const emailNorm = email.toLowerCase().trim();
  const q = await db.collection("clientes").where("email", "==", emailNorm).limit(1).get();
  if (q.empty) return { found: false };

  const clienteId = q.docs[0].id;
  const cardSnap = await cartaoRef(empresaId, clienteId).get();
  return {
    found: true,
    clienteId,
    nome: q.docs[0].data().nome || "",
    email: emailNorm,
    temCartao: cardSnap.exists,
    pontos: cardSnap.exists ? Number(cardSnap.data().pontos) || 0 : 0,
    premiosPendentes: cardSnap.exists ? Number(cardSnap.data().premiosPendentes) || 0 : 0,
  };
});

/**
 * acceptVendorInvite({ empresaId, token }) — vincula o usuário autenticado como
 * vendedor ativo da empresa a partir de um convite gerado pelo dono.
 */
exports.acceptVendorInvite = onCall(async (request) => {
  const { empresaId, token } = request.data || {};
  if (typeof empresaId !== "string" || !empresaId) throw new HttpsError("invalid-argument", "empresaId inválido.");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(token)) {
    throw new HttpsError("invalid-argument", "Convite inválido.");
  }
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para aceitar o convite.");

  const email = String(request.auth.token && request.auth.token.email || "").toLowerCase();
  if (!email) throw new HttpsError("failed-precondition", "Sua conta precisa ter e-mail para aceitar o convite.");

  const uid = request.auth.uid;
  const nome = String(request.auth.token && request.auth.token.name || "").trim() || email.split("@")[0] || "Atendente";
  const inviteRef = db.collection("empresas").doc(empresaId).collection("convitesVendedores").doc(token);
  // Chave COMPOSTA (empresa + e-mail): permite o mesmo e-mail atender em lojas
  // diferentes e elimina a colisão global que barrava o aceite.
  const vendorRef = db.collection("vendedores").doc(`${empresaId}__${emailSlug(email)}`);

  return db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) throw new HttpsError("not-found", "Convite não encontrado ou expirado.");
    const invite = inviteSnap.data();
    if (invite.ativo === false) throw new HttpsError("failed-precondition", "Este convite já foi usado ou cancelado.");
    if (invite.empresaId && invite.empresaId !== empresaId) throw new HttpsError("permission-denied", "Convite não pertence a esta empresa.");

    const vendorSnap = await tx.get(vendorRef);
    if (vendorSnap.exists) {
      const current = vendorSnap.data();
      if (current.empresaId && current.empresaId !== empresaId) {
        throw new HttpsError("already-exists", "Este e-mail já está vinculado a outra empresa.");
      }
    }

    tx.set(vendorRef, {
      nomeVendedor: nome,
      email,
      uid,
      empresaId,
      ativo: true,
      criadoViaConvite: true,
      conviteToken: token,
      atualizadoEm: FieldValue.serverTimestamp(),
      criadoEm: vendorSnap.exists ? (vendorSnap.data().criadoEm || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.update(inviteRef, {
      ativo: false,
      aceitoPorUid: uid,
      aceitoPorEmail: email,
      aceitoEm: FieldValue.serverTimestamp(),
    });

    return { ok: true, nomeVendedor: nome, email };
  });
});

/**
 * deleteMyData() — LGPD (direito ao esquecimento). Apaga todos os cartões do
 * cliente logado (e seus logs) em todas as empresas + o perfil. O client não
 * consegue apagar os cartões pelas regras, por isso é server-side.
 * Obs.: requer índice de collection group para `clienteId` em `clientes`.
 */
exports.deleteMyData = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const uid = request.auth.uid;

  const cards = await db.collectionGroup("clientes").where("clienteId", "==", uid).get();
  for (const docSnap of cards.docs) {
    await db.recursiveDelete(docSnap.ref); // cartão + subcoleção logs
  }
  await db.recursiveDelete(db.collection("clientes").doc(uid));
  return { deletedCards: cards.size };
});

/* ------------------------------------------------------------------ */
/*  Billing (Asaas / PIX) — exportado do módulo billing.js             */
/*  Nomes exportados: createSubscription, asaasWebhook                 */
/* ------------------------------------------------------------------ */
Object.assign(exports, require("./billing"));

/* ------------------------------------------------------------------ */
/*  Notificações por e-mail (TRIAL-01) — módulo notifications.js       */
/*  Nomes exportados: subscriptionReminderCron (onSchedule 10h BRT)    */
/* ------------------------------------------------------------------ */
Object.assign(exports, require("./notifications"));
