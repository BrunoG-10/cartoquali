-- Origem de cada solicitação comercial: o canal do link (?origem= ou utm_source) e o botão
-- da página que levou ao formulário. Só rótulos curtos; nada de IP, user-agent ou cookies.
ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS cta text;

ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_origem_format,
  DROP CONSTRAINT IF EXISTS commercial_leads_cta_format;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_origem_format
    CHECK (origem IS NULL OR (char_length(origem) BETWEEN 1 AND 80 AND origem ~ '^[a-z0-9._-]+$')),
  ADD CONSTRAINT commercial_leads_cta_format
    CHECK (cta IS NULL OR (char_length(cta) BETWEEN 1 AND 40 AND cta ~ '^[a-z0-9-]+$'));

CREATE INDEX IF NOT EXISTS commercial_leads_origem_created_idx
  ON public.commercial_leads (origem, created_at DESC);

COMMENT ON COLUMN public.commercial_leads.origem IS 'Canal do link que trouxe o visitante (?origem= ou utm_source/utm_campaign), normalizado.';
COMMENT ON COLUMN public.commercial_leads.cta IS 'Botão da página comercial que levou ao formulário.';
