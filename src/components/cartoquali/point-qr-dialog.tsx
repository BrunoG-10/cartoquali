import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEvaluationUrl } from "@/lib/public-url";
import type { EvaluationPoint, Registry } from "@/types/cartoquali";

// A4 a 200 dpi: o mesmo arquivo serve para o PNG baixado e para a impressão.
const PAGE_WIDTH = 1654;
const PAGE_HEIGHT = 2339;
const MARGIN = 130;
const INK = "#111827";
const MUTED = "#4b5563";
const BRAND = "#1f3a64";
const RULE = "#d9d3c5";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

type PosterInfo = {
  officialName: string;
  tradeName: string;
  details: Array<[label: string, value: string]>;
  code: string;
  url: string;
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatAddress(registry: Registry) {
  const street = [registry.street, registry.number].filter(Boolean).join(", ");
  const line = [street, registry.complement, registry.district].filter(Boolean).join(" - ");
  const city = [registry.city, registry.state].filter(Boolean).join("/");
  const zip = registry.zipCode ? `CEP ${registry.zipCode}` : "";
  return [line, city, zip].filter(Boolean).join(" - ");
}

function posterInfo(point: EvaluationPoint, registry: Registry | undefined): PosterInfo {
  const details: PosterInfo["details"] = [];
  if (registry?.cnpj) details.push(["CNPJ", formatCnpj(registry.cnpj)]);
  if (registry?.manager) details.push(["Responsável", registry.manager]);
  if (registry) {
    const address = formatAddress(registry);
    if (address) details.push(["Endereço", address]);
    const contact = [registry.phone, registry.email].filter(Boolean).join("  ·  ");
    if (contact) details.push(["Contato", contact]);
  }
  const officialName = registry?.officialName || point.name;
  const tradeName =
    registry?.tradeName && registry.tradeName !== registry.officialName ? registry.tradeName : "";
  return { officialName, tradeName, details, code: point.code, url: getEvaluationUrl(point.code) };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function renderPoster(info: PosterInfo) {
  const qr = await loadImage(
    await QRCode.toDataURL(info.url, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: INK, light: "#ffffff" },
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const center = PAGE_WIDTH / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, PAGE_WIDTH, 28);
  ctx.textBaseline = "alphabetic";

  // Cabeçalho: identificação da serventia.
  let y = MARGIN + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `bold 62px ${SERIF}`;
  for (const line of wrapText(ctx, info.officialName.toUpperCase(), contentWidth)) {
    y += 62;
    ctx.fillText(line, MARGIN, y);
    y += 12;
  }
  if (info.tradeName) {
    y += 46;
    ctx.fillStyle = MUTED;
    ctx.font = `36px ${SANS}`;
    ctx.fillText(info.tradeName, MARGIN, y);
  }
  y += 34;
  ctx.fillStyle = RULE;
  ctx.fillRect(MARGIN, y, contentWidth, 2);
  y += 26;

  const labelWidth = 250;
  for (const [label, value] of info.details) {
    ctx.font = `bold 30px ${SANS}`;
    ctx.fillStyle = BRAND;
    ctx.fillText(label.toUpperCase(), MARGIN, y + 36);
    ctx.font = `32px ${SANS}`;
    ctx.fillStyle = INK;
    for (const line of wrapText(ctx, value, contentWidth - labelWidth)) {
      y += 46;
      ctx.fillText(line, MARGIN + labelWidth, y - 10);
    }
    y += 10;
  }
  y += 24;
  ctx.fillStyle = BRAND;
  ctx.fillRect(MARGIN, y, contentWidth, 6);

  // Rodapé fixo na base da página.
  const footerTop = PAGE_HEIGHT - MARGIN - 40;
  ctx.fillStyle = RULE;
  ctx.fillRect(MARGIN, footerTop, contentWidth, 2);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${SANS}`;
  ctx.fillText("Pesquisa de satisfação gerida pelo CartoQuali", center, footerTop + 56);

  // Chamada + QR Code centralizados no espaço entre cabeçalho e rodapé.
  const textBelowQr = 250;
  const titleBlock = 170;
  const available = footerTop - y - 60;
  const qrSize = Math.max(500, Math.min(900, available - titleBlock - textBelowQr - 80));
  const blockHeight = titleBlock + qrSize + 80 + textBelowQr;
  let top = y + Math.max(50, (available - blockHeight) / 2);

  ctx.fillStyle = BRAND;
  ctx.font = `bold 72px ${SERIF}`;
  ctx.fillText("Avalie seu atendimento", center, top + 72);
  ctx.fillStyle = MUTED;
  ctx.font = `34px ${SANS}`;
  ctx.fillText("Sua opinião nos ajuda a melhorar o serviço prestado.", center, top + 130);
  top += titleBlock;

  const frame = 40;
  const qrLeft = center - qrSize / 2;
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(qrLeft - frame, top, qrSize + frame * 2, qrSize + frame * 2, 28);
  ctx.stroke();
  ctx.drawImage(qr, qrLeft, top + frame, qrSize, qrSize);
  top += qrSize + frame * 2 + 70;

  ctx.fillStyle = INK;
  ctx.font = `bold 40px ${SANS}`;
  ctx.fillText("Aponte a câmera do celular para o QR Code", center, top);
  ctx.fillStyle = MUTED;
  ctx.font = `30px ${SANS}`;
  ctx.fillText("Leva menos de 1 minuto. Ou acesse:", center, top + 56);
  ctx.fillStyle = BRAND;
  ctx.font = `bold 32px ${SANS}`;
  ctx.fillText(info.url, center, top + 104);
  ctx.fillStyle = MUTED;
  ctx.font = `bold 26px 'Courier New', monospace`;
  ctx.fillText(`Código ${info.code}`, center, top + 156);

  return canvas.toDataURL("image/png");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// Imprime o cartaz pronto em um iframe isolado, sem depender do layout do diálogo.
function printPoster(image: string, title: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>` +
      "@page{size:A4 portrait;margin:0}html,body{margin:0;height:100%;overflow:hidden}" +
      "img{display:block;width:100vw;height:100vh;object-fit:contain}" +
      `</style></head><body><img alt="" src="${image}"></body></html>`,
  );
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener("afterprint", cleanup, { once: true });
  const img = doc.querySelector("img");
  const go = () => {
    win.focus();
    win.print();
  };
  if (!img || img.complete) go();
  else img.addEventListener("load", go, { once: true });
}

export function PointQrDialog({
  point,
  registry,
  open,
  onOpenChange,
}: {
  point: EvaluationPoint | undefined;
  /** Dados da serventia usados no cabeçalho do cartaz (razão social, CNPJ, responsável, endereço). */
  registry?: Registry | undefined;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  const info = point ? posterInfo(point, registry) : undefined;
  const infoKey = info ? JSON.stringify(info) : "";

  useEffect(() => {
    if (!open || !infoKey) return;
    let cancelled = false;
    setImage("");
    setFailed(false);
    renderPoster(JSON.parse(infoKey) as PosterInfo)
      .then((result) => {
        if (!cancelled) setImage(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, infoKey]);

  if (!point || !info) return null;
  const fileName = `cartaz-qrcode-${point.code.toLowerCase()}`;
  const download = () => {
    if (!image) return;
    const anchor = document.createElement("a");
    anchor.href = image;
    anchor.download = `${fileName}.png`;
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>QR Code do cartório</DialogTitle>
          <DialogDescription>
            Um único QR Code para todo o atendimento. O cartaz já sai com os dados do cartório no
            cabeçalho, pronto para imprimir em A4 ou baixar como imagem.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto aspect-[210/297] w-full max-w-sm overflow-hidden rounded-md border bg-white shadow-sm">
          {image ? (
            <img
              className="size-full"
              src={image}
              alt={`Cartaz com QR Code para avaliar ${info.officialName}`}
            />
          ) : failed ? (
            <div
              role="alert"
              className="grid size-full place-items-center text-sm text-destructive"
            >
              Não foi possível gerar o cartaz.
            </div>
          ) : (
            <div role="status" className="grid size-full place-items-center">
              <LoaderCircle className="animate-spin text-primary" />
            </div>
          )}
        </div>
        <p className="break-all text-center text-xs text-muted-foreground">{info.url}</p>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={download} disabled={!image}>
            <Download />
            Baixar PNG
          </Button>
          <Button onClick={() => printPoster(image, fileName)} disabled={!image}>
            <Printer />
            Imprimir cartaz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
