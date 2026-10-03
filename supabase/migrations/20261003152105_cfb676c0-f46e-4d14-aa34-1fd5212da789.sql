update public.usuarios
set email = 'bg600070@gmail.com', updated_at = now()
where id = '20000000-0000-4000-8000-000000000001';

create or replace function public.get_my_cartoquali_context()
returns table (
  usuario_id uuid,
  auth_user_id uuid,
  nome text,
  email text,
  telefone text,
  usuario_status text,
  cartorio_id uuid,
  cartorio_nome text,
  cartorio_status text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if current_auth_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.usuarios
     set auth_user_id = current_auth_id,
         updated_at = now()
   where auth_user_id is null
     and lower(email) = current_email
     and not exists (
       select 1 from public.usuarios existing
       where existing.auth_user_id = current_auth_id
     );

  return query
  select
    u.id,
    u.auth_user_id,
    u.nome,
    u.email,
    u.telefone,
    u.status,
    c.id,
    c.nome_fantasia,
    c.status,
    ur.role
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  left join lateral (
    select role
    from public.user_roles
    where user_id = u.id
    order by case role
      when 'PLATFORM_ADMIN' then 1
      when 'CARTORIO_ADMIN' then 2
      when 'GESTOR' then 3
      when 'OPERADOR' then 4
      else 5
    end
    limit 1
  ) ur on true
  where u.auth_user_id = current_auth_id;
end;
$$;

revoke all on function public.get_my_cartoquali_context() from public, anon;
grant execute on function public.get_my_cartoquali_context() to authenticated, service_role;

create or replace function public.has_cartoquali_role(_auth_user_id uuid, _roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.cartorios c on c.id = u.cartorio_id
    join public.user_roles ur on ur.user_id = u.id
    where u.auth_user_id = _auth_user_id
      and u.status = 'ativo'
      and c.status = 'ativo'
      and ur.role = any(_roles)
  )
$$;

revoke all on function public.has_cartoquali_role(uuid, text[]) from public, anon;
grant execute on function public.has_cartoquali_role(uuid, text[]) to authenticated, service_role;