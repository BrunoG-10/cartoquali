# Relatório técnico — Backend Etapa 2

## Escopo entregue

- Login administrativo com email e senha pelo Supabase Auth.
- Recuperação de acesso e definição de senha por link público.
- Rotas administrativas sob proteção de sessão; avaliação pública e privacidade continuam abertas.
- Contexto central com identidade autenticada, usuário funcional, cartório, papel e estados de bloqueio.
- Menu administrativo com usuário, cartório, papel e saída segura.
- Listagem real de acessos e envio de convite apenas por Administrador da Plataforma ou Administrador do Cartório.
- Primeiro convite enviado e vinculado ao cadastro funcional administrador.

## Segurança aplicada

- Senhas não são armazenadas em `usuarios` nem enviadas ao frontend.
- A chave privilegiada do Supabase é carregada somente dentro de funções de servidor.
- Cada função privada exige sessão Supabase válida, independentemente da proteção visual da página.
- O envio de convite valida usuário ativo, papel autorizado, cartório do solicitante, cadastro funcional ativo e ausência de vínculo anterior.
- Se o vínculo do convite falhar, a conta Auth recém-criada é removida para evitar identidade órfã.
- Logout cancela consultas, limpa dados protegidos, encerra a sessão e substitui o histórico pela tela de login.
- Tabelas permanecem bloqueadas para acesso direto de `anon` e `authenticated`; RLS multi-tenant funcional pertence à Etapa 3.

## Evidências

- TypeScript validado sem erros.
- Compilação da prévia: `build OK`.
- Acesso sem sessão a `/dashboard` redireciona para `/login?redirect=%2Fdashboard`.
- A rota pública `/avaliar/cartorio-demo/recepcao` abre sem login.
- Login inválido exibe a mensagem neutra “Email ou senha inválidos.”.
- Recuperação renderizada e conferida em viewport móvel de 390 × 844.
- Consulta do banco confirmou o administrador `bg600070@gmail.com` ativo, com `auth_user_id`, cartório e papel `CARTORIO_ADMIN` vinculados.
- Busca no código não encontrou valor de chave privilegiada exposto em módulos de interface.

## Ressalvas

- O aceite do convite depende da ação do destinatário no email recebido. Por isso, definição inicial da senha, login válido, persistência, logout autenticado e recuperação completa aguardam esse aceite para teste fim a fim.
- Contas sem perfil, usuário inativo e convite negado a perfil sem permissão possuem tratamento implementado, mas os testes autenticados desses cenários também dependem de contas de teste reais.
- Dados de avaliações, pesquisas, pontos, indicadores, ocorrências, planos e relatórios permanecem em mocks de sessão, conforme o limite da etapa.

## Classificação

**APROVADA COM RESSALVAS**

A autenticação, a proteção, o contexto real e os convites estão implementados e a conta inicial foi provisionada. A aprovação integral depende apenas dos testes que exigem o aceite do convite pelo administrador.