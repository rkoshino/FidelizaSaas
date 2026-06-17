# Backlog — Review do CEO

> **Fonte:** mensagem de review pessoal do CEO (transcrita na íntegra no fim deste doc).
> **Organizado por:** gestão de projeto · **Data:** 2026-06-16
> **Como usar:** lista de tarefas viva. Marque `[x]` ao concluir. Cada tarefa tem ID estável (cite em commits/PRs, ex. `fix(VEND-04): ...`).
> **Relacionados:** `RELATORIO_DESIGN.md`, `RELATORIO_FINAL.md` e `PLANO_EXECUCAO.md`. Itens que coincidem com a auditoria de design estão marcados 🔗.

---

## Legenda

- **Tipo:** 🐛 Bug · ✨ Feature · 🎨 Melhoria UX/UI · 📝 Copy · 🔒 Segurança/Auth · ⚙️ Backend/Regras
- **Prioridade:** **P0** bloqueante · **P1** alta · **P2** média · **P3** baixa
- **Status:** `[ ]` a fazer · `[~]` em andamento · `[x]` feito · `[?]` precisa esclarecer com CEO

---

## 🔥 Críticos primeiro (P0/P1) — visão rápida

> **Todos os P0/P1 críticos abaixo já estão RESOLVIDOS e deployados em hosting** (faltam só testes runtime do CEO).

| ID | Status | Tipo | O quê | Arquivo |
|----|--------|------|-------|---------|
| **CAD-05** | ✅ | ⚙️ P0 | "Erro ao salvar, missing or insufficient permissions" ao finalizar o cadastro | `onboarding.html` + `firestore.rules` |
| **VEND-04** | ✅ | 🐛 P1 | Câmera fica escura ao logar de novo no painel do vendedor | `vendedor.html` |
| **VEND-03** | ✅ | 🐛 P1 | Caixa "você tem prêmios" não some após escanear e pontuar | `vendedor.html` |
| **DASH-01** | ✅ | 🐛 P1 | No celular não há como chegar na aba de Vendedores/Equipe | `dashboard.html` 🔗 |
| **MP-01** | ✅ | 🐛 P1 | Página principal scrolla pro lado no celular (botão "Cadastro Grátis" no header) | `index.html` 🔗 |

---

## 1. MAIN PAGE (`index.html`)

- [x] **MP-01 (M-03) · 🐛 P1 — Scroll horizontal no mobile** 🔗 ✅ 2026-06-17 — `index.html`: `overflow-x-hidden` na raiz, header responsivo (logo/botão encolhem) e cards flutuantes do mockup escondidos < sm.
  No celular dá pra arrastar a página pro lado por causa do botão "Cadastro Grátis" no canto direito do cabeçalho.
  **Aceite:** sem overflow horizontal em telas 320–430px; header não estoura a largura.

- [x] **MP-02 (C-05) · 📝 P2 — Reforçar a proposta de valor na home** ✅ 2026-06-17 — `index.html`: feature card "O cliente nunca perde" ("igual ao cartão de papel, mas não perde e sempre volta"). Entrou como seção adicional (não substituiu a headline).
  Incluir/ajustar copy: **"Cartão de pontos para celular"** e o mote **"Igual ao cartão de papel, só que o cliente não perde por aí! Sempre volta."**
  **Aceite:** mensagem aparece com destaque na main page (hero ou seção de features), no tom popular já usado.

---

## 2. PÁGINA DO VENDEDOR (`vendedor.html`)

- [x] **VEND-01 (C-02) · ✨ P2 — QR code da página do cliente no painel do vendedor** ✅ 2026-06-17 — `vendedor.html`: card de QR no rodapé (qrcodejs) apontando para `cliente.html?link=<slug>`, com link clicável.
  Exibir um QR code que leva à página do cliente, na **parte de baixo** da tela do vendedor.
  **Aceite:** QR visível no rodapé do painel; ao escanear, abre a página do cliente correta.

