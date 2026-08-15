"use client";

import type { CSSProperties } from "react";

import { evaluateCondition } from "../logic/conditions";
import type { Block, LeafBlock } from "../schema/block";
import type { Theme } from "../schema/theme";
import { ButtonBlock, LoaderBlock, ResultBlock } from "./blocks/action";
import {
  DividerBlock,
  HeadingBlock,
  ListBlock,
  ProgressBlock,
  SpacerBlock,
  TextBlock,
} from "./blocks/content";
import { ChoiceBlock, InputBlock } from "./blocks/input";
import { ImageBlock, VideoBlock } from "./blocks/media";
import { useFunnelRuntime } from "./runtime-context";
import { blockAnimationVars, blockStyleVars, splitResponsive } from "./style";

/**
 * Despacha um bloco para o seu renderer.
 *
 * O `switch` é exaustivo por construção: `Block` é uma união discriminada
 * derivada do registro, então esquecer de tratar um tipo novo vira erro de
 * compilação no `assertNever` — o registro e o renderer não saem de sincronia.
 */
export function BlockView({ block, theme }: { block: Block; theme: Theme }) {
  const { context } = useFunnelRuntime();

  if (!evaluateCondition(block.visibleIf, context)) return null;

  const style: CSSProperties = {
    ...blockStyleVars(block.style),
    ...blockAnimationVars(block.animation),
  };

  const animated = block.animation && block.animation.preset !== "none";

  return (
    <div
      className={animated ? "fn-block fn-anim" : "fn-block"}
      data-preset={animated ? block.animation?.preset : undefined}
      data-block-id={block.id}
      style={style}
    >
      <BlockContent block={block} theme={theme} />
    </div>
  );
}

function BlockContent({ block, theme }: { block: Block; theme: Theme }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock props={block.props} />;
    case "text":
      return <TextBlock props={block.props} />;
    case "list":
      return <ListBlock props={block.props} />;
    case "image":
      return <ImageBlock props={block.props} />;
    case "video":
      return <VideoBlock props={block.props} />;
    case "choice":
      return <ChoiceBlock props={block.props} />;
    case "input":
      return <InputBlock props={block.props} />;
    case "button":
      return <ButtonBlock props={block.props} theme={theme} />;
    case "loader":
      return <LoaderBlock props={block.props} />;
    case "result":
      return <ResultBlock props={block.props} />;
    case "progress":
      return <ProgressBlock props={block.props} />;
    case "divider":
      return <DividerBlock props={block.props} />;
    case "spacer":
      return <SpacerBlock props={block.props} />;
    case "container":
      return <ContainerBlock props={block.props} theme={theme} />;
    default:
      return assertNever(block);
  }
}

function ContainerBlock({
  props,
  theme,
}: {
  props: { columns: 1 | 2 | 3 | { base: 1 | 2 | 3; md?: 1 | 2 | 3 }; gap: number; children: LeafBlock[] };
  theme: Theme;
}) {
  const [base, md] = splitResponsive(props.columns);

  return (
    <div
      className="fn-container"
      style={
        {
          gap: props.gap,
          gridTemplateColumns: `repeat(${base ?? 1}, minmax(0, 1fr))`,
          "--fn-cols-md": String(md ?? base ?? 1),
        } as CSSProperties
      }
      data-has-md={md !== undefined}
    >
      {props.children.map((child) => (
        <BlockView key={child.id} block={child} theme={theme} />
      ))}
    </div>
  );
}

function assertNever(value: never): never {
  throw new Error(`Tipo de bloco não tratado no renderer: ${JSON.stringify(value)}`);
}
