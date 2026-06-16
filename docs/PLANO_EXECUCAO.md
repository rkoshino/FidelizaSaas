# Plano de Execução — Tem Pontinho
### Do diagnóstico à entrega · plano operacional por ondas

> **Base:** `RELATORIO_FINAL.md` (mapa master) · **Companion:** `TAREFAS_CEO.md`, `RELATORIO_DESIGN.md`
> **Data:** 2026-06-16 · **Status:** pronto para execução
> **Rastreabilidade:** mantém os IDs do relatório final (`B-01`, `M-01`, `$-03`…). Cite em commits/PRs: `fix(B-01): ...`.

---

## 0. Decisões do CEO — CONFIRMADAS (2026-06-16)

> As 5 decisões estratégicas foram respondidas pelo CEO. O plano agora executa sobre estas
> escolhas (não mais sobre defaults). ⛳ marca os IDs cujo escopo mudou em relação ao plano original.

| # | Decisão | **Definição do CEO** | Impacto no plano |
|---|---------|----------------------|------------------|
| D1 | Preço oficial | **R$ 19,90/mês + 1º mês grátis, sempre** | ⚠️ Muda o default (era R$10). Afeta **`billing.js` (hoje cria assinatura R$10)**, `$-03`, `$-01/$-02` (banner trial), `$-05` (MRR). Reconciliar TUDO para R$19,90. |
| D2 | Marca | **Logo ON HOLD.** Padronizar usando o **placeholder atual** (já está bom) em todas as telas; manter a tarefa do logo definitivo **em aberto**. | `V-01` vira "padronizar placeholder único + registrar pendência de logo", não "aplicar logo araras". |
| D3 | Tema do app | **Tema CLARO padronizado.** Paleta definitiva **a decidir** (usar paleta clara neutra como placeholder). | ⚠️ Muda o default (era escuro). `V-03` = migrar telas logadas p/ claro; paleta fica em aberto. |
| D4 | Apple/Facebook | **Fora do MVP** — só Google + e-mail/senha. **+ Necessidade do dev:** meio de **testar o cadastro sem criar e-mail novo** (e-mail de teste "reutilizável" ou rota que simula login). **NÃO é prioridade.** | `A-02` só Google+e-mail. Nova tarefa `T-DEV` (baixa prioridade) p/ test harness de cadastro. |
| D5 | Login do cartão do cliente | **Manter mínimo** — só o necessário para contabilizar o ponto no **menor número de movimentos** possível. | `C-01` reescopado: não remover login, e sim minimizar passos até pontuar. |

> **Mandato do CEO (prioridade-mestra):** *"gastar os tokens fazendo o MVP mínimo e completo funcional antes de luxos."*
> → Funcional (bugs, billing correto, mobile usável, monetização ligada) **vem antes** de polimento (Onda 5, pickers sofisticados).
> Documentar corretamente o progresso é parte do mandato.

---

## 1. Convenções

- **Estimativa:** **S** ≤ 0,5 dia · **M** ≈ 1 dia · **L** ≈ 2–3 dias.
- **Definition of Done (global):** funciona em mobile (320–430px) e desktop; sem erro no console; testado no fluxo real; sem regressão de billing/regras; copy em PT-BR revisada.
- **Tipos:** 🐛 Bug · ✨ Feature · 🎨 UI/UX · 📝 Copy · 🔒 Auth · ⚙️ Backend/Regras · 🧱 Fundação.

---

