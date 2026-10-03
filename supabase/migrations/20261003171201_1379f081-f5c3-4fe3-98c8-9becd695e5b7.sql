alter table public.planos_melhoria
  add column if not exists criado_por_id uuid,
  add column if not exists concluido_por_id uuid,
  add column if not exists client_request_id uuid;

alter table public.planos_melhoria
  add constraint planos_melhoria_criado_por_cartorio_fkey foreign key (criado_por_id, cartorio_id) references public.usuarios(id, cartorio_id) on delete restrict,
  add constraint planos_melhoria_concluido_por_cartorio_fkey foreign key (concluido_por_id, cartorio_id) references public.usuarios(id, cartorio_id) on delete restrict;

create unique index if not exists planos_melhoria_request_uidx on public.planos_melhoria (cartorio_id, client_request_id) where client_request_id is not null;
create index if not exists planos_melhoria_cartorio_created_idx on public.planos_melhoria (cartorio_id, created_at desc);
create index if not exists planos_melhoria_cartorio_prazo_idx on public.planos_melhoria (cartorio_id, prazo);

grant select, insert, update on public.planos_melhoria to authenticated;
grant all on public.planos_melhoria to service_role;
revoke delete on public.planos_melhoria from authenticated;

drop policy if exists planos_insert_own_tenant on public.planos_melhoria;
drop policy if exists planos_update_own_tenant on public.planos_melhoria;
drop policy if exists planos_delete_own_tenant on public.planos_melhoria;

create policy planos_insert_own_tenant on public.planos_melhoria for insert to authenticated with check (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and criado_por_id=(select u.id from public.usuarios u where u.auth_user_id=auth.uid() and u.status='ativo')
  and exists(select 1 from public.user_roles ur where ur.user_id=(select u.id from public.usuarios u where u.auth_user_id=auth.uid() and u.status='ativo') and ur.role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR'))
  and exists(select 1 from public.ocorrencias_qualidade o where o.id=planos_melhoria.ocorrencia_id and o.cartorio_id=(select cartoquali_private.current_cartorio_id()))
  and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=planos_melhoria.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id())))
  and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=planos_melhoria.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()) and u.status='ativo'))
);
create policy planos_update_own_tenant on public.planos_melhoria for update to authenticated using (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and exists(select 1 from public.user_roles ur where ur.user_id=(select u.id from public.usuarios u where u.auth_user_id=auth.uid() and u.status='ativo') and ur.role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR'))
) with check (
  cartorio_id=(select cartoquali_private.current_cartorio_id())
  and exists(select 1 from public.user_roles ur where ur.user_id=(select u.id from public.usuarios u where u.auth_user_id=auth.uid() and u.status='ativo') and ur.role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR'))
  and exists(select 1 from public.ocorrencias_qualidade o where o.id=planos_melhoria.ocorrencia_id and o.cartorio_id=(select cartoquali_private.current_cartorio_id()))
  and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=planos_melhoria.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id())))
  and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=planos_melhoria.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()) and u.status='ativo'))
);

