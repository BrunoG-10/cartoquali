# Plano — Arquitetura funcional multi-cartório do CartoQuali

## Objetivo
Evoluir o MVP atual para uma estrutura frontend coerente com um SaaS multi-cartório, preservando o visual e os fluxos existentes. Todos os dados continuarão fictícios e temporários, sem banco, autenticação, migrations, RLS, backend ou API externa.

## 1. Modelo de dados conectado
- Ampliar os tipos para representar Cartório, Usuário, Ponto de Avaliação, Pesquisa, Pergunta, Opção de Resposta, Avaliação, Resposta, Ocorrência, Plano de Melhoria e Evento de Auditoria.
- Incluir `cartorioId` nas entidades operacionais e IDs relacionais coerentes entre os registros.
- Modelar papéis e permissões futuras — administrador da plataforma, administrador do cartório, gestor e operador — sem implementar login ou controle de acesso real.
- Separar respostas das avaliações e manter dados pessoais opcionais, permitindo avaliações anônimas.
- Criar constantes tipadas para categorias, status, prioridades, tipos de pergunta, papéis e permissões.

## 2. Mocks e contratos preparados para API
- Substituir os dados soltos atuais por um conjunto centralizado de mocks relacionais, com um cartório ativo e dados consistentes entre pontos, pesquisas, perguntas, avaliações, respostas, ocorrências, planos e auditoria.
- Expandir o contrato de serviço com operações para obter cada entidade, buscar uma avaliação por ID, criar avaliação e consultar indicadores.
- Manter um adaptador mock como implementação do contrato, permitindo futura troca por API sem alterar as telas.
- Preservar alterações demonstrativas somente no provedor de sessão em memória; recarregar a página continuará restaurando os mocks originais.
- Garantir que todas as consultas da interface sejam limitadas ao cartório ativo, sem misturar dados de organizações diferentes.

## 3. Cálculos e filtros independentes da interface
- Criar funções puras para média geral, satisfação, resolutividade, índice de tempo e distribuição de notas.
- Criar filtros reutilizáveis por período, ponto, nota, categoria, pesquisa e status.
- Derivar os indicadores dos dados mockados e das avaliações enviadas na sessão, em vez de manter números estáticos nos componentes.

## 4. Dashboard mais realista
- Adicionar os filtros visuais de período — Hoje, 7 dias, 30 dias, 90 dias, 12 meses e Personalizado — e ponto de avaliação.
- Fazer os filtros atualizarem indicadores, evolução mensal, distribuição de 1 a 5 estrelas, desempenho por ponto e motivos de insatisfação.
- Exibir satisfação geral, média, resolutividade, avaliações recebidas e negativas usando a camada de cálculo.
- Manter o dashboard restrito ao cartório ativo e sem ranking entre cartórios.

## 5. Qualidade e planos de melhoria
- Transformar Qualidade em uma primeira tela funcional com os quatro indicadores solicitados e uma lista de ocorrências mockadas.
- Permitir abrir o detalhe de uma ocorrência e criar uma nova ocorrência apenas no estado da sessão.
- Criar a tela própria de Planos de melhoria, com os indicadores Em andamento, Concluídos e Atrasados, exemplos relacionados às ocorrências e detalhe de cada plano.
- Adicionar a nova tela à navegação sem remover as áreas existentes.

## 6. Adequação das telas existentes
- Fazer Cartório, Usuários, Pontos, Pesquisas, Avaliações, Relatórios e Configurações consumirem os contratos e mocks tipados, removendo dados operacionais embutidos nos componentes quando aplicável.
- Preservar o envio público, o detalhe das avaliações, o totem demonstrativo, os estados da sessão e as ações já construídas.
- Atualizar a URL pública conceitual para usar os identificadores fictícios relacionados do cartório e do ponto.
- Manter o padrão visual atual, o aviso de dados fictícios e a experiência responsiva.

## 7. Validação
- Validar relações entre os mocks, isolamento pelo cartório ativo, cálculos e filtros com testes focados.
- Percorrer em celular e desktop: filtros do dashboard, avaliação pública, reflexo do envio no painel, ocorrência nova, detalhe de ocorrência e detalhe de plano.
- Confirmar que não há persistência após recarregar e que não foi adicionada nenhuma conexão externa.
- Verificar todas as páginas, metadados, acessibilidade básica, erros de execução e integridade da compilação.

## Detalhes técnicos
- A UI dependerá apenas de tipos, seletores, utilitários e interfaces de serviço; o adaptador mock será a única origem dos dados iniciais.
- O provedor compartilhado continuará sendo a fronteira de estado temporário da demonstração.
- Novas páginas terão rotas TanStack próprias e metadados exclusivos.
- Nenhuma tecnologia de banco, autenticação ou backend será instalada ou configurada.
