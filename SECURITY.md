# Segurança multi-tenant do CartoQuali

## Identificação do tenant

O tenant é resolvido exclusivamente pela sessão validada do Supabase:

```text
auth.uid() → usuarios.auth_user_id → usuarios.cartorio_id
```

As funções `cartoquali_private.current_user_id()`, `cartoquali_private.current_cartorio_id()` e `cartoquali_private.has_any_role()` usam `SECURITY DEFINER`, `search_path` vazio e ficam fora do schema exposto pela Data API. Visitantes não podem executá-las. Usuários inativos, usuários sem perfil e usuários de cartórios inativos não obtêm tenant.

## Regras de acesso

- `cartorios`: leitura do próprio cartório; alteração somente por `CARTORIO_ADMIN` do tenant.
- `usuarios`: leitura do próprio tenant; criação, alteração e exclusão somente por `CARTORIO_ADMIN` do tenant.
- `user_roles`: leitura do próprio tenant; mutações somente por `CARTORIO_ADMIN`, sempre para usuário do mesmo tenant.
- `pesquisas`, `pontos_avaliacao` e `avaliacoes`: todas as operações administrativas exigem o tenant atual; criações e alterações também validam os pais relacionados.
- `perguntas` e `opcoes_resposta`: o acesso deriva de pesquisa → cartório.
- `respostas`: o acesso deriva de avaliação → cartório; gravações também exigem pergunta da mesma pesquisa.
- `ocorrencias_qualidade`: exige tenant próprio e valida avaliação, ponto e responsável relacionados.
- `planos_melhoria`: exige tenant próprio e valida ocorrência, ponto e responsável relacionados.
- `audit_logs`: clientes autenticados podem apenas consultar registros do próprio tenant. Escrita fica reservada ao servidor.
- `anon`: não possui acesso às tabelas. A entrada pública de avaliações permanece fora desta etapa.

`PLATFORM_ADMIN` não recebe acesso global nesta versão. Qualquer exceção futura deverá usar policy específica e contexto explícito, nunca uma liberação genérica.

## Chave privilegiada

A chave `service_role` existe apenas no ambiente de servidor. Leituras administrativas comuns usam a sessão autenticada e passam pela RLS. O cliente privilegiado é carregado somente dentro do envio de convites, após a autorização tenant feita por uma consulta sujeita à RLS.

## Evidências de validação

Foram criados cartórios e usuários Auth temporários para requisições diretas ao Supabase. A revalidação sequencial dos seis blocos aprovou:

- Bloco 1: 3/3 testes de contexto do tenant;
- Bloco 2: 10/10 testes de cartórios, usuários e bloqueio de exclusão do tenant;
- Blocos 3 e 4: matriz de 61/61 verificações sobre dados principais, avaliações e qualidade;
- Bloco 5: 8/8 testes de auditoria, usuário sem perfil, usuário inativo e visitante;
- Bloco 6: linter, inspeção das funções privadas, pesquisa de chave privilegiada, TypeScript, compilação, desempenho e limpeza final.

A matriz cobriu:

- leitura própria e cruzada nas 12 tabelas;
- criação e alteração no próprio tenant;
- criação, alteração e exclusão cruzadas;
- tentativa de mudar `cartorio_id`;
- relações cruzadas em perguntas, respostas, ocorrências e planos;
- usuário sem perfil, usuário inativo e visitante;
- limpeza integral das contas e registros temporários, confirmada com zero resíduos.

O bloqueio de exclusão de `cartorios` ocorre por ausência deliberada de privilégio/policy de exclusão; a resposta HTTP de permissão negada é o resultado seguro esperado. O linter não encontrou alerta introduzido pelas policies. Permanece um aviso preexistente de configuração: proteção contra senhas vazadas desabilitada no Supabase Auth.