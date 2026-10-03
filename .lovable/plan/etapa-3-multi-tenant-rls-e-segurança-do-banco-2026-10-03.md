# Etapa 3 — Multi-tenant, RLS e segurança do banco

## Objetivo
Garantir no próprio Supabase que cada usuário autenticado acesse somente os dados do seu cartório, mesmo em requisições manipuladas fora da interface.

## Estado confirmado
- As 12 tabelas públicas estão com RLS ativa, mas hoje possuem apenas políticas que bloqueiam integralmente `anon` e `authenticated`.
- Não há funções SQL auxiliares no schema público.
- O banco possui um cartório, três usuários funcionais, uma conta Auth vinculada e somente um tenant autenticável.
- As tabelas não possuem privilégios registrados para `anon`, `authenticated` ou `service_role`; os privilégios necessários serão concedidos de forma mínima e alinhada às políticas.
- O frontend operacional continua em mocks; apenas identidade, contexto e convites usam o Supabase nesta fase.
- O linter apontou proteção contra senhas vazadas desabilitada; isso será documentado como configuração externa de autenticação, sem misturar com as policies de tenant.

## Implementação
1. Criar funções SQL `SECURITY DEFINER` restritas, com `search_path` fixo, para resolver o usuário funcional, o cartório atual, o estado ativo e os papéis a partir de `auth.uid()`, sem consultar recursivamente a tabela protegida dentro das policies.
2. Revogar execução pública dessas funções e conceder somente o necessário ao papel `authenticated`.
3. Substituir as policies de bloqueio por policies específicas de leitura, criação, alteração e exclusão para:
   - `cartorios`, `usuarios` e `user_roles`;
   - `pesquisas`, `perguntas` e `opcoes_resposta`;
   - `pontos_avaliacao`;
   - `avaliacoes` e `respostas`;
   - `ocorrencias_qualidade` e `planos_melhoria`;
   - `audit_logs`.
4. Validar o tenant tanto nas colunas diretas quanto nas relações encadeadas. `WITH CHECK` impedirá inserções cruzadas e mudanças de `cartorio_id`; relações compostas existentes continuarão bloqueando vínculos inconsistentes.
5. Manter `anon` sem acesso às tabelas e não abrir a avaliação pública nesta etapa.
6. Manter `audit_logs` somente para consulta do próprio tenant; clientes autenticados não poderão alterar nem excluir logs.
7. Não conceder acesso global a `PLATFORM_ADMIN` nesta etapa. A exceção ficará documentada para implementação futura com escopo explícito.
8. Conceder privilégios mínimos de Data API a `authenticated` conforme cada operação permitida e preservar acesso de `service_role` apenas no servidor.
9. Revisar índices usados pelas policies e adicionar somente os que faltarem para `auth_user_id`, tenant e cadeias relacionais.

## Testes de violação
- Criar temporariamente um Cartório A e um Cartório B, com contas Auth e dados identificáveis em todas as cadeias relevantes.
- Executar chamadas diretas ao Supabase com a sessão real de cada usuário, sem depender da interface.
- Para cada entidade, verificar a matriz de leitura, criação, alteração e exclusão no próprio tenant e no tenant adversário.
- Tentar explicitamente: enviar `cartorio_id` alheio, trocar A por B em uma atualização, vincular pergunta/opção/resposta/ocorrência/plano a pai de outro tenant e consultar IDs conhecidos do outro cartório.
- Testar usuário sem perfil/cartório e usuário inativo; ambos devem receber zero acesso tenant.
- Confirmar que `anon` permanece bloqueado e que a chave privilegiada não aparece no código do navegador.
- Limpar as contas e fixtures temporárias após coletar os resultados, preservando os dados DEMO existentes.
- Rodar novamente o linter, a validação TypeScript, a compilação e os fluxos legítimos de login, painel, usuários, cartório, pontos, pesquisas e navegação.

## Código e documentação
- Ajustar funções administrativas que hoje usam acesso privilegiado para leituras comuns, fazendo-as operar como o usuário autenticado sob RLS; manter privilégio elevado apenas no envio de convites e em tarefas administrativas inevitáveis, sempre após autorização tenant.
- Atualizar `SECURITY.md`, `DATABASE_SCHEMA.md`, `roadmap.md` e criar o relatório final da Etapa 3.
- Registrar policies, funções, índices, matriz completa, tentativas de invasão, correções, pendências e a classificação final: APROVADA, APROVADA COM RESSALVAS ou REPROVADA.

## Limites
- Não migrar os módulos operacionais dos mocks para dados reais.
- Não implementar entrada pública de avaliações, API pública, pagamentos, notificações ou a Etapa 4.
- Não expor `service_role`, não aceitar tenant fornecido pelo cliente e não criar acesso administrativo global genérico.
