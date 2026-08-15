import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <p className="mt-2 text-sm text-app-muted">
        As respostas capturadas pelos funis aparecem aqui assim que o motor de lógica estiver
        ligado.
      </p>
    </div>
  );
}
