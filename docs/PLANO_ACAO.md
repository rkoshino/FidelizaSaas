# Plano de Ação — Tem Pontinho

> Refatoração da lógica de pontos (carry-over + auto-reset), segurança Firestore e simplificação de UX.
> Estado: **rascunho para revisão (Codex / arquitetura)** antes da execução.

## 1. Regra de negócio: pontos com carry-over e prêmio pendente

### Comportamento atual (com bug)
- `vendedor.html:655-662`: ao adicionar pontos, faz `if (totalPontos > meta) totalPontos = meta` → **excedente é descartado**.
- Resgate só ocorre num **segundo scan** (`pontosAtuais >= meta`).
- Resultado: cliente perde pontos e o fluxo exige 2 leituras.

### Comportamento desejado (1 scan, sem perda)
Ao vendedor escanear e confirmar `qtd` pontos:
```
total          = pontosAtuais + qtd
premiosGanhos  = floor(total / meta)
pontosRestantes= total % meta
```
- `pontos` do cartão passa a ser `pontosRestantes` (cartão reseta automaticamente).
- `premiosPendentes += premiosGanhos`.
- Se `premiosGanhos > 0`: cliente vê confete + banner "Você tem N prêmio(s)! Mostre o QR ao vendedor".
- **Exemplo:** 9 + 4 = 13 → 1 prêmio, resta 3 → cartão mostra **3/10** + badge "1 prêmio a resgatar".
- Suporta múltiplos prêmios numa tacada (ex.: 9 + 14 = 23 → 2 prêmios, resta 3).

### Entrega do prêmio = ação separada do vendedor
- Ao escanear, se `premiosPendentes > 0`, a tela do vendedor destaca **"🎁 N prêmio(s) a entregar"** + botão **"Entregar prêmio"**.
- "Entregar" → `premiosPendentes -= 1`, grava log de entrega, incrementa `empresas/{id}.totalPremiosEntregues`.
- Mantém o modo "Tirar 1 ponto" (correção de erro do vendedor).

## 2. Modelo de dados (Firestore)

**Mudança:** sair do mapa `pontosPerEmpresa` (dentro do doc do cliente) para **subcoleção por empresa**, que permite isolamento real nas regras e carregar `premiosPendentes`:

```
clientes/{clienteId}                      → perfil: { nome, email }        (cliente só escreve isto)
clientes/{clienteId}/cartoes/{empresaId}  → { pontos, premiosPendentes, atualizadoEm }
clientes/{clienteId}/cartoes/{empresaId}/logs/{logId} → carimbos e resgates (imutável)
```
- App é pré-lançamento (só dados de teste) → migração livre, sem backfill.
- `cliente.html` lê em tempo real a subcoleção `cartoes` do próprio cliente.

## 3. Segurança (núcleo do go-live)

Dois buracos críticos hoje (ver relatório): (a) **cliente pode dar pontos a si mesmo**; (b) **qualquer lojista/vendedor lê e edita clientes de qualquer outra empresa** (vazamento de PII / LGPD).

### Caminho recomendado: creditar via Cloud Function callable
- Functions `awardPoints(clienteId, qtd)` e `deliverPrize(clienteId)` rodam com Admin SDK e validam que o chamador é vendedor/dono **daquela** empresa.
- Regras Firestore: cliente **nunca** escreve `cartoes`; vendedor/dono só lê `cartoes` das suas empresas; `empresas` leitura pública só de campos de branding.
- Requer plano **Blaze** (pay-as-you-go); no volume de teste o custo é ~R$0 (free tier 2M invocações/mês).

### DECISÃO (pós-revisão): Cloud Function, sem rules-only
A alternativa rules-only foi **descartada** pela revisão de arquitetura:
- Não dá pra validar *quanto* foi creditado nem *quem* autorizou — só *quem escreve*. A fraude de incremento arbitrário continua aberta.
- Vendedor é chaveado por **e-mail**, não `uid` → as regras atuais (`exists(.../vendedores/$(uid))`) **nunca casam**; rules-only exigiria re-chavear vendedores por uid (trabalhoso, mexe no auto-create).
- Há estado derivado (`premiosPendentes`) que precisa de transação atômica.
- **Pré-requisito (ação do dono):** habilitar plano **Blaze** (cartão no projeto; custo ~R$0 no free tier) e `firebase login` para deploy.

