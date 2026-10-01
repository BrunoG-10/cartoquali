# Dashboard de Qualidade e Metodologia de Indicadores

## Objetivo
Transformar a área **Qualidade** em uma visão gerencial completa, calculada exclusivamente a partir dos dados fictícios já existentes e das avaliações criadas durante a sessão. Nada será conectado a banco de dados, autenticação, API externa ou persistência real.

## Implementação

### 1. Modelo analítico e metodologia
- Acrescentar uma estrutura tipada e versionada para a **Metodologia CartoQuali 1.0**, contendo dimensões, indicadores, fórmulas e vínculos com as perguntas.
- Centralizar em funções puras os cálculos de nota média, satisfação, negativas, resolutividade, índices dimensionais, período anterior, variações, destaques e pontos de atenção.
- Manter todos os cálculos fora dos componentes visuais e preservar o contrato substituível do serviço mock.
- Considerar válidas todas as avaliações completas presentes na fonte mock; calcular a dimensão Resolutividade a partir da resposta Sim/Não normalizada para 0–100.

### 2. Dados fictícios consistentes
- Ampliar os mocks com datas, notas e dimensões variadas, comentários opcionais, contatos opcionais e avaliações positivas e negativas em todos os pontos.
- Fazer cards, gráficos, tabelas e detalhes derivarem da mesma coleção de avaliações, incluindo as novas avaliações da sessão.
- Produzir evolução histórica determinística, sem valores aleatórios por renderização.

### 3. Página Qualidade
- Substituir a página atual de ocorrências por uma experiência organizada em: **Visão Geral, Indicadores, Dimensões, Evolução, Pontos de Avaliação e Metodologia**.
- Preservar o gerenciamento de ocorrências existente e integrá-lo à nova página, sem removê-lo.
- Adicionar filtros globais funcionais por período, ponto, pesquisa e nota, com datas personalizadas e ação para limpar filtros.
- No celular, apresentar os filtros em painel compacto; em telas maiores, exibi-los diretamente.

### 4. Indicadores e análises
- Exibir Satisfação, Nota média, Avaliações, Taxa de negativas e Resolutividade, com comparação ao período anterior.
- Mostrar Atendimento, Tempo, Clareza, Resolutividade e Estrutura em escala 0–100, quantidade de respostas e tendência.
- Implementar evolução alternável entre Nota média, Satisfação, Resolutividade e Negativas.
- Implementar distribuição de notas de 5 a 1 estrela; selecionar uma faixa filtrará a lista de avaliações.
- Exibir mapa de qualidade, dois maiores índices como pontos fortes e dois menores como pontos de atenção.
- Usar `p.p.` para variações de taxas e diferença numérica para nota média.

### 5. Qualidade por ponto e detalhamento
- Criar tabela por ponto com Avaliações, Nota média, Satisfação e Negativas.
- Abrir uma visão detalhada ao selecionar um ponto, reunindo indicadores, evolução, distribuição, dimensões, avaliações recentes e ocorrências relacionadas.
- Destacar avaliações de até 3 estrelas com comentário ou motivo como **Possível ponto de atenção**.
- Oferecer **Ver avaliação** e **Criar ocorrência**; a ocorrência será adicionada somente ao estado da sessão já existente.

### 6. Avaliações dentro da área Qualidade
- Adicionar acesso a todas as avaliações com data, ponto, nota, satisfação, resolutividade, comentário, status e indicação de ocorrência.
- Incluir filtros por período, nota, ponto, status, existência de comentário e solicitação de contato.
- Abrir o detalhe completo da avaliação sem duplicar regras analíticas dentro da interface.

### 7. Metodologia e conformidade textual
- Criar a seção **Metodologia CartoQuali — versão 1.0** com explicações simples das fórmulas.
- Informar claramente que os indicadores são métricas próprias da plataforma e não representam certificação oficial.
- Manter em todas as telas o aviso de solução independente, sem vínculo com ANOREG, PQTA ou CNJ.

## Validação
- Conferir cada um dos 14 critérios de conclusão do briefing.
- Validar filtros, recalculação, seleção por nota, detalhes por ponto, avaliação e criação de ocorrência em sessão.
- Testar visualmente em desktop e celular, incluindo tabelas com rolagem horizontal e filtros compactos.
- Confirmar tipos, compilação e ausência de erros no navegador.

## Fora do escopo
Banco de dados, Lovable Cloud, Supabase, autenticação real, API externa, persistência, pagamentos, planos, NFC/QR reais, IA, e-mail, WhatsApp, PDF e integrações oficiais.
