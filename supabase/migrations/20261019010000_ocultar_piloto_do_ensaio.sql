-- O "Cartório Piloto (ensaio)" foi criado só para o ensaio geral de 13/10/2026.
-- Fica oculto (não é apagado) do painel da plataforma e das implantações, como os de teste.
update public.cartorios
set oculto = true
where id = '2f2d4ea2-422c-4203-b96f-ce45d12aec21'; -- Cartório Piloto (ensaio)
