type MarketingImageProps = {
  file: "hero" | "copiloto" | "checkout";
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * Sem moldura, sem fundo, sem aspect-ratio forçado — cada imagem já vem
 * pronta (a `hero` é PNG com alfa de propósito, pra flutuar grande e sem
 * caixa; as outras já têm o próprio fundo e sombra desenhados nelas). Impor
 * um container por cima escondia exatamente o que cada uma foi feita pra
 * mostrar. `width`/tamanho ficam a cargo de quem chama, via `className`.
 */
export function MarketingImage({ file, alt, className, priority = false }: MarketingImageProps) {
  const src = `/marketing/${file}`;

  return (
    <picture className={`block ${className ?? ""}`}>
      <source srcSet={`${src}.avif`} type="image/avif" />
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img
        src={`${src}.png`}
        alt={alt}
        className="h-auto w-full"
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
