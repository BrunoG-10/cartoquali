# Matriz de Permissões — Etapa 12

## Princípios

- O cartório ativo sempre vem da sessão validada; nenhum formulário escolhe `cartorio_id`.
- Ocultar um item de menu melhora a experiência, mas a autorização efetiva é repetida nas funções de servidor e nas policies RLS.
- `PLATFORM_ADMIN` não possui acesso global implícito. Nesta versão, ele continua limitado ao cartório de seu perfil.
- Papéis ficam exclusivamente em `user_roles`, separados de `usuarios`.

## Capacidades

| Módulo | PLATFORM_ADMIN | CARTORIO_ADMIN | GESTOR | OPERADOR |
|---|---|---|---|---|
| Dashboard e indicadores | Consultar | Consultar | Consultar | Consultar |
| Avaliações | Consultar, contato conforme regra | Consultar, contato conforme regra | Consultar, contato conforme regra | Consultar sem contato |
| Pesquisas e perguntas | Administrar | Administrar | Administrar | Sem acesso administrativo |
| Pontos de avaliação | Administrar | Administrar | Administrar | Sem acesso administrativo |
| Ocorrências | Administrar | Administrar | Administrar | Consultar |
| Planos de melhoria | Administrar | Administrar | Administrar | Consultar |
| Relatórios | Consultar | Consultar | Consultar | Consultar |
| Cartório | Administrar campos permitidos | Administrar campos permitidos | Sem acesso | Sem acesso |
| Usuários e papéis | Administrar dentro do tenant | Administrar dentro do tenant | Sem acesso | Sem acesso |
| Configurações gerais | Administrar | Administrar | Sem acesso | Sem acesso |
| Auditoria | Consultar | Consultar | Sem acesso | Sem acesso |

## Proteções de usuário

- A criação registra perfil e papel na mesma transação lógica.
- A atualização de perfil e papel é atômica.
- Um administrador não pode inativar a si mesmo nem remover o próprio papel.
- O último administrador ativo do cartório não pode ser inativado ou rebaixado.
- Papéis globais não podem ser concedidos pelas operações do cartório.
- Escritas diretas em `usuarios` e `user_roles` foram removidas do papel autenticado; as operações passam por rotinas validadas.

## Sessões antigas

O contexto é revalidado ao entrar na aplicação, em mudanças de identidade, ao retornar para a aba e a cada cinco minutos. Um usuário inativado deixa de receber dados imediatamente pela RLS, mesmo antes da atualização visual.