create or replace function cartoquali_private.validate_improvement_plan()
returns trigger language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _user public.usuarios%rowtype; _occurrence public.ocorrencias_qualidade%rowtype; _rank_old int; _rank_new int;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found then raise exception 'unauthorized' using errcode='42501'; end if;
  if not exists(select 1 from public.user_roles where user_id=_user.id and role in ('PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR')) then raise exception 'forbidden' using errcode='42501'; end if;
  if tg_op='INSERT' then new.cartorio_id:=_user.cartorio_id; new.criado_por_id:=_user.id; new.status:='planejado'; new.progresso:=0; new.concluido_em:=null; new.concluido_por_id:=null;
  else
    if new.cartorio_id<>old.cartorio_id or new.ocorrencia_id<>old.ocorrencia_id or new.criado_por_id is distinct from old.criado_por_id or new.client_request_id is distinct from old.client_request_id then raise exception 'immutable_origin' using errcode='22023'; end if;
    if old.status in ('concluido','cancelado') and new.status<>old.status then raise exception 'final_status' using errcode='22023'; end if;
    _rank_old:=case old.status when 'planejado' then 1 when 'em_andamento' then 2 when 'concluido' then 3 else 99 end;
    _rank_new:=case new.status when 'planejado' then 1 when 'em_andamento' then 2 when 'concluido' then 3 else 99 end;
    if new.status<>'cancelado' and (_rank_new<_rank_old or _rank_new>_rank_old+1) then raise exception 'invalid_status_transition' using errcode='22023'; end if;
  end if;
  select * into _occurrence from public.ocorrencias_qualidade where id=new.ocorrencia_id and cartorio_id=_user.cartorio_id;
  if not found then raise exception 'occurrence_not_found' using errcode='P0002'; end if;
  new.ponto_id:=_occurrence.ponto_id;
  if new.responsavel_id is not null and not exists(select 1 from public.usuarios where id=new.responsavel_id and cartorio_id=_user.cartorio_id and status='ativo') then raise exception 'responsible_not_found' using errcode='P0002'; end if;
  if nullif(btrim(new.titulo),'') is null or length(btrim(new.titulo))>160 or nullif(btrim(new.problema),'') is null or nullif(btrim(new.objetivo),'') is null or nullif(btrim(new.acao),'') is null then raise exception 'invalid_request' using errcode='22023'; end if;
  if new.prazo<current_date and tg_op='INSERT' then raise exception 'invalid_due_date' using errcode='22023'; end if;
  if new.status='concluido' then
    if new.responsavel_id is null or nullif(btrim(new.resultado),'') is null or nullif(btrim(new.observacao_resultado),'') is null then raise exception 'completion_details_required' using errcode='22023'; end if;
    new.progresso:=100; new.concluido_em:=coalesce(old.concluido_em,now()); new.concluido_por_id:=coalesce(old.concluido_por_id,_user.id);
  elsif new.status='cancelado' then new.concluido_em:=null; new.concluido_por_id:=null;
  else new.concluido_em:=null; new.concluido_por_id:=null; if new.progresso=100 then raise exception 'invalid_progress' using errcode='22023'; end if;
  end if;
  new.updated_at:=now();
  return new;
end;$$;
revoke all on function cartoquali_private.validate_improvement_plan() from public, anon, authenticated;
grant execute on function cartoquali_private.validate_improvement_plan() to service_role;

drop trigger if exists validate_improvement_plan on public.planos_melhoria;
create trigger validate_improvement_plan before insert or update on public.planos_melhoria for each row execute function cartoquali_private.validate_improvement_plan();

create or replace function cartoquali_private.audit_improvement_plan()
returns trigger language plpgsql security definer set search_path='public','cartoquali_private','pg_temp' as $$
declare _user_id uuid; _metadata jsonb; _action text;
begin
  select id into _user_id from public.usuarios where auth_user_id=auth.uid() and cartorio_id=new.cartorio_id;
  if tg_op='INSERT' then _action:='improvement_plan_created'; _metadata:=jsonb_build_object('status',new.status,'occurrenceId',new.ocorrencia_id,'responsibleId',new.responsavel_id,'dueDate',new.prazo);
  else
    _action:=case when new.status='concluido' and old.status<>'concluido' then 'improvement_plan_completed' when new.status is distinct from old.status then 'improvement_plan_status_changed' when new.responsavel_id is distinct from old.responsavel_id then 'improvement_plan_assigned' when new.prazo is distinct from old.prazo then 'improvement_plan_due_date_changed' else 'improvement_plan_updated' end;
    _metadata:=jsonb_build_object('before',jsonb_build_object('status',old.status,'responsibleId',old.responsavel_id,'dueDate',old.prazo,'progress',old.progresso),'after',jsonb_build_object('status',new.status,'responsibleId',new.responsavel_id,'dueDate',new.prazo,'progress',new.progresso));
  end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) values(new.cartorio_id,_user_id,_action,'improvement_plan',new.id,_metadata);
  return new;