### Itens de segurança transversais
- Ativar **Firebase App Check**.
- `empresas`: expor publicamente só branding (cor, emoji, título, prêmio, meta), não o doc inteiro.

## 4. UX do cliente (`cliente.html`)
- Cartão em tempo real refletindo carry-over.
- `premiosPendentes > 0` → banner comemorativo + QR em destaque + confete. Cliente não precisa fazer mais nada além de mostrar o QR.
- **Mover o botão "Excluir meus dados" (LGPD) para um dropdown/menu kebab (⋮)** no topo, junto com "Sair". Tirar da área principal.
- Minimizar texto e ações na tela principal.

## 5. UX do vendedor (`vendedor.html`)
- Scan único: adiciona, faz carry-over, detecta prêmio(s), reseta cartão — sem 2º scan, sem perder ponto.
- Pós-scan mostra: nome do cliente, `pontos/meta`, e se houver, "🎁 N prêmio(s) a entregar" + botão Entregar.
- Mensagens claras: "+4 pontos · 1 cartela completa · 1 prêmio a entregar · cartão agora 3/10".
- Mantém modo "Tirar 1 ponto".

## 6. Fora desta leva (backlog do go-live — ver relatório)
Billing real (Mercado Pago/Asaas) + enforcement de trial/inadimplência · Tailwind via build · PWA (manifest) · auditoria de acessibilidade · atualizar `AI_CONTEXT.md`/README.

## 7. Execução (orquestração de agentes)
- Tudo num **branch/worktree isolado**; **sem deploy** (Firebase CLI não está autenticado — deploy depende do dono).
- Agente A — `firestore.rules` (+ Cloud Functions se aprovado) e modelo de dados.
- Agente B — `vendedor.html`: nova lógica + UX de prêmio.
- Agente C — `cliente.html`: UX de prêmios + dropdown LGPD.
- Contrato de dados (nomes de campos/coleções) fixado neste doc para os 3 agentes não divergirem.

## 8. Correções incorporadas da revisão de arquitetura (v2)

**Lógica / concorrência**
- `awardPoints` e `deliverPrize` rodam em **`runTransaction`** (ou `FieldValue.increment` no caminho puramente aditivo). Sem isso, double-scan/2 dispositivos = lost update.
- `deliverPrize` **idempotente**: valida `premiosPendentes > 0` no servidor, nunca abaixo de zero; client **desabilita o botão no clique**.
- `totalPremiosEntregues` da empresa é incrementado **dentro da transação** de `deliverPrize` (hoje é client-side e falha em silêncio).

**Validação server-side**
- `qtd` validado: `1 ≤ qtd ≤ limite` (ex.: ≤ meta ou ≤ 50). `meta` lida do doc `empresas` **no servidor**, nunca do client. Tratar `meta ≤ 0` (config corrompida).
- **Semântica de meta alterada:** a meta vigente sempre se aplica ao saldo atual (documentado p/ os 3 agentes).
- Na criação do cartão pelo cliente, forçar `pontos==0 && premiosPendentes==0` (ou só via Function).

**UX cliente**
- **Gatilho de confete/banner muda para `premiosPendentes > 0`** (não mais `pontos >= meta`, que nunca mais ocorre). Banner some quando voltar a 0.
- Listener migra de `doc(clientes/{uid})` para `onSnapshot(clientes/{uid}/cartoes/{empresaId})`.

**LGPD (delete)**
- Deletar o doc pai **não** apaga `cartoes/*` e `logs/*` → apagar a subcoleção explicitamente (ou Function de cleanup). Tratar `requires-recent-login` no `user.delete()` (hoje falha em silêncio).

**Segurança transversal**
- **App Check é parte do núcleo** (não opcional): sem ele qualquer um chama a callable com a config pública (`config.js`).

## 9. Smoke tests (reforçado)
Caminho feliz **e** bordas: múltiplos prêmios numa tacada (9+14→2 prêmios, resto 3); double-scan simultâneo; duplo-clique em "Entregar"; `qtd` fora do range via client adulterado; cartão recém-criado (`premiosPendentes` ausente → tratar como 0); meta alterada com saldo pendente; delete LGPD apagando subcoleções.
