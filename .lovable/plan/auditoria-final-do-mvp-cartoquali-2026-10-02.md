# Auditoria final do MVP CartoQuali

## Objetivo
Concluir o MVP frontend no estado atual, preservando design, rotas e funcionalidades, com dados exclusivamente em memória. Corrigir apenas falhas comprovadas e deixar contratos e documentação prontos para uma futura API externa.

## Escopo de implementação

### 1. Fortalecer o domínio e o isolamento por cartório
- Completar os contratos tipados com contexto de sessão (`currentUser`, `currentRegistry`, permissões), configuração do provedor de dados e modelo conceitual de auditoria.
- Garantir que leituras por ID e mutações recebam ou validem o `registryId`, inclusive avaliações públicas, ocorrências e planos.
- Validar também o `cartorioSlug` da URL pública; hoje somente o ponto é usado para localizar a pesquisa.
- Expandir a verificação dos mocks para IDs duplicados, condições entre perguntas e todos os vínculos cartório → ponto → pesquisa → pergunta → avaliação → resposta → ocorrência → plano.

### 2. Consolidar a camada de serviços e o estado da sessão
- Manter uma única fonte de dados mock e operações em memória, sem `localStorage`, banco ou autenticação.
- Alinhar o provedor da sessão ao contrato de serviço, eliminando regras duplicadas e identificadores fixos em mutações.
- Completar operações necessárias para entidades administrativas e relatórios, mantendo componentes de apresentação sem acesso direto aos arrays mock.
- Introduzir uma seleção simples e tipada de provedor `mock`, apenas como ponto de troca futura, sem implementar o adaptador de API.

### 3. Corrigir consistência de filtros, períodos e indicadores
- Centralizar o cálculo das janelas de data e aplicar o mesmo recorte no Dashboard, Qualidade e Relatórios.
- Corrigir a evolução da Qualidade para respeitar o período selecionado.
- Fazer evolução, comparação anterior, ocorrências e planos dos relatórios respeitarem todos os filtros aplicáveis, incluindo pesquisa, categoria, status e período personalizado.
- Padronizar no contrato a diferença entre quantidade de avaliações negativas e taxa negativa, preservando as fórmulas já definidas.
- Fazer o histórico da sessão reabrir o relatório com seus filtros originais.

### 4. Robustez e acessibilidade sem redesenho
- Substituir o alerta nativo da validação de relatório por mensagem integrada e acessível.
- Aplicar estados reutilizáveis de vazio, erro, carregamento, sucesso e confirmação onde os fluxos auditados ainda usam soluções isoladas.
- Corrigir diálogos manuais para fechamento por `Escape`, foco inicial, devolução de foco e controles semânticos; trocar botões HTML por componentes existentes quando aplicável.
- Validar mensagens em português, navegação por teclado e ausência de exposição de telefone/e-mail nas listagens.

### 5. Documentação final solicitada
- Criar `ARCHITECTURE.md` com módulos, entidades, relações, serviços, filtros, indicadores e ponto futuro de troca mock → API.
- Criar `BUSINESS_RULES.md` com avaliação, privacidade, fórmulas, períodos, ocorrências, planos e pesquisas.
- Criar `BACKEND_REQUIREMENTS.md` apenas como especificação futura de autenticação, multi-tenant, entidades, segurança, auditoria e contratos de API.
- Criar checklist interno de auditoria e um resumo técnico das correções, sem dados sensíveis e sem implementar backend.

### 6. Validação final
- Adicionar testes focados nas funções puras de indicadores, períodos, filtros e integridade dos mocks.
- Exercitar o fluxo público anônimo e com contato, incluindo falha simulada e nova tentativa.
- Exercitar o fluxo administrativo avaliação → ocorrência → plano → conclusão → relatório na mesma sessão.
- Verificar as páginas principais em 360, 390, 768 e 1280 px, incluindo teclado, diálogos, impressão, ausência de overflow e console sem erros.
- Rodar verificação de tipos e confirmar o build final.

## Limites preservados
- Nenhum banco, Lovable Cloud, Supabase, Firebase, API externa, autenticação real, migration, RLS ou pagamento.
- Nenhuma nova funcionalidade relevante, rota desnecessária ou reformulação visual.
- Nenhuma persistência após recarregar a página.

## Resultado esperado
MVP frontend validado, com mocks relacionais confiáveis, métricas consistentes, isolamento por cartório verificável, fluxos demonstráveis e documentação suficiente para planejar a substituição futura dos mocks sem reconstruir a interface.