end;$$;
revoke all on function cartoquali_private.audit_improvement_plan() from public, anon, authenticated;
grant execute on function cartoquali_private.audit_improvement_plan() to service_role;

drop trigger if exists audit_improvement_plan on public.planos_melhoria;
create trigger audit_improvement_plan after insert or update on public.planos_melhoria for each row execute function cartoquali_private.audit_improvement_plan();

create or replace function public.create_improvement_plan(_client_request_id uuid,_occurrence_id uuid,_title text,_problem text,_objective text,_action text,_responsible_id uuid,_priority text,_due_date date,_expected_result text default null,_dimension text default null)
returns jsonb language plpgsql security invoker set search_path='public','cartoquali_private','pg_temp' as $$
declare _user public.usuarios%rowtype; _plan public.planos_melhoria%rowtype;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into _plan from public.planos_melhoria where cartorio_id=_user.cartorio_id and client_request_id=_client_request_id;
  if found then return jsonb_build_object('id',_plan.id,'duplicate',true); end if;
  insert into public.planos_melhoria(cartorio_id,ocorrencia_id,titulo,problema,objetivo,acao,responsavel_id,prioridade,prazo,resultado_esperado,dimensao,client_request_id,criado_por_id)
  values(_user.cartorio_id,_occurrence_id,btrim(_title),btrim(_problem),btrim(_objective),btrim(_action),_responsible_id,_priority,_due_date,nullif(btrim(_expected_result),''),_dimension,_client_request_id,_user.id) returning * into _plan;
  return jsonb_build_object('id',_plan.id,'duplicate',false);
end;$$;
revoke all on function public.create_improvement_plan(uuid,uuid,text,text,text,text,uuid,text,date,text,text) from public, anon;
grant execute on function public.create_improvement_plan(uuid,uuid,text,text,text,text,uuid,text,date,text,text) to authenticated, service_role;

create or replace function public.update_improvement_plan(_id uuid,_expected_updated_at timestamptz,_title text,_problem text,_objective text,_action text,_responsible_id uuid,_priority text,_due_date date,_status text,_progress smallint,_expected_result text,_result text,_result_observation text,_indicator_name text,_indicator_before numeric,_indicator_after numeric)
returns jsonb language plpgsql security invoker set search_path='public','cartoquali_private','pg_temp' as $$
declare _old public.planos_melhoria%rowtype; _new public.planos_melhoria%rowtype;
begin
  select * into _old from public.planos_melhoria where id=_id for update;
  if not found then raise exception 'plan_not_found' using errcode='P0002'; end if;
  if _expected_updated_at is null or _old.updated_at<>_expected_updated_at then raise exception 'concurrent_update' using errcode='40001'; end if;
  update public.planos_melhoria set titulo=btrim(_title),problema=btrim(_problem),objetivo=btrim(_objective),acao=btrim(_action),responsavel_id=_responsible_id,prioridade=_priority,prazo=_due_date,status=_status,progresso=_progress,resultado_esperado=nullif(btrim(_expected_result),''),resultado=nullif(btrim(_result),''),observacao_resultado=nullif(btrim(_result_observation),''),indicador_nome=nullif(btrim(_indicator_name),''),indicador_antes=_indicator_before,indicador_depois=_indicator_after where id=_id returning * into _new;
  return jsonb_build_object('id',_new.id,'updatedAt',_new.updated_at);
end;$$;
revoke all on function public.update_improvement_plan(uuid,timestamptz,text,text,text,text,uuid,text,date,text,smallint,text,text,text,text,numeric,numeric) from public, anon;
grant execute on function public.update_improvement_plan(uuid,timestamptz,text,text,text,text,uuid,text,date,text,smallint,text,text,text,text,numeric,numeric) to authenticated, service_role;