- [x] **VEND-02 (C-03) · 🎨 P2 — Reposicionar a caixa de "ganhou prêmio"** ✅ 2026-06-17 — `vendedor.html`: caixa de prêmio reordenada para antes do progresso/pontos no painel do cliente.
  A caixa de prêmio deve aparecer **entre o QR code e os pontos**.
  **Aceite:** ordem visual = QR → caixa de prêmio → pontos.

- [x] **VEND-03 (B-03) · 🐛 P1 — Caixa de prêmio não some após pontuar** ✅ 2026-06-16
  Repro do CEO: completei 1 cartão → mensagem de prêmio apareceu → li o QR → cartão ganhou pontos → **a caixa não sumiu**.
  **Aceite:** após um scan que pontua/zera o cartão, o estado de prêmio é reavaliado e a caixa some/atualiza sozinha (sem refresh manual).
  **Resolução:** o caminho feliz (awardPoints) já reavaliava `premiosPendentes`; o real defeito era o caminho de **erro** (scan de cliente sem cartão ativo → `not-found`) que não limpava o painel, deixando a caixa do cliente anterior pendurada. `vendedor.html`: catch de `processPointAward` agora limpa painel + `updatePrizeBox(0)`. _Verificado: sintaxe OK; teste em device com câmera pendente (precisa T-DEV)._

- [x] **VEND-04 (B-02) · 🐛 P1 — Câmera escura ao relogar** ✅ 2026-06-16
  Ao logar de novo no site do vendedor, a câmera ficou escura.
  **Aceite:** reabrir/relogar reinicia o stream da câmera corretamente; sem tela preta.
  **Resolução:** `vendedor.html`: nova `teardownScanner()` (stop + clear + libera instância) chamada no logout, no estado deslogado e antes de recriar o `Html5Qrcode` no login. Antes recriávamos sobre um `#reader` com vídeo/canvas órfãos → tela preta. _Verificado: sintaxe OK; teste em device com câmera pendente._

- [x] **VEND-05 ($-01) · ✨ P1 — Aviso de fim do mês grátis (vendedor)** ✅ 2026-06-17 — `vendedor.html`: banner "Faltam N dias do mês grátis" (de `trialEndDate`) + CTA "Assinar".
  Mensagem mostrando **quantos dias faltam** para o mês grátis acabar, **com link para comprar o plano**.
  **Aceite:** banner com contagem de dias (baseado em `trialEndDate`) + CTA para a página/fluxo de assinatura. _(Mesma fonte de dados do DASH-04.)_

- [x] **VEND-06 (C-04) · ✨ P2 — Botão de acesso ao dashboard da empresa** ✅ 2026-06-17 — `vendedor.html`: botão "Painel" no header abre `dashboard.html`.
  Criar botão no painel do vendedor para abrir a área de administração (dashboard).
  **Aceite:** botão visível leva ao `dashboard.html` (respeitando login da mesma conta).

---

## 3. DASHBOARD (`dashboard.html`)

- [x] **DASH-01 (M-01) · 🐛 P1 — Aba de Vendedores inacessível no mobile** 🔗 ✅ 2026-06-17 — `dashboard.html`: barra de navegação inferior fixa (md:hidden) com as 4 abas via `switchTab`.
  No celular não há como chegar na página dos vendedores nem em nenhuma aba.
  **Aceite:** todas as abas (Visão Geral, Clientes, Equipe/Vendedores, Assinatura) acessíveis no celular.

- [x] **DASH-02 (M-02) · 🎨 P1 — Cabeçalho mobile apertado** ✅ 2026-06-17 — `dashboard.html`: header desapertado (labels só em lg, padding menor, título truncado) + logout acessível no mobile.
  Cabeçalho do dashboard no celular está "estranho, tudo muito apertado".
  **Aceite:** header legível e espaçado em 320–430px.

