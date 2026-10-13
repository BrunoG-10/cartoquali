-- Desativa os usuários dos cartórios de teste ocultos (Stage 8 e Stage 12) antes dos clientes reais.
-- Nada é apagado: os perfis ficam como "inativo" (sem acesso ao sistema) e a troca vai para a
-- auditoria pelo gatilho audit_user_administration.
update public.usuarios u
set status = 'inativo', updated_at = now()
from public.cartorios c
where c.id = u.cartorio_id
  and c.oculto
  and u.status = 'ativo';
