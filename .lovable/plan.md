# Etapa 11 — Operação dos Pontos, QR Code e preparação para NFC

## Objetivo
Executar exclusivamente a Etapa 11, transformando os pontos reais em recursos operacionais com URL pública estável, QR Code reutilizável, ativação controlada e preparação documental para NFC. A Etapa 12 não será iniciada.

## Implementação
1. Reforçar `pontos_avaliacao` sem duplicar campos: preservar nome, código, localização, descrição, status, cartório, pesquisa, `public_slug`, método e timestamps; tornar o identificador público globalmente inequívoco e manter compatibilidade com os links existentes.
2. Substituir mutações diretas por operações autenticadas que derivam o cartório da sessão, validam papel, código, pesquisa ativa e tenant, bloqueiam exclusão física e registram criação, edição, ativação, desativação, troca de pesquisa e alteração de código em `audit_logs`.
3. Aplicar a matriz mínima: `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR` administram pontos; `OPERADOR` consulta, copia, abre e gera QR, sem criar ou alterar. RLS continuará tenant-scoped e nenhuma tabela será aberta para leitura anônima.
4. Preservar `/avaliar/{codigo}` como URL pública canônica. O mesmo endereço servirá a link, QR e futura tag NFC; ponto/cartório/pesquisa inativos continuam bloqueando formulário e envio no servidor.
5. Criar um resolvedor único de URL pública: usar configuração pública de produção quando definida e origem atual como fallback de preview, sem domínio temporário ou segredo hardcoded.
6. Adicionar QR Code em alta resolução, com visualização, download em PNG e folha própria para impressão. O QR conterá somente a URL pública; copiar link terá confirmação, tratamento de falha e campo selecionável para cópia manual.
7. Reorganizar a tela de Pontos para mostrar nome, código, local, status, pesquisa, link e ações rápidas de visualizar, editar, copiar, QR e ativar/desativar, preservando estados de carregamento, vazio, erro e salvamento.
8. Remover somente contratos, operações e fixtures mock específicas dos Pontos que não têm mais consumidores reais. Não alterar mocks ainda usados por módulos fora deste escopo.

## Validação
- Executar matriz de dois cartórios e quatro papéis: leitura própria, bloqueio cruzado, criação/edição, código inválido/duplicado, pesquisa cruzada/inativa, status, troca de pesquisa, exclusão bloqueada e histórico imutável.
- Testar QR real: gerar, decodificar o conteúdo, abrir a URL em viewport móvel, enviar avaliação, confirmar persistência e leitura administrativa; desativar e reativar mantendo exatamente a mesma URL/QR.
- Testar erros controlados: código inexistente, ponto inativo, pesquisa inativa/inexistente, QR/URL inválidos, clipboard indisponível e rede indisponível.
- Validar 320, 360, 390, 414, 430 e desktop, sem rolagem horizontal e com ações utilizáveis; revisar número de requests e tempo de carregamento.
- Verificar TypeScript, build, linter, logs, ausência de credenciais/IDs internos no navegador e funções públicas restritas.
- Criar `EVALUATION_POINTS.md`, `NFC_PREPARATION.md`, relatório final e matriz de 22 itens com evidências e classificação.

## Limites
Não implementar hardware NFC, compra/configuração física de tags, automações, notificações, WhatsApp, pagamentos, IA, benchmarking ou integrações oficiais. NFC será apenas a documentação da mesma URL pública. A Etapa 12 não será iniciada.
