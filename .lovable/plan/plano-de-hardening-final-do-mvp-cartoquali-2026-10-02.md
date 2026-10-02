# Plano de hardening final do MVP CartoQuali

## Objetivo
Entregar um MVP estável, demonstrável e coerente de ponta a ponta, mantendo integralmente os dados fictícios apenas durante a sessão e sem banco, autenticação ou integrações externas.

## Estado confirmado
- As 13 telas principais abrem em desktop, tablet e celular sem erro de execução nem rolagem lateral.
- O fluxo público é anônimo por padrão e só coleta nome e telefone/e-mail quando o usuário pede contato.
- Dashboard, Qualidade e Relatórios já compartilham as funções centrais de indicadores.
- As entidades e leituras atuais são identificadas por cartório, mas os mocks contêm apenas um cartório; o isolamento ainda não tem prova automatizada com dados misturados.
- Faltam validações reutilizáveis, confirmação antes de excluir pergunta, aviso de privacidade dedicado e estados reutilizáveis completos.
- A série de evolução usa seis meses fixos, embora o relatório a descreva como semanal em períodos curtos.
- O histórico de relatórios é demonstrativo e não incorpora os relatórios gerados na sessão.

## Implementação

### 1. Integridade dos dados e isolamento
- Criar um validador de desenvolvimento para conferir todos os vínculos dos mocks: cartório, pesquisa, ponto, pergunta, resposta, avaliação, usuário, ocorrência e plano.
- Acrescentar uma pequena amostra de outro cartório somente para testar que nenhuma leitura da sessão ativa vaza dados.
- Exercitar os contratos do serviço mock com verificações automatizadas de isolamento e relacionamentos.

### 2. Cálculos e filtros consistentes
- Tornar a evolução temporal coerente com o período selecionado: diária/semanal para recortes curtos e mensal para recortes longos.
- Remover descrições divergentes entre Dashboard, Qualidade e Relatórios.
- Aplicar filtros específicos de nota, comentário e contato somente ao relatório de avaliações; manter os demais relatórios baseados no recorte comum.
- Validar períodos personalizados e impedir data final anterior à inicial.

### 3. Fluxo público, privacidade e LGPD
- Adicionar aviso de privacidade em português claro, com responsável identificado como informação demonstrativa do MVP.
- Manter contato opcional e separar telefone/e-mail em campos validados, exibindo consentimento específico somente quando o contato for solicitado.
- Não expor os dados de contato nas listagens gerenciais; mostrar apenas “contato solicitado”.
- Garantir que avaliações de 1 a 3 estrelas peçam motivo e permitam comentário sem tornar contato obrigatório.

### 4. Validação e ações administrativas seguras
- Centralizar regras de validação para cartório, usuário, pesquisa, pergunta, ponto, ocorrência e plano.
- Exibir mensagens claras junto aos campos, sem fechar formulários inválidos.
- Exigir confirmação antes de excluir perguntas e preferir ativação/inativação nas demais entidades.
- Corrigir ações ambíguas e botões apenas com ícone, preservando nomes acessíveis.

### 5. Estados de interface e relatórios em sessão
- Criar estados reutilizáveis de carregamento, vazio, erro, sucesso e confirmação para uso nos fluxos críticos.
- Registrar os relatórios gerados no histórico da sessão e reabri-los com os filtros usados.
- Substituir o aviso de exportação futura por uma orientação objetiva para impressão do navegador, sem prometer recurso inexistente.
- Traduzir as páginas globais de erro e não encontrado para pt-BR.

### 6. Verificação final
- Adicionar testes focados nas fórmulas, período anterior, evolução, vínculos dos mocks, isolamento entre cartórios e filtros de relatório.
- Percorrer o fluxo principal: ponto → avaliação negativa → erro controlado → reenvio → dashboard → ocorrência → plano → relatório.
- Verificar desktop, tablet, celular e impressão, além de teclado, foco visível, nomes acessíveis e ausência de exposição de contato.
- Atualizar o checklist do projeto somente após todas as verificações passarem.

## Limites preservados
- Nenhum banco de dados, backend, autenticação, armazenamento no navegador, API externa, QR Code/NFC real, envio de mensagens, IA ou PDF real.
- Nenhum módulo comercial novo; o health check será apenas validação de desenvolvimento.
