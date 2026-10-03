# Relatório técnico — Backend Etapa 3

## Implementação

- 43 policies específicas distribuídas pelas 12 tabelas públicas.
- Três funções auxiliares no schema privado `cartoquali_private`, sem exposição pela Data API.
- Tenant derivado de `auth.uid()`; nenhum `cartorio_id` fornecido pelo cliente define o escopo.
- Privilégios mínimos para `authenticated`, nenhum acesso de tabela para `anon` e acesso de `service_role` restrito ao servidor.
- Índice parcial `usuarios_auth_user_active_idx` para resolução do usuário autenticado e índice `cartorios_id_status_idx` para validação do tenant ativo.
- Leituras de identidade e usuários alteradas para usar a sessão autenticada sob RLS. O cliente administrativo ficou restrito ao convite Auth após autorização tenant.

## Matriz executada

| Entidade | Próprio tenant | Outro tenant |
|---|---|---|
| Cartórios | leitura e alteração autorizada conforme papel | bloqueado |
| Usuários | leitura; mutações administrativas | bloqueado |
| Papéis | leitura; mutações administrativas | bloqueado |
| Pesquisas | leitura/criação/alteração/exclusão | bloqueado |
| Pontos | leitura validada | bloqueado |
| Perguntas | leitura pela pesquisa | bloqueado |
| Opções | leitura pela pergunta e pesquisa | bloqueado |
| Avaliações | leitura validada | bloqueado |
| Respostas | leitura pela avaliação | bloqueado |
| Ocorrências | leitura validada | bloqueado |
| Planos | leitura validada | bloqueado |
| Auditoria | somente leitura | bloqueado |

## Ataques e resultados

- 24 leituras próprias e cruzadas, com A isolado de B e B isolado de A: aprovadas.
- Manipulação direta por requisição, sem interface: aprovada.
- `INSERT` próprio: permitido; `INSERT` com tenant alheio: bloqueado.
- `UPDATE` próprio: permitido; `UPDATE` cruzado e troca A → B: bloqueados.
- `DELETE` cruzado: bloqueado.
- Pergunta em pesquisa alheia, resposta com pergunta alheia, ocorrência com avaliação alheia e plano com ocorrência alheia: bloqueados.
- Usuário sem perfil, usuário inativo e visitante: nenhum dado tenant retornado.
- Resultado final automatizado: **61/61 verificações aprovadas**.
- Fixtures: quatro contas Auth e dois tenants temporários removidos; consulta final confirmou zero resíduos.

## Vulnerabilidades encontradas e corrigidas

1. As tabelas estavam indisponíveis para qualquer cliente autenticado, sem isolamento funcional por tenant. Foram adicionadas policies específicas.
2. As primeiras funções auxiliares estavam no schema público e o linter apontou execução de função privilegiada por autenticados. Elas foram movidas para `cartoquali_private`; o alerta foi eliminado.
3. As mutações iniciais de usuários e papéis permitiriam autoelevação dentro do próprio tenant. Foram restringidas a `CARTORIO_ADMIN`.
4. Funções administrativas comuns usavam o cliente privilegiado. Leituras passaram a usar a sessão autenticada e a RLS.

## Validações finais

- Supabase linter: nenhum alerta introduzido pela Etapa 3.
- TypeScript: aprovado.
- Compilação da prévia: `build OK`.
- Chave privilegiada: não encontrada em componentes, hooks ou variáveis `VITE_*`; acesso somente em módulo de servidor.
- Frontend operacional: permanece em mocks, conforme escopo; autenticação e contexto usam dados reais.

## Pendências

- Ativar a proteção contra senhas vazadas no painel do Supabase Auth. É um aviso preexistente de configuração, não uma falha do isolamento multi-tenant.
- A validação completa do login da conta administradora inicial continua condicionada ao aceite do convite da Etapa 2.
- A entrada pública de avaliações será definida em etapa própria e `anon` continua bloqueado.
- Acesso global de `PLATFORM_ADMIN` não foi implementado.

## Classificação

**APROVADA**

O isolamento foi validado por sessões reais de dois tenants em requisições diretas, incluindo tentativas cruzadas de leitura e mutação. Nenhuma verificação crítica falhou.