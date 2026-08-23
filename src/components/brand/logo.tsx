type LogoProps = {
  className?: string;
  /** Mostra o nome ao lado do símbolo. O ícone continua legível sozinho. */
  withWordmark?: boolean;
};

/**
 * Símbolo em raster (evita inconsistência de renderização de SVG entre
 * navegadores) + nome como texto de verdade — nunca como imagem, pra não
 * precisar reexportar um PNG toda vez que a marca mudar.
 */
export function Logo({ className, withWordmark = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <picture>
        <source srcSet="/brand/mark.avif" type="image/avif" />
        <source srcSet="/brand/mark.webp" type="image/webp" />
        <img src="/brand/mark.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </picture>
      {withWordmark && <span className="font-semibold">FunilQuiz</span>}
    </span>
  );
}
