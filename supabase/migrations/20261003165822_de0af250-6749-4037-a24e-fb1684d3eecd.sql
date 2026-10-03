alter table public.ocorrencias_qualidade
  add column if not exists criado_por_id uuid,
  add column if not exists encerrado_por_id uuid,
  add column if not exists client_request_id uuid;

alter table public.ocorrencias_qualidade
  add constraint ocorrencias_criado_por_tenant_fkey foreign key (criado_por_id, cartorio_id) references public.usuarios(id, cartorio_id) on delete restrict,
  add constraint ocorrencias_encerrado_por_tenant_fkey foreign key (encerrado_por_id, cartorio_id) references public.usuarios(id, cartorio_id) on delete restrict;

create unique index if not exists ocorrencias_cartorio_client_request_uidx on public.ocorrencias_qualidade(cartorio_id, client_request_id) where client_request_id is not null;
create index if not exists ocorrencias_cartorio_abertura_idx on public.ocorrencias_qualidade(cartorio_id, data_abertura desc);
create index if not exists ocorrencias_cartorio_responsavel_idx on public.ocorrencias_qualidade(cartorio_id, responsavel_id);

revoke insert, update, delete on public.ocorrencias_qualidade from authenticated;
grant select on public.ocorrencias_qualidade to authenticated;
grant all on public.ocorrencias_qualidade to service_role;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

drop policy if exists ocorrencias_insert_own_tenant on public.ocorrencias_qualidade;
drop policy if exists ocorrencias_update_own_tenant on public.ocorrencias_qualidade;
drop policy if exists ocorrencias_delete_own_tenant on public.ocorrencias_qualidade;

