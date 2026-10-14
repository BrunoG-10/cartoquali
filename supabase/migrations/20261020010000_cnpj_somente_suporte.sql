-- Razão social e CNPJ identificam o contrato: o cliente só consulta; quem altera é o suporte
-- (administrador da plataforma, pela implantação). Mesma trava que já protege plano e situação.
create or replace function cartoquali_private.validate_registry_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    if old.id <> new.id or old.plano <> new.plano
       or old.data_renovacao is distinct from new.data_renovacao then
      raise exception 'protected_registry_field' using errcode = '42501';
    end if;
    if (old.status <> new.status
        or old.cnpj is distinct from new.cnpj
        or old.razao_social is distinct from new.razao_social)
       and not cartoquali_private.is_platform_admin() then
      raise exception 'protected_registry_field' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function cartoquali_private.validate_registry_update() from public, anon, authenticated;
grant execute on function cartoquali_private.validate_registry_update() to service_role;
