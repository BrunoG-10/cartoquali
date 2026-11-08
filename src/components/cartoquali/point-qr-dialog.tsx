import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { Download, ImagePlus, LoaderCircle, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEvaluationUrl } from "@/lib/public-url";
import {
  posterHeader,
  qrPosterSettingsInput,
  type PosterHeader,
  type QrPosterMode,
  type QrPosterSettings,
  type QrPosterSettingsInput,
} from "@/lib/qr-poster";
import {
  getQrPosterImage,
  getQrPosterSettings,
  saveQrPosterImage,
  saveQrPosterSettings,
} from "@/lib/qr-poster.functions";
import { formatCnpj } from "@/lib/self-signup";
import { userMessage } from "@/lib/user-message";
import { cn } from "@/lib/utils";
import type { EvaluationPoint } from "@/types/cartoquali";

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
  mode: QrPosterMode;
  header: PosterHeader;
  code: string;
  url: string;
  /** Imagem própria do cartório (modo "imagem"); o QR Code vai no centro dela. */
  image: string | null;
};

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

async function qrImage(url: string) {
  return loadImage(
    await QRCode.toDataURL(url, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: INK, light: "#ffffff" },
    }),
  );
}

function newPage() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

/** Imagem própria ocupando a página inteira, com o QR Code numa placa branca no centro. */
async function renderImagePoster(info: PosterInfo, background: string) {
  const [art, qr] = await Promise.all([loadImage(background), qrImage(info.url)]);
  const { canvas, ctx } = newPage();
  const scale = Math.max(PAGE_WIDTH / art.width, PAGE_HEIGHT / art.height);
  const width = art.width * scale;
  const height = art.height * scale;
  ctx.drawImage(art, (PAGE_WIDTH - width) / 2, (PAGE_HEIGHT - height) / 2, width, height);

  const qrSize = 760;
  const pad = 50;
  const textBlock = 150;
  const plateWidth = qrSize + pad * 2;
  const plateHeight = qrSize + pad * 2 + textBlock;
  const left = (PAGE_WIDTH - plateWidth) / 2;
  const top = (PAGE_HEIGHT - plateHeight) / 2;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(left, top, plateWidth, plateHeight, 36);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.drawImage(qr, left + pad, top + pad, qrSize, qrSize);

  const center = PAGE_WIDTH / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `bold 38px ${SANS}`;
  ctx.fillText("Avalie seu atendimento", center, top + pad + qrSize + 62);
  ctx.fillStyle = BRAND;
  ctx.font = `bold 26px ${SANS}`;
  ctx.fillText(info.url, center, top + pad + qrSize + 108);
  ctx.fillStyle = MUTED;
  ctx.font = `bold 22px 'Courier New', monospace`;
  ctx.fillText(`Código ${info.code}`, center, top + pad + qrSize + 144);
  return canvas.toDataURL("image/png");
}

