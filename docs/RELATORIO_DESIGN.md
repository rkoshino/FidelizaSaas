# Relatório de Design — Tem Pontinho

> Consultoria de design sênior · revisão de UI/UX do produto inteiro (web + mobile)
> Data: 2026-06-16 · Autor: revisão de design assistida
> Escopo: landing, autenticação, app do cliente, painel do vendedor, onboarding, dashboard do dono, master-admin.

---

## 0. Como ler este documento

- **`RELATORIO_DESIGN.md`** (este arquivo) = o diagnóstico: o que vi, por que importa, com referências `arquivo:linha`.
- **`PLANO_EXECUCAO.md`** = o que fazer, em ondas, com critério de aceite e estimativa.

Severidade usada nas tabelas:
🔴 Crítico (quebra, fura a proposta ou trava o usuário) · 🟡 Moderado (atrito real) · 🟢 Polimento.

---

## 1. Sumário executivo

O Tem Pontinho **já tem um bom esqueleto de produto**: a landing é bonita e converte bem, a microcópia em PT-BR é excelente, os fluxos centrais existem e há detalhes de carinho (confete ao ganhar prêmio, simulador de celular ao vivo no onboarding, som + vibração no scan do vendedor). O problema **não é falta de talento — é falta de coesão e de acabamento**. Três coisas drenam a percepção de qualidade e contradizem a promessa "simples, sólido e barato":

1. **Identidade de marca fragmentada.** O produto tem **cinco marcas diferentes** em sete telas: araras na landing (clara), diamante no login/onboarding/dashboard (escuro), estrela ✶ no cliente, nenhum logo no vendedor, escudo no master-admin. Quem clica em "Cadastrar Grátis" na landing clara e amigável é jogado num onboarding escuro com outro logo. Isso sozinho faz o produto parecer um conjunto de protótipos colados, não um produto.

2. **A promessa "mobile-first" está literalmente quebrada no dashboard.** O menu lateral é `hidden md:flex` sem alternativa de menu mobile — **no celular o dono não consegue trocar de aba.** Para um produto cujo público é dono de comércio popular operando do telefone, isso é uma falha estrutural.

3. **Acabamento inconsistente.** Tipografia que silenciosamente não carrega (`font-outfit` usado 27× no dashboard sem estar configurado), `alert()/confirm()` nativos no meio de fluxos mobile, preço da landing (R$ 19,90) que contradiz a meta e o billing real (R$ 10), e lacunas de acessibilidade repetidas (contraste, alvos < 44px, foco invisível).

A boa notícia: **quase tudo isso é barato de corrigir** dado o stack (HTML + Tailwind via CDN, sem build). O maior ganho de percepção — unificar a marca — é essencialmente decidir **um** logo, **um** par de cores e **um** posicionamento de tema, e replicar. Nenhuma reescrita é necessária.

---

## 2. Metodologia e limitações

- **Telas públicas (landing, login):** inspeção visual ao vivo em `tempontinho.com` via Chrome, desktop 1440px.
- **Telas autenticadas (cliente, vendedor, onboarding, dashboard, master-admin):** auditoria de código (HTML/Tailwind/JS), pois exigem login. Cada achado referencia `arquivo:linha`.
- **Mobile:** a emulação mobile ao vivo não funcionou de forma confiável nesta sessão (o Chrome no macOS força largura mínima de janela ~500px e a captura ficou presa em viewport de 1920px; a extensão de mobile-view não é clicável por automação porque o navegador roda em tier somente-leitura). Portanto **a avaliação mobile foi feita lendo as classes responsivas do Tailwind** (base vs `sm/md/lg`) — base sólida para julgar reflow, mas recomendo um passe final com device real / DevTools nos pontos marcados.
- **Achados de código foram verificados** por grep direto no repositório (ver §6).

---

## 3. Produto vs. design entregue (a régua)

A proposta declarada é: **cartão fidelidade digital, sem complicação, barato (~R$ 10/mês), mobile-first**. Essa régua define o que é "bom o suficiente":

