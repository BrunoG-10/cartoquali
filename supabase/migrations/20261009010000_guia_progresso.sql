-- Progresso do guia de uso (tour guiado) por usuário. Spec: docs/superpowers/specs/2026-10-07-guia-de-uso-design.md
-- Leitura só da própria linha (RLS); escrita só pela RPC, que deriva o usuário da sessão.

create table if not exists public.guia_progresso (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  etapa int not null default 0 check (etapa >= 0),
  concluido_em timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.guia_progresso enable row level security;

drop policy if exists guia_progresso_select_own on public.guia_progresso;
create policy guia_progresso_select_own on public.guia_progresso
  for select to authenticated
  using (usuario_id = cartoquali_private.current_user_id());

revoke all on table public.guia_progresso from public, anon, authenticated;
grant select on table public.guia_progresso to authenticated;
grant all on table public.guia_progresso to service_role;

create or replace function public.save_my_guide_progress(_etapa int, _concluido boolean default false)
returns jsonb language plpgsql security definer set search_path = public, cartoquali_private, pg_temp as $$
declare
  _usuario uuid := cartoquali_private.current_user_id();
  _row public.guia_progresso;
begin
  if _usuario is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if _etapa is null or _etapa < 0 or _etapa > 1000 then raise exception 'invalid_step' using errcode = '22023'; end if;
  insert into public.guia_progresso as g (usuario_id, etapa, concluido_em, updated_at)
  values (_usuario, _etapa, case when coalesce(_concluido, false) then now() end, now())
  on conflict (usuario_id) do update
    set etapa = excluded.etapa,
        concluido_em = coalesce(g.concluido_em, excluded.concluido_em),
        updated_at = now()
  returning * into _row;
  return jsonb_build_object('step', _row.etapa, 'completedAt', _row.concluido_em);
end $$;

revoke all on function public.save_my_guide_progress(int, boolean) from public, anon;
grant execute on function public.save_my_guide_progress(int, boolean) to authenticated, service_role;
