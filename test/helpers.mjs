/**
 * helpers.mjs — utilitários compartilhados pelos testes contra o emulador.
 *
 * As portas batem com o bloco "emulators" do firebase.json:
 *   auth 9099 · functions 5001 · firestore 8080
 * O mock do Asaas (billing) sobe na 9100 (ver functions/.env.demo-tempontinho).
 */

export const PROJECT_ID = "demo-tempontinho";
export const REGION = "southamerica-east1";

export const PORTS = {
  auth: 9099,
  functions: 5001,
  firestore: 8085,
  hosting: 5055,
  asaasMock: 9100,
};

export const HOST = "127.0.0.1";

// Garante que o Admin SDK (firebase-admin) fale com os emuladores e nunca
// com produção. O emulators:exec já exporta FIRESTORE_EMULATOR_HOST e
// FIREBASE_AUTH_EMULATOR_HOST; reforçamos aqui por segurança.
export function forceEmulatorEnv() {
  process.env.FIRESTORE_EMULATOR_HOST ||= `${HOST}:${PORTS.firestore}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `${HOST}:${PORTS.auth}`;
  process.env.GCLOUD_PROJECT ||= PROJECT_ID;
}

// URL HTTP de uma function onRequest no emulador (ex.: asaasWebhook).
export function functionUrl(name) {
  return `http://${HOST}:${PORTS.functions}/${PROJECT_ID}/${REGION}/${name}`;
}

// Data futura/no passado como Date (para trialEndDate etc.).
export function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}