- **"Sem complicação"** → menos escolhas, menos jargão, menos passos. Hoje o onboarding pede slug com `cliente.html?link=` cru, 5+ fontes de display para escolher, e o app do cliente exige login **antes** de ver o cartão.
- **"Barato/popular"** → não precisa de animações sofisticadas nem design system gigante; precisa de **consistência e robustez**. É exatamente onde está o buraco.
- **"Mobile-first"** → o celular é o dispositivo principal de todos os três públicos (cliente, vendedor, dono). Hoje o dashboard quebra no celular e vários alvos de toque estão abaixo de 44px.

Conclusão: o trabalho certo aqui **não é mais design — é mais disciplina de design.** Padronizar, não enfeitar.

---

## 4. Achados transversais (afetam o produto inteiro)

### 4.1 🔴 Identidade de marca fragmentada
| Tela | Tema | Marca |
|------|------|-------|
| `index.html` (landing) | Claro (`#f8fafc`) | SVG de **duas araras** (gradiente índigo/ciano) |
| `login.html` | Escuro (`slate-950`) | **Diamante** (`fa-gem`) |
| `onboarding.html` | Escuro | Diamante (`fa-gem`) + selo "MVP 1.0 / White Label" |
| `dashboard.html` | Escuro | Diamante (`fa-gem`) |
| `cliente.html` | Escuro | **Estrela** `✶` (glyph) |
| `vendedor.html` | Escuro | **Nenhum** logo (`fa-user-shield`) |
| `master-admin.html` | Escuro | Escudo (`fa-shield-halved`) — *aceitável por ser interno* |

A transição mais danosa: **landing clara → onboarding escuro**, logo após o clique de maior intenção ("Cadastrar Grátis").

### 4.2 🔴 Tipografia display não carrega (bug silencioso e generalizado)
A classe `font-outfit` é usada mas **não está registrada no Tailwind nem carregada do Google Fonts** em 4 arquivos — então todos os títulos caem para a fonte padrão sem ninguém perceber:

| Arquivo | Usos de `font-outfit` | Configurada? | Fonte carregada? |
|---|---|---|---|
| `index.html` | 10 | ✅ | ✅ |
| `login.html` | 1 | ✅ | ✅ |
| `dashboard.html` | **27** | ❌ | ❌ |
| `onboarding.html` | 7 | ❌ | ❌ |
| `cliente.html` | 1 | ❌ | ❌ |
| `vendedor.html` | 1 | ❌ | ❌ |

Ou seja: a marca tipográfica que aparece bonita na landing **não existe em nenhuma tela logada.** Correção trivial (carregar Outfit + registrar no config), impacto visual grande.

### 4.3 🔴 "Mobile-first" quebrado no dashboard
`dashboard.html:81` — a navegação é `<aside class="... hidden md:flex">` sem hambúrguer nem fallback. Em telefone (público-alvo!), o dono **perde o acesso às abas** Visão Geral / Clientes / Equipe / Assinatura. O `master-admin.html` tem o mesmo padrão desktop-only (aceitável por ser interno).

### 4.4 🟡 Inconsistência de preço (landing vs. produto)
- Landing (`index.html:306/323/325`): **R$ 19,90/mês** ou **R$ 149,00/ano (R$ 12,41/mês)**.
- Meta de negócio declarada e billing real: **R$ 10,00/mês** (`dashboard.html:452` e modal PIX `:735` mostram R$ 10,00).

A landing promete um preço, o checkout cobra outro. Além de erodir confiança, contradiz o argumento "barato". **Definir o número e propagar.**

### 4.5 🟡 Diálogos nativos `alert()/confirm()/prompt()` no meio dos fluxos
Aparecem em `cliente.html` (323, 577, 580), `vendedor.html` (372, 422), `dashboard.html` (1298, 1352, 1660, 1892…). Em mobile eles são feios, bloqueiam a tela e quebram a linguagem visual — pior, alguns expõem `err.message` técnico ao consumidor final. Já existe um `showToast` bonito no dashboard e um `alert-card` no vendedor; é só usar o que já existe.

