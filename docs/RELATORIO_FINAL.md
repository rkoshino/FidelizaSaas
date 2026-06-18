# Relatório Final — Tem Pontinho
### Visão master consolidada (Auditoria de Design × Review do CEO)

> **Para:** CEO · **De:** time de produto/design · **Data:** 2026-06-16
> **Propósito:** unificar duas revisões independentes numa única leitura priorizada, cobrindo todos os buracos identificáveis, e propor — em alto nível — um plano em ondas para aprovação.
> **Documentos-fonte:** `RELATORIO_DESIGN.md` (auditoria de design) · `TAREFAS_CEO.md` (review do CEO).
> **Plano de execução:** `PLANO_EXECUCAO.md`.
> **Nota de status (2026-06-18):** este relatório é histórico. As decisões pendentes abaixo já foram
> resolvidas e grande parte do plano foi implementada/deployada. Para estado operacional atual, use
> `../HANDOFF.md` e `TAREFAS_CEO.md`.

---

## 1. Sumário executivo

Duas revisões foram feitas de forma **independente** e por **ângulos diferentes** — e chegaram à **mesma conclusão de fundo**:

> O Tem Pontinho já é um bom produto no núcleo (proposta clara, copy excelente, momentos de deleite), mas **a experiência mobile está quebrada em pontos críticos** e **o acabamento é inconsistente** — exatamente o que contradiz a promessa "simples, sólido e barato".

- A **auditoria de design** olhou o produto como **sistema**: coerência de marca, consistência, acessibilidade, qualidade de código, cobertura de estados.
- O **review do CEO** olhou o produto **em uso real no celular** e pela ótica de **negócio**: bugs que travam, monetização (trial), e a jornada de cadastro→cliente.

O valor de cruzar os dois é simples: **um pegou o que o outro não via.** Juntos, eles cobrem desde bugs que travam o cadastro hoje até a fragmentação de marca que ninguém percebe item a item, mas que faz o produto parecer inacabado.

**As 4 frentes que concentram quase tudo:**
1. 🔴 **Mobile-first de verdade** — hoje o dashboard é inutilizável no celular e a home rola pro lado.
2. 🔴 **Bugs que sangram agora** — o cadastro chega a falhar ao finalizar ("permissions"), câmera do vendedor escurece, caixa de prêmio não some.
3. 🟡 **Identidade única & acabamento** — 5 marcas diferentes, fonte que não carrega, seletores de cor/emoji ruins.
4. 🟡 **Monetização & ciclo de vida** — falta aviso de fim do trial + CTA, e o preço da landing contradiz o cobrado.

---

## 2. Os dois pontos de vista (e por que juntos são mais fortes)

| | Auditoria de Design (sistêmica) | Review do CEO (campo + negócio) |
|---|---|---|
| **Olhar** | Produto como sistema coerente | Produto em uso real no celular |
| **Pegou bem** | Marca fragmentada, tipografia quebrada, acessibilidade, estados, bugs de código (`deleteDoc`, paywall) | Bugs vivos (cadastro, câmera, caixa de prêmio), monetização/trial, fluxo de compartilhar |
| **Ponto cego** | Não roda o app autenticado em device real → não viu bugs de runtime | Não mapeia consistência sistêmica → não viu os 5 logos / fonte / contraste |
| **Viés útil** | Eleva o padrão de qualidade | Foca no que dá dinheiro e no que trava o usuário |

> **Conclusão:** as listas se **complementam**, não competem. Onde as duas apontam o mesmo problema (ex.: navegação mobile do dashboard), é prioridade inegociável. Onde só uma aponta, é buraco que a outra deixaria passar.

---

## 3. Convergências — alta confiança (fazer sem discutir)

Itens flagrados pelas **duas** revisões, de forma independente:

