// Registry attributions (Lei 8.935/1994, art. 5) and the services suggested for each.
// The same catalog is seeded in supabase/migrations/20261008010000_qr_unico_atribuicoes_schema.sql;
// keep both in sync.

import { z } from "zod";

export type AttributionKey =
  "notas" | "protesto" | "imoveis" | "rtd_pj" | "civil_pn" | "maritimo" | "distribuicao";

export const ATTRIBUTIONS: ReadonlyArray<{ key: AttributionKey; label: string }> = [
  { key: "notas", label: "Tabelionato de Notas" },
  { key: "protesto", label: "Tabelionato de Protesto" },
  { key: "imoveis", label: "Registro de Imóveis" },
  { key: "rtd_pj", label: "Registro de Títulos e Documentos e Civil de Pessoas Jurídicas" },
  { key: "civil_pn", label: "Registro Civil das Pessoas Naturais" },
  { key: "maritimo", label: "Registro de Contratos Marítimos" },
  { key: "distribuicao", label: "Registro de Distribuição" },
];

export const ATTRIBUTION_LABELS = Object.fromEntries(
  ATTRIBUTIONS.map((item) => [item.key, item.label]),
) as Record<AttributionKey, string>;

export const attributionKeySchema = z.enum([
  "notas",
  "protesto",
  "imoveis",
  "rtd_pj",
  "civil_pn",
  "maritimo",
  "distribuicao",
] as const satisfies readonly AttributionKey[]);

export const SERVICE_CATALOG: ReadonlyArray<{
  key: string;
  attribution: AttributionKey;
  name: string;
  order: number;
}> = [
  {
    key: "notas.reconhecimento_firma",
    attribution: "notas",
    name: "Reconhecimento de firma",
    order: 1,
  },
  { key: "notas.autenticacao", attribution: "notas", name: "Autenticação de cópias", order: 2 },
  { key: "notas.escritura", attribution: "notas", name: "Escritura", order: 3 },
  { key: "notas.procuracao", attribution: "notas", name: "Procuração", order: 4 },
  { key: "notas.testamento", attribution: "notas", name: "Testamento", order: 5 },
  { key: "notas.ata_notarial", attribution: "notas", name: "Ata notarial", order: 6 },
  {
    key: "notas.inventario_divorcio",
    attribution: "notas",
    name: "Inventário ou divórcio em cartório",
    order: 7,
  },
  {
    key: "protesto.protesto_titulo",
    attribution: "protesto",
    name: "Protesto de título",
    order: 1,
  },
  {
    key: "protesto.cancelamento",
    attribution: "protesto",
    name: "Cancelamento de protesto",
    order: 2,
  },
  { key: "protesto.certidao", attribution: "protesto", name: "Certidão de protesto", order: 3 },
  {
    key: "imoveis.registro_averbacao",
    attribution: "imoveis",
    name: "Registro ou averbação",
    order: 1,
  },
  {
    key: "imoveis.certidao_matricula",
    attribution: "imoveis",
    name: "Certidão de matrícula",
    order: 2,
  },
  { key: "imoveis.usucapiao", attribution: "imoveis", name: "Usucapião extrajudicial", order: 3 },
  {
    key: "rtd_pj.registro_documentos",
    attribution: "rtd_pj",
    name: "Registro de documentos",
    order: 1,
  },
  {
    key: "rtd_pj.registro_pj",
    attribution: "rtd_pj",
    name: "Registro de pessoa jurídica",
    order: 2,
  },
  { key: "rtd_pj.notificacao", attribution: "rtd_pj", name: "Notificação", order: 3 },
  { key: "civil_pn.nascimento", attribution: "civil_pn", name: "Nascimento", order: 1 },
  { key: "civil_pn.casamento", attribution: "civil_pn", name: "Casamento", order: 2 },
  { key: "civil_pn.obito", attribution: "civil_pn", name: "Óbito", order: 3 },
  { key: "civil_pn.certidoes", attribution: "civil_pn", name: "Certidões", order: 4 },
  {
    key: "civil_pn.habilitacao_casamento",
    attribution: "civil_pn",
    name: "Habilitação de casamento",
    order: 5,
  },
  {
    key: "maritimo.contrato",
    attribution: "maritimo",
    name: "Registro de contrato marítimo",
    order: 1,
  },
  { key: "distribuicao.distribuicao", attribution: "distribuicao", name: "Distribuição", order: 1 },
  {
    key: "distribuicao.certidao",
    attribution: "distribuicao",
    name: "Certidão de distribuição",
    order: 2,
  },
];

export type EssentialKey = "overall" | "courtesy" | "clarity" | "time" | "structure" | "resolution";

// The six questions every survey must keep (only the text may change). Seeded by the database.
export const ESSENTIAL_QUESTIONS: ReadonlyArray<{
  key: EssentialKey;
  order: number;
  text: string;
  type: "stars" | "scale" | "yes_no";
  dimension: string;
  required: boolean;
}> = [
  {
    key: "overall",
    order: 1,
    text: "Como você avalia sua experiência geral hoje?",
    type: "stars",
    dimension: "overall",
    required: true,
  },
  {
    key: "courtesy",
    order: 2,
    text: "Como você avalia a cordialidade e o respeito no atendimento?",
    type: "scale",
    dimension: "service",
    required: true,
  },
  {
    key: "clarity",
    order: 3,
    text: "As informações foram claras e fáceis de entender?",
    type: "scale",
    dimension: "clarity",
    required: true,
  },
  {
    key: "time",
    order: 4,
    text: "Como você avalia o tempo de espera e o cumprimento dos prazos informados?",
    type: "scale",
    dimension: "time",
    required: true,
  },
  {
    key: "structure",
    order: 5,
    text: "Como você avalia as instalações (conforto, limpeza, sinalização e acessibilidade)?",
    type: "scale",
    dimension: "structure",
    required: false,
  },
  {
    key: "resolution",
    order: 6,
    text: "Seu atendimento foi resolvido?",
    type: "yes_no",
    dimension: "resolution",
    required: true,
  },
];

export const ESSENTIAL_LABELS: Record<EssentialKey, string> = {
  overall: "Satisfação geral",
  courtesy: "Cordialidade",
  clarity: "Clareza",
  time: "Tempo",
  structure: "Instalações",
  resolution: "Resolutividade",
};
