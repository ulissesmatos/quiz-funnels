import type { ReactNode } from "react";

import { requireOrganization } from "@/server/auth/session";

/**
 * O editor ocupa a tela inteira: ele já tem a própria barra superior com volta
 * para a lista, e a sidebar do app roubaria largura justamente do canvas.
 */
export default async function EditorLayout({ children }: { children: ReactNode }) {
  await requireOrganization();
  return children;
}
