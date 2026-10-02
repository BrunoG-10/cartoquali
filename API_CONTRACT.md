# Contrato da API futura do CartoQuali

Este documento descreve a integração futura. O MVP atual não realiza requisições HTTP e continua usando o provedor mock em memória.

## Convenções

- Base sugerida: `/api/v1`.
- Autenticação administrativa por token seguro; a avaliação pública não exige login.
- `cartorio_id` no transporte corresponde a `registryId` no domínio frontend.
- Datas em ISO 8601, paginação por `page` e `page_size` e respostas JSON.
- Listagens aceitam os filtros aplicáveis: `cartorio_id`, `periodo`, `data_inicio`, `data_fim`, `ponto_id`, `pesquisa_id`, `nota`, `categoria`, `prioridade` e `status`.

## Formato das respostas

Sucesso: `{ "data": ..., "meta": { "page": 1, "page_size": 20, "total": 0 } }`.

Erro: `{ "error": { "code": "validation_error", "message": "Mensagem em português", "fields": {} } }`.

Códigos previstos: `validation_error` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `server_error` (500) e `network_error` no cliente.

## Recursos administrativos

| Método e caminho | Finalidade | Parâmetros/payload | Resposta |
|---|---|---|---|
| `GET /cartorios` | Listar cartórios autorizados | paginação, status | `Registry[]` |
| `GET /cartorios/:id` | Consultar cartório | `id` | `Registry` |
| `PATCH /cartorios/:id` | Atualizar cadastro | campos editáveis de `Registry` | `Registry` |
| `GET /usuarios` | Listar usuários | `cartorio_id`, perfil, status | `RegistryUser[]` |
| `POST /usuarios` | Criar usuário | nome, e-mail, telefone, perfil, status | `RegistryUser` |
| `GET /pontos-avaliacao` | Listar pontos | `cartorio_id`, pesquisa, status | `EvaluationPoint[]` |
| `POST /pontos-avaliacao` | Criar ponto | nome, local, descrição, código, pesquisa, status | `EvaluationPoint` |
| `GET /pesquisas` | Listar pesquisas | `cartorio_id`, status | `Survey[]` |
| `POST /pesquisas` | Criar pesquisa | nome, descrição, versão, configurações | `Survey` |
| `GET /avaliacoes` | Listar avaliações | filtros compartilhados | `Review[]` |
| `GET /avaliacoes/:id` | Consultar avaliação | `cartorio_id`, `id` | `Review` com respostas autorizadas |
| `PATCH /avaliacoes/:id` | Atualizar tratamento | status e campos operacionais | `Review` |
| `GET /indicadores` | Obter indicadores | período, ponto, pesquisa e cartório | `Indicators` |
| `GET /ocorrencias` | Listar ocorrências | período, ponto, categoria, prioridade, status | `QualityOccurrence[]` |
| `POST /ocorrencias` | Criar ocorrência | `CreateOccurrenceInput` + `cartorio_id` | `QualityOccurrence` |
| `PATCH /ocorrencias/:id` | Atualizar ocorrência | `UpdateOccurrenceInput` | `QualityOccurrence` |
| `GET /planos-melhoria` | Listar planos | período, ponto, dimensão, prioridade, status | `ImprovementPlan[]` |
| `POST /planos-melhoria` | Criar plano | `CreateImprovementPlanInput` + `cartorio_id` | `ImprovementPlan` |
| `PATCH /planos-melhoria/:id` | Atualizar plano | `UpdateImprovementPlanInput` | `ImprovementPlan` |
| `GET /relatorios` | Listar histórico | cartório, tipo, período | `ReportHistoryItem[]` |
| `GET /auditoria` | Consultar eventos | cartório, usuário, entidade, período | `AuditLog[]` |

Consultas por ID sempre validam que o recurso pertence ao cartório autorizado. Escritas administrativas registram um evento de auditoria.

## Avaliação pública

`POST /avaliacoes` não exige login. O backend resolve e valida cartório, ponto e pesquisa antes de aceitar o envio.

```json
{
  "cartorio_id": "registry-cartorio-modelo",
  "ponto_id": "point-recepcao",
  "pesquisa_id": "survey-service-v1",
  "nota_geral": 5,
  "atendimento_resolvido": "Sim",
  "nota_tempo": 4,
  "nota_clareza": 5,
  "nota_estrutura": 4,
  "comentario": "Atendimento claro.",
  "motivo_insatisfacao": null,
  "deseja_contato": false,
  "nome_contato": null,
  "telefone_contato": null,
  "email_contato": null,
  "anonymous": true,
  "created_at": "2026-10-02T04:00:00Z"
}
```

Nome, telefone e e-mail são opcionais e só podem ser enviados após consentimento de contato. CPF, RG e endereço não fazem parte do contrato. O endpoint deve aplicar validação, limitação de requisições, proteção contra automação e não revelar dados internos.