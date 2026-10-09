-- Cobrança mensal dos cartórios, controlada só pelo administrador da plataforma (baixa manual).
-- Os cartórios cobrados não leem nada disto; a auditoria fica no cartório de quem registrou.

create table if not exists public.cobranca_cartorio (
  cartorio_id uuid primary key references public.cartorios(id) on delete restrict,
  valor_mensal numeric(10,2) not null check (valor_mensal > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 28),
  inicio date not null check (extract(day from inicio) = 1),
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.pagamentos_cartorio (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  competencia date not null check (extract(day from competencia) = 1),
  valor numeric(10,2) not null check (valor > 0),
  pago_em date not null,
  forma text not null check (forma in ('pix', 'boleto', 'transferencia', 'outro')),
  observacao text check (observacao is null or char_length(observacao) <= 300),
  registrado_por uuid references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (cartorio_id, competencia)
);

alter table public.cobranca_cartorio enable row level security;
alter table public.pagamentos_cartorio enable row level security;
revoke all on table public.cobranca_cartorio from public, anon, authenticated;
revoke all on table public.pagamentos_cartorio from public, anon, authenticated;
grant all on table public.cobranca_cartorio to service_role;
grant all on table public.pagamentos_cartorio to service_role;

create or replace function cartoquali_private.require_platform_admin()
returns uuid language plpgsql stable security definer set search_path = public, cartoquali_private, pg_temp as $$
begin
  if not cartoquali_private.has_any_role(array['PLATFORM_ADMIN']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return cartoquali_private.current_user_id();
end $$;
revoke all on function cartoquali_private.require_platform_admin() from public, anon;
grant execute on function cartoquali_private.require_platform_admin() to authenticated, service_role;

create or replace function public.set_registry_billing(
  _cartorio_id uuid, _valor numeric, _dia int, _inicio date, _ativo boolean)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _actor uuid := cartoquali_private.require_platform_admin();
begin
  if not exists (select 1 from public.cartorios where id = _cartorio_id) then
    raise exception 'registry_not_found' using errcode = 'P0002';
  end if;
  if _valor is null or _valor <= 0 or _valor > 1000000 or _dia is null or _dia not between 1 and 28
     or _inicio is null then
    raise exception 'invalid_billing' using errcode = '22023';
  end if;
  insert into public.cobranca_cartorio as c (cartorio_id, valor_mensal, dia_vencimento, inicio, ativo, updated_at)
  values (_cartorio_id, round(_valor, 2), _dia, date_trunc('month', _inicio)::date, coalesce(_ativo, true), now())
  on conflict (cartorio_id) do update
    set valor_mensal = excluded.valor_mensal, dia_vencimento = excluded.dia_vencimento,
        inicio = excluded.inicio, ativo = excluded.ativo, updated_at = now();
  insert into public.audit_logs (cartorio_id, user_id, action, entity, entity_id, metadata)
  values (cartoquali_private.current_cartorio_id(), _actor, 'BILLING_UPDATED', 'registry_billing', _cartorio_id,
          jsonb_build_object('registryId', _cartorio_id, 'monthlyFee', round(_valor, 2), 'dueDay', _dia,
                             'startMonth', to_char(_inicio, 'YYYY-MM'), 'active', coalesce(_ativo, true)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.register_registry_payment(
  _cartorio_id uuid, _competencia date, _valor numeric, _pago_em date, _forma text, _observacao text default null)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _actor uuid := cartoquali_private.require_platform_admin();
  _id uuid;
begin
  if not exists (select 1 from public.cobranca_cartorio where cartorio_id = _cartorio_id) then
    raise exception 'billing_not_configured' using errcode = 'P0002';
  end if;
  if _competencia is null or _valor is null or _valor <= 0 or _valor > 1000000 or _pago_em is null
     or _forma not in ('pix', 'boleto', 'transferencia', 'outro')
     or char_length(coalesce(_observacao, '')) > 300 then
    raise exception 'invalid_payment' using errcode = '22023';
  end if;
  begin
    insert into public.pagamentos_cartorio (cartorio_id, competencia, valor, pago_em, forma, observacao, registrado_por)
    values (_cartorio_id, date_trunc('month', _competencia)::date, round(_valor, 2), _pago_em, _forma,
            nullif(btrim(_observacao), ''), _actor)
    returning id into _id;
  exception when unique_violation then
    raise exception 'duplicate_payment' using errcode = '23505';
  end;
  insert into public.audit_logs (cartorio_id, user_id, action, entity, entity_id, metadata)
  values (cartoquali_private.current_cartorio_id(), _actor, 'PAYMENT_REGISTERED', 'registry_payment', _id,
          jsonb_build_object('registryId', _cartorio_id, 'month', to_char(_competencia, 'YYYY-MM'),
                             'amount', round(_valor, 2), 'paidOn', _pago_em, 'method', _forma));
  return jsonb_build_object('id', _id);
end $$;

create or replace function public.remove_registry_payment(_id uuid)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _actor uuid := cartoquali_private.require_platform_admin();
  _row public.pagamentos_cartorio;
begin
  delete from public.pagamentos_cartorio where id = _id returning * into _row;
  if _row.id is null then raise exception 'payment_not_found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (cartorio_id, user_id, action, entity, entity_id, metadata)
  values (cartoquali_private.current_cartorio_id(), _actor, 'PAYMENT_REMOVED', 'registry_payment', _row.id,
          jsonb_build_object('registryId', _row.cartorio_id, 'month', to_char(_row.competencia, 'YYYY-MM'),
                             'amount', _row.valor, 'paidOn', _row.pago_em, 'method', _row.forma));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.set_registry_billing(uuid, numeric, int, date, boolean) from public, anon;
revoke all on function public.register_registry_payment(uuid, date, numeric, date, text, text) from public, anon;
revoke all on function public.remove_registry_payment(uuid) from public, anon;
grant execute on function public.set_registry_billing(uuid, numeric, int, date, boolean) to authenticated, service_role;
grant execute on function public.register_registry_payment(uuid, date, numeric, date, text, text) to authenticated, service_role;
grant execute on function public.remove_registry_payment(uuid) to authenticated, service_role;

-- Painel da plataforma (20261011010000) passa a trazer a cobrança e os pagamentos de cada cartório.
create or replace function public.get_platform_overview()
returns jsonb language plpgsql stable security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _rows jsonb;
  _hidden int;
begin
  if not cartoquali_private.has_any_role(array['PLATFORM_ADMIN']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into _hidden from public.cartorios where oculto;

  select coalesce(jsonb_agg(row_data order by row_data->>'name'), '[]'::jsonb) into _rows
  from (
    select jsonb_build_object(
      'id', c.id,
      'name', c.nome_fantasia,
      'city', c.cidade,
      'state', c.estado,
      'status', c.status,
      'environmentKind', c.environment_kind,
      'onboardingStatus', o.status,
      'evaluations7d', coalesce(ev.last7, 0),
      'evaluations30d', coalesce(ev.last30, 0),
      'average30d', ev.avg30,
      'lastEvaluationAt', ev.last_at,
      'openOccurrences', coalesce(oc.open_count, 0),
      'activeUsers', coalesce(us.active_count, 0),
      'lastAccessAt', us.last_access,
      'billing', case when cb.cartorio_id is null then null else jsonb_build_object(
        'monthlyFee', cb.valor_mensal,
        'dueDay', cb.dia_vencimento,
        'startMonth', to_char(cb.inicio, 'YYYY-MM'),
        'active', cb.ativo) end,
      'payments', coalesce(pg.items, '[]'::jsonb)
    ) as row_data
    from public.cartorios c
    left join public.cartorio_onboarding o on o.cartorio_id = c.id
    left join public.cobranca_cartorio cb on cb.cartorio_id = c.id
    left join lateral (
      select count(*) filter (where a.created_at >= now() - interval '7 days') as last7,
             count(*) filter (where a.created_at >= now() - interval '30 days') as last30,
             round(avg(a.nota_geral) filter (where a.created_at >= now() - interval '30 days'), 2) as avg30,
             max(a.created_at) as last_at
      from public.avaliacoes a
      where a.cartorio_id = c.id and not a.is_test
    ) ev on true
    left join lateral (
      select count(*) as open_count
      from public.ocorrencias_qualidade q
      where q.cartorio_id = c.id and q.status not in ('resolvida', 'encerrada')
    ) oc on true
    left join lateral (
      select count(*) filter (where u.status = 'ativo') as active_count,
             max(au.last_sign_in_at) as last_access
      from public.usuarios u
      left join auth.users au on au.id = u.auth_user_id
      where u.cartorio_id = c.id
    ) us on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'month', to_char(p.competencia, 'YYYY-MM'),
               'amount', p.valor,
               'paidOn', p.pago_em,
               'method', p.forma,
               'note', p.observacao) order by p.competencia desc) as items
      from public.pagamentos_cartorio p
      where p.cartorio_id = c.id
    ) pg on true
    where not c.oculto
  ) t;

  return jsonb_build_object('registries', _rows, 'hiddenCount', _hidden);
end $$;
