"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cloneElement, Fragment, isValidElement, useId, useRef, useState } from "react";
import { z } from "zod";

import { cn } from "@/lib/cn";

/**
 * Formulário derivado do schema Zod do bloco.
 *
 * A alternativa seria escrever um painel à mão para cada um dos 14 blocos — e
 * outro a cada bloco novo, sempre correndo atrás do schema. Aqui a definição do
 * bloco continua sendo a única fonte: o `.describe()` de cada campo vira o texto
 * de ajuda, e o tipo vira o controle.
 */

type Valor = unknown;

export function SchemaForm({
  schema,
  value,
  onChange,
  path = [],
}: {
  schema: z.ZodType;
  value: Record<string, Valor>;
  onChange: (patch: Record<string, Valor>, campo: string) => void;
  path?: string[];
}) {
  const shape = objectShape(schema);
  if (!shape) return null;

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(shape).map(([key, campo]) => (
        <Campo
          key={key}
          nome={key}
          schema={campo as z.ZodType}
          value={value?.[key]}
          onChange={(novo) => onChange({ [key]: novo }, [...path, key].join("."))}
        />
      ))}
    </div>
  );
}

function Campo({
  nome,
  schema,
  value,
  onChange,
}: {
  nome: string;
  schema: z.ZodType;
  value: Valor;
  onChange: (valor: Valor) => void;
}) {
  const { inner, optional } = unwrap(schema);
  const tipo = tipoDe(inner);
  const rotulo = rotularCampo(nome);
  const ajuda = descricaoDe(schema) ?? descricaoDe(inner);

  switch (tipo) {
    case "boolean":
      return (
        <Alternador rotulo={rotulo} ajuda={ajuda} value={Boolean(value)} onChange={onChange} />
      );

    case "enum": {
      const opcoes = enumOptions(inner);
      return (
        <Rotulo texto={rotulo} ajuda={ajuda}>
          <select
            className="ed-control"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          >
            {optional && <option value="">—</option>}
            {opcoes.map((opcao) => (
              <option key={opcao} value={opcao}>
                {rotularCampo(opcao)}
              </option>
            ))}
          </select>
        </Rotulo>
      );
    }

    case "number":
      if (nome === "score") {
        return <CampoPontos rotulo={rotulo} ajuda={ajuda} value={value} onChange={onChange} />;
      }

      return (
        <Rotulo texto={rotulo} ajuda={ajuda}>
          <input
            type="number"
            className="ed-control"
            value={value === undefined || value === null ? "" : Number(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
        </Rotulo>
      );

    case "string": {
      if (nome === "emoji") {
        return <CampoEmoji rotulo={rotulo} ajuda={ajuda} value={value} onChange={onChange} />;
      }

      const longo = ehTextoLongo(nome, ajuda);
      return (
        <Rotulo texto={rotulo} ajuda={ajuda}>
          <CampoComVariaveis multilinha={longo} value={String(value ?? "")} onChange={onChange} />
        </Rotulo>
      );
    }

    case "object":
      return (
        <Grupo titulo={rotulo} ajuda={ajuda}>
          <SchemaForm
            schema={inner}
            value={(value as Record<string, Valor>) ?? {}}
            onChange={(patch) =>
              onChange({ ...((value as Record<string, Valor>) ?? {}), ...patch })
            }
          />
        </Grupo>
      );

    case "array":
      return (
        <ListaEditavel
          rotulo={rotulo}
          ajuda={ajuda}
          elemento={arrayElement(inner)!}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    case "union":
      return (
        <UniaoDiscriminada
          rotulo={rotulo}
          ajuda={ajuda}
          schema={inner}
          value={value as Record<string, Valor> | undefined}
          onChange={onChange}
        />
      );

    default:
      // Tipo ainda sem controle dedicado (record de pontuação, por exemplo).
      // Melhor omitir do que renderizar um campo que corromperia o valor.
      return null;
  }
}

// ── Controles compostos ────────────────────────────────────────

function ListaEditavel({
  rotulo,
  ajuda,
  elemento,
  value,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  elemento: z.ZodType;
  value: Valor[];
  onChange: (valor: Valor[]) => void;
}) {
  const [aberto, setAberto] = useState<number | null>(0);
  const shape = objectShape(elemento);
  // Sem shape de objeto, o elemento é um primitivo (string, número, boolean):
  // não há o que expandir, o valor inteiro do item cabe num controle só.
  const tipoPrimitivo = shape ? null : tipoDe(unwrap(elemento).inner);

  function atualizar(index: number, patch: Record<string, Valor>) {
    const copia = [...value];
    copia[index] = { ...((copia[index] as Record<string, Valor>) ?? {}), ...patch };
    onChange(copia);
  }

  function substituir(index: number, novo: Valor) {
    const copia = [...value];
    copia[index] = novo;
    onChange(copia);
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= value.length) return;
    const copia = [...value];
    const [item] = copia.splice(de, 1);
    copia.splice(para, 0, item);
    onChange(copia);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-app-border p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{rotulo}</span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-app-muted hover:bg-app-surface-2 hover:text-app-text"
          onClick={() => {
            onChange([...value, valorPadrao(elemento)]);
            setAberto(value.length);
          }}
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>
      {ajuda && <Ajuda>{ajuda}</Ajuda>}

      {value.length === 0 && <p className="py-1 text-xs text-app-muted">Nenhum item ainda.</p>}

      {value.map((item, index) => {
        const expandido = aberto === index;

        const controles = (
          <>
            <button
              type="button"
              aria-label="Subir"
              className="text-app-muted hover:text-app-text disabled:opacity-25"
              disabled={index === 0}
              onClick={() => mover(index, index - 1)}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              aria-label="Descer"
              className="text-app-muted hover:text-app-text disabled:opacity-25"
              disabled={index === value.length - 1}
              onClick={() => mover(index, index + 1)}
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              aria-label="Remover"
              className="text-app-muted hover:text-app-danger"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X size={13} />
            </button>
          </>
        );

        // Elemento primitivo: o campo de valor fica na própria linha, sem
        // painel para expandir — não há nada além dele para editar no item.
        if (tipoPrimitivo) {
          return (
            <div
              key={index}
              className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface-2 px-2 py-1.5"
            >
              <ControleDeItem
                tipo={tipoPrimitivo}
                value={item}
                onChange={(novo) => substituir(index, novo)}
              />
              {controles}
            </div>
          );
        }

        const registro = (item as Record<string, Valor>) ?? {};

        return (
          <div key={index} className="rounded-lg border border-app-border bg-app-surface-2">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs"
                onClick={() => setAberto(expandido ? null : index)}
              >
                {resumoDoItem(item, index)}
              </button>

              {controles}
            </div>

            {expandido && (
              <div className="border-t border-app-border p-2.5">
                <SchemaForm
                  schema={elemento}
                  value={registro}
                  onChange={(patch) => atualizar(index, patch)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Controle inline para um item primitivo de lista (sem sub-campos). */
function ControleDeItem({
  tipo,
  value,
  onChange,
}: {
  tipo: string;
  value: Valor;
  onChange: (valor: Valor) => void;
}) {
  if (tipo === "number") {
    return (
      <input
        type="number"
        className="ed-control min-w-0 flex-1"
        value={value === undefined || value === null ? "" : Number(value as number)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }

  if (tipo === "boolean") {
    return (
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--color-app-primary)]"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  return (
    <input
      type="text"
      className="ed-control min-w-0 flex-1"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function UniaoDiscriminada({
  rotulo,
  ajuda,
  schema,
  value,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  schema: z.ZodType;
  value: Record<string, Valor> | undefined;
  onChange: (valor: Valor) => void;
}) {
  const variantes = unionOptions(schema);
  const discriminador = descobrirDiscriminador(variantes);
  if (!discriminador) return null;

  const atual = String(value?.[discriminador] ?? "");
  const variante = variantes.find((v) => literalDe(objectShape(v)?.[discriminador]) === atual);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-app-border p-2.5">
      <Rotulo texto={rotulo} ajuda={ajuda}>
        <select
          className="ed-control"
          value={atual}
          onChange={(e) => {
            const escolhida = variantes.find(
              (v) => literalDe(objectShape(v)?.[discriminador]) === e.target.value,
            );
            onChange(escolhida ? valorPadrao(escolhida) : { [discriminador]: e.target.value });
          }}
        >
          {variantes.map((v) => {
            const chave = literalDe(objectShape(v)?.[discriminador]) ?? "";
            return (
              <option key={chave} value={chave}>
                {rotularCampo(chave)}
              </option>
            );
          })}
        </select>
      </Rotulo>

      {variante && (
        <SchemaForm
          schema={omitirCampo(variante, discriminador)}
          value={value ?? {}}
          onChange={(patch) => onChange({ ...(value ?? {}), ...patch })}
        />
      )}
    </div>
  );
}

/** `{{chave}}` reconhecível dentro do texto do campo, com grupo de captura. */
const TOKEN_DE_VARIAVEL = /(\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\}\})/g;
const EH_TOKEN_INTEIRO = /^\{\{[\s\S]*\}\}$/;

/**
 * Campo de texto com `{{variáveis}}` destacadas em amarelo enquanto edita.
 *
 * Um `<input>`/`<textarea>` nativo não consegue colorir só parte do próprio
 * valor. A técnica é sobrepor dois elementos: o campo de verdade fica com o
 * texto transparente (só o cursor aparece, via `caret-color`) e recebe todo
 * clique/tecla normalmente; por baixo, um `<div>` decorativo espelha o mesmo
 * texto com as tags em amarelo. Os dois precisam da mesma fonte, padding e
 * quebra de linha — senão os caracteres do campo real desalinham do espelho
 * visível, e clicar num ponto do texto não posiciona o cursor ali.
 */
function CampoComVariaveis({
  multilinha,
  value,
  onChange,
  id,
  "aria-describedby": ariaDescribedBy,
}: {
  multilinha: boolean;
  value: string;
  onChange: (valor: string) => void;
  id?: string;
  "aria-describedby"?: string;
}) {
  const espelhoRef = useRef<HTMLDivElement>(null);

  function sincronizarRolagem(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!espelhoRef.current) return;
    espelhoRef.current.scrollTop = el.scrollTop;
    espelhoRef.current.scrollLeft = el.scrollLeft;
  }

  const partes = value.split(TOKEN_DE_VARIAVEL);

  return (
    <div className="ed-var-field">
      <div ref={espelhoRef} className="ed-var-backdrop" data-multilinha={multilinha} aria-hidden="true">
        {partes.map((parte, i) =>
          EH_TOKEN_INTEIRO.test(parte) ? (
            <span key={i} className="ed-var-token">
              {parte}
            </span>
          ) : (
            <Fragment key={i}>{parte}</Fragment>
          ),
        )}
        {/* Sem isto, um valor terminado em quebra de linha não reserva a
            linha vazia, e o campo de verdade por cima fica uma linha maior
            que o espelho. */}
        {value.endsWith("\n") && "​"}
      </div>

      {multilinha ? (
        <textarea
          id={id}
          aria-describedby={ariaDescribedBy}
          className="ed-control ed-var-input min-h-20 resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => sincronizarRolagem(e.currentTarget)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={ariaDescribedBy}
          type="text"
          className="ed-control ed-var-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => sincronizarRolagem(e.currentTarget)}
        />
      )}
    </div>
  );
}

/**
 * Pontos de uma opção: arrastar é mais rápido que digitar pra um número pequeno,
 * mas o campo ao lado continua aberto pra valores fora da faixa do slider.
 */
function CampoPontos({
  rotulo,
  ajuda,
  value,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  value: Valor;
  onChange: (valor: Valor) => void;
}) {
  const numero = typeof value === "number" ? value : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{rotulo}</span>
        <input
          type="number"
          value={value === undefined || value === null ? "" : numero}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="ed-control h-7 w-16 shrink-0 px-1.5 text-center text-xs"
        />
      </div>
      <input
        type="range"
        min={-10}
        max={10}
        step={1}
        value={Math.max(-10, Math.min(10, numero))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-app-primary)]"
        aria-label={rotulo}
      />
      {ajuda && <Ajuda>{ajuda}</Ajuda>}
    </div>
  );
}

const EMOJIS_SUGERIDOS = [
  "😀", "😃", "😄", "😁", "🙂", "😊", "😍", "🤩", "🥳", "😎",
  "🤔", "😅", "😬", "😴", "😢", "😭", "😡", "😱", "🙌", "👍",
  "👎", "👏", "🙏", "💪", "✋", "👉", "🔥", "⭐", "✨", "💯",
  "✅", "❌", "⚡", "💡", "🎯", "🏆", "🎉", "🎁", "⏰", "📈",
  "📉", "💰", "💸", "❤️", "💔", "💚", "🧠", "🍎", "🥗", "🍔",
  "🏃", "🧘", "💤", "🌱", "🌟", "🚀", "🛑", "⚠️", "❓", "👶",
];

/** Emoji de uma opção: escolher da grade é mais rápido que caçar no teclado do sistema. */
function CampoEmoji({
  rotulo,
  ajuda,
  value,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  value: Valor;
  onChange: (valor: Valor) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const atual = typeof value === "string" ? value : "";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">{rotulo}</span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-label="Escolher emoji"
          aria-expanded={aberto}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-app-border bg-app-surface text-base hover:border-app-primary"
        >
          {atual || "🙂"}
        </button>
        <input
          type="text"
          value={atual}
          onChange={(e) => onChange(e.target.value)}
          maxLength={8}
          placeholder="ou digite um emoji"
          className="ed-control min-w-0 flex-1"
        />
      </div>

      {ajuda && <Ajuda>{ajuda}</Ajuda>}

      {aberto && (
        <div className="grid grid-cols-8 gap-1 rounded-lg border border-app-border bg-app-surface-2 p-2">
          {EMOJIS_SUGERIDOS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setAberto(false);
              }}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-md text-sm hover:bg-app-surface",
                emoji === atual && "bg-app-primary/20",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Peças de UI ────────────────────────────────────────────────

/**
 * Rótulo ligado ao controle por `id`, com a ajuda em `aria-describedby`.
 *
 * Envolver tudo num `<label>` seria mais curto, mas aí o texto de ajuda entra
 * no nome acessível do campo: um leitor de tela anunciaria o parágrafo inteiro
 * como se fosse o nome do controle.
 */
function Rotulo({
  texto,
  ajuda,
  children,
}: {
  texto: string;
  ajuda?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const id = useId();
  const ajudaId = `${id}-ajuda`;

  const controle = isValidElement(children)
    ? cloneElement(children, { id, "aria-describedby": ajuda ? ajudaId : undefined })
    : children;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm" htmlFor={id}>
        {texto}
      </label>
      {controle}
      {ajuda && <Ajuda id={ajudaId}>{ajuda}</Ajuda>}
    </div>
  );
}

function Alternador({
  rotulo,
  ajuda,
  value,
  onChange,
}: {
  rotulo: string;
  ajuda?: string;
  value: boolean;
  onChange: (valor: boolean) => void;
}) {
  const id = useId();
  const ajudaId = `${id}-ajuda`;

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[var(--color-app-primary)]"
        checked={value}
        aria-describedby={ajuda ? ajudaId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="min-w-0">
        <label className="block text-sm" htmlFor={id}>
          {rotulo}
        </label>
        {ajuda && <Ajuda id={ajudaId}>{ajuda}</Ajuda>}
      </div>
    </div>
  );
}

function Ajuda({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} className="text-[11px] leading-snug text-app-muted">
      {children}
    </span>
  );
}

function Grupo({
  titulo,
  ajuda,
  children,
}: {
  titulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-app-border p-2.5")}>
      <span className="text-sm font-medium">{titulo}</span>
      {ajuda && <Ajuda>{ajuda}</Ajuda>}
      {children}
    </div>
  );
}

// ── Introspecção do Zod ────────────────────────────────────────
// Concentrada aqui: se a API interna do Zod mudar, muda só este bloco.

type ZodDef = { type?: string; [key: string]: unknown };

function def(schema: z.ZodType | undefined): ZodDef {
  return ((schema as unknown as { def?: ZodDef })?.def ?? {}) as ZodDef;
}

function tipoDe(schema: z.ZodType): string {
  return def(schema).type ?? "unknown";
}

/** Remove optional/default/nullable, devolvendo o schema de verdade. */
function unwrap(schema: z.ZodType): { inner: z.ZodType; optional: boolean } {
  let atual = schema;
  let optional = false;

  for (let i = 0; i < 10; i++) {
    const tipo = tipoDe(atual);
    if (tipo !== "optional" && tipo !== "default" && tipo !== "nullable") break;

    if (tipo === "optional" || tipo === "nullable") optional = true;
    atual = def(atual).innerType as z.ZodType;
    if (!atual) return { inner: schema, optional };
  }

  return { inner: atual, optional };
}

function objectShape(schema: z.ZodType | undefined): Record<string, z.ZodType> | null {
  if (!schema) return null;
  const { inner } = unwrap(schema);
  if (tipoDe(inner) !== "object") return null;

  const shape = def(inner).shape;
  return typeof shape === "function"
    ? (shape as () => Record<string, z.ZodType>)()
    : ((shape as Record<string, z.ZodType>) ?? null);
}

function arrayElement(schema: z.ZodType): z.ZodType | null {
  return (def(schema).element as z.ZodType) ?? null;
}

function enumOptions(schema: z.ZodType): string[] {
  const entries = def(schema).entries as Record<string, string> | undefined;
  if (entries) return Object.values(entries);

  const values = def(schema).values as Set<string> | string[] | undefined;
  if (values) return Array.isArray(values) ? values : [...values];

  return [];
}

function unionOptions(schema: z.ZodType): z.ZodType[] {
  return (def(schema).options as z.ZodType[]) ?? [];
}

function literalDe(schema: z.ZodType | undefined): string | null {
  if (!schema) return null;
  const values = def(schema).values as unknown[] | undefined;
  return values && values.length > 0 ? String(values[0]) : null;
}

function descricaoDe(schema: z.ZodType | undefined): string | undefined {
  return (schema as unknown as { description?: string })?.description;
}

/** O campo presente em todas as variantes e literal em cada uma. */
function descobrirDiscriminador(variantes: z.ZodType[]): string | null {
  const primeira = objectShape(variantes[0]);
  if (!primeira) return null;

  for (const chave of Object.keys(primeira)) {
    const literalEmTodas = variantes.every((v) => literalDe(objectShape(v)?.[chave]) !== null);
    if (literalEmTodas) return chave;
  }

  return null;
}

function omitirCampo(schema: z.ZodType, campo: string): z.ZodType {
  const shape = objectShape(schema);
  if (!shape) return schema;

  const resto = Object.fromEntries(Object.entries(shape).filter(([k]) => k !== campo));
  return z.object(resto);
}

/**
 * Valor inicial de um item novo. Não precisa ser válido ainda — o usuário
 * está prestes a preencher, e a validação de verdade acontece ao salvar.
 *
 * Cobre tanto elemento de lista primitivo (string, número, boolean — o valor
 * inteiro do item) quanto objeto (um valor por campo obrigatório).
 */
function valorPadrao(schema: z.ZodType): Valor {
  const { inner } = unwrap(schema);

  const literal = literalDe(inner);
  if (literal !== null) return literal;

  switch (tipoDe(inner)) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "enum":
      return enumOptions(inner)[0] ?? "";

    case "object": {
      const shape = objectShape(inner);
      if (!shape) return {};

      const resultado: Record<string, Valor> = {};
      for (const [chave, campo] of Object.entries(shape)) {
        const { optional } = unwrap(campo);
        if (optional) continue;
        resultado[chave] = valorPadrao(campo);
      }
      return resultado;
    }

    default:
      return undefined;
  }
}

// ── Texto ──────────────────────────────────────────────────────

const ROTULOS: Record<string, string> = {
  text: "Texto",
  label: "Rótulo",
  subLabel: "Linha de apoio",
  level: "Nível",
  items: "Itens",
  title: "Título",
  subtitle: "Subtítulo",
  description: "Descrição",
  options: "Opções",
  name: "Nome da variável",
  multiple: "Permitir várias respostas",
  layout: "Disposição",
  autoAdvance: "Avançar ao selecionar",
  required: "Obrigatório",
  showLetters: "Mostrar letras (A, B, C)",
  minSelect: "Mínimo de escolhas",
  maxSelect: "Máximo de escolhas",
  inputType: "Tipo do campo",
  placeholder: "Texto de exemplo",
  helpText: "Texto de ajuda",
  blockDisposableEmail: "Bloquear e-mail descartável",
  action: "Ação",
  icon: "Ícone",
  variant: "Estilo",
  size: "Tamanho",
  fullWidth: "Largura total",
  image: "Imagem",
  url: "URL",
  alt: "Texto alternativo",
  aspect: "Proporção",
  fit: "Ajuste",
  provider: "Origem",
  src: "URL do vídeo",
  poster: "Capa",
  autoplay: "Reproduzir sozinho",
  muted: "Sem som",
  loop: "Repetir",
  controls: "Mostrar controles",
  mode: "Modo",
  value: "Valor",
  showLabel: "Mostrar rótulo",
  sticky: "Fixar no topo",
  marker: "Marcador",
  animated: "Animar entrada",
  stagger: "Intervalo entre itens (ms)",
  lineStyle: "Estilo da linha",
  thickness: "Espessura",
  steps: "Etapas",
  durationMs: "Duração (ms)",
  showPercent: "Mostrar porcentagem",
  onFinish: "Ao terminar",
  outcomes: "Resultados",
  badge: "Etiqueta",
  when: "Condição",
  columns: "Colunas",
  gap: "Espaço entre colunas",
  children: "Blocos internos",
  emoji: "Emoji",
  score: "Pontos",
  scores: "Pontos por categoria",
  phone: "Telefone",
  message: "Mensagem",
  newTab: "Abrir em nova aba",
  stepId: "Tela de destino",
  kind: "Tipo",
};

function rotularCampo(nome: string): string {
  if (ROTULOS[nome]) return ROTULOS[nome];

  const comEspacos = nome.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return comEspacos.charAt(0).toUpperCase() + comEspacos.slice(1);
}

function ehTextoLongo(nome: string, ajuda?: string): boolean {
  if (["text", "description", "message", "subtitle"].includes(nome)) return true;
  return Boolean(ajuda?.includes("**negrito**"));
}

function resumoDoItem(item: Valor, index: number): string {
  if (typeof item === "string") return item.trim() || `Item ${index + 1}`;

  if (item && typeof item === "object") {
    for (const chave of ["label", "title", "text", "id", "name"]) {
      const valor = (item as Record<string, Valor>)[chave];
      if (typeof valor === "string" && valor.trim()) return valor;
    }
  }

  return `Item ${index + 1}`;
}
