-- Período de teste: 7 dias corridos a partir do primeiro login de um usuário do cartório.
-- Terminado o prazo sem cobrança ativa (cobranca_cartorio, 20261012010000), o acesso é bloqueado
-- no banco: current_user_id/current_cartorio_id deixam de resolver, e toda a RLS fecha junto.
-- A plataforma libera o cartório configurando a cobrança ativa no painel.

create table if not exists public.periodo_teste_cartorio (
  cartorio_id uuid primary key references public.cartorios(id) on delete cascade,
  aplicavel boolean not null default true,
  iniciado_em timestamptz
);

alter table public.periodo_teste_cartorio enable row level security;
revoke all on table public.periodo_teste_cartorio from public, anon, authenticated;
grant all on table public.periodo_teste_cartorio to service_role;

-- Cartórios que já existiam antes do período de teste continuam com acesso normal.
insert into public.periodo_teste_cartorio (cartorio_id, aplicavel)
select id, false from public.cartorios
on conflict (cartorio_id) do nothing;

create or replace function cartoquali_private.registry_trial_expired(_cartorio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.periodo_teste_cartorio t
    where t.cartorio_id = _cartorio_id
      and t.aplicavel
      and t.iniciado_em is not null
      and now() >= t.iniciado_em + interval '7 days'
      and not exists (
        select 1 from public.cobranca_cartorio cb where cb.cartorio_id = t.cartorio_id and cb.ativo)
  )
$$;
revoke all on function cartoquali_private.registry_trial_expired(uuid) from public, anon;
grant execute on function cartoquali_private.registry_trial_expired(uuid) to authenticated, service_role;

create or replace function cartoquali_private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  where u.auth_user_id = (select auth.uid())
    and u.status = 'ativo'
    and c.status = 'ativo'
    and not cartoquali_private.registry_trial_expired(c.id)
  limit 1
$$;

create or replace function cartoquali_private.current_cartorio_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.cartorio_id
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  where u.auth_user_id = (select auth.uid())
    and u.status = 'ativo'
    and c.status = 'ativo'
    and not cartoquali_private.registry_trial_expired(c.id)
  limit 1
$$;

-- Chamada a cada verificação de sessão: inicia o teste no primeiro login e informa se acabou.
-- Não depende de current_user_id, para responder mesmo com o acesso já bloqueado.
create or replace function public.start_registry_trial()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  _cartorio uuid;
  _row public.periodo_teste_cartorio;
begin
  select u.cartorio_id into _cartorio
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  where u.auth_user_id = (select auth.uid()) and u.status = 'ativo' and c.status = 'ativo'
  limit 1;
  if _cartorio is null then
    return jsonb_build_object('expired', false, 'endsAt', null);
  end if;

  insert into public.periodo_teste_cartorio (cartorio_id, aplicavel, iniciado_em)
  values (_cartorio, true, now())
  on conflict (cartorio_id) do update
    set iniciado_em = now()
    where public.periodo_teste_cartorio.aplicavel
      and public.periodo_teste_cartorio.iniciado_em is null;

  select * into _row from public.periodo_teste_cartorio where cartorio_id = _cartorio;
  return jsonb_build_object(
    'expired', cartoquali_private.registry_trial_expired(_cartorio),
    'endsAt', case when _row.aplicavel then _row.iniciado_em + interval '7 days' end);
end $$;
revoke all on function public.start_registry_trial() from public, anon;
grant execute on function public.start_registry_trial() to authenticated, service_role;
