-- Nomes da equipe para toda a equipe do cartório.
-- A RLS de usuarios deixa gestor e operador lerem só o próprio cadastro. Com isso, ocorrências e
-- planos mostravam o responsável como "Não definido", o histórico como "Usuário indisponível" e a
-- lista de responsáveis só trazia a própria pessoa. Esta função devolve apenas id, nome e se está
-- ativo, dos usuários do cartório de quem chama (nunca e-mail, telefone ou perfil). A RLS de
-- usuarios não muda.
create or replace function public.list_team_members()
returns table (id uuid, nome text, ativo boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.nome, u.status = 'ativo'
  from public.usuarios u
  where u.cartorio_id = (select cartoquali_private.current_cartorio_id())
  order by u.nome
$$;
revoke all on function public.list_team_members() from public, anon;
grant execute on function public.list_team_members() to authenticated, service_role;
