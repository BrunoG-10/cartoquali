# Ocorrências de Qualidade e Planos de Melhoria

## Objetivo
Completar, sobre o MVP atual, o fluxo demonstrável **Avaliação → Ocorrência → Plano → Acompanhamento → Resultado**, mantendo tudo em mocks e estado compartilhado da sessão, sem banco, autenticação, backend, API externa ou persistência.

## Implementação

### 1. Modelo e serviços substituíveis
- Ampliar os tipos de ocorrência, plano e histórico com título, origem, ponto, responsável por ID, prazo, prioridade, progresso, resultados e comparação de indicador.
- Adicionar contratos tipados para consultar, criar e atualizar ocorrências e planos, inclusive mudanças de status.
- Centralizar as mutações no provedor de sessão e sempre filtrar pelo cartório ativo; nenhuma tela alterará diretamente os mocks.
- Tratar **Atrasado** como estado visual calculado pelo prazo para evitar divergência entre data e status salvo.

### 2. Dados fictícios consistentes
- Expandir a base para pelo menos 6 ocorrências e 4 planos, cobrindo todos os status, prioridades, origens e relacionamentos solicitados.
- Incluir ocorrências ligadas e não ligadas a avaliações, histórico cronológico, plano atrasado, plano concluído e comparações de indicadores.
- Usar IDs e datas determinísticos; novas entidades da sessão receberão códigos sequenciais previsíveis.

### 3. Navegação da área Qualidade
- Criar navegação compartilhada e clara entre Visão Geral, Indicadores, Ocorrências, Planos de Melhoria, Evolução e Metodologia, preservando Dimensões e Pontos de Avaliação já existentes.
- Criar a rota própria **Ocorrências de Qualidade** e evoluir a rota existente de **Planos de Melhoria**, ambas com metadados próprios.
- Manter os acessos atuais e o aviso de solução independente em todas as telas.

### 4. Ocorrências de Qualidade
- Construir indicadores, filtros por status/prioridade/origem/categoria/ponto/período e listagem completa; usar tabela no desktop e cards no celular.
- Implementar **+ Nova ocorrência** com validação dos campos obrigatórios, relação opcional com avaliação e confirmação após salvar.
- Criar detalhe com informações completas, avaliação vinculada, acesso à avaliação completa e timeline vertical.
- Permitir atualizar responsável, status, prazo e observações; cada alteração acrescentará um evento local ao histórico.
- Manter a criação iniciada por avaliação negativa, agora abrindo o formulário preenchido em vez de gerar um registro incompleto automaticamente.

### 5. Planos de Melhoria
- Evoluir a lista com código, problema, responsável, prazo, status efetivo e progresso; incluir filtros e visual adaptado ao celular.
- Implementar **+ Novo plano**, com relacionamento opcional à ocorrência, ponto e dimensão da qualidade.
- Criar detalhe completo com problema, objetivo, ação, responsável, prazo, resultado esperado e resultado obtido.
- Permitir progresso em 0%, 25%, 50%, 75% e 100%, atualização de status e conclusão.
- Ao concluir, permitir registrar data, observação, indicador, valor anterior e posterior, exibindo a variação com a linguagem neutra exigida.
- A partir de uma ocorrência, oferecer criação de plano já relacionado e registrar essa ação no histórico da ocorrência.

### 6. Gestão e melhoria contínua
- Na Visão Geral de Qualidade, adicionar cartões clicáveis para ocorrências abertas/críticas e planos em andamento/atrasados/concluídos, levando às listas já filtradas.
- Adicionar **Atenção necessária** com regras puras e determinísticas para ocorrências críticas sem tratamento, planos próximos do prazo e queda de dimensão.
- Adicionar **Problemas mais recorrentes**, com filtros de período e categoria, calculado a partir das ocorrências do cartório ativo.
- Incluir a representação visual do **Ciclo de Melhoria Contínua**: Avaliar, Identificar, Analisar, Agir, Acompanhar e Medir novamente.
- Manter todos os cálculos gerenciais em funções puras, fora dos componentes visuais.

## Validação
- Validar o fluxo completo: abrir avaliação negativa, criar ocorrência, criar plano relacionado, definir responsável e prazo, atualizar progresso, concluir e registrar resultado comparativo.
- Conferir filtros, links filtrados, timeline, recorrência e alertas após mutações da sessão.
- Testar desktop e celular, incluindo formulários, cards móveis e ações principais.
- Confirmar tipos, compilação, metadados das rotas e ausência de erros no navegador.

## Fora do escopo
Banco de dados, Lovable Cloud, Supabase, migrations, autenticação real, RLS, backend, API externa, persistência, pagamentos, IA, notificações reais, WhatsApp, e-mail, PDF, NFC e QR reais.
