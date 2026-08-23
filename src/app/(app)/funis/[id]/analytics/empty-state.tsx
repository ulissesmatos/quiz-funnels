export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center">
      <p className="text-app-muted">
        Nenhuma visita registrada ainda. Assim que alguém acessar o funil publicado, os dados aparecem aqui.
      </p>
    </div>
  );
}

export function LowSampleNote() {
  return (
    <p className="rounded-lg border border-app-border bg-app-surface-2 px-3 py-2 text-xs text-app-muted">
      Poucos dados ainda — os números abaixo tendem a mudar bastante até o funil ter mais visitas.
    </p>
  );
}
