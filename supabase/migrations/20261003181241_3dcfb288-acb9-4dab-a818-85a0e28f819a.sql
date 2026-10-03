alter function public.minimize_evaluation_personal_data(uuid,uuid,boolean) rename to minimize_evaluation_personal_data_legacy;
revoke all on function public.minimize_evaluation_personal_data_legacy(uuid,uuid,boolean) from public,anon,authenticated,service_role;

create or replace function cartoquali_private.minimize_evaluation_personal_data(_evaluation_id uuid, _privacy_request_id uuid, _redact_free_text boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare _user public.usuarios%rowtype; _request public.privacy_requests%rowtype; _evaluation public.avaliacoes%rowtype;
begin
  select * into _user from public.usuarios where auth_user_id=auth.uid() and status='ativo';
  if not found or not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN']) then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into _request from public.privacy_requests where id=_privacy_request_id and cartorio_id=_user.cartorio_id for update;
  if not found or _request.evaluation_id is distinct from _evaluation_id then raise exception 'privacy_request_not_found' using errcode='P0002'; end if;
  select * into _evaluation from public.avaliacoes where id=_evaluation_id and cartorio_id=_user.cartorio_id for update;
  if not found then raise exception 'evaluation_not_found' using errcode='P0002'; end if;
  update public.avaliacoes set deseja_contato=false,nome_contato=null,telefone_contato=null,email_contato=null,contact_consent_version=null,contact_consent_at=null,minimized_at=now(),comentario=case when _redact_free_text then null else comentario end,motivo_insatisfacao=case when _redact_free_text then null else motivo_insatisfacao end where id=_evaluation.id;
  if _redact_free_text then
    update public.respostas r set valor=to_jsonb('[Conteúdo redigido por solicitação de privacidade]'::text),resposta_texto='[Conteúdo redigido por solicitação de privacidade]'
    from public.perguntas q where r.avaliacao_id=_evaluation.id and r.pergunta_id=q.id and q.tipo='text';
  end if;
  insert into public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
  values(_user.cartorio_id,_user.id,'evaluation_personal_data_minimized','evaluation',_evaluation.id,jsonb_build_object('privacy_request_id',_request.id,'contact_removed',true,'free_text_redacted',_redact_free_text));
  return jsonb_build_object('id',_evaluation.id,'minimized',true);
end $$;
revoke all on function cartoquali_private.minimize_evaluation_personal_data(uuid,uuid,boolean) from public,anon;
grant execute on function cartoquali_private.minimize_evaluation_personal_data(uuid,uuid,boolean) to authenticated,service_role;

create function public.minimize_evaluation_personal_data(_evaluation_id uuid, _privacy_request_id uuid, _redact_free_text boolean default true)
returns jsonb
language sql
security invoker
set search_path = public, cartoquali_private, pg_temp
as $$ select cartoquali_private.minimize_evaluation_personal_data($1,$2,$3) $$;
revoke all on function public.minimize_evaluation_personal_data(uuid,uuid,boolean) from public,anon;
grant execute on function public.minimize_evaluation_personal_data(uuid,uuid,boolean) to authenticated,service_role;

drop function public.minimize_evaluation_personal_data_legacy(uuid,uuid,boolean);