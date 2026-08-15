import type { ReactNode } from "react";

import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSettings } from "@/server/settings/queries";

/**
 * O editor ocupa a tela inteira: ele já tem a própria barra superior com volta
 * para a lista, e a sidebar do app roubaria largura justamente do canvas.
 *
 * Por ser uma árvore separada da de `(app)`, precisa do próprio
 * `data-app-theme` — herdar do layout raiz não existe, cada route group
 * resolve a preferência de novo a partir das configurações da organização.
 */
export default async function EditorLayout({ children }: { children: ReactNode }) {
  await requireOrganization();
  const { defaultThemeMode } = await getOrganizationSettings();

  return (
    <div data-app-theme={defaultThemeMode} className="bg-app-bg text-app-text">
      {children}
    </div>
  );
}
