import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  OTHER_TEXT_MAX,
  choiceAnswer,
  choiceOther,
  choiceValues,
  isOtherOption,
  toggleChoice,
} from "@/lib/multiple-choice";
import type { SurveyQuestion } from "@/types/cartoquali";
import { Stars } from "./primitives";

export type SurveyAnswers = Record<
  string,
  number | boolean | string | string[] | { values: string[]; other: string }
>;
const matchesCondition = (question: SurveyQuestion, answers: SurveyAnswers) =>
  !question.condition ||
  (question.condition.operator === "lte"
    ? typeof answers[question.condition.sourceQuestionId] === "number" &&
      Number(answers[question.condition.sourceQuestionId]) <= Number(question.condition.value)
    : String(answers[question.condition.sourceQuestionId]) === String(question.condition.value));

const visibleQuestions = (questions: SurveyQuestion[], answers: SurveyAnswers) =>
  questions
    .filter((item) => item.active && matchesCondition(item, answers))
    .sort((a, b) => a.order - b.order);

export function SurveyQuestionnaire({
  questions,
  preview = false,
  initialAnswers,
  onBack,
  onComplete,
}: {
  questions: SurveyQuestion[];
  preview?: boolean;
  /** Answers already given: the citizen came back from the final step to review them. */
  initialAnswers?: SurveyAnswers;
  /** "Voltar" on the first question leaves the questionnaire (e.g. back to the service step). */
  onBack?(): void;
  onComplete?(answers: SurveyAnswers): void;
}) {
  const [answers, setAnswers] = useState<SurveyAnswers>(initialAnswers ?? {});
  // Returning with answers reopens on the last question, where the citizen left off.
  const [step, setStep] = useState(() =>
    initialAnswers ? Math.max(0, visibleQuestions(questions, initialAnswers).length - 1) : 0,
  );
  const [complete, setComplete] = useState(false);
  const visible = useMemo(() => visibleQuestions(questions, answers), [questions, answers]);
  const question = visible[step];
  const questionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (step > 0) questionHeading.current?.focus();
  }, [step]);
  if (!question)
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma pergunta ativa para visualizar.
      </div>
    );
  const answer = answers[question.id];
  const valid =
    !question.required ||
    (question.type === "multiple_choice"
      ? choiceValues(answer).length > 0
      : answer !== undefined && answer !== "");
  const setAnswer = (value: SurveyAnswers[string]) =>
    setAnswers((current) => ({ ...current, [question.id]: value }));
  if (complete)
    return (
      <div className="py-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <Check />
        </span>
        <h3 className="mt-4 font-display text-xl font-bold">Pesquisa concluída</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {preview
            ? "Nenhuma resposta foi registrada."
            : "Obrigado por compartilhar sua experiência."}
        </p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => {
            setStep(0);
            setComplete(false);
            setAnswers({});
          }}
        >
          Recomeçar
        </Button>
      </div>
    );
  const next = () => {
    if (step < visible.length - 1) setStep((current) => current + 1);
    else {
      // Only answers to questions still visible: raising the rating to 4 or 5 drops the
      // "O que poderia melhorar?" reasons picked before.
      const shown = new Set(visible.map((item) => item.id));
      const kept = Object.fromEntries(Object.entries(answers).filter(([id]) => shown.has(id)));
      setComplete(true);
      onComplete?.(kept);
    }
  };
  const progress = Math.round(((step + 1) / visible.length) * 100);
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-primary">
            Pergunta {step + 1} de {visible.length}
          </span>
          <span className="text-muted-foreground">
            {question.required ? "Obrigatória" : "Opcional"}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso da avaliação"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <h1
        id={`question-${question.id}`}
        ref={questionHeading}
        tabIndex={-1}
        className="text-center font-display text-2xl font-bold outline-none"
      >
        {question.text}
      </h1>
      <div className="mt-7" aria-labelledby={`question-${question.id}`}>
        {question.type === "stars" && (
          <div className="text-center">
            <Stars
              value={typeof answer === "number" ? answer : 0}
              onChange={setAnswer}
              interactive
              size="lg"
            />
          </div>
        )}
        {question.type === "scale" && (
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                className="min-h-12"
                key={value}
                variant={answer === value ? "default" : "outline"}
                onClick={() => setAnswer(value)}
                aria-pressed={answer === value}
              >
                {value}
              </Button>
            ))}
          </div>
        )}
        {question.type === "yes_no" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(question.options?.length ? question.options : ["Sim", "Não"]).map((value) => (
              <Button
                className="min-h-12"
                key={value}
                variant={answer === value ? "default" : "outline"}
                onClick={() => setAnswer(value)}
                aria-pressed={answer === value}
              >
                {value}
              </Button>
            ))}
          </div>
        )}
        {question.type === "text" && (
          <Textarea
            aria-label={question.text}
            maxLength={1000}
            className="min-h-28"
            value={typeof answer === "string" ? answer : ""}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Quer contar mais? (opcional)"
          />
        )}
        {question.type === "single_choice" && (
          <div className="grid gap-2">
            {question.options?.map((option) => (
              <Button
                className="min-h-12 whitespace-normal"
                key={option}
                variant={answer === option ? "default" : "outline"}
                onClick={() => setAnswer(option)}
                aria-pressed={answer === option}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
        {question.type === "multiple_choice" &&
          (() => {
            const values = choiceValues(answer);
            const other = choiceOther(answer);
            const showOther = values.some(isOtherOption);
            return (
              <div className="grid gap-2">
                {/* One-tap chips; several can be on. min-h-11 = 44px touch target. */}
                <div className="flex flex-wrap justify-center gap-2">
                  {question.options?.map((option) => {
                    const selected = values.includes(option);
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        className="min-h-11 whitespace-normal rounded-full px-4"
                        aria-pressed={selected}
                        onClick={() => setAnswer(choiceAnswer(toggleChoice(values, option), other))}
                      >
                        {selected && <Check aria-hidden="true" />}
                        {option}
                      </Button>
                    );
                  })}
                </div>
                {showOther && (
                  <label className="mt-1 block text-left text-sm font-medium">
                    {/* Neutral wording: "Outro" can appear in any multiple-choice question. */}
                    Conte com suas palavras
                    <Textarea
                      className="mt-1.5 min-h-20"
                      maxLength={OTHER_TEXT_MAX}
                      value={other}
                      placeholder="Escreva aqui…"
                      onChange={(event) => setAnswer(choiceAnswer(values, event.target.value))}
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Opcional · não informe dados pessoais.
                    </span>
                  </label>
                )}
              </div>
            );
          })()}
      </div>
      <div className="mt-8 flex gap-3">
        <Button
          className="min-h-11"
          variant="outline"
          disabled={step === 0 && !onBack}
          onClick={() => (step === 0 ? onBack?.() : setStep((current) => Math.max(0, current - 1)))}
        >
          <ArrowLeft />
          Voltar
        </Button>
        <Button className="min-h-11 flex-1" disabled={!valid} onClick={next}>
          {step === visible.length - 1 ? "Concluir" : "Continuar"}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
