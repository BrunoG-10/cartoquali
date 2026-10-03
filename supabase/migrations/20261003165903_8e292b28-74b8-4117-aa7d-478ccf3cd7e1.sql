create or replace function cartoquali_private.validate_and_audit_quality_occurrence()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _user public.usuarios%rowtype;
  _order_old int;
  _order_new int;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found then raise exception 'unauthorized' using errcode='42501'; end if;
  if tg_op='INSERT' then
    new.cartorio_id:=_user.cartorio_id;
    new.criado_por_id:=_user.id;
    new.status:='nova';
    new.data_abertura:=now();
    new.data_resolucao:=null;
    new.encerrado_por_id:=null;
    if new.avaliacao_id is not null then
      select ponto_id into new.ponto_id from public.avaliacoes where id=new.avaliacao_id and cartorio_id=_user.cartorio_id;
      if not found then raise exception 'evaluation_not_found' using errcode='P0002'; end if;
      new.origem:='avaliacao_usuario';
    end if;
  else
    new.cartorio_id:=old.cartorio_id;
    new.avaliacao_id:=old.avaliacao_id;
    new.ponto_id:=old.ponto_id;
    new.origem:=old.origem;
    new.criado_por_id:=old.criado_por_id;
    new.client_request_id:=old.client_request_id;
    new.data_abertura:=old.data_abertura;
    _order_old:=array_position(array['nova','em_analise','em_tratamento','resolvida','encerrada'],old.status);
    _order_new:=array_position(array['nova','em_analise','em_tratamento','resolvida','encerrada'],new.status);
    if _order_new<_order_old or _order_new>_order_old+1 then raise exception 'invalid_status_transition' using errcode='22023'; end if;
    if new.status in ('resolvida','encerrada') and (new.responsavel_id is null or nullif(btrim(new.observacao),'') is null) then raise exception 'resolution_details_required' using errcode='22023'; end if;
    new.data_resolucao:=case when new.status in ('resolvida','encerrada') then coalesce(old.data_resolucao,now()) else null end;
    new.encerrado_por_id:=case when new.status in ('resolvida','encerrada') then coalesce(old.encerrado_por_id,_user.id) else null end;
    new.updated_at:=now();
  end if;
  if new.responsavel_id is not null and not exists(select 1 from public.usuarios u where u.id=new.responsavel_id and u.cartorio_id=_user.cartorio_id and u.status='ativo') then raise exception 'responsible_not_found' using errcode='P0002'; end if;
  if new.ponto_id is not null and not exists(select 1 from public.pontos_avaliacao p where p.id=new.ponto_id and p.cartorio_id=_user.cartorio_id) then raise exception 'point_not_found' using errcode='P0002'; end if;
  return new;
end;
$$;
revoke all on function cartoquali_private.validate_and_audit_quality_occurrence() from public, anon, authenticated;
grant execute on function cartoquali_private.validate_and_audit_quality_occurrence() to service_role;

drop trigger if exists validate_quality_occurrence on public.ocorrencias_qualidade;
create trigger validate_quality_occurrence before insert or update on public.ocorrencias_qualidade for each row execute function cartoquali_private.validate_and_audit_quality_occurrence();

create or replace function cartoquali_private.audit_quality_occurrence()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare _user_id uuid;
begin
  select id into _user_id from public.usuarios where auth_user_id=auth.uid() and cartorio_id=new.cartorio_id;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(new.cartorio_id,_user_id,case when tg_op='INSERT' then 'occurrence_created' when old.status<>new.status and new.status in ('resolvida','encerrada') then 'occurrence_closed' when old.status<>new.status then 'occurrence_status_changed' when old.responsavel_id is distinct from new.responsavel_id then 'occurrence_assigned' else 'occurrence_updated' end,'quality_occurrence',new.id,case when tg_op='INSERT' then jsonb_build_object('status',new.status,'origin',new.origem,'evaluationId',new.avaliacao_id,'responsibleId',new.responsavel_id) else jsonb_build_object('before',jsonb_build_object('title',old.titulo,'category',old.categoria,'priority',old.prioridade,'responsibleId',old.responsavel_id,'status',old.status,'dueDate',old.prazo,'observation',old.observacao),'after',jsonb_build_object('title',new.titulo,'category',new.categoria,'priority',new.prioridade,'responsibleId',new.responsavel_id,'status',new.status,'dueDate',new.prazo,'observation',new.observacao)) end);
  return new;
end;
$$;
revoke all on function cartoquali_private.audit_quality_occurrence() from public, anon, authenticated;
grant execute on function cartoquali_private.audit_quality_occurrence() to service_role;