## ONDA 0 — Estancar o sangramento (bugs P0)
**Meta:** parar perdas ativas. Não depende de nenhuma decisão estratégica → **pode começar já.**
**Rollup:** ~3–4 dias · 1 dev.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **B-01** | ⚙️🐛 | **Cadastro falha ao finalizar ("missing or insufficient permissions").** Reproduzir e identificar a escrita negada. Duas hipóteses: (a) empresa sendo criada com **slug** como doc ID em vez do **uid** (regra `firestore.rules:45` exige `uid==empresaId`); (b) o finalizar tenta gravar `trialEndDate`/`statusAssinatura` pelo client, barrado por `camposProtegidosIntactos` (`:48-49`). **Fix:** criar a empresa em `empresas/{uid}` e guardar o slug como campo; setar trial via Cloud Function/`create` (não via update). | `onboarding.html`, `firestore.rules`, `functions/` | Cadastro completo finaliza sem erro; doc criado em `empresas/{uid}`; trial gravado corretamente; regras continuam bloqueando billing via client | M |
| **B-02** | 🐛 | **Câmera do vendedor escurece ao relogar.** Investigar reuso do stream `html5-qrcode` após logout/login (provável `Html5Qrcode` não parado/recriado). Garantir `stop()`/`clear()` no logout e recriação no login. | `vendedor.html` | Logout→login reabre a câmera com vídeo ativo, sem tela preta, repetidamente | M |
| **B-03** | 🐛 | **Caixa "você tem prêmios" não some após pontuar.** Após um scan que pontua/zera, reavaliar `premiosPendentes` e re-renderizar (esconder/atualizar a caixa) sem refresh manual. | `vendedor.html` | Completar cartão → ler QR → caixa de prêmio atualiza/some automaticamente | S |
| **B-04** | 🐛 | **`deleteDoc` não importado** → "Excluir conta" quebra. Adicionar `deleteDoc` ao import de `config.js` em `dashboard.html` (já exportado em `config.js:138`). | `dashboard.html:798-811` | Excluir conta executa sem `ReferenceError` | S |
| **$-04** | ⚙️🐛 | **Paywall vaza escritas.** Estender `setWriteButtonsDisabled` (`dashboard.html:1535`) para também desabilitar "Editar Regras", "Novo Vendedor", PIX, salvar-slug e excluir-conta no estado bloqueado. | `dashboard.html` | Com assinatura inativa, nenhuma ação de escrita fica clicável | S |
| **B-07** | 🐛 | Remover `<script>` `canvas-confetti` duplicado. | `cliente.html:9,32` | Só um carregamento do script | S |

> **Marco 0:** "Nada trava." Cadastro conclui, vendedor opera, conta exclui, paywall íntegro.

---

## ONDA 1 — Mobile-first de verdade
**Meta:** o produto funciona de fato no celular (público principal).
**Rollup:** ~4–5 dias.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **M-01** | 🎨 | **Navegação mobile do dashboard.** Hoje `aside` é `hidden md:flex` (`:81`). Adicionar menu mobile (hambúrguer ou barra inferior) com as 4 abas (Visão Geral, Clientes, Equipe, Assinatura). | `dashboard.html` | No celular dá pra acessar todas as abas, incl. Vendedores | M |
| **M-02** | 🎨 | **Reflow mobile do dashboard.** Header desapertado; stats `grid-cols-1 sm:grid-cols-4` → incluir passo `grid-cols-2`; **tabela de clientes em cards** no mobile (hoje tabela de 6 col em `overflow-x-auto`). Manter **paridade de dados** com desktop. | `dashboard.html` | Todos os dados do desktop acessíveis e legíveis no celular | L |
| **M-03** | 🐛 | **Overflow horizontal da home.** Header com "Cadastro Grátis" estoura largura no celular. Conter (`max-w`/`flex-wrap`/`overflow-x-hidden` na raiz) sem mascarar a causa. | `index.html` | Sem scroll lateral em 320–430px | S |
| **M-04** | 🎨 | Home mobile: manter "Login" acessível (hambúrguer ou ícone) e conter os cards flutuantes do mockup (`-left-12`/`-right-8`) para não vazar/cobrir o texto < 400px. | `index.html` | Login acessível no mobile; mockup não invade a copy | M |
| **M-05** | 🎨 | **Alvos de toque ≥ 44px** nos botões de ação (tabela dashboard `px-2 py-1.5`, modo/logout do vendedor `py-2`, kebab/"Voltar" do cliente). | `dashboard.html`, `vendedor.html`, `cliente.html` | Alvos principais ≥ 44px | M |

