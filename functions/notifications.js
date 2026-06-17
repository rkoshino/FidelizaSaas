/**
 * notifications.js — Tem Pontinho (avisos por e-mail)
 *
 * Exporta:
 *   trialReminderCron (onSchedule) — roda 1x/dia e avisa os donos cujo trial
 *     termina em ~7 dias (TRIAL-01). Marca `trialReminder7Sent` para não repetir.
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

/* ------------------------------------------------------------------ */
/*  Helper: envia um e-mail via API do Resend                          */
/* ------------------------------------------------------------------ */
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
/*  Template do e-mail de fim de trial                                 */
/* ------------------------------------------------------------------ */
function buildTrialReminderEmail({ nomeEmpresa, diasRestantes }) {
  const subject = `Seu mês grátis no Tem Pontinho termina em ${diasRestantes} dias`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
      <h2 style="color:#111827;">Faltam ${diasRestantes} dias do seu mês grátis 🎁</h2>
      <p>Olá! O período grátis de <strong>${nomeEmpresa || "sua loja"}</strong> no
      <strong>Tem Pontinho</strong> está chegando ao fim.</p>
      <p>Para o seu programa de fidelidade continuar ativo sem interrupção, assine por
      <strong>R$ 19,90/mês</strong>. Você pode pagar via PIX direto pelo painel — o valor
      só começa a valer quando o período grátis terminar.</p>
      <p style="margin:28px 0;">
        <a href="https://tempontinho.com/dashboard.html"
           style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:12px;
                  text-decoration:none;font-weight:700;">Assinar agora</a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Se já assinou, pode ignorar este aviso.
      Qualquer dúvida, é só responder este e-mail.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Tem Pontinho · seu cartão fidelidade no celular</p>
    </div>`;
  return { subject, html };
}

/* ------------------------------------------------------------------ */
/*  Cron diário: avisa quem está a ~7 dias do fim do trial             */
/* ------------------------------------------------------------------ */
exports.trialReminderCron = onSchedule(
  {
    schedule: "every day 12:00",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const db = getFirestore();
    const agora = Date.now();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;

    // Só assinaturas ainda em trial e que ainda não receberam o aviso de 7 dias.
    const snap = await db
      .collection("empresas")
      .where("statusAssinatura", "==", "trial")
      .get();

    let enviados = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.trialReminder7Sent) continue;

      const raw = data.trialEndDate;
      if (!raw) continue;
      const fim = typeof raw.toDate === "function" ? raw.toDate().getTime() : new Date(raw).getTime();
      if (!fim || Number.isNaN(fim)) continue;

      const restanteMs = fim - agora;
      // Janela: entre 0 e 7 dias para o fim (entrou no período de aviso).
      if (restanteMs <= 0 || restanteMs > seteDiasMs) continue;

      const email = data.emailComercial;
      if (!email) continue;

      const diasRestantes = Math.max(1, Math.ceil(restanteMs / (24 * 60 * 60 * 1000)));
      try {
        const { subject, html } = buildTrialReminderEmail({
          nomeEmpresa: data.nomeEmpresa,
          diasRestantes,
        });
        await sendEmail({ to: email, subject, html });
        await docSnap.ref.update({
          trialReminder7Sent: true,
          trialReminder7SentAt: Timestamp.now(),
        });
        enviados++;
      } catch (err) {
        console.error(`[trialReminderCron] falha ao avisar ${docSnap.id} (${email}):`, err.message);
      }
    }

    console.log(`[trialReminderCron] avisos de fim de trial enviados: ${enviados}`);
  }
);
