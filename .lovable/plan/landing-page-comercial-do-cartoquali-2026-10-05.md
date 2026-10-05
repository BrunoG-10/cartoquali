# Landing page comercial do CartoQuali

## Objetivo

Transformar `/` na porta de entrada comercial do CartoQuali, levando titulares e gestores de cartórios de uma dúvida inicial até o pedido de demonstração, sem alterar as áreas autenticadas ou a avaliação pública.

## Estrutura da página

- Criar cabeçalho público responsivo com marca, navegação por seções, acesso ao sistema e CTA de demonstração.
- Construir uma primeira tela de alto impacto com o posicionamento aprovado, problema, solução, CTAs e uma composição fiel do produto: avaliação, indicadores, evolução e QR Code.
- Organizar a narrativa comercial nesta ordem: realidade dos cartórios, contexto setorial, problema, funcionamento, QR Code, dashboard, avaliação até ação, ocorrências, planos, relatórios, multipontos, benefícios, diferencial, privacidade, públicos, dúvidas e CTA final.
- Usar mockups estáticos e seguros baseados na interface existente; nenhum dado real, consulta pública ou carregamento do dashboard autenticado será usado.
- Criar rodapé com os links existentes de Privacidade e Termos, sem inventar dados empresariais.

## Conversão e formulário

- Fazer todos os CTAs comerciais levarem ao mesmo formulário de demonstração.
- Implementar os campos Nome, Cartório, Cidade/UF, Cargo, WhatsApp e E-mail, com validação clara, estados de envio, erro e sucesso.
- Criar uma tabela exclusiva de solicitações comerciais no Supabase externo, separada de avaliações e contatos de usuários.
- Enviar pelo servidor, com validação, limite de tamanho, idempotência, campo-armadilha antispam e limitação por sessão temporária; visitantes não poderão listar, alterar ou apagar contatos.
- Não enviar e-mail ou WhatsApp automaticamente nesta etapa, pois não há destinatário nem domínio de envio definidos. Os contatos ficarão disponíveis no Supabase.

## Design e experiência

- Evoluir a identidade atual para uma direção institucional tecnológica: fundo claro, tipografia firme, azul-violeta da marca, ciano e verde como acentos funcionais, alto contraste e composição editorial.
- Evitar visual genérico, imagens de banco, logos oficiais, parcerias implícitas e animações contínuas.
- Usar animações leves apenas para entrada de conteúdo, gráficos e o fluxo avaliação → ação, respeitando redução de movimento.
- Criar menu móvel acessível, hierarquia correta de títulos, foco visível e controles adequados para teclado e leitores de tela.

## Copy, confiança e SEO

- Aplicar os textos e ressalvas fornecidos, com revisão final para remover promessas não comprovadas.
- Contextualizar ANOREG/PQTA apenas em texto e sem logos, homologação, parceria, pontuação ou certificação implícita.
- Tratar anonimato e LGPD com linguagem técnica responsável, sem prometer anonimato absoluto ou conformidade jurídica total.
- Configurar título, descrição, Open Graph, Twitter Card, URL canônica relativa e headings sem repetição artificial de palavras-chave.

## Implementação técnica

- Substituir apenas o redirecionamento de `src/routes/index.tsx` pela landing page.
- Criar componentes comerciais pequenos e estáticos, carregando partes secundárias sob demanda quando isso reduzir o custo inicial.
- Criar função pública de servidor para leads, carregando a credencial administrativa somente dentro do servidor.
- Aplicar migração reproduzível em `database/migrations/` com tabela, permissões mínimas, RLS e função transacional restrita ao servidor.
- Registrar a decisão estrutural no `AGENTS.md` e documentar entrega, integrações, testes, pendências e classificação em um relatório próprio.

## Validação

- Testar visualmente e funcionalmente desktop, notebook, tablet e 320/360/390/430 px.
- Validar menu, todos os CTAs, formulário, estados de sucesso/erro, links, rolagem, ausência de overflow, acessibilidade básica, console e rede.
- Submeter um contato de teste, confirmar sua gravação no Supabase e remover somente esse registro.
- Confirmar que `/login`, `/dashboard`, rotas públicas de avaliação, Privacidade e Termos continuam acessíveis.
- Revisar segurança, ausência de dados privados, consultas desnecessárias e credenciais no navegador.
- Executar a auditoria final das dez perguntas de conversão e ajustar qualquer resposta negativa antes da conclusão.

## Entrega final

Informar estrutura, seções, CTAs, formulário, responsividade, SEO, integrações, testes, pendências e classificação. Somente declarar **“LANDING PAGE COMERCIAL DO CARTOQUALI VALIDADA.”** após todos os critérios verificáveis serem aprovados.
