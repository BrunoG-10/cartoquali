-- Painel da plataforma: visão de uso de todos os cartórios, só para PLATFORM_ADMIN.
-- Cartórios de teste antigos ficam ocultos (não são apagados) do painel e das implantações.

alter table public.cartorios add column if not exists oculto boolean not null default false;

-- Cartórios de teste das etapas 8 e 12 (inativos, sem uso real).
update public.cartorios
set oculto = true
where id in (
    '3bfc6c21-86cd-4c80-903c-1f05d26389ec', -- Stage 8 A
    'a4953c5d-1420-4a9b-929e-1ef68aafae42', -- Stage 8 B
    '7cf6041b-3290-4e1f-a7cb-6ea329ff0b58', -- Stage 12 0
    'b9dacbb3-1e0e-43a8-b873-b4db864d27d8', -- Stage 12 1
    'dd61eea8-f5dd-407c-9fc8-50f338767096', -- Stage 12 0
    '43c3d59d-98c8-427b-a864-cba891e43399'  -- Stage 12 1
  )
  and status = 'inativo'
  and nome_fantasia like 'Stage %';

-- Uma linha por cartório visível. Avaliações de teste da implantação não entram nos números.
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
      'lastAccessAt', us.last_access
    ) as row_data
    from public.cartorios c
    left join public.cartorio_onboarding o on o.cartorio_id = c.id
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
    where not c.oculto
  ) t;

  return jsonb_build_object('registries', _rows, 'hiddenCount', _hidden);
end $$;

revoke all on function public.get_platform_overview() from public, anon;
grant execute on function public.get_platform_overview() to authenticated, service_role;
