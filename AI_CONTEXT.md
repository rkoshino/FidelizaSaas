# Contexto do Projeto Tem Pontinho (Para IA)

## Visão Geral
Este é um **SaaS de Fidelidade Multi-tenant (White-label)** focado em pequenos comerciantes (MEIs). O sistema é 100% web (PWA), eliminando a necessidade de clientes ou lojistas baixarem aplicativos nas lojas de app.

## Stack Tecnológica
- **Frontend:** HTML5, Vanilla JavaScript (ECMAScript 6+), TailwindCSS (via CDN).
- **Backend/Infra:** Firebase (Auth, Firestore, Hosting) usando o **SDK v9 Modular**.
- **Deploy Automático:** Configurado via GitHub Actions (usa `firebase-tools` com `FIREBASE_TOKEN` embutido nos Secrets do repositório, não usa action oficial devido a bugs com Service Accounts).

## Estrutura do Banco de Dados (Firestore)
1. **`empresas/{empresaId}`**: Lojista principal (dono do tenant). Guarda as configurações visuais (cores, emojis, meta de pontos) e links únicos (`linkUnicoCliente`). Regra: Somente o dono edita.
2. **`vendedores/{vendedorId}`**: Atendentes que escaneiam os QR Codes. O ID (`vendedorId`) é um e-mail limpo (ex: `joao_gmail_com`). Regra: O vendedor pode ler seu perfil caso `resource.data.email == request.auth.token.email`.
3. **`clientes/{clienteId}`**: Consumidores finais. Cada cliente possui subcoleções internas `pontos/{empresaId}` que guardam os carimbos (registrados como documentos individuais com timestamp).

## Principais Fluxos do Sistema
- **Onboarding (`onboarding.html`)**: O lojista cria a conta, define a marca e ganha um "link único" (ex: `/cliente.html?link=bafo-do-dragao`).
- **Dashboard (`dashboard.html`)**: Painel de controle do lojista (acompanhar pontos, alterar cores, emoji).
- **Scanner do Vendedor (`vendedor.html`)**: O atendente entra no link com o parâmetro da empresa (`?empresa=ID`), faz login (Google Redirect), usa a câmera (Html5Qrcode) para ler o QR Code do cliente e dar pontos.
- **Painel do Cliente (`cliente.html`)**: O cliente entra no link da loja, faz login (Google Redirect) e vê a cartela de pontos preenchendo em tempo real (via `onSnapshot`). Apresenta um QR Code dinâmico para o vendedor ler.

## Peculiaridades e "Pegadinhas" Resolvidas
- **Login com Google no Celular (Loop Infinito do Redirect):** Para contornar o bloqueio de "rastreamento cruzado" (Intelligent Tracking Prevention) do iOS/Safari, configuramos o `authDomain` no `config.js` para ser exatamente o mesmo do domínio de hospedagem (`nice-dreamks-fidelidade.web.app`). Usamos sempre `signInWithRedirect` + `getRedirectResult(auth)` nas páginas mobile para finalizar o fluxo.
- **Múltiplos Exports:** `config.js` centraliza a inicialização do Firebase e exporta todos os módulos necessários.
- **Emojis Customizados:** O sistema permitia escolher emojis num grid, mas foi trocado para um **input de texto nativo** (`dashboard.html`), para que o lojista use o próprio teclado do sistema.

## Próximos Passos (Roadmap)
- Criação de um **Módulo Super Admin** para gerenciamento de todas as empresas e assinaturas.
- Implementação da lógica de pagamento/assinaturas (ex: MercadoPago, Asaas ou Stripe) atrelada ao Firestore.