| Problema | Design | CEO | Severidade |
|---|---|---|---|
| **Navegação do dashboard inacessível no celular** (sem como chegar nas abas/Vendedores) | §4.3 | DASH-01 | 🔴 |
| **Layout mobile do dashboard precário** (apertado, sem paridade com desktop) | §5.6 | DASH-02/03 | 🔴 |
| **Scroll horizontal / overflow no header mobile da home** | §5.1 | MP-01 | 🟡 |
| **Onboarding pesado / seletores confusos** (cor, emoji, jargão de URL) | §5.5 | CAD-06/07/08 | 🟡 |

Essas quatro entram direto na execução — duas fontes, mesma direção.

---

## 4. Mapa master de problemas (visão unificada e deduplicada)

Legenda origem: **D** = Design · **C** = CEO · **D+C** = ambos. Severidade: 🔴 crítico · 🟡 moderado · 🟢 polimento.

### T1 · Mobile-first quebrado
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| M-01 | Dashboard sem navegação no celular (`hidden md:flex`, sem hambúrguer) | D+C | 🔴 | DASH-01 |
| M-02 | Layout mobile do dashboard sem paridade com desktop; header apertado | D+C | 🔴 | DASH-02/03 |
| M-03 | Home rola pro lado no celular (botão "Cadastro Grátis" estoura largura) | D+C | 🟡 | MP-01 |
| M-04 | "Login" some < 640px na home sem alternativa; cards flutuantes do mockup vazam < 400px | D | 🟡 | §5.1 |
| M-05 | Alvos de toque < 44px em vendedor/dashboard/cliente | D | 🟡 | §4.6 |

### T2 · Bugs funcionais que sangram agora
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| B-01 | **Cadastro falha ao finalizar**: "missing or insufficient permissions" (regras Firestore) | C | 🔴 | CAD-05 |
| B-02 | Câmera do vendedor fica **escura ao relogar** | C | 🔴 | VEND-04 |
| B-03 | Caixa "você tem prêmios" **não some** após escanear e pontuar | C | 🔴 | VEND-03 |
| B-04 | `deleteDoc` usado mas **não importado** → "Excluir conta" quebra (`dashboard.html:1902`) | D | 🔴 | §6 |
| B-05 | "Esqueceu a senha?" é link morto `href="#"` (sem fluxo de reset) | D | 🟡 | §5.2 |
| B-06 | `catch` de branding deixa "Carregando…" eterno em falha de rede (`cliente.html:311`) | D | 🟡 | §4.7 |
| B-07 | `canvas-confetti` carregado em duplicata (`cliente.html`) | D | 🟢 | §6 |

### T3 · Identidade única & acabamento visual
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| V-01 | **5 marcas diferentes** em 7 telas (araras/diamante/estrela/nenhum/escudo) | D | 🟡 | §4.1 |
| V-02 | Fonte `Outfit` usada mas **não carregada/configurada** em 4 telas (títulos caem para padrão; 27× no dashboard) | D | 🟡 | §4.2 |
| V-03 | Quebra de tema landing clara → onboarding/app escuro logo após o clique de maior intenção | D | 🟡 | §4.1 |
| V-04 | Seletor de cores no celular feio/confuso, botões demais | C | 🟡 | CAD-07 |
| V-05 | Seletor de emoji ruim no desktop (campo de texto, sem emojis no teclado do PC) e dúvida no mobile | C | 🟡 | CAD-08/09 |
| V-06 | Jargão interno vazado ao usuário ("White Label", "empresaId", `cliente.html?link=`) | D | 🟢 | §5.3 |

### T4 · Monetização & ciclo de vida
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| $-01 | **Falta aviso de fim do mês grátis** + CTA de compra na **tela do vendedor** | C | 🟡 | VEND-05 |
| $-02 | **Falta aviso de fim do mês grátis** abaixo do cabeçalho do **dashboard** | C | 🟡 | DASH-04 |
| $-03 | ✅ **Resolvido:** preço oficial R$ 19,90/mês + 1º mês grátis reconciliado em landing, dashboard, billing e MRR | D | 🟡 | §4.4 |
| $-04 | Paywall **não bloqueia** "Editar Regras", "Novo Vendedor", PIX, slug, excluir-conta | D | 🔴 | §5.6 |
| $-05 | MRR do master-admin hardcoded (`ativas * 49`) — número fictício | D | 🟢 | §5.7 |