### 4.6 🟡 Acessibilidade — padrões repetidos
- **Contraste:** uso recorrente de `text-slate-500/600` e `text-white/40-60` em fundo escuro, e textos `text-[9px]/[10px]/[11px]` por todo lado — falham WCAG AA para texto pequeno.
- **Alvos de toque < 44px:** botões de modo/remover do vendedor (`py-2`), logout (`px-2 py-1`), kebab do cliente, ações da tabela do dashboard (`px-2 py-1.5 text-xs`), checkboxes 16px.
- **Foco invisível:** `focus:outline-none` aplicado amplamente sem anel substituto — navegação por teclado fica cega.
- **Labels/aria:** QR do cliente sem alt/aria; botões só-ícone sem `aria-label`; alertas sem `aria-live` (leitor de tela não anuncia o resultado do scan).

### 4.7 🟡 Cobertura de estados
Celebração/sucesso são fortes em todo o produto. Faltam consistentemente: **skeleton/loading real** (hoje é texto "Carregando…"), **empty states de boas-vindas** (cliente novo com 0 pontos; loja nova com 0 clientes), **estado offline** (inexistente no cliente), e **erro de rede** — em `cliente.html:311` o `catch` do branding deixa "Carregando..." para sempre.

---

## 5. Crítica por tela

### 5.1 Landing (`index.html`) — clara, escuro só aqui
**Primeira impressão:** forte. Headline "O fim dos cartõezinhos de papel" com "papel" riscado é ótima, dual-CTA claro, microcópia de confiança ("Setup em 2 min", "Sem cartão de crédito").

| Achado | Sev. | Recomendação |
|---|---|---|
| Sem prova social (zero depoimentos/FAQ/"como funciona") | 🟡 | A conversão depende só de claims. Add 2–3 depoimentos reais + bloco "como funciona" em 3 passos. |
| Fotos de stock genéricas (Unsplash) | 🟢 | Trocar por lojistas reais aumenta credibilidade no nicho. |
| Cards flutuantes do mockup posicionados fora do container (`-left-12`/`-right-8`) | 🟡 | Só não vazam por `overflow-x:hidden`; em < 400px tendem a colar/cobrir o texto. Restringir no mobile. |
| "Login" some em < 640px (`hidden sm:block`) e não há hambúrguer | 🟡 | No celular sobra só "Cadastrar"; quem já é cliente não acha o login. |
| Cookie banner `fixed bottom-0` cobre a última seção/CTA de preço | 🟡 | Garantir que não tampe o CTA final no mobile. |
| Preço R$ 19,90 ≠ meta R$ 10 | 🟡 | Ver §4.4. |

**O que funciona:** hierarquia visual, copy, paleta clara e leve, responsividade do hero (`grid-cols-1 lg:grid-cols-2`) e dos cards de preço (`grid-cols-1 md:grid-cols-2`).

### 5.2 Login (`login.html`) — escuro, diamante
| Achado | Sev. | Recomendação |
|---|---|---|
| "Esqueceu a senha?" aponta para `href="#"` (link morto) | 🔴 | Implementar reset de senha (Firebase tem pronto) ou esconder até existir. |
| Sem mostrar/ocultar senha | 🟡 | Adicionar o "olho" — atrito real ao digitar senha no celular. |
| Erro de credencial só em toast no canto superior | 🟡 | Mostrar inline abaixo do campo; toast some fácil no mobile. |
| Tema/logo divergem da landing | 🟡 | Ver §4.1. |

**O que funciona:** layout limpo e centrado, labels reais, anel de foco visível (`focus:ring-indigo-500`), estados de loading nos botões ("Acessando…", "Conectando…").

### 5.3 App do cliente (`cliente.html`) — a tela mais importante do produto
É aqui que mora a promessa "escaneou → vê o cartão". Hoje há atrito que contradiz isso.