- [x] **DASH-03 (M-02) · 🎨 P1 — Layout mobile do dashboard (epic)** ✅ 2026-06-17 — `dashboard.html`: stats grid-cols-2 e tabela de clientes vira cards no mobile (CSS + data-label), mantendo paridade de dados.
  Criar uma lógica de layout pensada para celular, **mantendo todos os dados** do dashboard de computador.
  **Aceite:** paridade de informação desktop↔mobile; navegação e tabelas usáveis no celular (ex.: tabela de clientes em cards).
  _(Guarda-chuva que engloba DASH-01 e DASH-02.)_

- [x] **DASH-04 ($-02) · ✨ P1 — Aviso de fim do mês grátis (dashboard)** ✅ 2026-06-17 — `dashboard.html`: banner de contagem aparece DURANTE o trial (não só ao expirar) + CTA "Assinar agora".
  Mensagem **abaixo do cabeçalho** com quantos dias faltam para o mês grátis acabar.
  **Aceite:** banner com contagem de dias (de `trialEndDate`) + CTA de assinatura. _(Mesma lógica do VEND-05.)_

---

## 4. PÁGINA DE CADASTRO (`onboarding.html`) + Auth (`login.html` / `config.js`)

### Autenticação / segurança
- [~] **CAD-01 (A-03) · 🔒 P2 — Termos de segurança no login social** ✅ login feito 2026-06-17 — `login.html`: aviso de Termos de Uso + Política de Privacidade. **Pendente:** repetir no onboarding (que ainda tem botões Google/Apple/Facebook sem o aviso).
  Exibir os termos de segurança no login com Google, Apple e Facebook.
  **Aceite:** aceite/sinalização de termos presente antes de concluir login via provedor social.

- [~] **CAD-02 (A-01/A-02) · 🔒 P1 — Provedores independentes + verificação de e-mail** — `config.js` já exporta `sendEmailVerification`/`sendPasswordResetEmail`. **Pendente:** plugar `sendEmailVerification` no fluxo de signup (A-01) e configurar provedores no **console Firebase** (A-02, não dá por código).
  Configurar login Google/Apple/Facebook e e-mail de forma independente, e criar cadastro por e-mail que **exija confirmação de e-mail**.
  **Aceite:** providers funcionam isoladamente; cadastro por e-mail dispara verificação e só libera após confirmar.
  _[?] Confirmar com CEO se Apple/Facebook são realmente para o MVP (custo/config de provider)._

### Parte 2 do cadastro
- [x] **CAD-03 (O-02) · 📝 P3 — Copy da etapa 2** ✅ 2026-06-17 — `onboarding.html`: "Configuração do Cartão de Pontos — Defina o prêmio, quantos pontos para ganhar e o link do seu cartão."
  Atualizar para: **"Configuração do Cartão de Pontos — Defina qual o prêmio e quantos pontos precisam para ganhar."**
  **Aceite:** título/descrição da etapa 2 com esse texto.

### Parte 3 do cadastro
- [x] **CAD-05 (B-01) · ⚙️ P0 — Erro ao finalizar: "missing or insufficient permissions"** ✅ 2026-06-16
  Ao clicar para finalizar o cadastro, erro "Erro ao salvar, missing or insufficient permissions".
  **Aceite:** cadastro finaliza sem erro; gravação respeita `firestore.rules`.
  **Causa raiz:** `onboarding.html:975` gravava `statusAssinatura`/`trialEndDate` (campos protegidos por `camposProtegidosIntactos`) **incondicionalmente** com `setDoc(merge)`. No 1º signup o doc não existe → `create` (permitido). Mas ao **reentrar** (login com conta já existente ou re-onboarding — justamente o que acontece ao testar repetidamente com o mesmo e-mail) o doc já existe → vira `update` que reescreve `trialEndDate` → **negado**. O doc ID já era o `uid` (hipótese do slug descartada).
  **Resolução:** só grava os campos de billing quando `isFirstCreate` (doc inexistente); no update, omite-os. Sem necessidade de deploy de Functions. _Verificado: rules + imports OK; teste runtime de re-signup depende do T-DEV (e-mail reutilizável)._

