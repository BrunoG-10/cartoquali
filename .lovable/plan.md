# Plano — CartoQuali v1

## Objetivo
Construir a primeira versão navegável do CartoQuali, em português do Brasil, como uma experiência SaaS responsiva para gestão de satisfação e qualidade em cartórios. Esta etapa será exclusivamente visual e demonstrativa, sem banco de dados, autenticação real ou integrações.

## Direção visual escolhida
- Aplicar a direção **Frosted glass analytics**: superfícies translúcidas, contraste institucional, azul-violeta com ciano, tipografia Space Grotesk nos destaques e Inter no conteúdo.
- Preservar a composição aprovada: menu lateral no desktop, cabeçalho contextual, indicadores escaneáveis, gráficos claros e navegação móvel adaptada.
- Usar movimentos discretos, foco visível, bom contraste e suporte a redução de movimento.
- Manter o CartoQuali claramente independente, sem sugerir homologação ou vínculo com ANOREG, PQTA ou CNJ.

## Estrutura da experiência
- Criar uma estrutura administrativa compartilhada com menu lateral no desktop e menu compacto em telas menores.
- Usar páginas próprias e navegáveis para: Dashboard, Avaliações, Pesquisas, Pontos de Avaliação, Qualidade, Relatórios, Cartório, Usuários e Configurações.
- Criar uma página pública separada, mobile-first, para a jornada de avaliação sem cadastro ou login.
- Adicionar títulos e descrições próprios para compartilhamento e busca em cada página.

## Telas e interações

### Dashboard
- Exibir satisfação geral (94,7%), avaliações (1.284), média (4,7/5), resolutividade (92,4%) e avaliações negativas (37).
- Incluir evolução da satisfação, avaliações por período, distribuição por estrelas, pontos fortes, pontos de atenção e avaliações recentes.
- Permitir alternar períodos de demonstração, atualizando visualmente os indicadores e gráficos.

### Avaliações
- Criar filtros por período, nota, ponto, categoria e status.
- Exibir avaliações em tabela no desktop e cartões legíveis no celular.
- Abrir o detalhe de uma avaliação com notas por critério, resolutividade, comentário, local e status.
- Incluir estados de resultado vazio e limpeza dos filtros.

### Pesquisas
- Montar o formulário padrão de seis perguntas descrito no briefing.
- Permitir editar textos, visualizar tipos de resposta e reorganizar/ativar perguntas localmente quando adequado à demonstração.
- Fazer “Salvar pesquisa” apresentar confirmação visual, sem persistência real.

### Pontos de Avaliação
- Exibir Recepção, Balcão 01 e Saída com nome, localização, código, status, método, quantidade e última avaliação.
- Criar detalhe do ponto e espaço visual reservado para futura associação de QR Code e NFC.
- Fazer “Novo ponto” abrir um formulário demonstrativo e atualizar somente o estado da sessão.

### Qualidade
- Criar uma visão inicial de ocorrências, temas críticos e ações de melhoria usando dados fictícios.
- Diferenciar claramente conteúdo disponível de recursos planejados, sem simular uma integração inexistente.

### Relatórios
- Organizar indicadores e modelos de relatório por período e tema.
- Manter exportação/PDF como ação indisponível ou demonstrativa, comunicada de forma clara.

### Cartório, Usuários e Configurações
- Criar formulários e listas demonstrativas para dados da serventia, acessos e preferências gerais.
- Usar feedback visual de sucesso/erro e estados vazios, sem autenticação ou gravação permanente.

### Avaliação pública
- Criar fluxo mobile em poucos passos: experiência geral, resolutividade, tempo, clareza e comentário opcional.
- Usar estrelas e opções grandes, indicador de progresso, validação simples e botão para avançar/enviar.
- Finalizar com a mensagem de agradecimento definida no briefing e permitir iniciar uma nova avaliação.
- Não implementar QR Code ou NFC reais.

## Componentes e dados
- Criar componentes reutilizáveis para botões, estrelas, indicadores, gráficos, badges, filtros, tabelas responsivas, formulários, modais, alertas e estados de carregamento/vazio.
- Separar tipos, dados fictícios e funções de acesso da camada visual, deixando um contrato simples para futura troca por API externa.
- Manter toda alteração apenas em memória durante a sessão; nenhuma informação será persistida.

## Validação
- Conferir navegação e principais interações de ponta a ponta.
- Validar visualmente desktop (1440 px), tablet e celular, com atenção especial à avaliação pública.
- Confirmar ausência de estouros, sobreposições, páginas vazias e erros de execução.
- Conferir que todas as telas informem corretamente quando uma ação é apenas demonstrativa.

## Fora desta versão
Banco de dados, Lovable Cloud, autenticação real, pagamentos, assinaturas, NFC, QR Code funcional, e-mails, PDFs e integrações externas.
