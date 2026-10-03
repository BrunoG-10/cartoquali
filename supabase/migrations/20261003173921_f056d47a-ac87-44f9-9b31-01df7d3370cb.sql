create unique index if not exists pontos_codigo_publico_global_key
  on public.pontos_avaliacao (lower(codigo));

create or replace function cartoquali_private.validate_evaluation_point()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _cartorio_id uuid;
  _is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not _is_service then
    _cartorio_id := cartoquali_private.current_cartorio_id();
    if _cartorio_id is null then raise exception 'unauthorized' using errcode='42501'; end if;
    if not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']) then
      raise exception 'forbidden' using errcode='42501';
    end if;
    new.cartorio_id := case when tg_op='INSERT' then _cartorio_id else old.cartorio_id end;
  elsif tg_op='UPDATE' then
    new.cartorio_id := old.cartorio_id;
  end if;

  new.nome := btrim(new.nome);
  new.codigo := upper(btrim(new.codigo));
  new.localizacao := btrim(new.localizacao);
  new.descricao := nullif(btrim(new.descricao), '');
  new.metodo := 'link_qr_nfc';
  new.updated_at := now();

  if new.nome = '' or length(new.nome) > 120
     or new.codigo !~ '^[A-Z0-9][A-Z0-9-]{2,39}$'
     or new.localizacao = '' or length(new.localizacao) > 160
     or coalesce(length(new.descricao), 0) > 500
     or new.status not in ('ativo','inativo') then
    raise exception 'invalid_point' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.pesquisas p
    where p.id = new.pesquisa_id
      and p.cartorio_id = new.cartorio_id
      and p.status = 'ativa'
  ) then
    raise exception 'survey_unavailable' using errcode='22023';
  end if;

  if tg_op='INSERT' then
    new.public_slug := lower(new.codigo);
  else
    new.public_slug := old.public_slug;
  end if;
  return new;
end;
$$;

revoke all on function cartoquali_private.validate_evaluation_point() from public, anon, authenticated;
grant execute on function cartoquali_private.validate_evaluation_point() to service_role;

drop trigger if exists validate_evaluation_point on public.pontos_avaliacao;
create trigger validate_evaluation_point
before insert or update on public.pontos_avaliacao
for each row execute function cartoquali_private.validate_evaluation_point();

create or replace function cartoquali_private.audit_evaluation_point()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _user_id uuid;
  _action text;
begin
  _user_id := cartoquali_private.current_user_id();
  if tg_op='INSERT' then
    _action := 'evaluation_point_created';
  elsif old.status <> new.status and new.status='ativo' then
    _action := 'evaluation_point_activated';
  elsif old.status <> new.status and new.status='inativo' then
    _action := 'evaluation_point_deactivated';
  elsif old.pesquisa_id <> new.pesquisa_id then
    _action := 'evaluation_point_survey_changed';
  elsif old.codigo <> new.codigo then
    _action := 'evaluation_point_code_changed';
  else
    _action := 'evaluation_point_updated';
  end if;

  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(
    new.cartorio_id,
    _user_id,
    _action,
    'evaluation_point',
    new.id,
    case when tg_op='INSERT'
      then jsonb_build_object('name',new.nome,'code',new.codigo,'status',new.status,'surveyId',new.pesquisa_id)
      else jsonb_build_object(
        'before',jsonb_build_object('name',old.nome,'code',old.codigo,'location',old.localizacao,'status',old.status,'surveyId',old.pesquisa_id),
        'after',jsonb_build_object('name',new.nome,'code',new.codigo,'location',new.localizacao,'status',new.status,'surveyId',new.pesquisa_id)
      )
    end
  );
  return new;
end;
$$;

revoke all on function cartoquali_private.audit_evaluation_point() from public, anon, authenticated;
grant execute on function cartoquali_private.audit_evaluation_point() to service_role;

