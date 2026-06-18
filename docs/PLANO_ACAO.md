# Plano de Ação — Tem Pontinho

> Refatoração da lógica de pontos, segurança Firestore e simplificação de UX.
> Estado: **executado e atualizado em 2026-06-18**. Este plano é histórico; o contrato final em produção
> usa **carry-over postergado**: cartão trava cheio, prêmio pendente bloqueia novos pontos, e a sobra só
> entra depois do resgate.

## 1. Regra de negócio: carry-over postergado + prêmio pendente

### Comportamento final em produção
Ao vendedor escanear o QR do cliente, o scan age diretamente:
- se `premiosPendentes > 0`, o scan resgata 1 prêmio automaticamente;
- se não há prêmio pendente, o scan credita a quantidade selecionada no leitor.

Ao creditar `qtd` pontos:
```
total          = pontosAtuais + qtd
premiosGanhos  = floor(total / meta)
pontosRestantes= total % meta
```
- Se `premiosGanhos == 0`: `pontos = total`.
- Se `premiosGanhos > 0`: `pontos = meta`, `premiosPendentes += premiosGanhos` e
  `pontosSobra = pontosRestantes`.
- Enquanto houver prêmio pendente, o cartão fica travado cheio e `awardPoints` recusa novos pontos.
- Quando o último prêmio pendente é resgatado, `deliverPrize` renova o cartão com `pontos = pontosSobra`
  e limpa `pontosSobra`.
- **Exemplo:** 9 + 4 = 13 → cartão mostra **10/10**, 1 prêmio pendente, `pontosSobra=3`; próximo scan
  resgata o prêmio e o cliente vê o cartão novo entrar com **3/10**.

### Entrega do prêmio = scan automático do vendedor
- Ao escanear cliente com `premiosPendentes > 0`, `vendedor.html` chama `deliverPrize`.
- `deliverPrize` grava log de entrega e incrementa `empresas/{id}.totalPremiosEntregues`.
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
- **Gatilho de confete/banner usa `premiosPendentes > 0`**. Banner permanece se o cliente voltar depois com prêmio pendente.
- No último resgate: banner de resgate, cartão rasgando, novo cartão entrando e `pontosSobra` animando ponto a ponto.
- Listener usa `empresas/{empresaId}/clientes/{clienteId}` via `listenCard`.

**LGPD (delete)**
- Deletar o doc pai **não** apaga `cartoes/*` e `logs/*` → apagar a subcoleção explicitamente (ou Function de cleanup). Tratar `requires-recent-login` no `user.delete()` (hoje falha em silêncio).

**Segurança transversal**
- **App Check é parte do núcleo** (não opcional): sem ele qualquer um chama a callable com a config pública (`config.js`).

## 9. Smoke tests (reforçado)
Caminho feliz **e** bordas: 9+4→cartão 10/10 + 1 prêmio + `pontosSobra=3`, próximo scan resgata e renova com 3/10; múltiplos prêmios numa tacada; double-scan simultâneo; duplo scan de resgate; `qtd` fora do range via client adulterado; cartão recém-criado (`premiosPendentes` ausente → tratar como 0); meta alterada com saldo pendente; delete LGPD apagando subcoleções.
