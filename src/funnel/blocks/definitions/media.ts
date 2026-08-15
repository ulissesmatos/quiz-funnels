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
});