### T5 · Cadastro / Onboarding
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| O-01 | Sem botão **Voltar** entre etapas do onboarding | D | 🟡 | §5.5 |
| O-02 | Copy da etapa 2 a ajustar ("Configuração do Cartão de Pontos…") | C | 🟢 | CAD-03 |
| O-03 | "Título da Página" deve vir **pré-preenchido** com o nome da empresa | C | 🟢 | CAD-06 |
| O-04 | Validação genérica por toast em vez de por campo | D | 🟡 | §5.5 |
| O-05 | **Etapa 4 (sucesso): compartilhar** — copiar link + enviar via WhatsApp + link do QR para impressão | C | 🟡 | CAD-10 |
| O-06 | Etapa 4 passo 2: deixar claro que é a mesma conta do vendedor (já funciona) | C | 🟢 | CAD-11 |

### T6 · Autenticação & segurança
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| A-01 | **Confirmação de e-mail** no cadastro por e-mail | C | 🟡 | CAD-02 |
| A-02 | ✅ **Resolvido por D4:** Google + e-mail/senha; Apple/Facebook fora do MVP | C | 🟡 | CAD-02 |
| A-03 | Exibir **termos de segurança** no login social | C | 🟡 | CAD-01 |
| A-04 | Sem "mostrar/ocultar senha" no login | D | 🟢 | §5.2 |

### T7 · Fluxo do cliente & valor percebido
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| C-01 | **Login obrigatório antes de ver o cartão** (atrito contra "sem complicação") | D | 🟡 | §5.3 |
| C-02 | QR da página do cliente **no painel do vendedor** (rodapé) | C | 🟡 | VEND-01 |
| C-03 | Reposicionar caixa de prêmio: QR → prêmio → pontos | C | 🟢 | VEND-02 |
| C-04 | Botão no vendedor para abrir o **dashboard** | C | 🟢 | VEND-06 |
| C-05 | Reforçar proposta de valor na home ("igual ao cartão de papel, mas o cliente não perde") | C | 🟢 | MP-02 |
| C-06 | Empty states de boas-vindas (cliente novo, loja nova) | D | 🟢 | §4.7 |

### T8 · Acessibilidade, estados & elegância
| ID | Problema | Origem | Sev | Ref |
|----|----------|--------|-----|-----|
| X-01 | `alert()/confirm()/prompt()` nativos no meio de fluxos mobile (já existe `showToast`) | D | 🟡 | §4.5 |
| X-02 | Contraste baixo e textos `text-[9px/10px]` em várias telas | D | 🟡 | §4.6 |
| X-03 | Foco de teclado invisível (`focus:outline-none` solto) | D | 🟢 | §4.6 |
| X-04 | Falta `aria-live`/`aria-label` (resultado de scan, botões só-ícone, QR sem alt) | D | 🟢 | §4.6 |
| X-05 | Loading real (skeleton), estado **offline** e erro de rede no cliente | D | 🟡 | §4.7 |
| X-06 | Bloquear lojista no master-admin **sem confirmação** | D | 🟡 | §5.7 |
| X-07 | Respeitar `prefers-reduced-motion` nas animações | D | 🟢 | §5.3 |

> **Contagem:** ~40 itens consolidados — **12 de ambos/críticos**, o restante distribuído. Nenhum item das duas fontes foi descartado; duplicatas foram fundidas (ver coluna Ref).

---

## 5. Decisões que dependem do CEO (destravam o resto)

Estas não são tarefas — são **direções** que precisam de uma escolha sua antes de executar:

1. ✅ **Preço oficial:** R$ 19,90/mês + 1º mês grátis; landing, dashboard, billing e MRR reconciliados.
2. **Marca única.** Qual logo vira o oficial (recomendação do design: a marca das araras da landing) e replicado em todas as telas (V-01)?
3. ✅ **Tema do app logado:** claro padronizado com paleta creme/verde/terracota.
4. ✅ **Apple e Facebook entram no MVP?** Não. D4: só Google + e-mail/senha.
5. **Cartão do cliente exige login?** Manter o login obrigatório ou liberar a visualização antes (C-01) — impacta diretamente a fricção do consumidor.

