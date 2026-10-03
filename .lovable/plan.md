# Etapa 5 — Avaliações e respostas reais

## Objetivo
Substituir a fonte simulada da página administrativa de Avaliações por dados do Supabase, mantendo o fluxo público e os demais módulos fora desta etapa.

## Blocos
1. Inspecionar tabelas, relações, regras de acesso e diferenças com o modelo visual atual.
2. Criar contratos e funções autenticadas para listagem paginada, filtros e detalhes, sempre isolados pelo cartório da sessão.
3. Conectar a página de Avaliações aos dados reais, com filtros, paginação, estados de interface e detalhes de respostas.
4. Criar somente uma operação administrativa controlada para testes de persistência e relações; avaliações históricas não serão editadas ou excluídas pela interface.
5. Executar testes diretos com dois cartórios para leitura, inserção, relações cruzadas, persistência e bloqueios.
6. Remover apenas os mocks que ainda alimentam a página de Avaliações e atualizar documentação, matriz final e roteiro.

## Detalhes técnicos
- TanStack server functions autenticadas e Supabase sob RLS; nenhuma rota pública, acesso anônimo ou chave privilegiada no navegador.
- Listagem recente primeiro, com paginação no servidor e filtros de período, ponto, pesquisa, nota e status.
- Contatos aparecem apenas no detalhe e somente para perfis autorizados.
- As respostas serão lidas junto às perguntas e opções válidas; a ausência de snapshot histórico será documentada sem ampliar o schema desnecessariamente.
- A Etapa 6 não será iniciada.
