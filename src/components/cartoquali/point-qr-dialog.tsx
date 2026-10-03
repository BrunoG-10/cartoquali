import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, LoaderCircle, Printer, QrCode } from "lucide-react";
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
import type { EvaluationPoint } from "@/types/cartoquali";

export function PointQrDialog({
  point,
  open,
  onOpenChange,
}: {
  point: EvaluationPoint | undefined;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  const url = point ? getEvaluationUrl(point.code) : "";

  useEffect(() => {
    if (!open || !url) return;
    setImage("");
    setFailed(false);
    void QRCode.toDataURL(url, {
      width: 1200,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then(setImage)
      .catch(() => setFailed(true));
  }, [open, url]);

  if (!point) return null;
  const download = () => {
    if (!image) return;
    const anchor = document.createElement("a");
    anchor.href = image;
    anchor.download = `qrcode-${point.code.toLowerCase()}.png`;
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="print-hidden">
          <DialogTitle>QR Code do ponto</DialogTitle>
          <DialogDescription>
            Use o mesmo endereço em cartazes e, futuramente, em tags NFC.
          </DialogDescription>
        </DialogHeader>
        <section className="point-qr-sheet mx-auto w-full max-w-md bg-background p-4 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <QrCode />
          </div>
          <p className="mt-5 text-sm font-semibold text-muted-foreground">AVALIE SEU ATENDIMENTO</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{point.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{point.location}</p>
          <div className="mx-auto mt-6 aspect-square w-full max-w-[320px] rounded-md border bg-background p-3">
            {image ? (
              <img className="size-full" src={image} alt={`QR Code para avaliar ${point.name}`} />
            ) : failed ? (
              <div
                role="alert"
                className="grid size-full place-items-center text-sm text-destructive"
              >
                Não foi possível gerar o QR Code.
              </div>
            ) : (
              <div role="status" className="grid size-full place-items-center">
                <LoaderCircle className="animate-spin text-primary" />
              </div>
            )}
          </div>
          <p className="mt-5 font-mono text-sm font-bold">{point.code}</p>
          <p className="mt-2 break-all text-xs text-muted-foreground">{url}</p>
          <p className="mt-5 text-sm">Aponte a câmera do celular e compartilhe sua experiência.</p>
        </section>
        <DialogFooter className="print-hidden gap-2 sm:space-x-0">
          <Button variant="outline" onClick={download} disabled={!image}>
            <Download />
            Baixar PNG
          </Button>
          <Button onClick={() => window.print()} disabled={!image}>
            <Printer />
            Imprimir cartaz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
