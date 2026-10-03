# Dashboard e indicadores reais

## Fonte e segurança
Os painéis `/dashboard` e `/qualidade` usam `get_dashboard_indicators`, executada como o usuário autenticado. A função é `SECURITY INVOKER`: todas as leituras continuam sujeitas às políticas RLS de `avaliacoes`, `respostas`, `pontos_avaliacao`, `pesquisas` e `perguntas`. O cartório nunca é recebido como parâmetro. `anon` não possui permissão de execução.

## Períodos e filtros
O frontend calcula limites semiabertos `[início, fim)` em `America/Sao_Paulo`, evitando duplicação na meia-noite. Opções: Hoje, 7 dias, 30 dias, Este mês, Mês anterior, 90 dias e Personalizado. O período anterior é o intervalo imediatamente precedente com duração equivalente. Séries usam dia até 31 dias, semana até 120 dias e mês acima disso. Ponto e pesquisa são aplicados na consulta; IDs que não pertencem ao tenant não produzem dados devido ao RLS.

## Indicadores oficiais
- **Total:** quantidade de avaliações válidas no recorte.
- **Nota média:** soma de `nota_geral` dividida pelo total.
- **Satisfação:** notas 4–5 ÷ total × 100.
- **Negativas:** notas 1–3 ÷ total × 100; a contagem também é retornada.
- **Resolutividade:** respostas `sim` em `atendimento_resolvido` ÷ respostas não nulas × 100.
- **Distribuição:** contagem e percentual para cada nota de 1 a 5; a soma deve coincidir com o total.
- **Volume:** contagem por dia, semana ou mês no fuso brasileiro.
- **Por ponto:** total, média, satisfação e negativas por ponto.
- **Comentários/contato:** contagens de avaliações com comentário e com solicitação de contato; nenhum dado pessoal é retornado.
- **Dimensões:** para perguntas `stars`/`scale`, índice = média ÷ 5 × 100; para `yes_no`, Sim=5, Parcialmente=3 e Não=1. Apenas Atendimento, Tempo, Clareza, Resolutividade e Estrutura são calculadas. Sem respostas compatíveis, a interface exibe “Dados insuficientes para este indicador”.

## Ausência de dados e falhas
Zero avaliações mostra estado vazio, não nota `0,0`. Um indicador sem base válida mostra “Dados insuficientes”. Falhas de consulta mostram erro e opção de tentar novamente; nunca há fallback para mocks.

## Permissões e atualização
PLATFORM_ADMIN, CARTORIO_ADMIN, GESTOR e OPERADOR mantêm os acessos já autorizados pelas políticas atuais, sempre dentro do tenant da sessão. O botão Atualizar e a revalidação ao focar a janela consultam novamente o Supabase.
