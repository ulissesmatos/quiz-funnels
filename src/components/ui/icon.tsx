import { icons } from "lucide-react";

/**
 * Ícone por nome, como os que ficam guardados nas definições de bloco e nos
 * metadados de tipo de tela.
 *
 * Nome desconhecido não quebra a tela: some. Um ícone é decoração, e derrubar o
 * editor porque alguém escreveu "Sparkle" em vez de "Sparkles" seria pior do
 * que o espaço vazio.
 */
export function Icon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Componente = icons[name as keyof typeof icons];
  if (!Componente) return null;

  return <Componente size={size} className={className} aria-hidden />;
}
