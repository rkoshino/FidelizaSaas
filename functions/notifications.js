/**
 * notifications.js — Tem Pontinho (avisos por e-mail)
 *
 * Exporta:
 *   subscriptionReminderCron (onSchedule) — roda todo dia às 10:00 (BRT) e avisa os
 *     donos cuja assinatura vence em 15, 7, 3 ou 1 dia(s). Cada marco é enviado uma
 *     única vez por data de vencimento (dedupe em `lembretesVencimentoEnviados`).
 *
 * Vencimento considerado:
 *   - statusAssinatura == "trial"  → `trialEndDate`     (fim do 1º mês grátis)
 *   - statusAssinatura == "active" → `proximoVencimento` (próxima renovação)
 *   - demais status (overdue/canceled) → ignorado.
 *
 * Secrets (Cloud Secret Manager):
 *   RESEND_API_KEY — chave da API do Resend (https://resend.com) p/ envio transacional.
 *
 * Observação: usa a API REST do Resend via fetch nativo (Node 22), sem SDK extra.
 */

"use strict";

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

// Remetente: precisa ser de um domínio verificado no Resend (ver passo a passo).
const FROM_EMAIL = "Tem Pontinho <avisos@tempontinho.com>";

// Marcos de aviso (dias antes do vencimento).
const MARCOS = [15, 7, 3, 1];
const DIA_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toDate(raw) {
  if (!raw) return null;
  const d = typeof raw.toDate === "function" ? raw.toDate() : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Data de vencimento relevante conforme o status da assinatura.
function getVencimento(data) {
  if (data.statusAssinatura === "trial") return toDate(data.trialEndDate);
  if (data.statusAssinatura === "active") return toDate(data.proximoVencimento);
  return null;
}

function isoDay(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function sendEmail({ to, subject, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Resend ${resp.status}: ${detail}`);
  }
  return resp.json().catch(() => ({}));
}

/* ------------------------------------------------------------------ */
/*  Template do e-mail de vencimento                                   */
/* ------------------------------------------------------------------ */
function buildReminderEmail({ nomeEmpresa, diasRestantes, isTrial }) {
  const quando = diasRestantes === 1 ? "amanhã" : `em ${diasRestantes} dias`;
  const subject = isTrial
    ? `Seu mês grátis no Tem Pontinho termina ${quando}`
    : `Sua assinatura do Tem Pontinho vence ${quando}`;
  const intro = isTrial
    ? `O período grátis de <strong>${nomeEmpresa || "sua loja"}</strong> termina ${quando}.`
    : `A assinatura de <strong>${nomeEmpresa || "sua loja"}</strong> vence ${quando}.`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
      <h2 style="color:#111827;">${isTrial ? "Seu mês grátis está acabando 🎁" : "Sua assinatura vai vencer ⏰"}</h2>
      <p>Olá! ${intro}</p>
      <p>Para o seu programa de fidelidade continuar ativo sem interrupção, mantenha a
      assinatura em dia — <strong>R$ 19,90/mês</strong>, pagamento via PIX direto pelo painel.</p>
      <p style="margin:28px 0;">
        <a href="https://tempontinho.com/dashboard.html"
           style="background:#0E6E63;color:#fff;padding:12px 22px;border-radius:12px;
                  text-decoration:none;font-weight:700;">Abrir meu painel</a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Se já está tudo certo com o pagamento, pode ignorar
      este aviso. Qualquer dúvida, é só responder este e-mail.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Tem Pontinho · seu cartão fidelidade no celular</p>
    </div>`;
  return { subject, html };
}

/* ------------------------------------------------------------------ */
/*  Cron diário (10:00 BRT): avisa em 15/7/3/1 dias antes do vencimento */
/* ------------------------------------------------------------------ */
exports.subscriptionReminderCron = onSchedule(
  {
    schedule: "0 10 * * *", // todos os dias às 10:00
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const db = getFirestore();
    const agora = Date.now();

    // Considera só quem tem assinatura em trial ou ativa (os que têm vencimento a cobrar).
    const snap = await db
      .collection("empresas")
      .where("statusAssinatura", "in", ["trial", "active"])
      .get();

    let enviados = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      const venc = getVencimento(data);
      if (!venc) continue;

      const diasRestantes = Math.ceil((venc.getTime() - agora) / DIA_MS);
      if (!MARCOS.includes(diasRestantes)) continue;

      const email = data.emailComercial;
      if (!email) continue;

      const vencISO = isoDay(venc);
      const key = `${vencISO}:${diasRestantes}`;
      const jaEnviados = Array.isArray(data.lembretesVencimentoEnviados)
        ? data.lembretesVencimentoEnviados
        : [];
      if (jaEnviados.includes(key)) continue; // marco já avisado p/ este vencimento

      try {
        const { subject, html } = buildReminderEmail({
          nomeEmpresa: data.nomeEmpresa,
          diasRestantes,
          isTrial: data.statusAssinatura === "trial",
        });
        await sendEmail({ to: email, subject, html });

        // Mantém só as chaves do vencimento atual (evita crescimento entre renovações).
        const atualizado = jaEnviados.filter((k) => k.startsWith(`${vencISO}:`)).concat(key);
        await docSnap.ref.update({
          lembretesVencimentoEnviados: atualizado,
          ultimoLembreteEnviadoEm: Timestamp.now(),
        });
        enviados++;
      } catch (err) {
        console.error(`[subscriptionReminderCron] falha ao avisar ${docSnap.id} (${email}):`, err.message);
      }
    }

    console.log(`[subscriptionReminderCron] avisos de vencimento enviados: ${enviados}`);
  }
);
