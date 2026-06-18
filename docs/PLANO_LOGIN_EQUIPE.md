# Plano de Ação — Login, Cadastro e Equipe

> Criado em 2026-06-18 a partir do teste manual do dono.
> Objetivo: deixar explícita a diferença entre entrar e criar conta, melhorar erros em PT-BR e substituir pré-cadastro manual de vendedores por convite seguro.

## Problemas observados

1. **Login do dono com Google cria conta sem aviso claro.**
   - Hoje o botão de login também pode criar uma conta Firebase nova.
   - Isso inicia/continua o fluxo de empresa/trial sem o usuário ter confirmado que queria cadastrar.

2. **Login por e-mail/senha não ajuda quando a conta não existe ou a senha está errada.**
   - O feedback atual é genérico.
   - Falta sugerir criação de conta e reaproveitar o e-mail digitado.

3. **Cadastro de vendedores exige pré-cadastro manual por e-mail.**
   - O dono quer gerar um link de convite.
   - O atendente deve se cadastrar por Google ou e-mail/senha e já virar vendedor da empresa.

4. **Gerenciamento de vendedores incompleto.**
   - Lista deve mostrar vendedores claramente.
   - Cada vendedor precisa de ações: pausar/retomar e apagar.

5. **Mensagens/validações ainda aparecem em inglês ou técnicas.**
   - Campos vazios, erros Firebase/Auth e feedbacks devem estar em português claro.

## TODO de implementação

- [x] Login do dono: separar visualmente “Entrar” de “Criar conta grátis”.
- [x] Login do dono: ao usar Google com conta sem empresa, pedir confirmação antes de seguir para cadastro/trial.
- [x] Login do dono: em erro de e-mail/senha, mostrar sugestão de cadastro com link para onboarding.
- [x] Vendedores: criar convite em `empresas/{empresaId}/convitesVendedores/{token}`.
- [x] Vendedores: implementar callable `acceptVendorInvite` para vincular usuário autenticado como vendedor ativo.
- [x] Dashboard: botão “Novo vendedor” gera link, copia/mostra link e não pede e-mail/nome manual.
- [x] Dashboard: lista de vendedores com botões Pausar/Retomar e Apagar.
- [x] Vendedor: aceitar `?convite=TOKEN`; após Google ou e-mail/senha, aceitar convite e cair direto no scanner.
- [x] Vendedor: corrigir mensagens de campo vazio e Auth para PT-BR.
- [x] Revisar strings principais de login/cadastro/equipe para evitar mensagens técnicas em inglês.
- [x] Validar sintaxe, rules/functions/hosting e deployar.

## Critérios de aceite

- Clicar “Entrar com Google” no login do dono com conta nova não cria empresa/trial silenciosamente; a UI pede confirmação.
- E-mail/senha incorreto no login do dono sugere criar conta grátis.
- Dono gera link de convite de vendedor sem cadastrar e-mail.
- Atendente abre link, cadastra/loga com Google ou e-mail/senha e entra direto no scanner.
- Dono consegue pausar, retomar e apagar vendedor.
- Vendedor pausado não consegue pontuar/resgatar via Cloud Functions.
- Fluxos principais mostram mensagens em português.