> **Marco 1:** "Usável no bolso." Dono gerencia tudo pelo celular; home sem bug de scroll.

---

## ONDA 2 — Identidade única & tipografia (🧱 fundação)
**Meta:** o maior salto de percepção pelo menor esforço. ⛳ depende de D2/D3.
**Rollup:** ~2–3 dias.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **F-00** | 🧱 | **Fundação de marca compartilhada.** Criar `assets/brand.js` (ou snippet copiável): SVG do logo oficial ⛳(D2), variáveis de cor, config Tailwind (incl. `outfit`) e `<link>` do Google Fonts com Outfit. | novo `assets/brand.js` | Um único ponto define logo/cores/fontes | M |
| **V-02** | 🐛🧱 | **Carregar/configurar a fonte `Outfit`** onde falta: `dashboard.html` (27×), `onboarding.html` (7×), `cliente.html`, `vendedor.html`. (Aplicar via F-00.) | 4 arquivos | Títulos renderizam em Outfit em todas as telas | S |
| **V-01** | 🎨 | **Logo único** em todas as telas (substitui diamante/estrela/"sem logo"). ⛳(D2) | login, onboarding, dashboard, cliente, vendedor | Mesma marca em 100% das telas | S |
| **V-03** | 🎨 | Suavizar a quebra landing clara → app escuro: aplicar marca/cores unificadas no app ⛳(D3). | telas logadas | Transição coerente de marca pós-cadastro | M |
| **V-06** | 📝 | Remover jargão vazado: "White Label" (`cliente.html:182`, onboarding), "empresaId" (`dashboard.html:544`), instruções de dev no erro de link (`cliente.html:304`). | cliente, onboarding, dashboard | Zero termo interno visível ao usuário | S |

> **Marco 2:** "Parece um produto só." Marca e tipografia consistentes ponta a ponta.

---

## ONDA 3 — Monetização & trial
**Meta:** ligar o motor grátis→pago. ⛳ depende de D1 (preço).
**Rollup:** ~3 dias.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **$-03** | 📝 | **Reconciliar o preço** ⛳(D1) em landing (`index.html` R$ 19,90/R$ 12,41), dashboard (R$ 10) e master-admin (MRR `*49`). Valor único e coerente. | index, dashboard, master-admin | Mesmo preço em todas as superfícies | S |
| **$-01** | ✨ | **Banner de trial no vendedor**: "Faltam N dias do mês grátis" + CTA "assinar". Calcular de `trialEndDate`. | `vendedor.html` | Banner com contagem correta + CTA leva ao fluxo de assinatura | M |
| **$-02** | ✨ | **Banner de trial no dashboard** (abaixo do cabeçalho), mesma lógica/CTA. | `dashboard.html` | Banner abaixo do header com contagem + CTA | S |
| **$-05** | ⚙️ | MRR real (ou rótulo "estimativa") no master-admin em vez de `ativas*49`. | `master-admin.html` | Número reflete o preço oficial/realidade | S |

> **Componente compartilhado:** `$-01`/`$-02` usam a mesma função "dias restantes do trial" — implementar uma vez e reusar.
> **Marco 3:** "O grátis vira pago." Usuário vê o fim do trial e o caminho de compra em todo lugar.

---

