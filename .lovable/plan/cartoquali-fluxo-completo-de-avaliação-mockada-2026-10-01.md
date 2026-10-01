# CartoQuali — fluxo completo de avaliação mockada

## Objetivo
Evoluir o MVP atual para demonstrar, de ponta a ponta, uma avaliação iniciada em um ponto específico e refletida imediatamente no ambiente administrativo, sem banco, autenticação, API ou persistência real.

## Fluxo público
- Criar a URL dinâmica `/avaliar/$cartorio/$ponto`, mantendo `/avaliar` como demonstração compatível com o fluxo já existente.
- Exibir “Cartório Modelo” e o ponto “Recepção” a partir dos identificadores mockados da URL, com estado amigável para um ponto desconhecido.
- Refinar a jornada mobile em cinco etapas: nota/atendimento, resolutividade, tempo, clareza e comentário.
- Mostrar o texto correspondente à estrela escolhida: Muito ruim, Ruim, Regular, Bom ou Excelente.
- Para notas 4–5, mostrar uma mensagem positiva breve; para notas 1–3, incluir seleção múltipla dos motivos de insatisfação.
- Incluir solicitação opcional de contato, revelando nome e telefone/e-mail somente quando autorizada, com aviso de privacidade.
- Implementar validação, voltar/avançar, alvos grandes para toque, foco visível e prevenção de envio duplicado.
- Exibir “Enviando avaliação...” durante o envio e permitir simular falha/repetição pelo adaptador mock, sem expor controles técnicos na experiência normal.
- Finalizar com “Avaliação enviada.”, identificação do ponto e botão “Finalizar”.

## Estado compartilhado da demonstração
- Ampliar os tipos de avaliação para representar motivo, origem, contato protegido e respostas detalhadas.
- Criar um armazenamento somente em memória, acessado por um contrato tipado e um adaptador mock observável.
- Registrar o envio durante a sessão atual e notificar Dashboard, Avaliações e Pontos sem recarregar a página.
- Manter os componentes de apresentação dependentes do contrato, permitindo trocar o mock por uma API externa futuramente.
- Não usar localStorage, cookies, banco, Lovable Cloud, Supabase, migrations ou chamadas de rede.

## Ambiente administrativo
- Recalcular visualmente total, média, satisfação, negativas, distribuição e avaliações recentes usando a base fictícia mais os envios da sessão.
- Inserir a nova avaliação no topo da lista com “Agora”, status “Nova”, ponto, comentário e tipo de avaliação.
- Expandir o detalhe com nota geral, atendimento, tempo, clareza, resolutividade, motivos, comentário e área futura de “Tratamento da ocorrência”.
- Ocultar dados pessoais por padrão e apenas indicar que há dados protegidos para contato.
- Atualizar a contagem e a última avaliação do ponto correspondente.

## Pontos, QR e totem
- Melhorar cada ponto com ações separadas “Ver avaliação” e “Configurar ponto”.
- “Ver avaliação” abrirá a URL dinâmica correspondente em uma nova navegação adequada ao fluxo público.
- Criar o modal “Totem de avaliação” com chamada, estrelas, identidade do cartório/ponto, ícone NFC e QR meramente visual.
- Não gerar QR Code nem implementar NFC real.

## Qualidade e validação
- Preservar a direção visual Frosted Glass e todas as áreas já criadas.
- Adicionar metadados próprios à nova rota pública dinâmica.
- Validar os caminhos positivo, negativo, contato opcional, erro/repetição, atualização do painel/lista/detalhe e visualização do totem.
- Conferir em celular e desktop, incluindo navegação por teclado, ausência de erros no console e compilação válida.

## Limites desta etapa
Não implementar banco, persistência entre recargas, autenticação, API, pagamentos, NFC/QR reais, e-mail, WhatsApp, PDFs ou IA.
