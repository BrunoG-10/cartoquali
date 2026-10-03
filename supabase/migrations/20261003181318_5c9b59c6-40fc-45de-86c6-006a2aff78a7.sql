drop policy privacy_requests_update_admin_tenant on public.privacy_requests;
create policy privacy_requests_update_admin_tenant on public.privacy_requests for update to authenticated using (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
) with check (
  cartorio_id = cartoquali_private.current_cartorio_id()
  and created_by_id = (select created_by_id from public.privacy_requests existing where existing.id=privacy_requests.id)
  and cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN'])
  and (responsible_user_id is null or exists (
    select 1 from public.usuarios u where u.id=responsible_user_id and u.cartorio_id=cartorio_id and u.status='ativo'
  ))
  and (evaluation_id is null or exists (
    select 1 from public.avaliacoes a where a.id=evaluation_id and a.cartorio_id=cartorio_id
  ))
);

create or replace function cartoquali_private.set_evaluation_contact_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare _version text;
begin
  if new.deseja_contato then
    select coalesce(privacy_notice_version,'1.0') into _version from public.configuracoes_cartorio where cartorio_id=new.cartorio_id;
    new.contact_consent_version:=coalesce(nullif(new.contact_consent_version,''),_version,'1.0');
    new.contact_consent_at:=coalesce(new.contact_consent_at,now());
    new.anonymous:=false;
  else
    new.nome_contato:=null; new.telefone_contato:=null; new.email_contato:=null;
    new.contact_consent_version:=null; new.contact_consent_at:=null;
    new.anonymous:=true;
  end if;
  return new;
end $$;
revoke all on function cartoquali_private.set_evaluation_contact_consent() from public,anon,authenticated;
grant execute on function cartoquali_private.set_evaluation_contact_consent() to service_role;
create trigger set_evaluation_contact_consent before insert or update of deseja_contato,nome_contato,telefone_contato,email_contato on public.avaliacoes for each row execute function cartoquali_private.set_evaluation_contact_consent();