- [x] **CAD-06 (O-03) · 🎨 P2 — Pré-preencher "Título da Página" com o nome da empresa** ✅ 2026-06-17 — `onboarding.html`: ao avançar p/ etapa 3, o título vem com o nome da empresa (flag de edição manual respeita o que o dono digitar).
  O campo já deve vir com o nome da empresa; a pessoa muda se quiser.
  **Aceite:** campo "Título da Página" inicia com o nome informado, editável.

- [x] **CAD-07 (V-04) · 🎨 P1 — Seletor de cores no celular** ✅ 2026-06-17 — `onboarding.html`: paleta curada de 8 swatches (toque rápido) + input custom; swatch selecionado destacado.
  No mobile abre um menu com cores feias; há botões demais e é confuso de achar onde escolher a cor.
  **Aceite:** picker de cores simples e bonito no celular (paleta curada de poucas opções), fácil de localizar.

- [x] **CAD-08 (V-05) · 🐛 P1 — Seletor de emoji no desktop** ✅ (já existia) — `onboarding.html`: emoji picker embutido (grid clicável com categorias), funciona no desktop sem teclado do SO.
  No computador é um campo de texto e o teclado não tem emojis instalados → difícil escolher.
  **Aceite:** picker de emojis embutido (grid clicável), funciona no desktop sem depender do teclado do SO.

- [x] **CAD-09 (V-05) · 🐛 P2 — Seletor de emoji no celular** ✅ resolvido pelo picker próprio do CAD-08 (grid clicável funciona em qualquer dispositivo, sem depender do teclado de emoji do SO).
  CEO: "no menu do celular, onde o teclado tem emojis, não está de…" (mensagem cortada).
  **Aceite:** picker próprio embutido resolve mobile e desktop.

### Parte 4 do cadastro (tela de sucesso)
- [x] **CAD-10 (O-05) · ✨ P1 — Passo 1: compartilhar link + QR** ✅ 2026-06-17 — `onboarding.html`: copiar link do cliente, **botão "Enviar no WhatsApp" (wa.me)** com mensagem pronta, QR com download para impressão (já havia copiar + QR; faltava o wa.me direto).
  "Mande o link para seus clientes ou mostre este QR code."
  **Aceite:** botão de **copiar link** e **compartilhar** (mensagem pronta de WhatsApp ou similar) + link para gerar/imprimir o arquivo do QR code.

- [x] **CAD-11 (O-06) · 📝 P3 — Passo 2: link para a Página do Vendedor** ✅ 2026-06-17 — `onboarding.html`: aviso de que o link do vendedor usa o **mesmo e-mail e senha** deste cadastro.
  "Clique aqui para dar pontos aos clientes (Página do Vendedor)." CEO confirma que **já funciona** (basta logar com a mesma conta).
  **Aceite:** texto/explicação claros de que é a mesma conta; link presente. _(Tarefa de copy/validação; sem mudança funcional.)_

---

## 5. Itens a esclarecer com o CEO ([?])

- **MP-02** — a copy nova substitui a headline atual ou é seção adicional?
- **CAD-02** — Apple e Facebook entram no MVP? (custo/burocracia de provider)
- **CAD-09** — qual exatamente o problema do emoji no celular (mensagem veio truncada).

---

## 4.5 Rodada 2 — feedback do CEO pós-teste da Onda 0 (2026-06-16)

> Testes da Onda 0: **B-02 (câmera) confirmado OK** ✅. Novos itens abaixo.

