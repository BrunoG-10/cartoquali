# Arquitetura do CartoQuali

## Estado atual

O MVP é uma aplicação frontend em React e TanStack Start. Não usa banco, autenticação real, API externa ou persistência no navegador. Todo dado alterado existe apenas durante a sessão atual.

## Camadas

- `src/types/cartoquali.ts`: contratos do domínio.
- `src/data/mock-service.ts`: dados relacionais e adaptador mock.
- `src/services`: contratos de acesso e composição dos relatórios.
- `src/components/cartoquali/session-provider.tsx`: estado único da sessão e operações usadas pela interface.
- `src/utils/cartoquali-analytics.ts`: filtros e cálculos puros compartilhados.
- `src/routes`: rotas públicas e administrativas.

## Domínio e relações

Cada entidade operacional possui `registryId`. O encadeamento principal é:

```text
Cartório → Ponto → Pesquisa → Perguntas
                         ↘ Avaliação → Respostas → Ocorrência → Plano
```

O contexto expõe `currentRegistry`, `currentUser`, permissões e o provedor `mock`. Listagens e mutações são limitadas ao cartório atual. A rota pública valida os slugs do cartório e do ponto.

## Indicadores e filtros

Dashboard, Qualidade e Relatórios usam as mesmas funções puras para período, nota média, satisfação, resolutividade, taxa negativa, dimensões e comparação anterior. Filtros incluem período, intervalo personalizado, ponto, pesquisa, nota, categoria e status quando aplicáveis.

## Migração futura

`CartoQualiService` é a fronteira para substituir o mock por uma API. Um adaptador futuro deverá implementar esse contrato, manter o escopo obrigatório por `registryId` e devolver os mesmos tipos. A interface não deve acessar diretamente tabelas, Supabase ou detalhes de transporte.
