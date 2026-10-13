-- Histórico de ocorrências e planos visível para toda a equipe do cartório.
-- O detalhe da ocorrência e do plano lê o histórico em audit_logs, que só administradores
-- podiam ler: gestor e operador viam o histórico sempre vazio. Esta política libera apenas
-- essas duas entidades, do próprio cartório; o restante da auditoria continua restrito.
drop policy if exists audit_logs_select_work_history on public.audit_logs;
create policy audit_logs_select_work_history on public.audit_logs
  for select to authenticated
  using (
    cartorio_id = (select cartoquali_private.current_cartorio_id())
    and entity in ('quality_occurrence', 'improvement_plan')
  );
