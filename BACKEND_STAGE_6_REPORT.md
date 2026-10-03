# CartoQuali — Relatório da Etapa 6

## Resultado

**APROVADA** — o fluxo público real funciona de Ponto → Pesquisa → Perguntas → Respostas → Avaliação → Supabase → módulo administrativo.

## Implementado

- Rota pública canônica por código opaco do ponto.
- Carregamento mínimo da pesquisa sem login.
- Questionário mobile-first com estados explícitos.
- Envio transacional, validação no servidor, idempotência e limitação de abuso.
- Anonimato por padrão e contato voluntário com consentimento.
- Link público copiável na administração de pontos.

## Banco

- `cartoquali_private.public_submission_guards`.
- `get_public_evaluation_context(_code)`.
- `submit_public_evaluation(_code, _idempotency_key, _source_hash, _answers, _contact)`.
- Execução das funções restrita ao serviço do servidor; nenhuma tabela foi aberta para leitura anônima.

## Testes

- Contexto público real e cinco perguntas: aprovado.
- Código inexistente: aprovado.
- Envio real completo: aprovado.
- Tela final de sucesso: aprovado.
- Persistência no Supabase: aprovado.
- Isolamento e relações cruzadas: aprovado.
- Imutabilidade e negação de leitura pública: aprovado.
- Idempotência, repetição e limitação de abuso: aprovado.
- Layout em 320, 390, 430 e 1280 px: aprovado, sem rolagem horizontal.
- TypeScript e build: aprovados.

## Problemas corrigidos

- A rota dinâmica estava aninhada sob `/avaliar` sem `Outlet`, fazendo o código ser ignorado. Ela foi convertida em rota independente no mesmo endereço público.
- O teste visual foi ajustado às opções reais configuradas na pesquisa, sem inventar respostas.

## Ressalvas

- O aviso preexistente de proteção contra senhas vazadas permanece fora do escopo desta etapa.
- Mocks de módulos ainda não migrados foram preservados; a rota pública não depende mais deles.

## Escopo confirmado

**A Etapa 7 não foi iniciada.**