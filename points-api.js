/**
 * points-api.js — camada única de acesso à lógica de pontos (client-side).
 *
 * Os arquivos de UI (cliente.html, vendedor.html, dashboard.html) DEVEM usar
 * estas funções em vez de escrever pontos no Firestore diretamente. Toda
 * mutação chama uma Cloud Function (ver functions/index.js). O client só:
 *   - cria o cartão zerado (auto-cadastro do cliente);
 *   - escuta o próprio cartão em tempo real;
 *   - lê o cartão (dono/vendedor) — feito nas próprias telas.
 *
 * Modelo de dados: empresas/{empresaId}/clientes/{clienteId}
 *   { nome, email, pontos, premiosPendentes, atualizadoEm }
 */

import { app, auth, db, doc, getDoc, setDoc, onSnapshot } from "./config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const functions = getFunctions(app, "southamerica-east1");

function call(name) {
  const fn = httpsCallable(functions, name);
  return async (payload) => {
    const res = await fn(payload);
    return res.data;
  };
}

/* ---- Callables (mutação server-side) ---- */

// awardPoints({ empresaId, clienteId, qtd })
//   -> { pontos, premiosGanhos, premiosPendentes, meta }
export const awardPoints = call("awardPoints");

// deliverPrize({ empresaId, clienteId }) -> { premiosPendentes }
export const deliverPrize = call("deliverPrize");

// removePoint({ empresaId, clienteId }) -> { pontos }   (correção do vendedor)
export const removePoint = call("removePoint");

// setPoints({ empresaId, clienteId, pontos, motivo }) -> { pontos }  (dono, auditado)
export const setPoints = call("setPoints");

// getCard({ empresaId, clienteId }) -> { exists, nome, email, pontos, premiosPendentes }
//   Leitura do cartão para o staff (vendedor não pode ler o doc direto).
export const getCard = call("getCard");

// findClient({ empresaId, email }) -> { found, clienteId, nome, email, temCartao, pontos, premiosPendentes }
//   Fallback do vendedor: buscar cliente por e-mail quando não há QR.
export const findClient = call("findClient");

// deleteMyData() -> { deletedCards }   LGPD: apaga cartões + perfil do cliente logado.
export const deleteMyData = call("deleteMyData");

/* ---- Leitura / cadastro (client-side, permitido pelas regras) ---- */

function cardRef(empresaId, clienteId) {
  return doc(db, "empresas", empresaId, "clientes", clienteId);
}

/**
 * Garante que o cliente logado tem um cartão (zerado) naquela empresa.
 * Também grava/atualiza o perfil do consumidor em clientes/{uid}.
 * Chamar no primeiro acesso ao link da loja.
 */
export async function ensureClientCard(empresaId, { nome, email } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Cliente não autenticado.");
  const uid = user.uid;
  const nomeFinal = nome || user.displayName || "";
  const emailFinal = (email || user.email || "").toLowerCase();

  // Perfil do consumidor (o cliente pode escrever o próprio doc).
  await setDoc(doc(db, "clientes", uid), { nome: nomeFinal, email: emailFinal }, { merge: true });

  // Cartão na empresa: cria zerado só se ainda não existir (regra exige 0/0).
  const ref = cardRef(empresaId, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      clienteId: uid,
      nome: nomeFinal,
      email: emailFinal,
      pontos: 0,
      premiosPendentes: 0,
      atualizadoEm: serverTimestamp(),
    });
  }
  return uid;
}

/**
 * Escuta o cartão do cliente logado em tempo real.
 * cb recebe { pontos, premiosPendentes, ... } ou null se não existir.
 * Retorna a função de unsubscribe.
 */
export function listenCard(empresaId, clienteId, cb) {
  return onSnapshot(cardRef(empresaId, clienteId), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}
