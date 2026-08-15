"use client";

import { Check } from "lucide-react";
import { useId } from "react";

import type { PropsOf } from "../../schema/block";
import { plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";

const LETTERS = "ABCDEFGHIJKL";

export function ChoiceBlock({ props }: { props: PropsOf<"choice"> }) {
  const { context, setAnswer, answerAndAdvance, interactive, errors } = useFunnelRuntime();

  const answer = context.answers[props.name];
  const selected = new Set(
    Array.isArray(answer) ? answer.map(String) : answer != null ? [String(answer)] : [],
  );

  function toggle(optionId: string) {
    if (!interactive) return;

    if (!props.multiple) {
      // Avançar sozinho é o padrão "uma pergunta por tela": tira um clique de
      // cada pergunta, o que se acumula bastante ao longo do funil.
      if (props.autoAdvance) answerAndAdvance(props.name, optionId);
      else setAnswer(props.name, optionId);
      return;
    }

    const updated = new Set(selected);
    if (updated.has(optionId)) {
      updated.delete(optionId);
    } else {
      if (props.maxSelect && updated.size >= props.maxSelect) return;
      updated.add(optionId);
    }

    setAnswer(props.name, [...updated]);
  }

  const error = errors[props.name];

  return (
    <div>
      <div className="fn-choice" data-layout={props.layout} role={props.multiple ? "group" : "radiogroup"}>
        {props.options.map((option, index) => {
          const isSelected = selected.has(option.id);

          return (
            <button
              key={option.id}
              type="button"
              className="fn-option"
              data-layout={props.layout}
              data-selected={isSelected}
              role={props.multiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              onClick={() => toggle(option.id)}
            >
              {props.layout !== "list" && option.image?.url && (
                <img
                  className="fn-option-image"
                  src={option.image.url}
                  alt={plainText(option.image.alt, context)}
                  loading="lazy"
                />
              )}

              {props.showLetters && index < LETTERS.length && (
                <span className="fn-option-letter" aria-hidden>
                  {LETTERS[index]}
                </span>
              )}

              {option.emoji && (
                <span className="fn-option-emoji" aria-hidden>
                  {option.emoji}
                </span>
              )}

              <span className="fn-option-body">
                <span className="fn-option-label">{option.label}</span>
                {option.description && <span className="fn-option-desc">{option.description}</span>}
              </span>

              {props.multiple && (
                <span className="fn-option-check" aria-hidden>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="fn-field-error" role="alert">{error}</p>}
    </div>
  );
}

export function InputBlock({ props }: { props: PropsOf<"input"> }) {
  const { context, setAnswer, interactive, errors } = useFunnelRuntime();
  const id = useId();

  const value = context.answers[props.name];
  const error = errors[props.name];

  const shared = {
    id,
    className: "fn-input",
    name: props.name,
    required: props.required,
    placeholder: props.placeholder,
    "data-invalid": Boolean(error),
    "aria-invalid": Boolean(error),
    value: value == null ? "" : String(value),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (interactive) setAnswer(props.name, event.target.value);
    },
  };

  return (
    <div className="fn-field">
      {props.label && (
        <label className="fn-field-label" htmlFor={id}>
          {props.label}
        </label>
      )}

      {props.inputType === "textarea" ? (
        <textarea {...shared} maxLength={props.maxLength} minLength={props.minLength} />
      ) : (
        <input
          {...shared}
          type={props.inputType === "number" ? "number" : props.inputType}
          inputMode={inputModeFor(props.inputType)}
          autoComplete={autoCompleteFor(props)}
          maxLength={props.maxLength}
          minLength={props.minLength}
          min={props.min}
          max={props.max}
        />
      )}

      {error ? (
        <p className="fn-field-error" role="alert">
          {error}
        </p>
      ) : (
        props.helpText && <p className="fn-field-help">{props.helpText}</p>
      )}
    </div>
  );
}

/** Teclado certo no celular vale mais que qualquer microcopy. */
function inputModeFor(type: PropsOf<"input">["inputType"]) {
  switch (type) {
    case "email":
      return "email" as const;
    case "tel":
      return "tel" as const;
    case "number":
      return "numeric" as const;
    default:
      return "text" as const;
  }
}

function autoCompleteFor(props: PropsOf<"input">): string {
  if (props.inputType === "email") return "email";
  if (props.inputType === "tel") return "tel";
  if (props.name === "nome" || props.name === "name") return "name";
  return "off";
}
