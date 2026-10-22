-- Avaliações e respostas só nascem pelo fluxo público (submit_public_evaluation e
-- submit_onboarding_test_evaluation, ambas security definer). O INSERT direto que sobrou para
-- usuários logados deixava qualquer pessoa da equipe, inclusive Operador, gravar avaliações pela
-- API do Supabase sem as validações, limites e data do servidor — fraude de indicadores.
-- A leitura (SELECT por cartório) continua igual.
drop policy if exists avaliacoes_insert_own_tenant on public.avaliacoes;
drop policy if exists respostas_insert_own_tenant on public.respostas;
revoke insert on public.avaliacoes from anon, authenticated;
revoke insert on public.respostas from anon, authenticated;
