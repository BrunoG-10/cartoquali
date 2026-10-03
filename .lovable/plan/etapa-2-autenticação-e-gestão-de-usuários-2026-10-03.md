# Etapa 2 — Autenticação e gestão de usuários

## Objetivo
Conectar a área administrativa ao Supabase Auth com email e senha, manter os dados funcionais em `usuarios`/`user_roles`/`cartorios` e preservar os demais módulos em mocks. O primeiro convite será enviado para **bg600070@gmail.com** como Administrador do Cartório.

## Estado confirmado
- O Supabase está conectado e contém 3 usuários funcionais e 3 papéis DEMO.
- Ainda não há usuários no Supabase Auth e nenhum registro de `usuarios` está vinculado por `auth_user_id`.
- `usuarios.auth_user_id` já permite a ligação entre credencial e usuário funcional; nenhuma senha será adicionada à tabela.
- As tabelas administrativas estão com RLS ativa e bloqueio total para clientes, portanto a Etapa 2 precisa de acesso mínimo e específico para contexto do usuário e convites, sem abrir o restante do banco.
- As rotas administrativas atuais ainda são públicas; `/avaliar`, `/avaliar/:cartorio/:ponto` e `/privacidade` devem continuar públicas.

## Implementação

### 1. Base segura no Supabase
- Aplicar uma migração incremental apenas para autenticação:
  - função segura para carregar o próprio usuário, cartório e papel a partir de `auth.uid()`;
  - função segura para validar se o usuário autenticado possui papel administrativo;
  - permissões mínimas de execução para `authenticated`, mantendo as tabelas bloqueadas contra acesso direto;
  - nenhuma política ampla de multi-tenancy, nenhuma API pública e nenhuma alteração nos módulos de avaliações, indicadores, ocorrências, planos ou relatórios.
- Vincular o convite aceito ao registro funcional correspondente por email de forma controlada, sem criar perfis automaticamente para contas desconhecidas.

### 2. Primeiro acesso e convites
- Enviar um convite seguro do Supabase Auth para `bg600070@gmail.com` e vinculá-lo ao usuário administrador DEMO existente.
- Adicionar à área de usuários uma ação de convite, executada no servidor com chave privilegiada nunca enviada ao navegador.
- Antes de convidar, validar no servidor que o solicitante está autenticado, ativo e possui `PLATFORM_ADMIN` ou `CARTORIO_ADMIN`.
- Manter a tela de usuários focada em listar, visualizar, identificar papel/cartório/status e convidar; não ampliar o CRUD além do solicitado.

### 3. Contexto central de autenticação
- Criar `AuthProvider`/`useAuth()` único com:
  - usuário do Supabase Auth;
  - registro de `usuarios`, cartório e papel atuais;
  - estados carregando, autenticando, autenticado, sem perfil, usuário inativo e erro;
  - `signIn`, `signOut`, recuperação e definição da nova senha.
- Registrar uma única escuta de mudança de sessão na raiz e anexar o token às funções protegidas.
- Integrar o usuário/cartório/papel reais ao provedor de sessão existente, mantendo avaliações e demais dados de negócio em memória.

### 4. Login e recuperação
- Criar `/login` com email, senha, carregamento, mensagens neutras de erro, “Esqueci minha senha” e retorno seguro à página pretendida.
- Criar `/reset-password` pública, validar o fluxo de recuperação e permitir definir a nova senha.
- Usar exclusivamente Supabase Auth para credenciais e sessão persistente.

### 5. Proteção das páginas administrativas
- Criar o layout protegido gerenciado em `_authenticated`, sem duplicar a rota `/`.
- Mover as telas administrativas para essa árvore e disponibilizar o painel em `/dashboard`; manter `/` como redirecionamento consciente de sessão.
- Proteger Dashboard, Avaliações, Pesquisas, Pontos, Qualidade, Ocorrências, Planos, Relatórios, Visão Executiva, Cartório, Usuários e Configurações.
- Manter `/avaliar`, `/avaliar/:cartorio/:ponto`, `/privacidade`, `/login` e `/reset-password` públicas.
- Exibir estados controlados para conta sem perfil, usuário inativo, cartório ausente ou inativo, sem mostrar conteúdo administrativo.

### 6. Logout e navegação
- Mostrar usuário, cartório e papel atuais no menu administrativo.
- Implementar logout cancelando consultas, limpando dados protegidos, encerrando a sessão e substituindo o histórico por `/login`.
- Garantir que Voltar ou acesso direto não restaurem uma página privada.

## Validação
- Verificar compilação, metadados das novas páginas e ausência de segredos no código do navegador.
- Executar no navegador, em desktop e celular:
  1. aceite do convite e definição inicial de senha;
  2. login válido e persistência após atualização;
  3. login inválido com mensagem neutra;
  4. logout e bloqueio ao voltar/acessar diretamente;
  5. acesso direto sem sessão a `/dashboard`, `/avaliacoes`, `/qualidade` e `/relatorios`;
  6. acesso público a `/avaliar/...` sem login;
  7. recuperação completa, nova senha e novo login;
  8. conta Auth sem perfil;
  9. usuário funcional inativo;
  10. convite administrativo e rejeição para usuário sem permissão.
- Consultar o Supabase após os testes para confirmar vínculo Auth → usuário → cartório → papel e ausência de senhas em `usuarios`.
- Atualizar o relatório e o roadmap, classificando a etapa como APROVADA, APROVADA COM RESSALVAS ou REPROVADA conforme as evidências.

## Limites
- Não implementar Etapa 3, RLS multi-tenant completa, API pública, pagamentos, notificações ou migração dos dados de negócio.
- Não alterar regras e cálculos existentes; apenas sessão, identidade atual, proteção e leitura administrativa de usuários passam a usar dados reais.
