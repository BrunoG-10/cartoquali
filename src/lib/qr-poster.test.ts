import { describe, expect, it } from "vitest";
import {
  parseQrPosterSettings,
  posterHeader,
  qrPosterImageInput,
  qrPosterSettingsInput,
} from "./qr-poster";

const blank = parseQrPosterSettings({
  customized: false,
  mode: "dados",
  officialName: "Cartório do 1º Ofício",
  cnpj: "11222333000181",
  fallbackName: "Cartório do 1º Ofício",
});

describe("qr poster", () => {
  it("shows only official name and CNPJ when nothing was configured", () => {
    expect(posterHeader(blank, "Atendimento")).toEqual({
      title: "Cartório do 1º Ofício",
      details: [["CNPJ", "11.222.333/0001-81"]],
    });
  });

  it("shows the filled fields in order and joins the contacts", () => {
    const header = posterHeader(
      {
        ...blank,
        officialName: "",
        holder: "Ana Souza",
        address: "Rua A, 10 - Centro - Teresina/PI",
        phone: "(86) 3222-0000",
        email: "contato@cartorio.com.br",
      },
      "Atendimento",
    );
    expect(header.title).toBe("Cartório do 1º Ofício");
    expect(header.details.map(([label]) => label)).toEqual([
      "Titular",
      "CNPJ",
      "Endereço",
      "Contato",
    ]);
    expect(header.details[3]?.[1]).toBe("(86) 3222-0000  ·  contato@cartorio.com.br");
  });

  it("accepts empty optional fields and rejects invalid CNPJ and e-mail", () => {
    const base = {
      mode: "dados",
      officialName: "",
      holder: "",
      cnpj: "",
      address: "",
      phone: "",
      email: "",
    };
    expect(qrPosterSettingsInput.safeParse(base).success).toBe(true);
    expect(qrPosterSettingsInput.safeParse({ ...base, cnpj: "11.222.333/0001-82" }).success).toBe(
      false,
    );
    expect(qrPosterSettingsInput.safeParse({ ...base, email: "x@" }).success).toBe(false);
  });

  it("accepts only PNG or JPEG data URLs as the poster image", () => {
    expect(qrPosterImageInput.safeParse({ image: "data:image/jpeg;base64,AAAA" }).success).toBe(
      true,
    );
    expect(qrPosterImageInput.safeParse({ image: null }).success).toBe(true);
    expect(qrPosterImageInput.safeParse({ image: "data:image/svg+xml;base64,AAAA" }).success).toBe(
      false,
    );
  });

  it("falls back to safe defaults on a malformed payload", () => {
    expect(parseQrPosterSettings(null)).toMatchObject({ mode: "dados", hasImage: false });
  });
});