## ONDA 4 — Cadastro, compartilhamento & auth
**Meta:** reduzir atrito do funil de entrada e fechar o ciclo criar→compartilhar.
**Rollup:** ~5–6 dias.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **O-05** | ✨ | **Etapa 4 (compartilhar):** botão **copiar link**, **enviar via WhatsApp** (`wa.me` com mensagem pronta) e link para o **arquivo de QR para impressão**. | `onboarding.html` | Dono copia/compartilha o link e baixa/imprime o QR | M |
| **A-01** | 🔒 | **Confirmação de e-mail** no cadastro por e-mail (`sendEmailVerification`); bloquear/avisar até confirmar. | `onboarding.html`/`login.html`, `config.js` | Cadastro por e-mail exige verificação | M |
| **B-05** | 🔒 | **Reset de senha real** ("Esqueceu a senha?" hoje é `href="#"`) via `sendPasswordResetEmail`. | `login.html`, `config.js` | Link dispara e-mail de reset funcional | S |
| **A-03** | 🔒📝 | Exibir **termos de segurança** no login social ⛳(D4 define quais provedores). | login/onboarding | Aceite/sinalização de termos antes de concluir | S |
| **A-02** | 🔒 | Configurar provedores Google/e-mail de forma independente (Apple/Facebook ⛳ fora do MVP por D4). | config Firebase, `login.html` | Login Google e e-mail funcionam isolados | M |
| **V-04** | 🎨 | **Seletor de cores mobile**: paleta curada de poucas opções, bonita e fácil de achar (substitui o input nativo). | `onboarding.html` | Picker simples e agradável no celular | M |
| **V-05** | 🎨 | **Seletor de emoji embutido** (grid clicável) que funciona no **desktop** sem depender do teclado do SO — resolve também o caso mobile (CAD-09). | `onboarding.html` | Escolher emoji por clique em qualquer dispositivo | M |
| **O-03** | 🎨 | "Título da Página" **pré-preenchido** com o nome da empresa (editável). | `onboarding.html` | Campo inicia com o nome informado | S |
| **O-01** | 🎨 | Botão **Voltar** entre etapas do onboarding. | `onboarding.html` | Dá pra voltar e corrigir etapas anteriores | S |
| **O-04** | 🎨 | Validação **por campo** (substitui toast genérico "preencha todos"). | `onboarding.html` | Erros mostrados no campo específico | S |
| **O-02** | 📝 | Copy etapa 2: "Configuração do Cartão de Pontos — Defina o prêmio e quantos pontos para ganhar." | `onboarding.html` | Texto aplicado | S |
| **O-06** | 📝 | Etapa 4 passo 2: deixar claro que é a mesma conta do vendedor. | `onboarding.html` | Texto claro; link presente | S |
| **C-02** | ✨ | **QR da página do cliente no rodapé do vendedor.** | `vendedor.html` | QR no rodapé abre a página do cliente | M |
| **C-03** | 🎨 | Reordenar vendedor: QR → caixa de prêmio → pontos. | `vendedor.html` | Ordem visual conforme pedido (depende de C-02) | S |
| **C-04** | ✨ | Botão no vendedor para abrir o **dashboard**. | `vendedor.html` | Botão leva ao `dashboard.html` | S |
| **C-05** | 📝 | Reforço de valor na home ("igual ao cartão de papel, mas o cliente não perde; sempre volta") ⛳(MP-02 a confirmar formato). | `index.html` | Mensagem com destaque no hero/feature | S |

> **Marco 4:** "Entrar e divulgar é fácil." Cadastro fluido, auth sólido, dono compartilha em 1 clique.

---

## ONDA 5 — Acessibilidade, estados & elegância
**Meta:** o "1% a mais" — produto barato com cara de premium.
**Rollup:** ~4–5 dias.

| ID | Tipo | Tarefa | Arquivos | Critério de aceite | Est. |
|----|------|--------|----------|--------------------|------|
| **X-01** | 🎨 | Substituir `alert/confirm/prompt` nativos por toast/modal (reusar `showToast`/`alert-card`). | cliente, vendedor, dashboard | Sem diálogo nativo em fluxo de usuário | M |
| **X-02** | 🎨 | Corrigir contraste (`text-slate-500/600`, `text-white/40`) e subir textos `text-[9-11px]` para ≥ 12px. | múltiplos | Texto principal passa WCAG AA | M |
| **X-05** | 🎨 | Loading real (skeleton), estado **offline** e erro de rede no cliente (corrige "Carregando…" eterno, B-06). | cliente | Estados de loading/offline/erro visíveis | M |
| **C-01** | 🎨 | **Reduzir fricção do cartão do cliente** ⛳(D5): mostrar loja/prêmio/progresso antes do login; priorizar Google 1-tap. | cliente | Valor visível antes da barreira de login | L |
| **C-06** | 🎨 | Empty states de boas-vindas (cliente novo "falta pouco p/ 1º prêmio"; loja nova no overview). | cliente, dashboard | Telas vazias acolhem em vez de zerar | M |
| **X-03** | 🎨 | Foco de teclado visível (remover `focus:outline-none` solto, anel `focus-visible`). | múltiplos | Navegação por teclado visível | S |
| **X-04** | 🎨 | `aria-live` (resultado de scan), `aria-label` em botões só-ícone, alt no QR. | cliente, vendedor | Leitor de tela anuncia ações | S |
| **X-06** | ⚙️ | Confirmação ao **bloquear lojista** no master-admin (`:809`). | master-admin | Bloqueio exige confirmação | S |
| **X-07** | 🎨 | Respeitar `prefers-reduced-motion` nas animações (confete/carimbo). | cliente | Animações reduzidas quando solicitado | S |