- [x] **VEND-07 · 🎨 P1 — Scan deliberado (1 leitura → painel → ações)** ⭐ ✅ 2026-06-16 — `vendedor.html`: scan chama `getCard` (read-only) e abre painel único com progresso + entregar prêmio + adicionar pontos (opções `+1/+2/+3/+⌊x/2⌋/+x`) + tirar ponto + próximo cliente. Removida a caixa "Modo do Próximo Scan".
  Hoje, ao iniciar a câmera, o scan **auto-aplica** o "Modo do Próximo Scan" (por padrão dá +1 ponto na hora). Indesejado/superestimulante.
  **Desejado:** escanear **uma vez** o QR do cliente → abrir um painel **minimalista** com o estado do cartão e ações explícitas: **aplicar pontos**, **ver/entregar prêmio pendente** (marcar como resgatado), **tirar ponto** (correção). Sem mutação automática no scan.
  **Aceite:** 1 scan carrega o cliente (via `getCard`, read-only); pontuar e entregar prêmio são toques deliberados; fluxo limpo e rápido de pegar. _(Substitui a caixa "Modo do Próximo Scan"; engloba VEND-03.)_

- [x] **VEND-08 · ✨ P2 — QR de acesso do vendedor no dashboard** ✅ 2026-06-16 — `dashboard.html` aba Equipe: QR para `vendedor.html?empresa=ID` + instrução + copiar link.
  Na aba **Equipe**, junto ao QR de divulgação, um QR que leva à **página de login do vendedor** (`vendedor.html?empresa=ID`). O trabalhador (e-mail já pré-cadastrado pelo dono em Equipe) escaneia → loga → **cai direto no vendedor**. Dashboard continua só do dono.
  **Aceite:** QR presente na aba Equipe; escanear abre o login do vendedor da empresa correta; pós-login vai para o vendedor (não para o dashboard).

- [x] **B-08 · 🐛⚙️ P1 — Cadastro com e-mail já existente sobrescreve a empresa** ✅ 2026-06-16 — `onboarding.html`: login/social já cadastrado → redireciona ao dashboard (sem re-onboarding); signup com e-mail existente → toast "já cadastrado" + alterna p/ Login. Marca de "completo" = `linkUnicoCliente`.
  Repro: criar empresa X com um e-mail; recriar com o **mesmo e-mail** e link Y → ao logar aparece **Y** (sobrescreveu X). O e-mail (entidade) se sobrepõe ao link do cartão.
  **Desejado (produção):** se o e-mail/conta já tem empresa cadastrada → **feedback visual "e-mail já cadastrado" + CTA "fazer login"**; **não** permitir re-onboarding que sobrescreve. _(Ajuste de produto sobre B-01: o B-01 tirou o crash; falta impedir o overwrite no signup.)_

- [x] **TRIAL-01 · 📝🎨 P1 — Condições do trial de forma lúdica/minimalista (1 CTA)** ✅ 2026-06-16 (parcial) — card no passo 1 do onboarding (1 mês grátis, sem cartão, aviso 7 dias antes, paga antes mas vale após 30d, acesso encerra sem pagamento). **Pendente:** o aviso real de 7 dias antes (notificação/e-mail) e `nextDueDate = trialEndDate` no billing (Fase B).
  No onboarding (e onde fizer sentido), explicar com **1 movimento de CTA**: **1 mês grátis**, **sem cartão de crédito**, **avisamos 1 semana antes** perguntando se quer fechar o premium, **o acesso encerra ao fim do trial** salvo pagamento, e o **pagamento pode ser feito antes** — o **mês pago só começa a valer ao fim dos 30 dias** garantidos.
  **Aceite:** mensagem clara, didática e enxuta; usuário entende o trial sem fricção. _(Impacta billing: `createSubscription.nextDueDate = trialEndDate`, não hoje — ver Fase B.)_

