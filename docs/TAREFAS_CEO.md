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

| ID | Tipo | O quê | Arquivo |
|----|------|-------|---------|
| **CAD-05** | ⚙️ P0 | "Erro ao salvar, missing or insufficient permissions" ao finalizar o cadastro | `onboarding.html` + `firestore.rules` |
| **VEND-04** | 🐛 P1 | Câmera fica escura ao logar de novo no painel do vendedor | `vendedor.html` |
| **VEND-03** | 🐛 P1 | Caixa "você tem prêmios" não some após escanear e pontuar | `vendedor.html` |
| **DASH-01** | 🐛 P1 | No celular não há como chegar na aba de Vendedores/Equipe | `dashboard.html` 🔗 |
| **MP-01** | 🐛 P1 | Página principal scrolla pro lado no celular (botão "Cadastro Grátis" no header) | `index.html` 🔗 |

---

## 1. MAIN PAGE (`index.html`)

- [ ] **MP-01 · 🐛 P1 — Scroll horizontal no mobile** 🔗
  No celular dá pra arrastar a página pro lado por causa do botão "Cadastro Grátis" no canto direito do cabeçalho.
  **Aceite:** sem overflow horizontal em telas 320–430px; header não estoura a largura.

- [ ] **MP-02 · 📝 P2 — Reforçar a proposta de valor na home**
  Incluir/ajustar copy: **"Cartão de pontos para celular"** e o mote **"Igual ao cartão de papel, só que o cliente não perde por aí! Sempre volta."**
  **Aceite:** mensagem aparece com destaque na main page (hero ou seção de features), no tom popular já usado.
  _[?] Confirmar com CEO se substitui a headline atual ou entra como subtítulo/seção._

---

## 2. PÁGINA DO VENDEDOR (`vendedor.html`)

- [ ] **VEND-01 · ✨ P2 — QR code da página do cliente no painel do vendedor**
  Exibir um QR code que leva à página do cliente, na **parte de baixo** da tela do vendedor.
  **Aceite:** QR visível no rodapé do painel; ao escanear, abre a página do cliente correta.

- [ ] **VEND-02 · 🎨 P2 — Reposicionar a caixa de "ganhou prêmio"**
  A caixa de prêmio deve aparecer **entre o QR code e os pontos**.
  **Aceite:** ordem visual = QR → caixa de prêmio → pontos. _(Depende de VEND-01.)_

- [ ] **VEND-03 · 🐛 P1 — Caixa de prêmio não some após pontuar**
  Repro do CEO: completei 1 cartão → mensagem de prêmio apareceu → li o QR → cartão ganhou pontos → **a caixa não sumiu**.
  **Aceite:** após um scan que pontua/zera o cartão, o estado de prêmio é reavaliado e a caixa some/atualiza sozinha (sem refresh manual).

- [ ] **VEND-04 · 🐛 P1 — Câmera escura ao relogar**
  Ao logar de novo no site do vendedor, a câmera ficou escura.
  **Aceite:** reabrir/relogar reinicia o stream da câmera corretamente; sem tela preta. _(Investigar reuso de stream do html5-qrcode após logout/login.)_

- [ ] **VEND-05 · ✨ P1 — Aviso de fim do mês grátis (vendedor)**
  Mensagem mostrando **quantos dias faltam** para o mês grátis acabar, **com link para comprar o plano**.
  **Aceite:** banner com contagem de dias (baseado em `trialEndDate`) + CTA para a página/fluxo de assinatura. _(Mesma fonte de dados do DASH-04.)_

- [ ] **VEND-06 · ✨ P2 — Botão de acesso ao dashboard da empresa**
  Criar botão no painel do vendedor para abrir a área de administração (dashboard).
  **Aceite:** botão visível leva ao `dashboard.html` (respeitando login da mesma conta).

---

## 3. DASHBOARD (`dashboard.html`)

- [ ] **DASH-01 · 🐛 P1 — Aba de Vendedores inacessível no mobile** 🔗
  No celular não há como chegar na página dos vendedores nem em nenhuma aba.
  **Aceite:** todas as abas (Visão Geral, Clientes, Equipe/Vendedores, Assinatura) acessíveis no celular.

- [ ] **DASH-02 · 🎨 P1 — Cabeçalho mobile apertado**
  Cabeçalho do dashboard no celular está "estranho, tudo muito apertado".
  **Aceite:** header legível e espaçado em 320–430px.