| Achado | Sev. | Recomendação |
|---|---|---|
| **Login obrigatório antes de ver o cartão** | 🔴 | A proposta é "sem complicação". Exigir Google/Facebook/Apple/e-mail antes de mostrar qualquer coisa é o maior atrito do produto. Mostrar nome da loja/prêmio e o progresso **antes** do login; priorizar 1-tap Google. |
| Rodapé "Alimentado por White Label" | 🔴 | Jargão interno vazado para o consumidor; parece app quebrado. Remover/trocar. |
| `catch` do branding deixa "Carregando…" eterno (`:311`) | 🔴 | Estado de erro com retry. |
| Script `canvas-confetti` duplicado (`:9` e `:32`) | 🟢 | Remover duplicata. |
| `alert()` para erros de auth (`:323/577/580`) expõe `err.message` | 🟡 | Toast/inline. |
| Grade de carimbos `w-10 h-10` (40px) e kebab/"Voltar" < 44px | 🟡 | Subir alvos. |
| QR sem alt/aria; textos `text-[9px]` | 🟡 | Acessibilidade. |
| Sem empty-state de boas-vindas (cliente novo) nem offline | 🟡 | "Falta pouco para seu 1º prêmio!" |

**O que funciona muito bem:** a celebração de prêmio (banner + `animate-bounce` + confete por `premiosPendentes>0`), a animação de carimbo, o contador "0 / 10". O coração emocional do produto está certo.

### 5.4 Painel do vendedor (`vendedor.html`) — uso dezenas de vezes por dia
| Achado | Sev. | Recomendação |
|---|---|---|
| "Modo do Próximo Scan" (+pontos/remover) fica **abaixo** da câmera | 🟡 | Decisão de alta frequência off-screen na hora de escanear. Mover o seletor de modo **acima** da câmera. |
| Resultado do scan (pontos/prêmio) renderiza bem abaixo do visor | 🟡 | Vendedor tem que rolar pra confirmar cada scan. Tornar o resultado fixo/sticky perto do visor. |
| "Tirar 1 Ponto" é toggle armado que só desarma após sucesso | 🟡 | Fácil esquecer armado e remover ponto por engano. Banner claro de "modo remover ativo" + auto-desarme. |
| Sem `aria-live` no card de alerta | 🟡 | Resultado do scan não é anunciado por leitor de tela. |
| Alvos `py-2` (modo/carimbar/logout) < 44px; textos `text-[9px]/[10px]` | 🟡 | Subir. |
| Sem logo / sem empty-state de repouso | 🟢 | "Escaneie um cliente para começar." |

**O que funciona muito bem:** câmera traseira forçada (`facingMode:"environment"`), `qrbox` 220px, feedback rico no sucesso (verde + som + vibração + emoji), tratamento de `ASSINATURA_INATIVA`.

### 5.5 Onboarding (`onboarding.html`) — primeira impressão do dono
| Achado | Sev. | Recomendação |
|---|---|---|
| Tema escuro + diamante + "MVP/White Label" logo após a landing clara | 🔴 | Quebra de marca no momento de maior intenção. Alinhar à identidade da landing. |
| **Sem botão Voltar** em nenhum passo (`setStep` só avança) | 🔴 | Errou o nome da empresa no passo 1? Não dá pra voltar. Adicionar "Voltar". |
| "Link Personalizado" com `cliente.html?link=` cru | 🟡 | Jargão de dev para lojista. Esconder a mecânica da URL. |
| Validação genérica por toast ("preencha todos os campos") | 🟡 | Validação por campo. |
| Simulador ao vivo fica **abaixo** do form no mobile | 🟡 | Mostrar o preview acima do form no celular. |
| Excesso de fontes de display + upload de logo travado (PRO) no 1º uso | 🟢 | Reduzir escolhas; cores padrão inteligentes. |

**O que funciona muito bem:** 4 passos com barra de progresso e check animado, simulador de celular ao vivo, copy tranquilizadora ("30 dias, sem cartão de crédito"), kit de WhatsApp pronto.

