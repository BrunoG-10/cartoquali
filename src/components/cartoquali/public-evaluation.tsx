import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { Resolution } from "@/types/cartoquali";
import { Stars } from "./primitives";
import { useCartoQualiSession } from "./session-provider";

const ratingLabels = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];
const improvementOptions = ["Tempo de atendimento", "Atendimento", "Informações recebidas", "Serviço solicitado", "Estrutura", "Outro"];

export function PublicEvaluation({ cartorioSlug = "cartorio-demo", pointSlug = "recepcao" }: { cartorioSlug?: string; pointSlug?: string }) {
  const { points, registry, submitEvaluation } = useCartoQualiSession();
  const point = points.find((item) => item.slug === pointSlug);
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [resolution, setResolution] = useState<Resolution | "">("");
  const [time, setTime] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [comment, setComment] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [contactRequested, setContactRequested] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const steps = ["Atendimento", "Resolutividade", "Tempo", "Clareza", "Comentário"];
  const valid = [rating > 0 && (rating > 3 || reasons.length > 0), Boolean(resolution), time > 0, clarity > 0, !contactRequested || (name.trim().length > 1 && channel.trim().length > 3)][step];

  if (!point || cartorioSlug !== registry.slug) return <Screen registryName={registry.tradeName} pointName="Ponto não identificado"><h1 className="font-display text-2xl font-bold">Este ponto não está disponível.</h1><p className="mt-3 text-muted-foreground">Confira o acesso no cartaz ou peça ajuda à equipe do cartório.</p></Screen>;

  const reset = () => { setStep(0); setRating(0); setResolution(""); setTime(0); setClarity(0); setComment(""); setReasons([]); setContactRequested(false); setName(""); setChannel(""); setDone(false); setError(false); };
  const toggleReason = (reason: string) => setReasons((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]);
  const send = async () => {
    if (!valid || sending || !resolution) return;
    setSending(true); setError(false);
    try {
      await submitEvaluation({ rating, pointId: point.id, point: point.name, service: rating, time, clarity, resolution, comment: comment.trim(), improvementReasons: reasons, contact: contactRequested ? { requested: true, name: name.trim(), channel: channel.trim() } : { requested: false } });
      setDone(true);
    } catch { setError(true); }
    finally { setSending(false); }
  };

  if (done) return <Screen registryName={registry.tradeName} pointName={point.name}><div className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success"><Check className="size-8" /></div><h1 className="mt-6 font-display text-3xl font-bold">Avaliação enviada.</h1><p className="mx-auto mt-3 max-w-sm text-muted-foreground">Obrigado por compartilhar sua experiência. Sua opinião contribui para a melhoria contínua dos serviços.</p><p className="mt-6 text-sm font-medium">Avaliação realizada em: <strong>{point.name}</strong></p><div className="mt-8 grid gap-2"><Button asChild><Link to="/">Finalizar</Link></Button><Button onClick={reset} variant="ghost"><RotateCcw />Fazer nova avaliação</Button></div></Screen>;

  return <Screen registryName={registry.tradeName} pointName={point.name}>
    <div className="mb-7 text-left"><div className="flex items-center justify-between text-xs font-semibold"><span className="text-primary">Etapa {step + 1} de {steps.length}</span><span className="text-muted-foreground">{steps[step]}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
    {step === 0 && <Question title="Como foi sua experiência hoje?" description="Sua opinião ajuda o cartório a melhorar continuamente seus serviços."><RatingInput value={rating} onChange={setRating} />{rating > 0 && <p className="mt-5 rounded-lg bg-muted/70 p-3 text-sm">{rating >= 4 ? "Que bom saber disso. Sua avaliação é importante para nós." : "Queremos entender como podemos melhorar."}</p>}{rating > 0 && rating <= 3 && <fieldset className="mt-6 text-left"><legend className="text-sm font-semibold">O que poderia ter sido melhor?</legend><p className="mt-1 text-xs text-muted-foreground">Selecione uma ou mais opções.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{improvementOptions.map((reason) => <label key={reason} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input bg-glass-strong px-3 py-2 text-sm"><Checkbox checked={reasons.includes(reason)} onCheckedChange={() => toggleReason(reason)} />{reason}</label>)}</div></fieldset>}</Question>}
    {step === 1 && <Question title="Seu atendimento foi resolvido?"><div className="grid gap-3">{(["Sim", "Parcialmente", "Não"] as Resolution[]).map((value) => <Button key={value} size="lg" variant={resolution === value ? "default" : "outline"} onClick={() => setResolution(value)}>{value}</Button>)}</div></Question>}
    {step === 2 && <Question title="Como você avalia o tempo de atendimento?"><RatingInput value={time} onChange={setTime} /></Question>}
    {step === 3 && <Question title="Como você avalia a clareza das informações recebidas?"><RatingInput value={clarity} onChange={setClarity} /></Question>}
    {step === 4 && <Question title="Quer deixar um comentário?" description="O comentário e o pedido de contato são opcionais."><Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-28 bg-glass-strong" placeholder="Conte um pouco mais sobre sua experiência" maxLength={600} /><label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-input bg-glass-strong p-3 text-left text-sm"><Checkbox checked={contactRequested} onCheckedChange={(checked) => setContactRequested(checked === true)} />Deseja que o cartório entre em contato?</label>{contactRequested && <div className="mt-3 space-y-3 rounded-lg bg-muted/60 p-4 text-left"><label className="block text-sm font-medium">Nome<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 bg-background" /></label><label className="block text-sm font-medium">Telefone ou e-mail<Input value={channel} onChange={(event) => setChannel(event.target.value)} className="mt-1.5 bg-background" /></label><p className="flex gap-2 text-xs text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Seus dados serão utilizados apenas para possibilitar o contato relacionado à sua avaliação.</p></div>}{error && <div role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-destructive">Não foi possível registrar sua avaliação. Tente novamente.</div>}</Question>}
    <div className="mt-8 flex gap-3">{step > 0 && <Button variant="outline" size="lg" disabled={sending} onClick={() => setStep((current) => current - 1)}><ArrowLeft />Voltar</Button>}<Button className="flex-1" size="lg" disabled={!valid || sending} onClick={() => step === steps.length - 1 ? void send() : setStep((current) => current + 1)}>{sending ? <><LoaderCircle className="animate-spin" />Enviando avaliação...</> : step === steps.length - 1 ? error ? "Tentar novamente" : "Enviar avaliação" : <>Continuar<ArrowRight /></>}</Button></div>
  </Screen>;
}

function RatingInput({ value, onChange }: { value: number; onChange(value: number): void }) { return <div><Stars value={value} onChange={onChange} interactive size="lg" /><p aria-live="polite" className="mt-3 min-h-6 font-display text-lg font-bold text-primary">{value ? ratingLabels[value] : "Toque para avaliar"}</p></div>; }
function Question({ title, description = "Selecione a opção que melhor representa sua experiência.", children }: { title: string; description?: string; children: ReactNode }) { return <div><h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p><div className="mt-7">{children}</div></div>; }
function Screen({ registryName, pointName, children }: { registryName: string; pointName: string; children: ReactNode }) { return <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-4"><div aria-hidden className="absolute inset-0 [background:radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_42%)]" /><main className="relative w-full max-w-lg rounded-xl border border-glass-border bg-glass p-6 text-center shadow-glass backdrop-blur-xl sm:p-9"><div className="mb-7 flex items-center justify-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary font-display font-bold text-primary-foreground">C</span><div className="text-left"><strong className="block font-display">CartoQuali</strong><small className="text-muted-foreground">{registryName} · {pointName}</small></div></div>{children}<p className="mt-7 text-[11px] text-muted-foreground">Avaliação anônima · nenhum cadastro necessário</p></main></div>; }