- [ ] **DASH-03 · 🎨 P1 — Layout mobile do dashboard (epic)**
  Criar uma lógica de layout pensada para celular, **mantendo todos os dados** do dashboard de computador.
  **Aceite:** paridade de informação desktop↔mobile; navegação e tabelas usáveis no celular (ex.: tabela de clientes em cards).
  _(Guarda-chuva que engloba DASH-01 e DASH-02.)_

- [ ] **DASH-04 · ✨ P1 — Aviso de fim do mês grátis (dashboard)**
  Mensagem **abaixo do cabeçalho** com quantos dias faltam para o mês grátis acabar.
  **Aceite:** banner com contagem de dias (de `trialEndDate`) + CTA de assinatura. _(Mesma lógica do VEND-05.)_

---

## 4. PÁGINA DE CADASTRO (`onboarding.html`) + Auth (`login.html` / `config.js`)

### Autenticação / segurança
- [ ] **CAD-01 · 🔒 P2 — Termos de segurança no login social**
  Exibir os termos de segurança no login com Google, Apple e Facebook.
  **Aceite:** aceite/sinalização de termos presente antes de concluir login via provedor social.

- [ ] **CAD-02 · 🔒 P1 — Provedores independentes + verificação de e-mail**
  Configurar login Google/Apple/Facebook e e-mail de forma independente, e criar cadastro por e-mail que **exija confirmação de e-mail**.
  **Aceite:** providers funcionam isoladamente; cadastro por e-mail dispara verificação e só libera após confirmar.
  _[?] Confirmar com CEO se Apple/Facebook são realmente para o MVP (custo/config de provider)._

### Parte 2 do cadastro
- [ ] **CAD-03 · 📝 P3 — Copy da etapa 2**
  Atualizar para: **"Configuração do Cartão de Pontos — Defina qual o prêmio e quantos pontos precisam para ganhar."**
  **Aceite:** título/descrição da etapa 2 com esse texto.

### Parte 3 do cadastro
- [ ] **CAD-05 · ⚙️ P0 — Erro ao finalizar: "missing or insufficient permissions"** ⚠️ bloqueante
  Ao clicar para finalizar o cadastro, erro "Erro ao salvar, missing or insufficient permissions".
  **Aceite:** cadastro finaliza sem erro; gravação respeita `firestore.rules`. _(Investigar regras de escrita do doc da empresa/onboarding — provável regra negando o create/update na conclusão.)_

- [ ] **CAD-06 · 🎨 P2 — Pré-preencher "Título da Página" com o nome da empresa**
  O campo já deve vir com o nome da empresa; a pessoa muda se quiser.
  **Aceite:** campo "Título da Página" inicia com o nome informado, editável.

- [ ] **CAD-07 · 🎨 P1 — Seletor de cores no celular**
  No mobile abre um menu com cores feias; há botões demais e é confuso de achar onde escolher a cor.
  **Aceite:** picker de cores simples e bonito no celular (paleta curada de poucas opções), fácil de localizar.

- [ ] **CAD-08 · 🐛 P1 — Seletor de emoji no desktop**
  No computador é um campo de texto e o teclado não tem emojis instalados → difícil escolher.
  **Aceite:** picker de emojis embutido (grid clicável), funciona no desktop sem depender do teclado do SO.

- [ ] **CAD-09 · 🐛 P2 — Seletor de emoji no celular** ⚠️ descrição truncada
  CEO: "no menu do celular, onde o teclado tem emojis, não está de…" (mensagem cortada).
  **Aceite:** _[?] confirmar com CEO o problema exato no mobile (provável: o teclado de emoji não abre / não preenche o campo). Tratar junto do CAD-08 com um picker próprio resolve ambos._

### Parte 4 do cadastro (tela de sucesso)
- [ ] **CAD-10 · ✨ P1 — Passo 1: compartilhar link + QR**
  "Mande o link para seus clientes ou mostre este QR code."
  **Aceite:** botão de **copiar link** e **compartilhar** (mensagem pronta de WhatsApp ou similar) + link para gerar/imprimir o arquivo do QR code.

- [ ] **CAD-11 · 📝 P3 — Passo 2: link para a Página do Vendedor**
  "Clique aqui para dar pontos aos clientes (Página do Vendedor)." CEO confirma que **já funciona** (basta logar com a mesma conta).
  **Aceite:** texto/explicação claros de que é a mesma conta; link presente. _(Tarefa de copy/validação; sem mudança funcional.)_

---

## 5. Itens a esclarecer com o CEO ([?])

- **MP-02** — a copy nova substitui a headline atual ou é seção adicional?
- **CAD-02** — Apple e Facebook entram no MVP? (custo/burocracia de provider)
- **CAD-09** — qual exatamente o problema do emoji no celular (mensagem veio truncada).

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