### 5.6 Dashboard do dono (`dashboard.html`)
| Achado | Sev. | Recomendação |
|---|---|---|
| **Navegação morta no mobile** (`:81` `hidden md:flex`, sem hambúrguer) | 🔴 | Ver §4.3 — falha estrutural para o público mobile. |
| `deleteDoc` usado (`:1902`) mas **não importado** → `ReferenceError` ao excluir conta | 🔴 | Adicionar `deleteDoc` ao import de `config.js` (já é exportado lá). |
| Paywall não desabilita "Editar Regras", "Novo Vendedor", PIX, salvar-slug e excluir-conta (`:1535`) | 🔴 | Furo de enforcement visual: escritas vazam no estado "bloqueado". |
| Nomes divergentes para a mesma tela: "Assinatura" / "Minha Assinatura" / "Configurações da Conta"; botão "Editar Regras" abre modal "Editar Página" | 🟡 | Unificar nomenclatura. |
| Tabela de clientes de 6 colunas sem reflow em card no mobile | 🟡 | Lista em cards no celular. |
| Maioria das mutações usa `alert/confirm/prompt` em vez do `showToast` existente | 🟡 | Trocar pelo padrão que já existe. |
| Jargão "empresaId" exposto em tooltip (`:544`) | 🟢 | Linguagem de lojista. |
| `grid-cols-1 sm:grid-cols-4` (salta 1→4) | 🟢 | Passo intermediário `grid-cols-2`. |

**O que funciona:** spinners de loading, empty-state amigável de clientes, fluxo PIX claro, preço **correto** em R$ 10 aqui (a landing é que diverge).

### 5.7 Master-admin (`master-admin.html`) — interno
Cobertura de estados muito boa (loading/empty/error/access-denied). **Risco principal:** bloquear/desbloquear lojista (`:809`) **sem confirmação** — um clique pode cortar os clientes de uma loja pagante, enquanto a exclusão de comunicado tem `confirm()`. Inconsistente. Acessibilidade fraca (busca sem label, `th` sem `scope`), mas tolerável por ser ferramenta interna de operador em desktop. MRR hardcoded `ativas * 49` (`:622`) — número fictício, alinhar com o preço real.

---

## 6. Bugs concretos verificados (grep no repo)
1. **`deleteDoc` não importado** em `dashboard.html` (usado em `:1902`, ausente no import `:798-811`; é exportado por `config.js:138`). → exclusão de conta quebra.
2. **`font-outfit` sem fonte/config** em `dashboard.html` (27×), `onboarding.html` (7×), `cliente.html`, `vendedor.html`. → títulos caem para fonte padrão.
3. **`href="#"`** em "Esqueceu a senha?" (`login.html:80`). → link morto.
4. **`canvas-confetti` carregado 2×** em `cliente.html` (`:9` e `:32`).
5. **Preço divergente**: `index.html` R$ 19,90/R$ 12,41 vs `dashboard.html` R$ 10,00.
6. **Paywall com seletor incompleto** (`dashboard.html:1535`) deixa ações de escrita ativas no bloqueio.
7. **Bloqueio de lojista sem confirmação** (`master-admin.html:809`).

---

## 7. O que já está ótimo (preservar)
- **Microcópia PT-BR**: calorosa, popular, sem jargão na landing ("Pare de jogar dinheiro na gráfica", "Adeus carimbos falsificados").
- **Momentos de deleite**: confete do cliente, simulador ao vivo do onboarding, som/vibração do vendedor.
- **Landing**: hierarquia e conversão sólidas.
- **Padrões já existentes e bons**: `showToast` (dashboard), `alert-card` (vendedor), labels reais em formulários, câmera traseira forçada, fluxo PIX.
- **Robustez de produto**: mutação de pontos só via Cloud Functions, paywall por `onSnapshot`.

O caminho não é redesenhar — é **padronizar o que já existe de bom e tapar os buracos.** Detalhes acionáveis em `PLANO_EXECUCAO.md`.
