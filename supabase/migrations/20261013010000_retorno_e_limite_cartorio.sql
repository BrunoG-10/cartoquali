-- 1) Situação da avaliação (Nova, Em análise, Respondida) passa a ser alterável pela equipe.
--    A avaliação continua imutável: esta função muda só a coluna status, no cartório da sessão,
--    e registra a troca na auditoria. Operador só consulta.
-- 2) Avaliação pública: além do limite por sessão, no máximo 30 avaliações reais por cartório a
--    cada 10 minutos, contra envio em massa por robô.

create or replace function public.set_evaluation_status(_id uuid, _status text)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _user uuid := cartoquali_private.current_user_id();
  _tenant uuid := cartoquali_private.current_cartorio_id();
  _old text;
begin
  if _user is null or _tenant is null
     or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN', 'CARTORIO_ADMIN', 'GESTOR']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if _status is null or _status not in ('nova', 'em_analise', 'respondida') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select status into _old from public.avaliacoes
  where id = _id and cartorio_id = _tenant and not is_test
  for update;
  if not found then raise exception 'evaluation_not_found' using errcode = 'P0002'; end if;
  if _old = _status then return jsonb_build_object('status', _status, 'changed', false); end if;
  update public.avaliacoes set status = _status where id = _id;
  insert into public.audit_logs (cartorio_id, user_id, action, entity, entity_id, metadata)
  values (_tenant, _user, 'evaluation_status_changed', 'evaluation', _id,
          jsonb_build_object('before', _old, 'after', _status));
  return jsonb_build_object('status', _status, 'changed', true);
end $$;

revoke all on function public.set_evaluation_status(uuid, text) from public, anon;
grant execute on function public.set_evaluation_status(uuid, text) to authenticated, service_role;

-- Limite por cartório, aplicado sobre a definição atual da função (trocas exatas; falha se o
-- trecho não existir, em vez de aplicar algo parcial).
create or replace function cartoquali_private.patch_function(_signature text, _pairs text[])
returns void language plpgsql set search_path = pg_catalog, public as $$
declare
  _ddl text := pg_get_functiondef(_signature::regprocedure);
  _i int;
begin
  for _i in 1 .. array_length(_pairs, 1) / 2 loop
    if position(_pairs[_i * 2 - 1] in _ddl) = 0 then
      raise exception 'patch_anchor_not_found: % (#%)', _signature, _i;
    end if;
    _ddl := replace(_ddl, _pairs[_i * 2 - 1], _pairs[_i * 2]);
  end loop;
  execute _ddl;
end $$;

select cartoquali_private.patch_function(
  'public.submit_public_evaluation(text,uuid,text,jsonb,jsonb,uuid,boolean)',
  array[
    $a$  if _registry_status is distinct from 'ativo' then raise exception 'survey_unavailable' using errcode='P0001'; end if;$a$,
    $b$  if _registry_status is distinct from 'ativo' then raise exception 'survey_unavailable' using errcode='P0001'; end if;
  if (select count(*) from public.avaliacoes where cartorio_id=_point.cartorio_id and not is_test and created_at>now()-interval '10 minutes')>=30 then raise exception 'registry_busy' using errcode='P0001'; end if;$b$
  ]
);

drop function cartoquali_private.patch_function(text, text[]);
