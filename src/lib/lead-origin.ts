/**
 * Normaliza o canal do link (?origem=, ou utm_source + utm_campaign) para um rótulo curto,
 * no formato aceito por `commercial_leads.origem`. Devolve undefined quando não há origem.
 */
export function leadOriginFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const raw =
    params.get("origem") ??
    [params.get("utm_source"), params.get("utm_campaign")].filter(Boolean).join("-");
  const normalized = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return normalized || undefined;
}

/** Botões da página comercial que levam ao formulário; o valor vai para `commercial_leads.cta`. */
export type LeadCta = "cabecalho" | "topo" | "fluxo" | "normas" | "preco" | "menu-celular";
