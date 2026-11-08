// Cartaz do QR Code: o que o cartório escolheu mostrar no cabeçalho (ou a imagem própria).
// Sem configuração, só razão social e CNPJ do cadastro, nunca dados pessoais de quem se cadastrou.
import { z } from "zod";
import { formatCnpj, isValidCnpj } from "@/lib/self-signup";

export type QrPosterMode = "dados" | "imagem";

export type QrPosterSettings = {
  customized: boolean;
  mode: QrPosterMode;
  officialName: string;
  holder: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  hasImage: boolean;
  /** Razão social do cadastro, usada quando o campo do cartaz fica vazio. */
  fallbackName: string;
};

export const qrPosterSettingsInput = z.object({
  mode: z.enum(["dados", "imagem"]),
  officialName: z.string().trim().max(200),
  holder: z.string().trim().max(160),
  cnpj: z
    .string()
    .trim()
    .max(20)
    .refine((value) => !value || isValidCnpj(value), "Informe um CNPJ válido ou deixe em branco."),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(40),
  email: z
    .string()
    .trim()
    .max(255)
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Informe um e-mail válido ou deixe em branco.",
    ),
});
export type QrPosterSettingsInput = z.infer<typeof qrPosterSettingsInput>;

/** Até ~2,5 MB: a imagem chega já reduzida pelo navegador. */
export const MAX_POSTER_IMAGE_CHARS = 3_500_000;
export const qrPosterImageInput = z.object({
  image: z
    .string()
    .max(MAX_POSTER_IMAGE_CHARS, "A imagem ficou grande demais. Use uma imagem menor.")
    .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, "Envie uma imagem PNG ou JPG.")
    .nullable(),
});

export function parseQrPosterSettings(value: unknown): QrPosterSettings {
  const raw = (value ?? {}) as Partial<Record<keyof QrPosterSettings, unknown>>;
  const text = (item: unknown) => (typeof item === "string" ? item : "");
  return {
    customized: raw.customized === true,
    mode: raw.mode === "imagem" ? "imagem" : "dados",
    officialName: text(raw.officialName),
    holder: text(raw.holder),
    cnpj: text(raw.cnpj),
    address: text(raw.address),
    phone: text(raw.phone),
    email: text(raw.email),
    hasImage: raw.hasImage === true,
    fallbackName: text(raw.fallbackName),
  };
}

export type PosterHeader = { title: string; details: Array<[label: string, value: string]> };

/** Cabeçalho do cartaz no modo de dados: só os campos preenchidos, na ordem pedida. */
export function posterHeader(settings: QrPosterSettings, pointName: string): PosterHeader {
  const details: PosterHeader["details"] = [];
  if (settings.holder) details.push(["Titular", settings.holder]);
  if (settings.cnpj) details.push(["CNPJ", formatCnpj(settings.cnpj)]);
  if (settings.address) details.push(["Endereço", settings.address]);
  const contact = [settings.phone, settings.email].filter(Boolean).join("  ·  ");
  if (contact) details.push(["Contato", contact]);
  return { title: settings.officialName || settings.fallbackName || pointName, details };
}
