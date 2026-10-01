# Estrutura administrativa do CartoQuali

## Objetivo

Completar a administração do CartoQuali usando somente dados fictícios e estado compartilhado em memória, preservando as telas e fluxos já existentes e mantendo contratos substituíveis por um backend externo no futuro.

## Estado atual confirmado

- Já existem páginas básicas de Cartório, Usuários, Pesquisas, Pontos e Configurações, mas elas ainda cobrem apenas parte do novo briefing.
- O provedor compartilhado mantém avaliações, pontos, ocorrências e planos durante a sessão; usuários, pesquisas e perguntas ainda não possuem operações administrativas completas.
- Os mocks atuais têm 3 usuários, 1 pesquisa, 5 perguntas e 3 pontos; o briefing pede 4 usuários, 2 pesquisas, 7 perguntas e 4 pontos relacionados por IDs.
- Os indicadores dimensionais ainda leem campos fixos das avaliações. Eles precisam passar a usar respostas vinculadas às perguntas e às dimensões configuradas.
- A experiência pública já existe, mas sua estrutura é fixa e ainda não possui um modo de visualização administrativa sem envio.

## Implementação

### 1. Modelo administrativo e dados fictícios

- Ampliar os tipos de cartório, conta, usuário, perfil, permissão, pesquisa, versão, pergunta, condição, dimensão, categoria e configurações.
- Garantir `registryId` em todas as entidades operacionais e relações explícitas entre pesquisa, perguntas, ponto, avaliação e respostas.
- Completar o conjunto demonstrativo com 1 cartório, 4 usuários, 3 perfis em uso, 2 pesquisas, 7 perguntas padrão, 4 pontos, dimensões, categorias e configurações.
- Representar os quatro perfis definidos e a matriz de permissões solicitada, apenas para consulta e configuração futura, sem bloquear telas.

### 2. Contratos e sessão compartilhada

- Expandir o contrato de serviço com todas as consultas e operações administrativas solicitadas.
- Implementar essas operações no adaptador mock e expô-las no provedor de sessão.
- Centralizar no provedor a criação, edição, ordenação, duplicação, ativação, desativação e exclusão, evitando estado isolado dentro das páginas.
- Manter tudo volátil: recarregar a página restaura os mocks e nenhuma informação será gravada no navegador ou enviada a serviços externos.

### 3. Cartório, usuários e permissões

- Organizar Cartório em “Dados institucionais” e “Informações da conta”, incluindo início e renovação.
- Transformar Usuários em uma listagem responsiva com novo usuário, edição, detalhe, status, último acesso, criação e atividade recente fictícia.
- Exibir o aviso de que o acesso só será configurado quando a autenticação for ativada.
- Adicionar a visualização de Perfis e Permissões com a matriz fornecida e permissões herdadas no detalhe do usuário.
- Permitir ativar/desativar usuários apenas durante a sessão.

### 4. Pesquisas e editor de perguntas

- Criar a listagem de pesquisas com status Ativa, Rascunho e Inativa, versão, quantidade de perguntas, avaliações e atualização.
- Adicionar criação e edição de pesquisa, configurações de coleta mínima, contato opcional, anonimato e mensagem de agradecimento.
- Criar editor estável de perguntas com tipo, dimensão, obrigatoriedade, status e ordem.
- Incluir ações de subir, descer, editar, duplicar, ativar/desativar e excluir, usando botões em vez de drag-and-drop.
- Suportar Estrelas 1–5, Sim/Não, Escala 1–5, Texto, Seleção única e Seleção múltipla.
- Modelar e executar as duas regras condicionais solicitadas na experiência de visualização.
- Exibir versão atual, data e status, deixando o modelo preparado para histórico futuro sem implementar versionamento completo.

### 5. Prévia pública reutilizável

- Separar a apresentação da pesquisa pública do registro da avaliação para que o mesmo componente receba uma pesquisa configurada.
- Abrir “Visualizar pesquisa” em modo de visualização claramente identificado.
- Nesse modo, permitir percorrer perguntas e condições, mas impedir qualquer registro de avaliação ou alteração nos indicadores.
- Preservar o fluxo público atual e sua falha controlada com nova tentativa no modo real.

### 6. Pontos de avaliação

- Completar a listagem com código, localização, status, pesquisa vinculada, avaliações e criação.
- Criar formulário com todos os campos solicitados e operações no estado compartilhado.
- Adicionar detalhe do ponto com informações, indicadores derivados, evolução histórica e URL pública futura.
- Manter QR Code e NFC apenas como representação visual, sem geração ou integração real.

### 7. Configurações, categorias e dimensões

- Reorganizar Configurações em Sistema, Experiência, Avaliações e Qualidade.
- Permitir editar as opções gerais somente na sessão, incluindo pesquisa padrão e preferências de anonimato, comentário e contato.
- Criar gestão de categorias com adicionar, editar e ativar/desativar.
- Criar gestão de Dimensões da Qualidade com descrição, status e contagem de perguntas associadas.

### 8. Indicadores configuráveis

- Fazer os cálculos dimensionais percorrerem `resposta → pergunta → dimensão`, em funções puras fora das telas.
- Manter nota geral, satisfação e resolutividade compatíveis com o painel atual, mas remover a dependência dos campos dimensionais fixos para os índices de qualidade.
- Garantir que mudanças de dimensão ou pergunta no editor sejam refletidas nos indicadores durante a mesma sessão.

### 9. Navegação e experiência visual

- Preservar o padrão visual atual e dividir páginas extensas em abas ou áreas horizontais fáceis de usar.
- Criar rotas administrativas adicionais apenas quando a tela precisar de endereço compartilhável; todos os links receberão suas páginas e metadados próprios.
- Usar cartões no celular para tabelas densas, formulários em largura total e ações sempre acessíveis.
- Manter os overlays manuais já adotados no projeto para evitar a regressão de contexto observada anteriormente.

## Validação

- Verificar tipos e compilação após a expansão dos contratos.
- Testar em computador e celular: editar cartório, criar/editar/desativar usuário, consultar permissões, criar pesquisa, manipular perguntas e condições, visualizar sem registrar, criar ponto e editar configurações/categorias/dimensões.
- Confirmar a cadeia completa: pesquisa configurada → pergunta dimensionada → ponto vinculado → resposta → indicador → ocorrência → plano de melhoria.
- Confirmar que recarregar restaura os dados fictícios e que nenhuma autenticação, banco, API, armazenamento persistente, QR/NFC real ou integração externa foi adicionada.

## Limites desta etapa

- Sem Lovable Cloud, Supabase, banco, migrations, RLS, backend, API externa ou autenticação real.
- Sem login, pagamento, assinatura, e-mail, WhatsApp, IA, PDF, QR Code real ou NFC real.