drop trigger if exists audit_evaluation_point on public.pontos_avaliacao;
create trigger audit_evaluation_point
after insert or update on public.pontos_avaliacao
for each row execute function cartoquali_private.audit_evaluation_point();

alter policy pontos_insert_own_tenant on public.pontos_avaliacao
with check (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']))
  and exists(select 1 from public.pesquisas p where p.id=pontos_avaliacao.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()) and p.status='ativa')
);

alter policy pontos_update_own_tenant on public.pontos_avaliacao
using (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']))
)
with check (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']))
  and exists(select 1 from public.pesquisas p where p.id=pontos_avaliacao.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()) and p.status='ativa')
);

drop policy if exists pontos_delete_own_tenant on public.pontos_avaliacao;
revoke delete on public.pontos_avaliacao from authenticated;

create or replace function public.get_public_evaluation_context(_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  _point public.pontos_avaliacao%rowtype;
  _registry public.cartorios%rowtype;
  _survey public.pesquisas%rowtype;
  _questions jsonb;
begin
  if _code is null or length(trim(_code)) < 3 or length(trim(_code)) > 80 then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into _point
  from public.pontos_avaliacao
  where public_slug = lower(trim(_code)) or lower(codigo) = lower(trim(_code))
  order by case when lower(codigo)=lower(trim(_code)) then 0 else 1 end
  limit 1;

  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if _point.status <> 'ativo' then return jsonb_build_object('status', 'inactive'); end if;

  select * into _registry from public.cartorios where id = _point.cartorio_id;
  if not found or _registry.status <> 'ativo' then return jsonb_build_object('status', 'unavailable'); end if;

  select * into _survey from public.pesquisas where id = _point.pesquisa_id and cartorio_id = _point.cartorio_id;
  if not found or _survey.status <> 'ativa' then return jsonb_build_object('status', 'unavailable'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',q.id,'text',q.texto,'type',q.tipo,'order',q.ordem,'required',q.obrigatoria,
    'dimension',q.dimensao,'condition',q.condicao,
    'options',coalesce((select jsonb_agg(jsonb_build_object('value',o.valor,'label',o.texto) order by o.ordem) from public.opcoes_resposta o where o.pergunta_id=q.id),'[]'::jsonb)
  ) order by q.ordem),'[]'::jsonb)
  into _questions from public.perguntas q where q.pesquisa_id=_survey.id and q.ativa=true;

  if jsonb_array_length(_questions)=0 then return jsonb_build_object('status','unavailable'); end if;
  return jsonb_build_object('status','ready','registryName',_registry.nome_fantasia,'pointName',_point.nome,'surveyName',_survey.nome,'surveyDescription',_survey.descricao,'settings',_survey.configuracoes,'questions',_questions);
end;
$$;

revoke all on function public.get_public_evaluation_context(text) from public, anon, authenticated;
grant execute on function public.get_public_evaluation_context(text) to service_role;

create or replace function cartoquali_private.resolve_public_evaluation_point(_code text)
returns public.pontos_avaliacao
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p from public.pontos_avaliacao p
  where p.public_slug=lower(trim(_code)) or lower(p.codigo)=lower(trim(_code))
  order by case when lower(p.codigo)=lower(trim(_code)) then 0 else 1 end
  limit 1
$$;
revoke all on function cartoquali_private.resolve_public_evaluation_point(text) from public, anon, authenticated;
grant execute on function cartoquali_private.resolve_public_evaluation_point(text) to service_role;

create or replace function cartoquali_private.prevent_evaluation_point_delete()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin raise exception 'point_delete_forbidden' using errcode='42501'; end;
$$;
revoke all on function cartoquali_private.prevent_evaluation_point_delete() from public,anon,authenticated;
grant execute on function cartoquali_private.prevent_evaluation_point_delete() to service_role;
drop trigger if exists prevent_evaluation_point_delete on public.pontos_avaliacao;
create trigger prevent_evaluation_point_delete before delete on public.pontos_avaliacao for each row execute function cartoquali_private.prevent_evaluation_point_delete();