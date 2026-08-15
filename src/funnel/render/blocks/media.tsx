"use client";

import { ChevronLeft, ChevronRight, ImageIcon, Mic, Pause, Play, PlayCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

/** Barras decorativas de onda — altura fixa, para o desenho não pular a cada render. */
const ONDA = [8, 14, 20, 12, 24, 16, 10, 22, 14, 18, 9, 21, 13, 17, 11, 23, 15, 8, 19, 12];

export function AudioBlock({ props }: { props: PropsOf<"audio"> }) {
  const { context, interactive } = useFunnelRuntime();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [tocando, setTocando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [duracao, setDuracao] = useState(0);

  useEffect(() => {
    const elemento = audioRef.current;
    if (!elemento) return;

    const aoAtualizar = () => setProgresso(elemento.currentTime);
    const aoCarregar = () => setDuracao(elemento.duration || 0);
    const aoTerminar = () => setTocando(false);

    elemento.addEventListener("timeupdate", aoAtualizar);
    elemento.addEventListener("loadedmetadata", aoCarregar);
    elemento.addEventListener("ended", aoTerminar);

    return () => {
      elemento.removeEventListener("timeupdate", aoAtualizar);
      elemento.removeEventListener("loadedmetadata", aoCarregar);
      elemento.removeEventListener("ended", aoTerminar);
    };
  }, []);

  if (!props.src) {
    return (
      <div className="fn-media-placeholder">
        <Mic size={22} />
        <span>Cole a URL do áudio</span>
      </div>
    );
  }

  const fracao = duracao > 0 ? progresso / duracao : 0;
  const tempo = duracao > 0 ? formatarTempo(duracao - progresso) : (props.durationLabel ?? "0:00");

  function alternar() {
    const elemento = audioRef.current;
    if (!elemento || !interactive) return;

    if (elemento.paused) {
      void elemento.play();
      setTocando(true);
    } else {
      elemento.pause();
      setTocando(false);
    }
  }

  return (
    <div className="fn-audio">
      {props.avatar?.url ? (
        <img
          className="fn-audio-avatar"
          src={props.avatar.url}
          alt={plainText(props.avatar.alt, context)}
          loading="lazy"
        />
      ) : (
        <span className="fn-audio-avatar fn-audio-avatar--vazio" aria-hidden>
          <Mic size={18} />
        </span>
      )}

      <button
        type="button"
        className="fn-audio-play"
        aria-label={tocando ? "Pausar áudio" : "Ouvir áudio"}
        onClick={alternar}
      >
        {tocando ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>

      <div className="fn-audio-body">
        {props.senderName && <span className="fn-audio-sender">{props.senderName}</span>}

        <div className="fn-audio-wave" aria-hidden>
          {ONDA.map((altura, index) => (
            <span
              key={index}
              style={{ height: altura }}
              data-played={index / ONDA.length <= fracao}
            />
          ))}
        </div>

        <span className="fn-audio-time">{tempo}</span>
      </div>

      <audio ref={audioRef} src={props.src} preload="metadata" autoPlay={props.autoplay} muted={props.autoplay} />
    </div>
  );
}

function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function CarouselBlock({ props }: { props: PropsOf<"carousel"> }) {
  const { context, interactive } = useFunnelRuntime();
  const [atual, setAtual] = useState(0);

  const total = props.slides.length;
  const aspect = resolveAspect(props.aspect);

  useEffect(() => {
    if (!props.autoplay || !interactive || total <= 1) return;

    const timer = setInterval(() => setAtual((i) => (i + 1) % total), props.intervalMs);
    return () => clearInterval(timer);
  }, [props.autoplay, props.intervalMs, interactive, total]);

  const ir = (destino: number) => setAtual(((destino % total) + total) % total);

  return (
    <div className="fn-carousel">
      <div className="fn-carousel-viewport">
        <div className="fn-carousel-track" style={{ transform: `translateX(-${atual * 100}%)` }}>
          {props.slides.map((slide, index) => (
            <div className="fn-carousel-slide" key={index} aria-hidden={index !== atual}>
              {slide.image?.url && (
                <img
                  src={slide.image.url}
                  alt={plainText(slide.image.alt, context)}
                  style={{ aspectRatio: aspect }}
                  loading="lazy"
                />
              )}
              {slide.title && <strong className="fn-carousel-title">{plainText(slide.title, context)}</strong>}
              {slide.text && <span className="fn-carousel-text">{plainText(slide.text, context)}</span>}
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className="fn-carousel-nav fn-carousel-nav--prev"
              aria-label="Slide anterior"
              onClick={() => ir(atual - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="fn-carousel-nav fn-carousel-nav--next"
              aria-label="Próximo slide"
              onClick={() => ir(atual + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {props.showDots && total > 1 && (
        <div className="fn-carousel-dots">
          {props.slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir para o slide ${index + 1}`}
              aria-current={index === atual}
              data-active={index === atual}
              onClick={() => ir(index)}
            />
          ))}
        </div>
      )}
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
