// Cadastro próprio pela página comercial: validação compartilhada entre o formulário e o servidor.
// O banco (create_self_signup_registry) repete as mesmas travas; aqui elas só dão erro por campo.
import { z } from "zod";
import { attributionKeySchema } from "@/lib/attributions";

export const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const SIGNUP_ROLES = ["Titular", "Substituto(a)", "Escrevente ou gestor(a)", "Outro cargo"];

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** CNPJ com 14 dígitos e dígitos verificadores corretos (mesma regra de cartoquali_private.valid_cnpj). */
export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const check = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

/** Máscara 00.000.000/0000-00 aplicada enquanto a pessoa digita. */
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return [
    d.slice(0, 2),
    d.length > 2 ? `.${d.slice(2, 5)}` : "",
    d.length > 5 ? `.${d.slice(5, 8)}` : "",
    d.length > 8 ? `/${d.slice(8, 12)}` : "",
    d.length > 12 ? `-${d.slice(12, 14)}` : "",
  ].join("");
}

export const selfSignupSchema = z.object({
  clientRequestId: z.string().uuid(),
  submissionSession: z.string().uuid(),
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  roleTitle: z.string().trim().min(2, "Informe seu cargo.").max(100),
  registryName: z.string().trim().min(3, "Informe o nome do cartório.").max(160),
  cnpj: z.string().trim().refine(isValidCnpj, "Informe um CNPJ válido."),
  city: z.string().trim().min(2, "Informe a cidade.").max(120),
  state: z.enum(BRAZIL_STATES, { message: "Selecione a UF." }),
  attributions: z.array(attributionKeySchema).min(1, "Marque ao menos uma atribuição.").max(7),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+()\-\s\d]+$/, "Informe um WhatsApp válido.")
    .refine((value) => onlyDigits(value).length >= 10, "Informe o WhatsApp com DDD."),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .max(255),
  acceptTerms: z.literal(true, { message: "Aceite os termos para continuar." }),
  website: z.string().max(0).optional(),
  // Rótulos de medição nunca bloqueiam o cadastro: o que vier malformado é descartado.
  origin: z
    .string()
    .regex(/^[a-z0-9._-]{1,80}$/)
    .optional()
    .catch(undefined),
  cta: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional()
    .catch(undefined),
});

export type SelfSignupInput = z.infer<typeof selfSignupSchema>;

/** Mensagem para a pessoa a partir do código levantado no banco ou no Auth. */
export function selfSignupErrorMessage(code: string): string {
  if (code.includes("duplicate_registry"))
    return "Este CNPJ já tem cadastro no CartoQuali. Se você não recebeu o acesso, fale com a gente pelo WhatsApp.";
  if (code.includes("duplicate_user") || code.includes("already been registered"))
    return "Este e-mail já tem acesso ao CartoQuali. Entre pela página de login ou use outro e-mail.";
  if (code.includes("invalid_cnpj")) return "Informe um CNPJ válido.";
  if (code.includes("rate_limited"))
    return "Muitos cadastros foram feitos neste navegador. Aguarde um pouco ou fale com a gente pelo WhatsApp.";
  if (code.includes("daily_limit"))
    return "Recebemos muitos cadastros hoje. Fale com a gente pelo WhatsApp e liberamos o seu teste.";
  return "Não foi possível concluir o cadastro agora. Tente novamente ou fale com a gente pelo WhatsApp.";
}