> **Marco 5:** "Impecável." Acessível, com estados completos e deleite consciente.

---

## 2. Sequência, paralelização e caminho crítico

```
Onda 0 (bugs)  ──┐
                 ├─ pode rodar em paralelo à decisão de preço/marca
Decisões D1–D5 ──┘
        │
        ▼
Onda 1 (mobile) ──► Onda 2 (marca) ──► Onda 3 (trial) ──► Onda 4 (cadastro/auth) ──► Onda 5 (polimento)
```

- **Começar imediatamente:** Onda 0 (independe de tudo) + coletar decisões D1–D5.
- **Paralelizável:** dentro de cada onda, tarefas de arquivos diferentes podem ir em paralelo (ex.: M-03/M-04 na home enquanto M-01/M-02 no dashboard).
- **Caminho crítico:** F-00 (fundação) destrava V-01/V-02/V-03 — fazer cedo na Onda 2.
- **Componentes reusados:** "dias de trial" ($-01/$-02), picker de emoji (V-05 cobre CAD-08+09), toast (X-01) — implementar uma vez.

**Estimativa total:** ~21–26 dias-dev (~4–5 semanas com 1 dev; ~2,5–3 com 2 devs paralelizando ondas).

---

## 3. Riscos & mitigação

| Risco | Mitigação |
|-------|-----------|
| Fix de regras (B-01) reabrir furo de billing | Testar com a suíte de regras; manter `camposProtegidosIntactos`; setar trial só via Admin SDK |
| Refactor mobile do dashboard (M-02) virar reescrita | Escopo travado em "paridade de dados", não redesign; reusar componentes existentes |
| Decisão de preço/marca atrasar | Ondas 0 e 1 não dependem delas; seguir com padrões assumidos e reverter se preciso |
| Auth (A-01/A-02) depender de config externa (Firebase console) | Listar pré-requisitos de console antes; não bloquear UI |
| Mudança no cartão do cliente (C-01) afetar conversão | Medir antes/depois; tratar como experimento reversível |

---

## 4. Rastreabilidade

- IDs deste plano = IDs do `RELATORIO_FINAL.md` (§4) → cruzam com `TAREFAS_CEO.md` e `RELATORIO_DESIGN.md`.
- Sugerido: criar issues/PRs por ID. Um PR pode fechar vários IDs da mesma onda/arquivo.
- Conforme entregar, marcar `[x]` no `TAREFAS_CEO.md` e atualizar o `HANDOFF.md`.

---

## 5. Recomendação de arranque

1. **Hoje:** abrir a **Onda 0** (B-01 primeiro — é o que mais sangra) e enviar as 5 decisões (D1–D5) para o CEO.
2. **Assim que B-01 fechar:** validar cadastro ponta a ponta em device real.
3. **Em paralelo:** preparar **F-00** (fundação de marca) para a Onda 2 já começar sem atrito.

> Quer que eu comece pela **Onda 0 / B-01** agora (reproduzir e corrigir o erro de permissões do cadastro)? É a correção de maior impacto imediato e não depende de nenhuma decisão estratégica.
