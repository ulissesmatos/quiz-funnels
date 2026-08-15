import { z } from "zod";

import { MediaImage } from "../../schema/common";
import { defineBlock } from "../types";

const AspectRatio = z
  .enum(["auto", "1:1", "4:3", "16:9", "3:4", "9:16"])
  .describe("Proporção do quadro. Em funil mobile, 1:1 e 4:3 funcionam melhor que 16:9.");

export const imageBlock = defineBlock({
  type: "image",
  label: "Imagem",
  category: "midia",
  icon: "Image",
  description:
    "Imagem única. Use para ilustrar a pergunta, mostrar o produto ou dar prova visual (antes/depois, print de resultado).",
  props: z
    .object({
      image: MediaImage,
      aspect: AspectRatio,
      fit: z.enum(["cover", "contain"]).describe("cover preenche o quadro cortando; contain mostra a imagem inteira"),
    })
    .strict(),
  defaults: {
    image: { url: "", alt: "" },
    aspect: "auto",
    fit: "cover",
  },
  example: {
    image: { url: "https://exemplo.com/plano.jpg", alt: "Plano personalizado" },
    aspect: "4:3",
    fit: "cover",
  },
  emptyState: (props) => (props.image.url ? null : "Escolha uma imagem"),
});

export const audioBlock = defineBlock({
  type: "audio",
  label: "Áudio",
  category: "midia",
  icon: "Mic",
  description:
    "Player de áudio no formato de mensagem de voz, com avatar e onda. Funciona muito bem como recado pessoal do especialista no meio do funil: soa como conversa, não como propaganda. Grave curto, entre 20 e 60 segundos.",
  props: z
    .object({
      src: z.string().describe("URL do arquivo de áudio (mp3, m4a, ogg). Vazio = não configurado."),
      avatar: MediaImage.optional().describe("Foto de quem está falando"),
      senderName: z.string().optional().describe("Nome exibido acima do player"),
      durationLabel: z
        .string()
        .optional()
        .describe("Duração mostrada antes do play, ex.: '0:42'. O player corrige ao carregar."),
      autoplay: z.boolean().describe("Navegadores só permitem com o som mudo; use com parcimônia"),
    })
    .strict(),
  defaults: { src: "", autoplay: false },
  example: {
    src: "https://exemplo.com/recado.mp3",
    avatar: { url: "https://exemplo.com/especialista.jpg", alt: "Dra. Ana" },
    senderName: "Dra. Ana",
    durationLabel: "0:42",
    autoplay: false,
  },
  emptyState: (props) => (props.src ? null : "Cole a URL do áudio"),
});

export const carouselBlock = defineBlock({
  type: "carousel",
  label: "Carrossel",
  category: "midia",
  icon: "GalleryHorizontalEnd",
  description:
    "Slides deslizáveis com imagem, título e texto. Bom para mostrar resultados de vários clientes, etapas de um método ou variações de produto sem esticar a tela.",
  props: z
    .object({
      slides: z
        .array(
          z
            .object({
              image: MediaImage.optional(),
              title: z.string().optional(),
              text: z.string().optional(),
            })
            .strict(),
        )
        .min(1)
        .max(12),
      aspect: AspectRatio,
      autoplay: z.boolean(),
      intervalMs: z.number().min(1500).max(15000).describe("Tempo em cada slide quando autoplay está ligado"),
      showDots: z.boolean().describe("Bolinhas de navegação abaixo"),
    })
    .strict(),
  defaults: {
    slides: [{ title: "Primeiro slide" }, { title: "Segundo slide" }],
    aspect: "4:3",
    autoplay: false,
    intervalMs: 4000,
    showDots: true,
  },
  example: {
    slides: [
      { image: { url: "https://exemplo.com/antes.jpg", alt: "Marina antes" }, title: "Marina, 34", text: "8 semanas" },
      { image: { url: "https://exemplo.com/depois.jpg", alt: "Rafael antes" }, title: "Rafael, 41", text: "12 semanas" },
    ],
    aspect: "1:1",
    autoplay: true,
    intervalMs: 4000,
    showDots: true,
  },
});

export const videoBlock = defineBlock({
  type: "video",
  label: "Vídeo",
  category: "midia",
  icon: "Play",
  description:
    "Vídeo do YouTube, Vimeo ou arquivo MP4 hospedado. Para VSL, use autoplay com muted ligado (navegadores bloqueiam autoplay com som) e esconda os controles para segurar a atenção.",
  props: z
    .object({
      provider: z.enum(["youtube", "vimeo", "file"]).describe("file = MP4/HLS por URL direta"),
      src: z
        .string()
        .describe(
          "URL completa do YouTube/Vimeo, ou URL direta do arquivo quando provider = 'file'. Vazio = ainda não configurado.",
        ),
      poster: z.string().optional().describe("Imagem de capa exibida antes de dar play"),
      autoplay: z.boolean(),
      muted: z.boolean().describe("Precisa ser true para o autoplay funcionar nos navegadores"),
      loop: z.boolean(),
      controls: z.boolean(),
      aspect: AspectRatio,
    })
    .strict(),
  defaults: {
    provider: "youtube",
    src: "",
    autoplay: false,
    muted: true,
    loop: false,
    controls: true,
    aspect: "16:9",
  },
  example: {
    provider: "youtube",
    src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    autoplay: true,
    muted: true,
    loop: false,
    controls: false,
    aspect: "9:16",
  },
  emptyState: (props) => (props.src ? null : "Cole a URL do vídeo"),
});