create or replace function public.create_quality_occurrence(
  _client_request_id uuid,
  _title text,
  _description text,
  _category text,
  _priority text,
  _origin text,
  _evaluation_id uuid default null,
  _point_id uuid default null,
  _responsible_id uuid default null,
  _due_date date default null,
  _observation text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _user public.usuarios%rowtype;
  _role_allowed boolean;
  _evaluation public.avaliacoes%rowtype;
  _occurrence public.ocorrencias_qualidade%rowtype;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found then raise exception 'unauthorized' using errcode='42501'; end if;
  select exists(select 1 from public.user_roles ur where ur.user_id=_user.id and ur.role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR','OPERADOR')) into _role_allowed;
  if not _role_allowed then raise exception 'forbidden' using errcode='42501'; end if;
  if _client_request_id is null or nullif(btrim(_title),'') is null or length(btrim(_title))>160 or nullif(btrim(_description),'') is null or length(btrim(_description))>4000 then raise exception 'invalid_request' using errcode='22023'; end if;
  if _category not in ('atendimento','tempo','clareza','resolutividade','estrutura','processo','outro') or _priority not in ('baixa','media','alta','critica') or _origin not in ('avaliacao_usuario','indicador','equipe_cartorio','auditoria_interna','outro') then raise exception 'invalid_request' using errcode='22023'; end if;
  if _due_date is not null and _due_date < current_date then raise exception 'invalid_due_date' using errcode='22023'; end if;

  select * into _occurrence from public.ocorrencias_qualidade where cartorio_id=_user.cartorio_id and client_request_id=_client_request_id;
  if found then return jsonb_build_object('id',_occurrence.id,'duplicate',true); end if;

  if _evaluation_id is not null then
    select * into _evaluation from public.avaliacoes where id=_evaluation_id and cartorio_id=_user.cartorio_id;
    if not found then raise exception 'evaluation_not_found' using errcode='P0002'; end if;
    if _point_id is not null and _point_id<>_evaluation.ponto_id then raise exception 'invalid_point' using errcode='22023'; end if;
    _point_id:=_evaluation.ponto_id;
    _origin:='avaliacao_usuario';
  elsif _point_id is not null and not exists(select 1 from public.pontos_avaliacao p where p.id=_point_id and p.cartorio_id=_user.cartorio_id) then
    raise exception 'point_not_found' using errcode='P0002';
  end if;
  if _responsible_id is not null and not exists(select 1 from public.usuarios u where u.id=_responsible_id and u.cartorio_id=_user.cartorio_id and u.status='ativo') then raise exception 'responsible_not_found' using errcode='P0002'; end if;

  insert into public.ocorrencias_qualidade(cartorio_id,avaliacao_id,ponto_id,titulo,categoria,descricao,prioridade,responsavel_id,status,origem,prazo,observacao,criado_por_id,client_request_id)
  values(_user.cartorio_id,_evaluation_id,_point_id,btrim(_title),_category,btrim(_description),_priority,_responsible_id,'nova',_origin,_due_date,nullif(btrim(_observation),''),_user.id,_client_request_id)
  returning * into _occurrence;

  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,'occurrence_created','quality_occurrence',_occurrence.id,jsonb_build_object('status','nova','origin',_origin,'evaluationId',_evaluation_id,'responsibleId',_responsible_id));
  return jsonb_build_object('id',_occurrence.id,'duplicate',false);
end;
$$;

create or replace function public.update_quality_occurrence(
  _id uuid,
  _expected_updated_at timestamptz,
  _title text,
  _description text,
  _category text,
  _priority text,
  _responsible_id uuid,
  _status text,
  _due_date date,
  _observation text
) returns jsonb
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _user public.usuarios%rowtype;
  _old public.ocorrencias_qualidade%rowtype;
  _new public.ocorrencias_qualidade%rowtype;
  _order_old int;
  _order_new int;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not exists(select 1 from public.user_roles ur where ur.user_id=_user.id and ur.role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR')) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into _old from public.ocorrencias_qualidade where id=_id and cartorio_id=_user.cartorio_id for update;
  if not found then raise exception 'occurrence_not_found' using errcode='P0002'; end if;
  if _expected_updated_at is null or _old.updated_at<>_expected_updated_at then raise exception 'concurrent_update' using errcode='40001'; end if;
  if nullif(btrim(_title),'') is null or length(btrim(_title))>160 or nullif(btrim(_description),'') is null or length(btrim(_description))>4000 then raise exception 'invalid_request' using errcode='22023'; end if;
  if _category not in ('atendimento','tempo','clareza','resolutividade','estrutura','processo','outro') or _priority not in ('baixa','media','alta','critica') or _status not in ('nova','em_analise','em_tratamento','resolvida','encerrada') then raise exception 'invalid_request' using errcode='22023'; end if;
  if _responsible_id is not null and not exists(select 1 from public.usuarios u where u.id=_responsible_id and u.cartorio_id=_user.cartorio_id and u.status='ativo') then raise exception 'responsible_not_found' using errcode='P0002'; end if;
  if _due_date is not null and _due_date<_old.data_abertura::date then raise exception 'invalid_due_date' using errcode='22023'; end if;
  _order_old:=array_position(array['nova','em_analise','em_tratamento','resolvida','encerrada'],_old.status);
  _order_new:=array_position(array['nova','em_analise','em_tratamento','resolvida','encerrada'],_status);
  if _order_new<_order_old or _order_new>_order_old+1 then raise exception 'invalid_status_transition' using errcode='22023'; end if;
  if _status in ('resolvida','encerrada') and (_responsible_id is null or nullif(btrim(_observation),'') is null) then raise exception 'resolution_details_required' using errcode='22023'; end if;

  update public.ocorrencias_qualidade set titulo=btrim(_title),descricao=btrim(_description),categoria=_category,prioridade=_priority,responsavel_id=_responsible_id,status=_status,prazo=_due_date,observacao=nullif(btrim(_observation),''),data_resolucao=case when _status in ('resolvida','encerrada') then coalesce(data_resolucao,now()) else null end,encerrado_por_id=case when _status in ('resolvida','encerrada') then coalesce(encerrado_por_id,_user.id) else null end,updated_at=now() where id=_id returning * into _new;

  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,case when _old.status<>_new.status then case when _new.status in ('resolvida','encerrada') then 'occurrence_closed' else 'occurrence_status_changed' end when _old.responsavel_id is distinct from _new.responsavel_id then 'occurrence_assigned' else 'occurrence_updated' end,'quality_occurrence',_new.id,jsonb_build_object('before',jsonb_build_object('title',_old.titulo,'category',_old.categoria,'priority',_old.prioridade,'responsibleId',_old.responsavel_id,'status',_old.status,'dueDate',_old.prazo,'observation',_old.observacao),'after',jsonb_build_object('title',_new.titulo,'category',_new.categoria,'priority',_new.prioridade,'responsibleId',_new.responsavel_id,'status',_new.status,'dueDate',_new.prazo,'observation',_new.observacao)));
  return jsonb_build_object('id',_new.id,'updatedAt',_new.updated_at);
end;
$$;

revoke all on function public.create_quality_occurrence(uuid,text,text,text,text,text,uuid,uuid,uuid,date,text) from public, anon;
revoke all on function public.update_quality_occurrence(uuid,timestamptz,text,text,text,text,uuid,text,date,text) from public, anon;
grant execute on function public.create_quality_occurrence(uuid,text,text,text,text,text,uuid,uuid,uuid,date,text) to authenticated, service_role;
grant execute on function public.update_quality_occurrence(uuid,timestamptz,text,text,text,text,uuid,text,date,text) to authenticated, service_role;