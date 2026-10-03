# Relatórios e Evidências

## Relatórios disponíveis

- Qualidade consolidada
- Avaliações
- Indicadores
- Ocorrências
- Planos de melhoria
- Satisfação
- Visão executiva

Todos consultam a RPC autenticada `get_quality_report`; não existe fallback para relatório fictício.

## Indicadores e fórmulas

- Nota média: `AVG(nota_geral)`.
- Satisfação: avaliações com nota 4 ou 5 / total × 100.
- Negativas: avaliações com nota 1, 2 ou 3 / total × 100.
- Resolutividade: respostas `sim` / avaliações que responderam resolutividade × 100.
- Distribuição: contagem de cada nota de 1 a 5; a soma coincide com o total.
- Dimensões: média de respostas válidas 1–5 convertida para percentual. Sem respostas, a interface informa “Sem dados suficientes no período selecionado.”
- Ocorrências resolvidas: status `resolvida` ou `encerrada`.
- Planos atrasados: prazo anterior ao dia atual de São Paulo e status não final.

## Período e filtros

Períodos: Hoje, 7, 30 e 90 dias, este mês, mês anterior e personalizado. Limites são semiabertos (`início <= data < fim`) e calculados para `America/Sao_Paulo`; a comparação usa intervalo imediatamente anterior com a mesma duração. A granularidade é dia até 31 dias, semana até 120 dias e mês acima disso.

Filtros de ponto, pesquisa e status aplicável são validados pelo servidor e aplicados à consulta real. IDs invisíveis ao tenant são rejeitados. Links do resumo encaminham avaliações negativas e planos concluídos para listas filtradas.

## Segurança, permissões e LGPD

A RPC é `SECURITY INVOKER`, exige `auth.uid()` e depende das policies RLS já validadas. `anon` e `PUBLIC` não executam; `authenticated` executa conforme a visibilidade do próprio cartório. Os quatro papéis existentes consultam o relatório sem ampliar sua visibilidade tenant-scoped.

O payload e o CSV não incluem nome, telefone, e-mail de contato, documentos, credenciais ou IDs de autenticação. Comentários são tratados como conteúdo da avaliação e podem ser exportados pelos usuários administrativos autorizados.

## Evidências e exportação

O relatório relaciona Avaliação → Ocorrência → Plano → Resultado e exibe somente campos operacionais necessários. O CSV é produzido no servidor a partir do mesmo recorte autenticado e contém data, ponto, pesquisa, nota, status e comentário. A impressão do navegador possui apresentação própria e pode ser salva como PDF. Um gerador PDF dedicado não foi adicionado para evitar dependência frágil no MVP.

## Performance e limites

Uma única RPC consolida agregados e detalhes. Índices existentes cobrem tenant/data e relações principais. Limites defensivos: 5.000 avaliações, 2.000 ocorrências, 2.000 planos e 500 cadeias de evidência por relatório. Para volumes superiores, a evolução recomendada é exportação assíncrona paginada.

## Validação

Dados reais DEMO: 4 avaliações, média 4,25, satisfação 75%, 1 negativa e distribuição somando 4. RPC autenticada e CSV foram conferidos; ID de ponto forjado foi rejeitado; acesso sem autenticação retornou 401. Um segundo tenant temporário com uma avaliação nota 1 viu somente seu registro, enquanto o tenant A manteve seus 4 registros. Fixtures e usuários temporários foram removidos. Desktop 1280×1800 e mobile 390×844 não apresentaram overflow nem erros de console.
