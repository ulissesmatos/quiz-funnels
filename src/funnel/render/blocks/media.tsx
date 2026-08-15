"use client";

import { ImageIcon, PlayCircle } from "lucide-react";

import type { PropsOf } from "../../schema/block";
import { plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";
import { resolveAspect } from "../style";

export function ImageBlock({ props }: { props: PropsOf<"image"> }) {
  const { context } = useFunnelRuntime();
  const aspect = resolveAspect(props.aspect);

  if (!props.image.url) {
    return (
      <div className="fn-media-placeholder">
        <ImageIcon size={22} />
        <span>Escolha uma imagem</span>
      </div>
    );
  }

  return (
    <div className="fn-media" style={{ aspectRatio: aspect }}>
      {/* Sem next/image de propósito: a URL vem do documento e pode apontar
          para qualquer host, inclusive um S3 do próprio cliente. */}
      <img
        src={props.image.url}
        alt={plainText(props.image.alt, context)}
        width={props.image.width}
        height={props.image.height}
        loading="lazy"
        decoding="async"
        style={{ objectFit: props.fit, aspectRatio: aspect }}
      />
    </div>
  );
}

export function VideoBlock({ props }: { props: PropsOf<"video"> }) {
  const aspect = resolveAspect(props.aspect) ?? "16 / 9";

  if (!props.src) {
    return (
      <div className="fn-media-placeholder">
        <PlayCircle size={22} />
        <span>Cole a URL do vídeo</span>
      </div>
    );
  }

  if (props.provider === "file") {
    return (
      <div className="fn-media" style={{ aspectRatio: aspect }}>
        <video
          src={props.src}
          poster={props.poster}
          autoPlay={props.autoplay}
          muted={props.muted}
          loop={props.loop}
          controls={props.controls}
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(props);
  if (!embedUrl) {
    return (
      <div className="fn-media-placeholder">
        <PlayCircle size={22} />
        <span>Não reconhecemos essa URL de vídeo</span>
      </div>
    );
  }

  return (
    <div className="fn-media" style={{ aspectRatio: aspect }}>
      <iframe
        src={embedUrl}
        title="Vídeo"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

/**
 * Monta a URL de embed a partir do link que a pessoa colou — ela cola o link da
 * barra de endereço, não o de embed.
 */
function buildEmbedUrl(props: PropsOf<"video">): string | null {
  const flags = (params: URLSearchParams) => {
    if (props.autoplay) params.set("autoplay", "1");
    if (props.muted) params.set("muted", "1");
    if (props.loop) params.set("loop", "1");
    if (!props.controls) params.set("controls", "0");
    return params;
  };

  if (props.provider === "youtube") {
    const id = extractYouTubeId(props.src);
    if (!id) return null;

    const params = flags(new URLSearchParams({ rel: "0", playsinline: "1" }));
    if (props.autoplay) params.set("mute", "1"); // YouTube usa `mute`, não `muted`
    if (props.loop) params.set("playlist", id); // loop só funciona com playlist
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  }

  const vimeoId = /vimeo\.com\/(?:video\/)?(\d+)/.exec(props.src)?.[1];
  if (!vimeoId) return null;

  return `https://player.vimeo.com/video/${vimeoId}?${flags(new URLSearchParams())}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }

  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}
