# Arquitetura do CartoQuali

## Estado atual

O MVP é uma aplicação frontend em React e TanStack Start. A estrutura do PostgreSQL externo está definida separadamente, mas o frontend ainda não usa banco, autenticação real, API externa ou persistência no navegador. Todo dado alterado na interface existe apenas durante a sessão atual.

## Camadas

```text
UI → Rotas → Componentes → Serviços → Data Provider → Mock atual
                                                   ↘ API futura → Backend → PostgreSQL externo
```

- `src/types/cartoquali.ts`: contratos do domínio.
- `src/data/mock-service.ts`: dados relacionais e adaptador mock.
- `src/services/cartoquali-service.ts`: fronteira tipada de leituras e mutações.
- `src/services/data-provider.ts`: seleciona explicitamente o provedor `mock`; `api` é apenas um ponto de extensão.
- `src/services/report-service.ts`: compõe modelos de relatório a partir do domínio da sessão.
- `src/components/cartoquali/session-provider.tsx`: estado único da sessão e operações usadas pela interface.
- `src/utils/cartoquali-analytics.ts`: filtros e cálculos puros compartilhados.
- `src/routes`: rotas públicas e administrativas.

## Domínio e relações

Cada entidade operacional possui `registryId`. O encadeamento principal é:

```text
Cartório → Ponto → Pesquisa → Perguntas
                         ↘ Avaliação → Respostas → Ocorrência → Plano
```

O contexto expõe `currentRegistry`, `currentUser`, permissões, `hasPermission` e o provedor ativo. Listagens e mutações são limitadas ao cartório atual. A rota pública valida os slugs do cartório e do ponto.

## Indicadores e filtros

Dashboard, Qualidade e Relatórios usam as mesmas funções puras para período, nota média, satisfação, resolutividade, taxa negativa, dimensões e comparação anterior. Filtros incluem período, intervalo personalizado, ponto, pesquisa, nota, categoria e status quando aplicáveis.

## Migração futura

`CartoQualiService` é a fronteira para substituir o mock por uma API. Um adaptador futuro deverá implementar esse contrato, manter o escopo obrigatório por `registryId` e devolver os mesmos tipos. A interface não deve acessar diretamente banco ou detalhes de transporte. O snapshot inicial existe apenas para iniciar a demonstração em memória; mudanças continuam centralizadas no provedor da sessão e são descartadas ao recarregar.


## Banco externo — Etapa 1

A migration, o seed DEMO e os testes SQL ficam em `database/`. O modelo usa `cartorio_id` como equivalente persistido de `registryId`. Até a implementação de autenticação e RLS, as tabelas não concedem acesso a `anon` ou `authenticated`; esta etapa não conecta o frontend ao banco.
