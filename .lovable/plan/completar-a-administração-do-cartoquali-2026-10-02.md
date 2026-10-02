# Completar a administração do CartoQuali

## Objetivo

Aprimorar a estrutura administrativa existente para atender integralmente ao novo briefing, mantendo todos os dados fictícios apenas durante a sessão e preservando os módulos já concluídos.

## Estado atual confirmado

- Cartório, usuários, permissões, pesquisas, perguntas, pontos e configurações já possuem uma base funcional em estado compartilhado.
- O cadastro do cartório ainda concentra o endereço em um único campo e não reúne identidade visual e configurações da avaliação na mesma área.
- A gestão de usuários já permite criar, editar e ativar/inativar, mas a listagem não exibe claramente a data de criação nem apresenta os quatro perfis na visão estrutural.
- A duplicação de pesquisa atual cria somente a pesquisa, sem copiar suas perguntas; também faltam edição dos dados da pesquisa e duplicação de perguntas.
- A prévia atual é estática e não percorre a pesquisa configurada com o mesmo componente da experiência pública.
- Pontos já possuem código, pesquisa e prévia física, mas a criação não inclui descrição/status e o detalhe ainda não mostra todos os indicadores e avaliações recentes pedidos.
- Configurações gerais não incluem formato de data, todos os switches solicitados nem a identificação da versão “CartoQuali v0.1 MVP”.
- O projeto está compilando sem erros e continua sem banco, autenticação, backend ou persistência.

## Implementação

### 1. Modelo e mocks administrativos

- Expandir Cartório, Ponto e Configurações com os campos faltantes de endereço, identidade, descrição, formato de data e opções de avaliação.
- Manter IDs e relacionamentos por `registryId`, pesquisa, ponto e pergunta, sem mover dados para componentes nem adicionar persistência.
- Ajustar os mocks para que cartório, usuários, pontos, pesquisas, perguntas e avaliações permaneçam coerentes entre si.

### 2. Cartório e configurações da avaliação

- Reorganizar a página Cartório em Dados, Contato, Endereço, Responsável, Configurações de avaliação e Identidade visual.
- Adicionar os campos de logradouro, número, complemento e bairro, além de nome exibido, cor principal e texto de apresentação.
- Incluir os sete switches de avaliação solicitados e salvar tudo no estado compartilhado com confirmação visual.
- Representar a seleção de logo sem upload ou armazenamento real.

### 3. Usuários, perfis e permissões

- Tornar nome, e-mail, perfil, status, último acesso e criação claramente consultáveis em computador e celular.
- Exibir os quatro perfis e suas descrições, mantendo a matriz solicitada para Admin do cartório, Gestor e Operador.
- Preservar criação, edição e ativação/inativação apenas durante a sessão, sem login real.

### 4. Pesquisas e construtor de perguntas

- Adicionar edição dos dados da pesquisa e manter criação, ativação/inativação e versão visíveis.
- Corrigir a duplicação para gerar novo ID, nova versão e cópias independentes de todas as perguntas.
- Completar o editor com duplicação de pergunta, exclusão, obrigatoriedade, status, associação à dimensão e reordenação por botões.
- Manter os tipos já suportados e alinhar a pesquisa padrão às sete perguntas e associações de indicador do briefing.

### 5. Prévia reutilizável da pesquisa

- Extrair uma apresentação compartilhada que renderize perguntas configuradas por tipo, respeite ordem, status e regras condicionais.
- Usar essa apresentação na experiência pública e no modo de visualização administrativo.
- No modo de visualização, permitir navegar como no celular, mostrar a identificação apropriada e impedir qualquer envio ou alteração dos indicadores.

### 6. Pontos de avaliação

- Completar criação e edição com nome, localização, descrição, código, status e pesquisa vinculada.
- Validar código único e gerar slug/URL pública coerentes no estado da sessão.
- Ampliar o detalhe com URL, volume, nota média, satisfação, avaliações recentes e a prévia física de QR Code/NFC.
- Manter QR Code e NFC estritamente visuais, sem geração ou integração real.

### 7. Configurações gerais e navegação

- Organizar Configurações em Geral, Avaliações, Qualidade, Interface e Sistema.
- Adicionar idioma, formato de data, metodologia, dimensões, identidade e a versão “CartoQuali v0.1 MVP”.
- Reaproveitar as mesmas preferências de avaliação exibidas em Cartório, evitando configurações divergentes.
- Ajustar a navegação apenas onde necessário para tornar as ações administrativas fáceis de localizar, sem criar rotas redundantes.

### 8. Contratos e estado compartilhado

- Expandir os contratos tipados e as operações do provedor para duplicar pesquisas e perguntas, editar pontos e atualizar os novos campos.
- Manter todas as mutações administrativas centralizadas no provedor de sessão e filtradas pelo cartório ativo.
- Garantir que recarregar a página restaure os mocks originais.

## Validação

- Verificar compilação e integridade dos relacionamentos após expandir os tipos.
- Testar em computador e celular: editar Cartório, salvar switches, criar/editar usuário, consultar perfis, criar/editar ponto, abrir detalhe, criar/editar/duplicar pesquisa, duplicar/reordenar perguntas e navegar pela prévia.
- Confirmar que a prévia não registra avaliações e que a experiência pública continua registrando somente na sessão.
- Confirmar que nenhuma funcionalidade existente foi removida e que nenhum banco, autenticação, backend, API, upload, QR/NFC real ou persistência foi adicionado.

## Limites desta etapa

- Sem Lovable Cloud, banco de dados, migrations, autenticação, RLS, backend ou API externa.
- Sem cobrança, assinatura, pagamento, e-mail, WhatsApp, IA, PDF, QR Code real ou NFC real.
