# Complemento de Relatórios e Visão Executiva do CartoQuali

## Objetivo
Completar o briefing enviado sobre a base de relatórios já existente, preservando os seis relatórios atuais e adicionando apenas as funções ainda ausentes. Tudo continuará usando os dados mock da sessão, sem banco, backend, autenticação, integrações ou PDF real.

## Estado confirmado
- Já existem catálogo, filtros compartilhados, visualizações de Qualidade, Satisfação, Avaliações, Ocorrências, Planos de Melhoria e Executivo, além de impressão básica.
- Os relatórios já recebem os dados da sessão por um serviço tipado e reutilizam os cálculos centrais de qualidade.
- Ainda faltam o gerador “Novo relatório”, o relatório específico de Indicadores, o histórico reabrível, filtros próprios de Avaliações e algumas seções detalhadas pedidas no novo briefing.

## Implementação

### 1. Gerador e catálogo
- Adicionar **Novo relatório** ao catálogo, com tipo, período, ponto e pesquisa, exibindo o resultado na própria experiência de relatórios.
- Incluir os períodos **Este mês** e **Mês anterior**, mantendo os recortes já disponíveis e o intervalo personalizado.
- Criar o **Relatório de Indicadores** e preservar o Relatório de Satisfação existente para não remover funcionalidade.
- Adicionar **Relatórios recentes** com registros mock estáveis e ação para reabrir cada relatório com seus filtros.

### 2. Contratos e serviço central
- Ampliar os contratos tipados de relatório para contemplar definição do relatório, histórico, destaques automáticos, tendências, evidências de melhoria e filtros específicos.
- Completar o serviço com operações equivalentes a `getReports`, `getReportById`, `generateReport`, `getExecutiveSummary` e geradores especializados.
- Manter o serviço puro sobre dados da sessão e isolado por `registryId`, sem acessar mocks diretamente na apresentação.
- Centralizar os cálculos adicionais: qualidade geral, resolutividade por ponto, tendência, melhor/pior dimensão, maior evolução e categoria recorrente.

### 3. Relatório de Qualidade
- Adicionar resumo executivo textual calculado, sem IA e sem adjetivos avaliativos proibidos.
- Criar **Destaques** com melhor indicador, principal ponto de atenção, maior evolução positiva e problema recorrente.
- Completar a comparação atual/anterior, distribuição de 1 a 5 estrelas e evolução com alternância entre nota, satisfação e resolutividade.
- Adequar a série para leitura semanal em períodos curtos e mensal em períodos longos.
- Incluir percepção dos usuários, desempenho por ponto com resolutividade e detalhe clicável, resumo completo de ocorrências e lista dos principais planos.
- Exibir avaliações de atenção com categoria e status da ocorrência vinculada.

### 4. Relatórios especializados
- **Indicadores:** tabela atual/anterior/variação/tendência, dimensões, evolução alternável e evidências usadas no cálculo.
- **Avaliações:** filtros adicionais por nota, comentário e solicitação de contato; distribuição, comentários e detalhe completo.
- **Ocorrências:** manter totais e agrupamentos, destacar abertas e completar a tabela detalhada.
- **Melhorias:** incluir progresso médio, estados, atrasos e resultados registrados.
- **Executivo:** mostrar qualidade geral em percentual, nota, resolutividade e avaliações com setas de tendência, evolução, forças, atenções, ações e problemas abertos em leitura imediata.

### 5. Evidências, exportação e impressão
- Transformar resultados antes/depois em **Evidências de melhoria**, incluindo indicador, situação anterior, ação, situação posterior, responsável e conclusão, com linguagem sem causalidade automática.
- Trocar o botão de exportação apenas desabilitado por uma mensagem clara de disponibilidade futura, sem gerar arquivo.
- Preservar a impressão do navegador e aprimorar a folha de impressão para o documento completo.

### 6. Responsividade e consistência
- Manter filtros em painel no celular, cartões empilhados, gráficos adaptáveis e tabelas com rolagem ou leitura compacta.
- Conferir que Dashboard, Qualidade e Relatórios retornam os mesmos indicadores quando os filtros são equivalentes.
- Preservar todos os módulos existentes e o estado somente em memória; recarregar continuará restaurando os mocks originais.

## Detalhes técnicos
- Reutilizar as rotas atuais e ampliar a lista de tipos válidos sem alterar URLs existentes.
- Evoluir `reportService` e as funções puras de analytics; componentes continuarão recebendo modelos tipados prontos.
- Não instalar biblioteca de gráficos ou PDF; usar os componentes e tokens visuais atuais.
- Registrar no roadmap apenas os incrementos desta etapa e manter a decisão arquitetural vigente no `AGENTS.md`.

## Validação
- Validar criação e reabertura de relatório, todos os tipos, filtros e períodos, detalhes clicáveis, exportação futura e impressão.
- Comparar números entre Dashboard, Qualidade e relatórios sob o mesmo recorte.
- Testar computador e celular, incluindo estados vazios, painel de filtros e tabelas.
- Confirmar tipagem, compilação, rotas, console e execução sem erros.