async function renderDataPoster(info: PosterInfo) {
  const qr = await qrImage(info.url);
  const { canvas, ctx } = newPage();
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const center = PAGE_WIDTH / 2;

  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, PAGE_WIDTH, 28);

  // Cabeçalho: identificação da serventia, só com o que o cartório escolheu mostrar.
  let y = MARGIN + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `bold 62px ${SERIF}`;
  for (const line of wrapText(ctx, info.header.title.toUpperCase(), contentWidth)) {
    y += 62;
    ctx.fillText(line, MARGIN, y);
    y += 12;
  }
  y += 34;
  ctx.fillStyle = RULE;
  ctx.fillRect(MARGIN, y, contentWidth, 2);
  y += 26;

  const labelWidth = 250;
  for (const [label, value] of info.header.details) {
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

function renderPoster(info: PosterInfo) {
  return info.mode === "imagem" && info.image
    ? renderImagePoster(info, info.image)
    : renderDataPoster(info);
}

/** Reduz a imagem escolhida para no máximo A4 a 200 dpi, em JPEG, antes de enviar. */
async function shrinkImage(file: File) {
  const source = await loadImage(URL.createObjectURL(file));
  const scale = Math.min(1, PAGE_WIDTH / source.width, PAGE_HEIGHT / source.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(source.src);
  return canvas.toDataURL("image/jpeg", 0.85);
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

const fieldLabels: Array<[keyof Omit<QrPosterSettingsInput, "mode">, string, number]> = [
  ["officialName", "Razão social", 200],
  ["holder", "Tabeliã ou tabelião (titular)", 160],
  ["cnpj", "CNPJ", 18],
  ["address", "Endereço", 300],
  ["phone", "Telefone de contato", 40],
  ["email", "E-mail de contato", 255],
];

function draftFrom(settings: QrPosterSettings): QrPosterSettingsInput {
  return {
    mode: settings.mode,
    officialName: settings.officialName,
    holder: settings.holder,
    cnpj: settings.cnpj ? formatCnpj(settings.cnpj) : "",
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
  };
}

function PosterSettingsForm({ settings }: { settings: QrPosterSettings }) {
  const client = useQueryClient();
  const saveSettings = useServerFn(saveQrPosterSettings);
  const saveImage = useServerFn(saveQrPosterImage);
  const [draft, setDraft] = useState(() => draftFrom(settings));
  const [errors, setErrors] = useState<Partial<Record<keyof QrPosterSettingsInput, string>>>({});
  const refresh = async (next: QrPosterSettings) => {
    client.setQueryData(["qr-poster"], next);
    await client.invalidateQueries({ queryKey: ["qr-poster-image"] });
  };
  const settingsMutation = useMutation({
    mutationFn: (data: QrPosterSettingsInput) => saveSettings({ data }),
    onSuccess: async (next) => {
      await refresh(next);
      toast.success("Cartaz atualizado");
    },
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar o cartaz.")),
  });
  const imageMutation = useMutation({
    mutationFn: (image: string | null) => saveImage({ data: { image } }),
    onSuccess: async (next) => {
      setDraft((current) => ({ ...current, mode: next.mode }));
      await refresh(next);
      toast.success(next.hasImage ? "Imagem do cartaz salva" : "Imagem removida");
    },
    onError: (error) => toast.error(userMessage(error, "Não foi possível salvar a imagem.")),
  });
  const busy = settingsMutation.isPending || imageMutation.isPending;

  const submit = () => {
    const checked = qrPosterSettingsInput.safeParse(draft);
    if (!checked.success) {
      const found: typeof errors = {};
      for (const issue of checked.error.issues) {
        const key = issue.path[0] as keyof QrPosterSettingsInput;
        found[key] ??= issue.message;
      }
      setErrors(found);
      return;
    }
    setErrors({});
    settingsMutation.mutate(checked.data);
  };
  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast.error("Envie uma imagem PNG ou JPG.");
      return;
    }
    try {
      imageMutation.mutate(await shrinkImage(file));
    } catch {
      toast.error("Não foi possível ler a imagem.");
    }
  };

  return (
    <div className="grid gap-4 rounded-md border p-4">
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1 font-semibold">Modelo do cartaz</legend>
        {(
          [
            ["dados", "Cabeçalho com os dados do cartório"],
            ["imagem", "Imagem própria com o QR Code no centro"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="poster-mode"
              value={value}
              className="accent-primary"
              checked={draft.mode === value}
              disabled={busy || (value === "imagem" && !settings.hasImage)}
              onChange={() => setDraft({ ...draft, mode: value })}
            />
            {label}
            {value === "imagem" && !settings.hasImage ? (
              <span className="text-xs text-muted-foreground">(envie a imagem abaixo)</span>
            ) : null}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        {fieldLabels.map(([key, label, max]) => (
          <div key={key} className={cn("grid gap-1 text-sm", key === "address" && "sm:col-span-2")}>
            <label htmlFor={`poster-${key}`} className="font-medium">
              {label}
            </label>
            <Input
              id={`poster-${key}`}
              value={draft[key]}
              maxLength={max}
              inputMode={key === "cnpj" ? "numeric" : undefined}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `poster-${key}-error` : undefined}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  [key]: key === "cnpj" ? formatCnpj(event.target.value) : event.target.value,
                })
              }
            />
            {errors[key] ? (
              <p id={`poster-${key}-error`} className="text-xs font-semibold text-destructive">
                {errors[key]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Só os campos preenchidos aparecem no cartaz. Sem razão social, usamos a do cadastro.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={submit} disabled={busy}>
          {settingsMutation.isPending ? "Salvando..." : "Salvar cartaz"}
        </Button>
      </div>

      <div className="grid gap-2 border-t pt-4 text-sm">
        <p className="font-semibold">Imagem própria</p>
        <p className="text-xs text-muted-foreground">
          Envie a arte do cartório em PNG ou JPG, de preferência no formato A4 em pé. Ela ocupa a
          página inteira, e o QR Code fica numa placa branca no centro.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" disabled={busy}>
            <label htmlFor="poster-image" className="cursor-pointer">
              <ImagePlus aria-hidden />
              {settings.hasImage ? "Trocar imagem" : "Enviar imagem"}
            </label>
          </Button>
          <input
            id="poster-image"
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void pickImage(event)}
          />
          {settings.hasImage ? (
            <Button variant="outline" disabled={busy} onClick={() => imageMutation.mutate(null)}>
              <Trash2 aria-hidden />
              Remover imagem
            </Button>
          ) : null}
          {imageMutation.isPending ? (
            <LoaderCircle className="animate-spin text-primary" aria-label="Enviando imagem" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PointQrDialog({
  point,
  canManage,
  open,
  onOpenChange,
}: {
  point: EvaluationPoint | undefined;
  /** Administrador do cartório e gestor podem personalizar o cartaz. */
  canManage: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const loadSettings = useServerFn(getQrPosterSettings);
  const loadImageData = useServerFn(getQrPosterImage);
  const settingsQuery = useQuery({
    queryKey: ["qr-poster"],
    queryFn: () => loadSettings(),
    enabled: open,
  });
  const settings = settingsQuery.data;
  const wantsImage = settings?.mode === "imagem" && settings.hasImage;
  const imageQuery = useQuery({
    queryKey: ["qr-poster-image"],
    queryFn: () => loadImageData(),
    enabled: open && wantsImage,
    staleTime: Infinity,
  });
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);

  const ready = settings && (!wantsImage || imageQuery.data);
  const info: PosterInfo | undefined =
    point && ready
      ? {
          mode: settings.mode,
          header: posterHeader(settings, point.name),
          code: point.code,
          url: getEvaluationUrl(point.code),
          image: wantsImage ? (imageQuery.data?.image ?? null) : null,
        }
      : undefined;
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
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!point) return null;
  const fileName = `cartaz-qrcode-${point.code.toLowerCase()}`;
  const loadFailed = settingsQuery.isError || imageQuery.isError;
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
            Um único QR Code para todo o atendimento, pronto para imprimir em A4 ou baixar como
            imagem.{" "}
            {canManage
              ? "Escolha o que aparece no cabeçalho ou use uma imagem própria."
              : "O cabeçalho é definido pelo administrador ou gestor do cartório."}
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto aspect-[210/297] w-full max-w-sm overflow-hidden rounded-md border bg-white shadow-sm">
          {image ? (
            <img
              className="size-full"
              src={image}
              alt={`Cartaz com QR Code para avaliar ${info?.header.title ?? point.name}`}
            />
          ) : failed || loadFailed ? (
            <div
              role="alert"
              className="grid size-full place-items-center text-sm text-destructive"
            >
              Não foi possível gerar o cartaz.
            </div>
          ) : (
            <div role="status" className="grid size-full place-items-center">
              <LoaderCircle className="animate-spin text-primary" aria-label="Gerando cartaz" />
            </div>
          )}
        </div>
        <p className="break-all text-center text-xs text-muted-foreground">
          {getEvaluationUrl(point.code)}
        </p>
        {canManage && settings ? (
          <div className="grid gap-3">
            <Button
              variant="outline"
              aria-expanded={editing}
              aria-controls="poster-settings"
              onClick={() => setEditing((current) => !current)}
            >
              {editing ? "Fechar personalização" : "Personalizar cartaz"}
            </Button>
            {editing ? (
              <div id="poster-settings">
                <PosterSettingsForm key={JSON.stringify(settings)} settings={settings} />
              </div>
            ) : null}
          </div>
        ) : null}
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
