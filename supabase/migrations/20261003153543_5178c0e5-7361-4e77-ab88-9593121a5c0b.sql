create schema if not exists cartoquali_private;
revoke all on schema cartoquali_private from public, anon;
grant usage on schema cartoquali_private to authenticated, service_role;

create or replace function cartoquali_private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  where u.auth_user_id = (select auth.uid())
    and u.status = 'ativo'
    and c.status = 'ativo'
  limit 1
$$;

create or replace function cartoquali_private.current_cartorio_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.cartorio_id
  from public.usuarios u
  join public.cartorios c on c.id = u.cartorio_id
  where u.auth_user_id = (select auth.uid())
    and u.status = 'ativo'
    and c.status = 'ativo'
  limit 1
$$;

revoke all on function cartoquali_private.current_user_id() from public, anon;
revoke all on function cartoquali_private.current_cartorio_id() from public, anon;
grant execute on function cartoquali_private.current_user_id() to authenticated, service_role;
grant execute on function cartoquali_private.current_cartorio_id() to authenticated, service_role;

alter policy cartorios_select_own_tenant on public.cartorios using (id=(select cartoquali_private.current_cartorio_id()));
alter policy cartorios_update_own_tenant on public.cartorios using (id=(select cartoquali_private.current_cartorio_id())) with check (id=(select cartoquali_private.current_cartorio_id()));
alter policy usuarios_select_own_tenant on public.usuarios using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy usuarios_insert_own_tenant on public.usuarios with check (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy usuarios_update_own_tenant on public.usuarios using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy usuarios_delete_own_tenant on public.usuarios using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy user_roles_select_own_tenant on public.user_roles using (exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy user_roles_insert_own_tenant on public.user_roles with check (exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy user_roles_update_own_tenant on public.user_roles using (exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check (exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy user_roles_delete_own_tenant on public.user_roles using (exists(select 1 from public.usuarios u where u.id=user_roles.user_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy pesquisas_select_own_tenant on public.pesquisas using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy pesquisas_insert_own_tenant on public.pesquisas with check (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy pesquisas_update_own_tenant on public.pesquisas using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy pesquisas_delete_own_tenant on public.pesquisas using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy perguntas_select_own_tenant on public.perguntas using (exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy perguntas_insert_own_tenant on public.perguntas with check (exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy perguntas_update_own_tenant on public.perguntas using (exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check (exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy perguntas_delete_own_tenant on public.perguntas using (exists(select 1 from public.pesquisas p where p.id=perguntas.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_select_own_tenant on public.opcoes_resposta using (exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_insert_own_tenant on public.opcoes_resposta with check (exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_update_own_tenant on public.opcoes_resposta using (exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check (exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy opcoes_delete_own_tenant on public.opcoes_resposta using (exists(select 1 from public.perguntas q join public.pesquisas p on p.id=q.pesquisa_id where q.id=opcoes_resposta.pergunta_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy pontos_select_own_tenant on public.pontos_avaliacao using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy pontos_insert_own_tenant on public.pontos_avaliacao with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.pesquisas p where p.id=pontos_avaliacao.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy pontos_update_own_tenant on public.pontos_avaliacao using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.pesquisas p where p.id=pontos_avaliacao.pesquisa_id and p.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy pontos_delete_own_tenant on public.pontos_avaliacao using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy avaliacoes_select_own_tenant on public.avaliacoes using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy avaliacoes_insert_own_tenant on public.avaliacoes with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.pontos_avaliacao pt where pt.id=avaliacoes.ponto_id and pt.pesquisa_id=avaliacoes.pesquisa_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy avaliacoes_update_own_tenant on public.avaliacoes using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.pontos_avaliacao pt where pt.id=avaliacoes.ponto_id and pt.pesquisa_id=avaliacoes.pesquisa_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy avaliacoes_delete_own_tenant on public.avaliacoes using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy respostas_select_own_tenant on public.respostas using (exists(select 1 from public.avaliacoes a where a.id=respostas.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy respostas_insert_own_tenant on public.respostas with check (exists(select 1 from public.avaliacoes a join public.perguntas q on q.id=respostas.pergunta_id join public.pesquisas p on p.id=q.pesquisa_id where a.id=respostas.avaliacao_id and a.pesquisa_id=p.id and a.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy respostas_update_own_tenant on public.respostas using (exists(select 1 from public.avaliacoes a where a.id=respostas.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id()))) with check (exists(select 1 from public.avaliacoes a join public.perguntas q on q.id=respostas.pergunta_id join public.pesquisas p on p.id=q.pesquisa_id where a.id=respostas.avaliacao_id and a.pesquisa_id=p.id and a.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy respostas_delete_own_tenant on public.respostas using (exists(select 1 from public.avaliacoes a where a.id=respostas.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id())));
alter policy ocorrencias_select_own_tenant on public.ocorrencias_qualidade using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy ocorrencias_insert_own_tenant on public.ocorrencias_qualidade with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (avaliacao_id is null or exists(select 1 from public.avaliacoes a where a.id=ocorrencias_qualidade.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=ocorrencias_qualidade.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=ocorrencias_qualidade.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))));
alter policy ocorrencias_update_own_tenant on public.ocorrencias_qualidade using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and (avaliacao_id is null or exists(select 1 from public.avaliacoes a where a.id=ocorrencias_qualidade.avaliacao_id and a.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=ocorrencias_qualidade.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=ocorrencias_qualidade.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))));
alter policy ocorrencias_delete_own_tenant on public.ocorrencias_qualidade using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy planos_select_own_tenant on public.planos_melhoria using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy planos_insert_own_tenant on public.planos_melhoria with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.ocorrencias_qualidade o where o.id=planos_melhoria.ocorrencia_id and o.cartorio_id=(select cartoquali_private.current_cartorio_id())) and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=planos_melhoria.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=planos_melhoria.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))));
alter policy planos_update_own_tenant on public.planos_melhoria using (cartorio_id=(select cartoquali_private.current_cartorio_id())) with check (cartorio_id=(select cartoquali_private.current_cartorio_id()) and exists(select 1 from public.ocorrencias_qualidade o where o.id=planos_melhoria.ocorrencia_id and o.cartorio_id=(select cartoquali_private.current_cartorio_id())) and (ponto_id is null or exists(select 1 from public.pontos_avaliacao pt where pt.id=planos_melhoria.ponto_id and pt.cartorio_id=(select cartoquali_private.current_cartorio_id()))) and (responsavel_id is null or exists(select 1 from public.usuarios u where u.id=planos_melhoria.responsavel_id and u.cartorio_id=(select cartoquali_private.current_cartorio_id()))));
alter policy planos_delete_own_tenant on public.planos_melhoria using (cartorio_id=(select cartoquali_private.current_cartorio_id()));
alter policy audit_logs_select_own_tenant on public.audit_logs using (cartorio_id=(select cartoquali_private.current_cartorio_id()));

drop function public.current_cartoquali_user_id();
drop function public.get_current_cartorio_id();