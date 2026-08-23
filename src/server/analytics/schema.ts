import { z } from "zod";

/**
 * Corpo aceito pelo endpoint público de telemetria (`/api/track`). Tamanhos
 * limitados de propósito — é o único endpoint do app sem autenticação, então
 * o schema é a única barreira contra um payload absurdo.
 */
const AnswerValue = z.union([
  z.string().max(2000),
  z.array(z.string().max(500)).max(50),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const TrackEventBody = z
  .object({
    funnelId: z.uuid(),
    funnelVersionId: z.uuid().optional(),
    sessionId: z.uuid(),
    type: z.enum(["view", "step_view", "answer", "complete", "click"]),
    /** Step em que o evento aconteceu. Ausente só faz sentido para `complete`. */
    stepId: z.string().max(64).optional(),
    answer: z
      .object({ name: z.string().max(64), value: AnswerValue })
      .strict()
      .optional(),
    complete: z
      .object({
        scores: z.record(z.string().max(64), z.number()).optional(),
        outcomeId: z.string().max(64).optional(),
      })
      .strict()
      .optional(),
    click: z
      .object({ kind: z.enum(["link", "whatsapp"]), url: z.string().max(2000).optional() })
      .strict()
      .optional(),
    /** UTMs e cliques de anúncio (gclid/fbclid) capturados na primeira visualização. */
    utm: z.record(z.string().max(32), z.string().max(200)).optional(),
    referrer: z.string().max(2000).optional(),
  })
  .strict();

export type TrackEventBody = z.infer<typeof TrackEventBody>;
