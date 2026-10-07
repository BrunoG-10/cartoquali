# Resumo técnico — preparação para backend externo

> **Histórico.** Este resumo descreve a fase anterior ao backend. A camada mock (`data-provider`, `mock-service`, `session-provider`) foi removida depois que todos os módulos passaram a usar o Supabase. A arquitetura atual está em `ARCHITECTURE.md`.

## Entregue

- Contratos centrais ampliados com resultados de serviço, erros previsíveis, filtros, auditoria e snapshot da sessão.
- `CartoQualiService` cobre cartórios, usuário atual, perguntas e respostas com escopo de cartório, avaliações, indicadores, ocorrências, planos, relatórios e auditoria.
- `data-provider.ts` concentra a seleção do provedor. O MVP usa `mock`; `api` é apenas um ponto de extensão explícito.
- O provedor de sessão não importa coleções mock diretamente. Ele recebe o serviço tipado e inicia seus dados pelo data provider.
- Permissões usam o helper central `hasPermission`; eventos administrativos têm contrato e coleção de sessão.
- Filtros e indicadores permanecem em funções puras compartilhadas.
- `API_CONTRACT.md`, `ARCHITECTURE.md` e `BACKEND_REQUIREMENTS.md` documentam a integração futura.

## Tipos e equivalências

- `registryId` permanece como chave interna para não quebrar o MVP e será serializado como `cartorio_id` na API.
- Os contratos compartilhados incluem `Registry`, `RegistryUser`, `EvaluationPoint`, `Survey`, `SurveyQuestion`, `Review`, `EvaluationAnswer`, `QualityOccurrence`, `ImprovementPlan`, `ReportHistoryItem`, `Indicators` e `AuditLog`.

## Pendências exclusivas do backend futuro

- Implementar o adaptador HTTP compatível com `CartoQualiService`.
- Persistir entidades e auditoria, autenticar usuários e autorizar operações no servidor.
- Isolar cartórios no armazenamento, proteger dados de contato e limitar abuso na avaliação pública.
- Reproduzir no servidor as fórmulas e os filtros compartilhados.

## Limites mantidos

Nenhum banco, autenticação real, migration, API externa ou persistência no navegador foi adicionado. O design e os fluxos de negócio permanecem inalterados; alterações da demonstração são descartadas ao recarregar.