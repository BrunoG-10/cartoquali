# Provisionamento de tenant

## Pré-requisitos

- Sessão de um usuário ativo com papel `PLATFORM_ADMIN`.
- Supabase externo configurado no servidor.
- Origem HTTPS definida em `VITE_PUBLIC_APP_URL` antes da entrega do QR de produção.

## Procedimento suportado

Use **Implantações > Novo cartório**. Nenhuma etapa normal exige SQL manual, edição direta do banco, criação manual de usuário ou alteração de variável por cliente.

O provisionamento transacional cria:

- cartório inativo, classificado como `real`;
- configurações próprias;
- registro de onboarding e auditoria;
- posteriormente, administrador convidado, pesquisa/perguntas, ponto e QR.

## Limites de acesso

O `CARTORIO_ADMIN` convidado só acessa seu tenant. `GESTOR` e `OPERADOR` não provisionam tenants. Alterar parâmetros ou IDs não transfere dados entre cartórios. Funções internas não são executáveis por `anon` e validam novamente o papel da plataforma.

## Demonstração

Registros históricos explicitamente nomeados DEMO/TESTE são classificados como `demo` e exibidos com **DEMONSTRAÇÃO**. Novos onboardings sempre nascem `real`. Dados demo e reais continuam separados por `cartorio_id`; não copie avaliações demo para tenants reais.

## Recuperação

O progresso é lido de `cartorio_onboarding`. Retome pela lista de Implantações; não recrie entidades concluídas. Em falha de convite, confirme o erro apresentado e tente novamente. Em indisponibilidade, preserve o cadastro inativo e não entregue o QR como produção.