---

## 6. Buracos adicionais cobertos (que nenhuma das duas listas citou explicitamente)

Para garantir cobertura total, incluímos também:
- **Reset de senha real** (hoje o link é morto — B-05).
- **Prova social na landing** (sem depoimentos/FAQ/"como funciona" — reduz conversão).
- **Estado offline** no cartão do cliente (X-05).
- **Confirmação em ação destrutiva** do operador (X-06).
- **Paridade de enforcement do paywall** ($-04) — hoje o "bloqueado" vaza escritas.

---

## 7. Proposta de plano em ondas (alto nível — para aprovação)

> Sequência pensada para **estancar dano primeiro, destravar mobile e marca, depois monetizar e polir**. Cada onda entrega valor sozinha. Detalhamento completo em `PLANO_EXECUCAO.md`.

| Onda | Tema | O que entra | Por que nesta ordem |
|------|------|-------------|---------------------|
| **0 — Estancar sangramento** | Bugs P0 | B-01 (cadastro/permissions), B-02 (câmera), B-03 (caixa prêmio), B-04 (deleteDoc), $-04 (paywall) | São perdas ativas: cadastro que falha e funções que quebram. Nada mais importa enquanto isto sangra. |
| **1 — Mobile-first de verdade** | Dashboard + Home | M-01, M-02, M-03, M-04, M-05 | O público vive no celular; é a falha estrutural mais citada pelos dois. |
| **2 — Identidade única** | Marca + tipografia | V-01, V-02, V-03, V-06 (depende da decisão §5.2/5.3) | Maior salto de percepção de qualidade pelo menor esforço; pré-requisito barato. |
| **3 — Monetização & trial** | Receita | $-01, $-02, $-03 + preço definido | Liga o motor de conversão grátis→pago (depende da decisão §5.1). |
| **4 — Cadastro & auth** | Funil de entrada | O-01..O-06, A-01..A-03, V-04, V-05 | Reduz atrito do onboarding e fecha o ciclo "criar → compartilhar". |
| **5 — Acessibilidade, estados & elegância** | Polimento | X-01..X-07, C-01, C-06 | O "1% a mais" que faz um produto barato parecer premium. |

**Princípio que guia tudo:** *toda decisão deve reduzir complexidade, não adicionar* — fiel à proposta "sem complicação" e ao stack vanilla (sem build, mudanças baratas).

---

## 8. Como vamos medir sucesso

- **Onda 0/1:** taxa de conclusão de cadastro sobe; zero relatos de "não acho a aba no celular"; sem scroll lateral na home.
- **Onda 2:** marca única em 100% das telas; títulos renderizando na fonte correta.
- **Onda 3:** % de trials que veem o aviso e clicam em "assinar"; conversão grátis→pago.
- **Onda 4/5:** queda de abandono no onboarding; checklist de acessibilidade (contraste/alvos/foco) passando.

---

## 9. Próximo passo

Este relatório é para **leitura e aprovação**. Assim que o CEO aprovar (e decidir os 5 pontos da §5), o `PLANO_EXECUCAO.md` já traz cada onda quebrada em tarefas com estimativa, dependências e critérios de aceite — usando os IDs deste documento como rastreabilidade.

> **Pergunta-chave para destravar:** podemos começar a **Onda 0** (bugs que sangram) **em paralelo** à sua decisão sobre preço/marca? Ela não depende de nenhuma definição estratégica e elimina perdas imediatas.

---

### Anexos (em `docs/`)
- `RELATORIO_DESIGN.md` — auditoria de design completa, tela a tela.
- `TAREFAS_CEO.md` — review do CEO transcrito e organizado em backlog rastreável.
- `PLANO_EXECUCAO.md` — plano operacional por ondas, com tarefas, aceite e estimativas.
