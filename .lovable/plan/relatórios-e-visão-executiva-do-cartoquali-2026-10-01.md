# Relatórios e Visão Executiva do CartoQuali

## Objetivo
Transformar os dados fictícios já mantidos na sessão em seis relatórios gerenciais consistentes com o Dashboard e o módulo Qualidade, sem banco, autenticação, API, persistência ou geração real de arquivos.

## Experiência entregue

### 1. Catálogo e navegação
- Transformar `/relatorios` em um catálogo com os seis relatórios, descrição, período, última atualização e ação **Visualizar**.
- Criar uma URL própria para cada visualização em `/relatorios/$tipo`: Qualidade, Satisfação, Avaliações, Ocorrências, Planos de Melhoria e Executivo.
- Manter o item atual no menu e criar títulos/metadados próprios para o catálogo e para cada relatório.

### 2. Filtros compartilhados
- Criar filtros por período, datas personalizadas, ponto, pesquisa e dimensão.
- Aplicar o mesmo recorte de avaliações em todas as métricas; ocorrências e planos também respeitarão período, ponto e vínculos disponíveis.
- No celular, abrir os filtros em um painel modal; no desktop, mantê-los visíveis.
- A dimensão selecionada limitará as seções dimensionais e suas evidências, sem distorcer os indicadores gerais.

### 3. Camada única de dados e cálculos
- Criar contratos tipados para filtros, evidências, resumos e resultados de cada relatório.
- Implementar `reportService` com `generateQualityReport`, `generateSatisfactionReport`, `generateEvaluationReport`, `generateOccurrenceReport`, `generateImprovementReport` e `generateExecutiveReport`.
- Fazer o serviço receber os dados da sessão e montar apenas modelos de visualização, sempre isolados pelo cartório ativo.
- Reutilizar as funções puras atuais de indicadores, dimensões, evolução, insatisfação, ocorrências e planos; extrair apenas cálculos compartilhados que ainda estejam presos às telas.
- Ajustar o Dashboard onde hoje houver visualização demonstrativa fixa, para que Dashboard e relatórios usem a mesma origem e produzam os mesmos números sob filtros equivalentes.

### 4. Dados fictícios estáveis
- Preservar os registros atuais e ampliar somente o necessário com dados determinísticos em meses, pontos, notas, dimensões, ocorrências, planos e resultados antes/depois.
- Não usar aleatoriedade na montagem dos relatórios nem gravar dados fora da sessão atual.
- Garantir exemplos suficientes para estados positivos, negativos, recorrentes, concluídos, em andamento e atrasados.

### 5. Relatório de Qualidade
- Exibir identificação do cartório, período, data de geração e resumo com avaliações, nota, satisfação, resolutividade, negativas, ocorrências abertas e planos em andamento.
- Incluir comparação com período anterior, evolução, desempenho por dimensão, pontos fortes e pontos de atenção justificados por dados.
- Incluir avaliações de atenção, distribuição por nota, categorias, comentários, motivos de insatisfação, ocorrências por status, planos por status, taxa de conclusão e resultados observados antes/depois.
- O botão **Ver avaliações** abrirá a listagem detalhada já filtrada no módulo de relatórios.

### 6. Relatórios especializados
- **Satisfação:** nota média, satisfação, distribuição, evolução, resultados por ponto e período, positivas e negativas.
- **Avaliações:** tabela filtrável com data, ponto, nota, resolutividade, dimensões, comentário, contato e status; clique abre o detalhe completo.
- **Ocorrências:** totais e distribuições por categoria, prioridade, status e responsável, tempo médio de resolução, recorrências e gráficos simples.
- **Planos de Melhoria:** totais, estados, responsável, prazo, progresso, indicador e resultado, com seção prioritária de atrasados.
- **Executivo:** documento mais contido com KPIs essenciais, evolução, forças, atenções e ações em andamento, sem controles operacionais desnecessários.

### 7. Evidências, metodologia e impressão
- Encerrar cada relatório com contagens de evidências que sustentam seus indicadores.
- Adicionar **Metodologia CartoQuali — v1.0** e link direto para a seção de metodologia existente em Qualidade.
- Adicionar **Imprimir relatório** usando a impressão do navegador.
- Criar estilos `@media print` para ocultar menu, filtros e ações, mantendo identificação, período, métricas, gráficos e tabelas legíveis.
- Exibir **Exportar PDF** desabilitado com “Disponível na próxima versão”; deixar os tipos preparados para CSV, Excel e PDF, sem download simulado.

## Detalhes técnicos
- Converter a rota atual de Relatórios em layout com `<Outlet />`, mover o catálogo para a rota índice e adicionar a rota dinâmica de visualização, sem alterar URLs públicas existentes.
- Separar montagem de dados, cálculos e apresentação; componentes recebem contratos tipados e não acessam mocks diretamente.
- Reaproveitar os componentes visuais e overlays manuais existentes; gráficos serão barras e comparações simples, sem nova biblioteca.
- Preservar `registryId` em todas as leituras e manter o provedor de sessão como única fonte do estado demonstrativo.
- Registrar a nova camada arquitetural no `AGENTS.md` e acompanhar a implementação no `roadmap.md`.

## Validação
- Verificar igualdade entre Dashboard e Relatório de Qualidade para filtros equivalentes.
- Testar os seis relatórios, filtros, datas personalizadas, detalhe de avaliação, links, estados vazios e impressão.
- Validar desktop e celular, incluindo modal de filtros, tabelas com rolagem e resumo executivo priorizado.
- Confirmar ausência de erros de compilação, execução, console e navegação; nenhuma integração externa será adicionada.
