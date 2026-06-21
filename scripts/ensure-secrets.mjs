/**
 * ensure-secrets.mjs — garante functions/.secret.local para o emulador.
 *
 * O Functions Emulator lê os secrets (ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN) de
 * functions/.secret.local. Se o arquivo não existir, o emulador trava pedindo
 * o valor interativamente — o que quebra os testes em CI/máquina nova.
 *
 * Este script (rodado nos "pre" hooks de teste) cria o arquivo com valores
 * DUMMY de teste, caso ele não exista. O arquivo é gitignored. NUNCA coloque
 * aqui as chaves reais de produção.
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "functions", ".secret.local");

if (existsSync(target)) {
  console.log("[ensure-secrets] functions/.secret.local já existe — ok.");
} else {
  writeFileSync(
    target,
    "ASAAS_API_KEY=test-asaas-key\nASAAS_WEBHOOK_TOKEN=test-webhook-token\n"
  );
  console.log("[ensure-secrets] functions/.secret.local criado com valores de teste.");
}
