import type { ReactNode } from "react";
import { LogoMark } from "@/components/cartoquali/logo";
import { decimalBR, formatCnpj, percentBR } from "@/lib/format";
import type { QualityReportData } from "@/lib/quality-reports.functions";
import {
  CATEGORY_LABELS,
  EVALUATION_STATUS_LABELS,
  OCCURRENCE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  deltaLabel,
  formatDateBR,
  formatDateTimeBR,
  labelOf,
} from "@/lib/report-format";
import type { ReportKind } from "@/types/cartoquali";

export type PrintRegistry = {
  officialName: string;
  tradeName: string;
  cnpj: string;
  city: string;
  state: string;
};

/**
 * Versão do relatório feita para papel/PDF: só aparece na impressão (a tela continua igual).
 * Cabeçalho com a marca, identificação do cartório com CNPJ e tabelas de documento.
 */
export function ReportPrintDocument({
  kind,
  title,
  data,
  registry,
  period,
  filters,
}: {
  kind: ReportKind;
  title: string;
  data: QualityReportData;
  registry: PrintRegistry | null;
  period: string;
  filters: string;
}) {
  const s = data.summary;
  const p = data.previousSummary;
  const m = data.management;
  const empty = s.total === 0 && m.occurrences_total === 0 && m.plans_total === 0;
  const showQuality = kind !== "ocorrencias" && kind !== "planos-melhoria";
  return (
    <article className="report-print" aria-hidden="true">
      <header className="rp-header">
        <div className="rp-brand">
          <LogoMark size={34} />
          <span className="rp-wordmark">
            Carto<span>Quali</span>
          </span>
        </div>
        <div className="rp-title">
          <p>Documento gerencial</p>
          <h1>{title}</h1>
        </div>
      </header>

      <section className="rp-identification">
        <dl className="rp-registry">
          <Item
            wide
            label="Cartório"
            value={registry?.officialName ?? data.registry.official_name}
          />
          <Item label="CNPJ" value={registry?.cnpj ? formatCnpj(registry.cnpj) : "—"} />
          <Item label="Nome fantasia" value={registry?.tradeName ?? data.registry.trade_name} />
          <Item label="Município" value={registry ? `${registry.city}/${registry.state}` : "—"} />
        </dl>
        <dl className="rp-meta">
          <Item label="Período" value={period} />
          <Item label="Filtros" value={filters} />
          <Item label="Emitido em" value={formatDateTimeBR(new Date().toISOString())} />
        </dl>
      </section>

      {empty ? (
        <p className="rp-empty">Sem dados no período selecionado.</p>
      ) : (
        <>
          <Section title="Resumo executivo" note="Comparado ao período anterior de mesma duração.">
            <table className="rp-kpis">
              <tbody>
                <tr>
                  <Kpi label="Avaliações" value={s.total} hint={deltaLabel(s.total, p.total)} />
                  <Kpi
                    label="Nota média"
                    value={s.average === null ? "—" : `${decimalBR(s.average)}/5`}
                    hint={deltaLabel(s.average, p.average)}
                  />
                  <Kpi
                    label="Satisfação"
                    value={s.satisfaction === null ? "—" : percentBR(s.satisfaction)}
                    hint={deltaLabel(s.satisfaction, p.satisfaction, " p.p.")}
                  />
                  <Kpi
                    label="Avaliações negativas"
                    value={s.negative_count}
                    hint={deltaLabel(s.negative_count, p.negative_count)}
                  />
                </tr>
                <tr>
                  <Kpi label="Ocorrências" value={m.occurrences_total} />
                  <Kpi label="Ocorrências resolvidas" value={m.occurrences_resolved} />
                  <Kpi label="Planos de melhoria" value={m.plans_total} />
                  <Kpi label="Planos concluídos" value={m.plans_completed} />
                </tr>
              </tbody>
            </table>
          </Section>

          {showQuality && (
            <>
              <Section title="Evolução da qualidade" note="Por intervalo, no horário de Brasília.">
                <Table
                  head={["Período", "Avaliações", "Nota média", "Satisfação", "Negativas"]}
                  numeric={[1, 2, 3, 4]}
                  rows={data.series.map((x) => [
                    formatDateBR(x.bucket),
                    x.total,
                    `${decimalBR(x.average)}/5`,
                    percentBR(x.satisfaction),
                    percentBR(x.negative_rate),
                  ])}
                />
              </Section>
              <div className="rp-columns">
                <Section title="Distribuição das notas">
                  <Table
                    head={["Nota", "Quantidade", "Percentual"]}
                    numeric={[1, 2]}
                    rows={[5, 4, 3, 2, 1].map((rating) => {
                      const count = data.distribution.find((x) => x.rating === rating)?.count ?? 0;
                      const percent = s.total ? (count / s.total) * 100 : 0;
                      return [
                        <Stars key="s" rating={rating} />,
                        count,
                        <Bar key="b" percent={percent} />,
                      ];
                    })}
                  />
                </Section>
                <Section title="Dimensões de qualidade">
                  <Table
                    head={["Dimensão", "Respostas", "Índice"]}
                    numeric={[1, 2]}
                    rows={data.dimensions.map((x) => [
                      x.label,
                      x.responses,
                      x.index === null ? "Sem dados" : percentBR(x.index),
                    ])}
                  />
                </Section>
              </div>
              <Section title="Pontos de avaliação">
                <Table
                  head={["Ponto", "Avaliações", "Nota média", "Satisfação", "Negativas"]}
                  numeric={[1, 2, 3, 4]}
                  rows={data.points.map((x) => [
                    x.name,
                    x.total,
                    x.average == null ? "—" : `${decimalBR(x.average)}/5`,
                    x.satisfaction == null ? "—" : percentBR(x.satisfaction),
                    x.negative_rate == null ? "—" : percentBR(x.negative_rate),
                  ])}
                />
              </Section>
            </>
          )}

          {kind !== "avaliacoes" && (
            <>
              <div className="rp-columns">
                <Section
                  title="Ocorrências por situação"
                  note={`${m.occurrences_total} no total · ${m.occurrences_resolved} resolvidas ou encerradas`}
                >
                  <Table
                    head={["Situação", "Quantidade"]}
                    numeric={[1]}
                    rows={data.occurrenceGroups
                      .filter((x) => x.kind === "status")
                      .map((x) => [labelOf(OCCURRENCE_STATUS_LABELS, x.label), x.count])}
                  />
                </Section>
                <Section title="Ocorrências por categoria">
                  <Table
                    head={["Categoria", "Quantidade"]}
                    numeric={[1]}
                    rows={data.occurrenceGroups
                      .filter((x) => x.kind === "category")
                      .map((x) => [labelOf(CATEGORY_LABELS, x.label), x.count])}
                  />
                </Section>
              </div>
              <Section
                title="Planos de melhoria"
                note={`${m.plans_active} em andamento · ${m.plans_overdue} com prazo vencido`}
              >
                <Table
                  head={["Plano", "Responsável", "Prazo", "Situação", "Progresso"]}
                  numeric={[4]}
                  rows={data.plans.map((x) => [
                    x.title,
                    x.owner ?? "Sem responsável",
                    formatDateBR(x.due_date),
                    labelOf(PLAN_STATUS_LABELS, x.status),
                    `${x.progress}%`,
                  ])}
                />
              </Section>
            </>
          )}

          {["qualidade", "avaliacoes", "satisfacao"].includes(kind) && (
            <Section
              title="Avaliações do período"
              note={
                data.evaluations.length > 100
                  ? `As 100 mais recentes de ${data.evaluations.length}. Sem dados de contato.`
                  : "Sem dados de contato de quem avaliou."
              }
            >
              <Table
                className="rp-evaluations"
                head={["Data", "Serviço / ponto", "Nota", "Situação", "Comentário"]}
                numeric={[2]}
                rows={data.evaluations
                  .slice(0, 100)
                  .map((x) => [
                    formatDateTimeBR(x.created_at),
                    [x.service_name, x.point_name].filter(Boolean).join(" · "),
                    `${x.rating}/5`,
                    labelOf(EVALUATION_STATUS_LABELS, x.status),
                    x.comment ?? "—",
                  ])}
              />
            </Section>
          )}

          {["qualidade", "executivo"].includes(kind) && data.evidence.length > 0 && (
            <Section
              title="Evidências do ciclo de melhoria"
              note="Avaliação → ocorrência → plano de melhoria → resultado."
            >
              <Table
                className="rp-evidence"
                head={["Avaliação", "Ocorrência", "Plano e resultado"]}
                rows={data.evidence.map((x) => [
                  <Stack
                    key="a"
                    lines={[
                      `${x.rating}/5 · ${x.point_name}`,
                      formatDateTimeBR(x.evaluation_date),
                      x.comment ? `“${x.comment}”` : null,
                    ]}
                  />,
                  x.occurrence_id ? (
                    <Stack
                      key="o"
                      lines={[
                        x.occurrence_title,
                        labelOf(OCCURRENCE_STATUS_LABELS, x.occurrence_status),
                        x.treatment,
                      ]}
                    />
                  ) : (
                    "Sem ocorrência vinculada"
                  ),
                  x.plan_id ? (
                    <Stack
                      key="p"
                      lines={[
                        x.plan_action,
                        `${labelOf(PLAN_STATUS_LABELS, x.plan_status)} · ${x.responsible ?? "sem responsável"}`,
                        x.plan_result ? `Resultado: ${x.plan_result}` : null,
                      ]}
                    />
                  ) : (
                    "Sem plano vinculado"
                  ),
                ])}
              />
            </Section>
          )}
        </>
      )}

      <footer className="rp-footer">
        <p>
          <strong>Metodologia.</strong> Períodos no horário de Brasília. Satisfação considera notas
          4 e 5; negativas, notas 1 a 3. Avaliações de teste da implantação e dados de contato não
          entram nos números.
        </p>
        <p>
          Emitido pelo CartoQuali · cartoquali.com.br · solução independente, sem vínculo com
          ANOREG, PQTA ou CNJ.
        </p>
      </footer>
    </article>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rp-section">
      <h2>{title}</h2>
      {note && <p className="rp-note">{note}</p>}
      {children}
    </section>
  );
}

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "rp-wide" : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <td>
      <span className="rp-kpi-label">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="rp-kpi-hint">{hint}</span>}
    </td>
  );
}

function Table({
  head,
  rows,
  numeric = [],
  className,
}: {
  head: string[];
  rows: ReactNode[][];
  numeric?: number[];
  className?: string;
}) {
  if (!rows.length) return <p className="rp-empty">Sem dados no período selecionado.</p>;
  return (
    <table className={className ? `rp-table ${className}` : "rp-table"}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={numeric.includes(i) ? "rp-num" : undefined}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={numeric.includes(i) ? "rp-num" : undefined}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="rp-stars" aria-label={`${rating} estrelas`}>
      {"★".repeat(rating)}
      <span>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function Bar({ percent }: { percent: number }) {
  return (
    <span className="rp-bar">
      <span className="rp-bar-track">
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </span>
      {percentBR(percent)}
    </span>
  );
}

function Stack({ lines }: { lines: Array<string | null> }) {
  const shown = lines.filter(Boolean) as string[];
  return (
    <>
      {shown.map((line, i) => (
        <span key={i} className={i === 0 ? "rp-stack-main" : "rp-stack-sub"}>
          {line}
        </span>
      ))}
    </>
  );
}