- [x] **O-01 · 🎨 P1 — Botão Voltar entre etapas do onboarding** (CEO confirmou prioridade) ✅ 2026-06-16 — botão "Voltar" no passo 3 → passo 2 (preserva dados). Passo 1 é auth (sem voltar).
  Poder voltar a um passo anterior (ex.: do passo 3 visual para o passo 2 regras) antes de finalizar.
  **Aceite:** navegação para etapas anteriores disponível; dados preservados.

---

## 6. Relação com a auditoria de design (evitar retrabalho)

| Item CEO | Item Design | Observação |
|----------|-------------|------------|
| MP-01 | Plano M-03 | Mesmo overflow horizontal no header mobile |
| DASH-01 / DASH-03 | Plano M-01 / M-02 | Mesma falha de navegação mobile do dashboard |
| CAD-07 / CAD-08 | RELATÓRIO 5.5 | "excesso de fontes/escolhas no onboarding" + picker |
| VEND-05 / DASH-04 | (novo) | Contagem de trial não estava na auditoria — incluir |
| CAD-05 | (novo) | Bug de regras Firestore — fora do escopo de design, P0 |

> **Recomendação de PM:** atacar nesta ordem — **CAD-05 (P0, trava cadastro)** → bugs P1 do vendedor (VEND-03/04) e dashboard mobile (DASH-01/03) → features de trial (VEND-05/DASH-04) → demais melhorias. Os itens 🔗 podem ser feitos uma única vez resolvendo CEO + design juntos.

---

## Anexo — mensagem original do CEO (transcrição)

> **MAIN PAGE:** ta dando pra scrollar pro lado na pagina do celular pq tem um "cadastro gratis" no cabeçalho na direita. "cartão de pontos para celular." na main page. igual o cartão no papel, só que o cliente não perde por aí! sempre volta
>
> **PAGINA DO VENDEDOR:** um qrcode para a pagina do cliente na tela do vendedor, na parte de baixo da pagina. a caixa que ganhou um premio aparecer entre o qrcode e os pontos. quando escaneia o qrcode não está sumindo a caixa falando que voce tem prêmios (ex.: completei 1 cartão, a mensagem apareceu, eu li o qrcode, o cartão ganhou pontos e a caixa não sumiu). houve um bug que logando de novo no site do vendedor a camera ficou escura. mensagem mostrando quantos dias faltam para o mes gratis acabar na tela do vendedor, com link para comprar o plano. criar um botão para acesso a area de administração dashboard da empresa.
>
> **DASHBOARD:** Não consigo encontrar o botão para ir na pagina dos vendedores, nem em nenhuma aba do dashboard, usando pelo celular. Cabeçalho de celular está estranho, tudo muito apertado. vamos criar uma logica diferente, da melhor forma possivel para celulares, mas contendo todos os dados do dashboard de computador. mensagem em baixo do cabeçalho falando quantos dias faltam para o mês gratis acabar.
>
> **Pagina CADASTRO:** botar os termos de segurança no login das contas do google, apple e facebook. configurar o login com essas contas e email independente. fazer um sistema de cadastro do email que exija confirmação do email.
> *Parte 2:* Configuração dos Cartão de Pontos — Defina qual o prêmio e quantos pontos precisa para ganhar.
> *Parte 3:* ao finalizar apareceu "Erro ao salvar, missing or insuficient permisions". deixar na caixa do Título da Página já o nome da empresa (editável). Seleção de cores para celular está abrindo um menu com cores feias; muitos botões, confuso de achar — melhorar o menu de cor pro celular. escolha de emojis no computador está dificil pois é um campo de texto e o teclado do PC não tem emojis. no menu do celular, onde o teclado tem emojis, não está de… *(truncado)*
> *Parte 4:* "Seu Cartão Virtual está pronto! Agora vamos mostrar para todos." Passo 1: mande o Link ou mostre o QR code (forma de copiar/enviar o link, mensagem de WhatsApp) + link do arquivo para imprimir o QR. Passo 2: Clique aqui para dar pontos aos clientes (Página do Vendedor) — já funciona, é só logar com a mesma conta.
