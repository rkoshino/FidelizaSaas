# Tem Pontinho: Plataforma SaaS de Fidelidade Digital Multi-tenant

Esta é uma plataforma SaaS White-Label completa, altamente responsiva e portátil para fidelidade digital por pontos/carimbos. Ela permite que proprietários de empresas criem programas de fidelidade personalizados para seus clientes, e que atendentes autorizados possam ler os cartões via scanner de câmera do celular e dar pontos em tempo real.

---

## 🛠️ Stack Tecnológico Utilizado
- **Frontend**: HTML5, CSS3, ES6 JavaScript moderno, Google Fonts.
- **Estilização**: Tailwind CSS (carregado via CDN otimizado com customização de temas).
- **Backend & Banco de Dados**: Firebase Web SDK (v10) contendo:
  - **Firebase Authentication**: Suporte a login tradicional (E-mail/Senha) e Social (Google, Facebook e Apple).
  - **Cloud Firestore**: Banco de dados NoSQL estruturado com escutas em tempo real (`onSnapshot`) e regras robustas de segurança.
  - **Firebase Hosting** (Pronto para Deploy).
- **Bibliotecas Adicionais**:
  - `html5-qrcode` (Scanner de câmera de alta performance para navegadores móveis).
  - `qrcode.js` (Gerador de QR Code de alta precisão).
  - `canvas-confetti` (Animações de comemoração na tela do cliente).

---

## 📁 Estrutura do Projeto
O projeto está organizado nos seguintes arquivos estáticos limpos no diretório de trabalho:
- `index.html`: Landing page institucional e assistente de onboarding (Wizard) passo a passo para o empresário. Possui simulador de tela de celular em tempo real.
- `dashboard.html`: Painel completo do dono da empresa para ajustar pontos manualmente com auditoria, gerenciar equipe e simular pagamentos do Stripe.
- `cliente.html`: Cartão de fidelidade mobile-first do cliente. Carrega dinamicamente a identidade visual de cada empresa inquilina com base no link acessado.
- `vendedor.html`: Leitor de QR Code do atendente. Abre a câmera traseira do celular por padrão para registrar os carimbos ou resgatar o prêmio.
- `config.js`: Centralizador de importação do Firebase e provedores de autenticação (Google, Facebook, Apple).
- `firestore.rules`: Regras de segurança críticas que estabelecem o isolamento multi-tenant de dados.

---

## 🚀 Passo a Passo para Configuração no Firebase

Para que o MVP funcione com seu próprio banco de dados, siga as instruções abaixo para criar e configurar o projeto Firebase:

### 1. Criar o Projeto Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Clique em **Adicionar Projeto** e dê um nome (ex: `Tem Pontinho`).
3. Siga os passos e clique em **Criar Projeto**.

### 2. Registrar um Web App
1. Na tela inicial do seu projeto, clique no ícone **Web (</>)** para registrar um aplicativo.
2. Dê o nome de `Tem Pontinho Web` e clique em **Registrar app**.
3. Copie o bloco de configuração `firebaseConfig` gerado na tela.
4. Abra o arquivo `config.js` e substitua o bloco `firebaseConfig` da linha 22 com os seus dados.

### 3. Configurar Firebase Authentication (Provedores)
Acesse a aba **Authentication** no menu lateral esquerdo e clique em **Começar**. Depois, na aba **Sign-in method**, ative os provedores necessários:

#### A. E-mail/Senha
1. Clique em **Adicionar novo provedor** > **E-mail/senha**.
2. Ative e clique em **Salvar**.

#### B. Google Login
1. Clique em **Adicionar novo provedor** > **Google**.
2. Ative, selecione o e-mail de suporte do projeto e salve.

