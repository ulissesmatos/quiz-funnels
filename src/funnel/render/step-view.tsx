"use client";

import type { CSSProperties } from "react";

import type { Step } from "../schema/step";
import type { Theme } from "../schema/theme";
import { BlockView } from "./block-view";
import { separarBlocosFixos } from "./step-layout";
import { resolveColor, resolveSpace } from "../theme/css";

export function StepView({
  step,
  theme,
  transition,
}: {
  step: Step;
  theme: Theme;
  transition: Theme["transition"];
}) {
  const background = step.layout.background;
  const { fixos, fluxo } = separarBlocosFixos(step.blocks);

  const style: CSSProperties = {
    backgroundColor: resolveColor(background?.color),
    backgroundImage: background?.image?.url ? `url("${background.image.url}")` : undefined,
    paddingBlock: resolveSpace(step.layout.paddingY),
  };

  if (step.layout.maxWidth) {
    (style as Record<string, string>)["--fn-step-width"] = `${step.layout.maxWidth}px`;
  }

  return (
    <div className="fn-step-wrapper">
      {background?.image?.url && background.overlay ? (
        <div className="fn-step-overlay" style={{ opacity: background.overlay }} />
      ) : null}

      <section
        className="fn-step fn-step-enter"
        data-transition={transition}
        data-align={step.layout.align}
        data-full-height={step.layout.fullHeight}
        data-step-id={step.id}
        style={style}
        // Remonta a seção a cada troca de step para a animação de entrada
        // disparar de novo — sem isso a transição só rodaria na primeira tela.
        key={step.id}
      >
        {fixos.length > 0 && (
          <div className="fn-step-header">
            {fixos.map((block) => (
              <BlockView key={block.id} block={block} theme={theme} />
            ))}
          </div>
        )}

        <div className="fn-step-inner">
          {fluxo.map((block) => (
            <BlockView key={block.id} block={block} theme={theme} />
          ))}
        </div>
      </section>
    </div>
  );
}