drop trigger if exists audit_quality_occurrence on public.ocorrencias_qualidade;
create trigger audit_quality_occurrence after insert or update on public.ocorrencias_qualidade for each row execute function cartoquali_private.audit_quality_occurrence();

create policy ocorrencias_insert_own_tenant on public.ocorrencias_qualidade for insert to authenticated with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR','OPERADOR'])) and (avaliacao_id is null or exists(select 1 from public.avaliacoes a where a.id=ocorrencias_qualidade.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (ponto_id is null or exists(select 1 from public.pontos_avaliacao p where p.id=ocorrencias_qualidade.ponto_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=ocorrencias_qualidade.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()) and u.status='ativo')));
create policy ocorrencias_update_own_tenant on public.ocorrencias_qualidade for update to authenticated using (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']))) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (select cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR'])));

grant insert, update on public.ocorrencias_qualidade to authenticated;

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
security invoker
set search_path = public, cartoquali_private, pg_temp
as $$
declare _user public.usuarios%rowtype; _evaluation public.avaliacoes%rowtype; _occurrence public.ocorrencias_qualidade%rowtype;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found then raise exception 'unauthorized' using errcode='42501'; end if;
  if _client_request_id is null or nullif(btrim(_title),'') is null or length(btrim(_title))>160 or nullif(btrim(_description),'') is null or length(btrim(_description))>4000 then raise exception 'invalid_request' using errcode='22023'; end if;
  if _category not in ('atendimento','tempo','clareza','resolutividade','estrutura','processo','outro') or _priority not in ('baixa','media','alta','critica') or _origin not in ('avaliacao_usuario','indicador','equipe_cartorio','auditoria_interna','outro') then raise exception 'invalid_request' using errcode='22023'; end if;
  if _due_date is not null and _due_date<current_date then raise exception 'invalid_due_date' using errcode='22023'; end if;
  select * into _occurrence from public.ocorrencias_qualidade where cartorio_id=_user.cartorio_id and client_request_id=_client_request_id;
  if found then return jsonb_build_object('id',_occurrence.id,'duplicate',true); end if;
  if _evaluation_id is not null then select * into _evaluation from public.avaliacoes where id=_evaluation_id; if not found then raise exception 'evaluation_not_found' using errcode='P0002'; end if; _point_id:=_evaluation.ponto_id; _origin:='avaliacao_usuario'; end if;
  insert into public.ocorrencias_qualidade(cartorio_id,avaliacao_id,ponto_id,titulo,categoria,descricao,prioridade,responsavel_id,origem,prazo,observacao,client_request_id)
  values(_user.cartorio_id,_evaluation_id,_point_id,btrim(_title),_category,btrim(_description),_priority,_responsible_id,_origin,_due_date,nullif(btrim(_observation),''),_client_request_id) returning * into _occurrence;
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
security invoker
set search_path = public, cartoquali_private, pg_temp
as $$
declare _old public.ocorrencias_qualidade%rowtype; _new public.ocorrencias_qualidade%rowtype;
begin
  select * into _old from public.ocorrencias_qualidade where id=_id for update;
  if not found then raise exception 'occurrence_not_found' using errcode='P0002'; end if;
  if _expected_updated_at is null or _old.updated_at<>_expected_updated_at then raise exception 'concurrent_update' using errcode='40001'; end if;
  if nullif(btrim(_title),'') is null or length(btrim(_title))>160 or nullif(btrim(_description),'') is null or length(btrim(_description))>4000 then raise exception 'invalid_request' using errcode='22023'; end if;
  if _category not in ('atendimento','tempo','clareza','resolutividade','estrutura','processo','outro') or _priority not in ('baixa','media','alta','critica') or _status not in ('nova','em_analise','em_tratamento','resolvida','encerrada') then raise exception 'invalid_request' using errcode='22023'; end if;
  update public.ocorrencias_qualidade set titulo=btrim(_title),descricao=btrim(_description),categoria=_category,prioridade=_priority,responsavel_id=_responsible_id,status=_status,prazo=_due_date,observacao=nullif(btrim(_observation),'') where id=_id returning * into _new;
  return jsonb_build_object('id',_new.id,'updatedAt',_new.updated_at);
end;
$$;

revoke all on function public.create_quality_occurrence(uuid,text,text,text,text,text,uuid,uuid,uuid,date,text) from public, anon;
revoke all on function public.update_quality_occurrence(uuid,timestamptz,text,text,text,text,uuid,text,date,text) from public, anon;
grant execute on function public.create_quality_occurrence(uuid,text,text,text,text,text,uuid,uuid,uuid,date,text) to authenticated, service_role;
grant execute on function public.update_quality_occurrence(uuid,timestamptz,text,text,text,text,uuid,text,date,text) to authenticated, service_role;