#### C. Facebook Login
1. Crie um aplicativo na [Meta for Developers Portal](https://developers.facebook.com/).
2. Adicione o produto **Login do Facebook**.
3. No console do Firebase, adicione o provedor **Facebook** e cole o *ID do aplicativo* e a *Chave secreta*.
4. Copie a *URI de redirecionamento do OAuth* do console do Firebase e cole nas configurações de Login do Facebook no portal de desenvolvedores da Meta.

#### D. Apple Login
1. Crie um identificador de serviço (Services ID) no portal de desenvolvedores da Apple.
2. No console do Firebase, adicione o provedor **Apple**.
3. Cole o *ID do serviço*, a *Chave de equipe (Team ID)*, a *Chave secreta (Key ID)* e o arquivo da chave privada.
4. Adicione a URI de redirecionamento fornecida pelo Firebase na console da Apple.

### 4. Configurar Cloud Firestore
1. Acesse **Firestore Database** no menu esquerdo e clique em **Criar banco de dados**.
2. Escolha **Iniciar no modo de produção** ou **modo de teste**.
3. Selecione a localização do servidor (Sugerido: `southamerica-east1` para o Brasil) e crie.
4. Acesse a aba **Regras (Rules)** no topo.
5. Copie o conteúdo completo do arquivo `firestore.rules` gerado no seu projeto, cole no console do Firebase e clique em **Publicar**.

---

## 🔒 Regras de Segurança e Isolamento Lógico (Multi-Tenant)

O isolamento é construído e validado através do campo `empresaId`. Veja o comportamento das regras publicadas no `firestore.rules`:
1. **Coleção `empresas`**: A leitura é aberta ao público para que a tela do cliente possa carregar a paleta de cores e o prêmio da empresa correspondente. Gravações só são permitidas se o UID do usuário corresponder ao ID do documento (`request.auth.uid == empresaId`), garantindo que apenas o dono altere suas configurações.
2. **Coleção `vendedores`**: O vendedor tem acesso aos seus próprios dados, e o empresário pode criar ou remover vendedores contanto que o `empresaId` do vendedor corresponda ao UID do empresário autenticado.
3. **Coleção `clientes`**: O cliente lê e grava apenas seus próprios dados. Donos e vendedores autorizados da empresa têm permissão de leitura e atualização para poderem verificar e alterar a pontuação nos cartões dos clientes vinculados.

---

## 💻 Como Rodar e Testar o MVP Localmente

Como a aplicação é estruturada em HTML e Vanilla JS com importações em formato ESM (EcmaScript Modules), você não precisa compilar nada. 

### Opção 1: Abrir via Servidor Estático Simples
Para que as importações de módulos ESM (`type="module"`) funcionem corretamente sem restrições de CORS locais, é recomendado rodar um servidor de arquivos simples.

Se você possuir **Python** instalado (nativo no Windows/macOS/Linux):
1. Abra o terminal (PowerShell/Prompt) na pasta `fidelidade-saas`.
2. Rode o comando:
   ```bash
   python -m http.server 8000
   ```
3. Abra `http://localhost:8000` no seu navegador!

Se você possuir o **VS Code**:
1. Instale a extensão **Live Server**.
2. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.

### Opção 2: Hospedagem Gratuita no Firebase Hosting
Caso queira subir o MVP para a nuvem de forma gratuita para testar direto do celular:
1. Instale o Firebase CLI no seu computador.
2. Rode `firebase login` e em seguida `firebase init`.
3. Selecione a opção **Hosting**.
4. Configure a pasta pública como `./` (ou arraste os arquivos para a pasta pública padrão `public`).
5. Execute o deploy:
   ```bash
   firebase deploy
   ```
6. O Firebase gerará um link público seguro (ex: `https://meu-app.web.app`) pronto para teste real da câmera e login de clientes.

---

## 💡 Fluxo Recomendado de Testes do MVP
1. **Cadastro do Empresário**: Abra `index.html` e crie uma conta de testes (Trial). Configure as regras e a aparência visual no formulário.
2. **Simulador ao Vivo**: Modifique a cor e a fonte para ver o mockup do celular do lado direito atualizar em tempo real.
3. **Geração de Links**: Na etapa 4, clique em baixar o QR Code gerado e copie o link do cliente e o link do vendedor.
4. **Cadastrar Atendente**: Acesse o Dashboard Admin clicando no botão final do wizard. Navegue até a aba **Equipe** e cadastre um e-mail de vendedor de testes.
5. **Acesso do Cliente**: Abra o link do cliente (`cliente.html?link=...`) em um navegador em aba anônima (ou no celular). Faça login e observe o cartão fidelidade vazio.
6. **Pontuação via Scanner**: Em outro dispositivo (ou outra janela anônima), abra o link do vendedor (`vendedor.html?empresa=...`). Faça login como vendedor criado e inicie a câmera. Escaneie o QR Code exibido na tela do cliente.
7. **Confete e Ganho**: Acompanhe os pontos subirem em tempo real na tela do cliente. Ao atingir a meta, a animação de confetes interativa explodirá automaticamente na tela do cliente indicando a vitória!
