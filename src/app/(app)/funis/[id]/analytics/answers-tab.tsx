"use client";

import { Card } from "@/components/ui/card";
import type { QuestionBreakdown } from "@/server/analytics/queries";

import { AiExplainButton } from "./ai-explain-button";
import { AnswerBarChart } from "./answer-bar-chart";
import { EmptyState, LowSampleNote } from "./empty-state";

export function AnswersTab({
  funnelId,
  answers,
  hasAnyData,
  hasEnoughData,
}: {
  funnelId: string;
  answers: QuestionBreakdown[];
  hasAnyData: boolean;
  hasEnoughData: boolean;
}) {
  if (!hasAnyData) return <EmptyState />;

  const questionsWithData = answers.filter((question) => question.totalResponses > 0);

  return (
    <div className="flex flex-col gap-4">
      {!hasEnoughData && <LowSampleNote />}

      {questionsWithData.length === 0 && (
        <p className="text-sm text-app-muted">Nenhuma pergunta recebeu resposta ainda neste período.</p>
      )}

      {questionsWithData.map((question) => (
        <Card key={question.blockName} padding="sm">
          <h2 className="text-sm font-medium text-app-text">{question.stepName}</h2>
          <p className="mb-3 text-xs text-app-muted tabular-nums">{question.totalResponses} respostas</p>

          {question.kind === "choice" ? (
            <AnswerBarChart options={question.options} />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {question.samples.length === 0 && <p className="text-xs text-app-muted">Sem amostras de texto ainda.</p>}
              {question.samples.map((sample, index) => (
                <li key={index} className="truncate rounded-lg bg-app-surface-2 px-2.5 py-1.5 text-sm text-app-text">
                  {sample}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      {hasEnoughData && questionsWithData.length > 0 && (
        <AiExplainButton
          funnelId={funnelId}
          section="respostas"
          sampleSize={Math.max(...questionsWithData.map((question) => question.totalResponses))}
          metrics={{
            questions: questionsWithData.map((question) =>
              question.kind === "choice"
                ? {
                    name: question.stepName,
                    kind: "choice",
                    totalResponses: question.totalResponses,
                    options: question.options.map((option) => ({
                      label: option.label,
                      count: option.count,
                      pct: option.pct,
                    })),
                  }
                : { name: question.stepName, kind: "text", totalResponses: question.totalResponses },
            ),
          }}
        />
      )}
    </div>
  );
}
