"use client";

import { Check, Loader2, UploadCloud } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { FunnelPixels } from "@/funnel/schema";
import { updateFunnelPixelsAction } from "@/server/analytics/actions";
import { publishFunnelAction } from "@/server/funnels/actions";

export function TrackingSettingsTab({ funnelId, pixels }: { funnelId: string; pixels: FunnelPixels }) {
  const [form, setForm] = useState({
    metaPixelId: pixels.metaPixelId ?? "",
    googleAdsId: pixels.googleAdsId ?? "",
    googleTagManagerId: pixels.googleTagManagerId ?? "",
    tiktokPixelId: pixels.tiktokPixelId ?? "",
    linkedinPartnerId: pixels.linkedinPartnerId ?? "",
    linkedinConversionId: pixels.linkedinConversionId ?? "",
    conversionEventName: pixels.conversionEventName ?? "",
  });

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNow, setSavedNow] = useState(false);

  const [publishing, startPublishing] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedNow, setPublishedNow] = useState(false);

  function salvar() {
    setSaveError(null);
    setSavedNow(false);
    startSaving(async () => {
      const result = await updateFunnelPixelsAction(funnelId, form);
      if (result.ok) {
        setSavedNow(true);
        setTimeout(() => setSavedNow(false), 3000);
      } else {
        setSaveError(result.error);
      }
    });
  }

  function publicar() {
    setPublishError(null);
    startPublishing(async () => {
      const result = await publishFunnelAction(funnelId);
      if (result.ok) {
        setPublishedNow(true);
        setTimeout(() => setPublishedNow(false), 3000);
      } else {
        setPublishError(result.error);
      }
    });
  }

  return (
    <Card padding="sm" className="max-w-lg">
      <h2 className="text-sm font-medium text-app-text">Pixel e tags de conversão</h2>
      <p className="mt-1 text-xs text-app-muted">
        Vale só para este funil. Salvar altera o rascunho — publique para valer no ar.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <Field label="Meta Pixel ID" hint="Só números, ex.: 1234567890123456">
          <Input
            value={form.metaPixelId}
            onChange={(e) => setForm((f) => ({ ...f, metaPixelId: e.target.value }))}
            placeholder="1234567890123456"
          />
        </Field>

        <Field label="Google Ads / GA4 ID" hint="Ex.: AW-XXXXXXXXX ou G-XXXXXXXXXX">
          <Input
            value={form.googleAdsId}
            onChange={(e) => setForm((f) => ({ ...f, googleAdsId: e.target.value }))}
            placeholder="AW-XXXXXXXXX"
          />
        </Field>

        <Field label="Google Tag Manager ID" hint="Ex.: GTM-XXXXXXX">
          <Input
            value={form.googleTagManagerId}
            onChange={(e) => setForm((f) => ({ ...f, googleTagManagerId: e.target.value }))}
            placeholder="GTM-XXXXXXX"
          />
        </Field>

        <Field label="TikTok Pixel ID" hint="Pixel Code, no TikTok Ads Manager — ex.: C56Q1ONB3D4MMMSLO3KG">
          <Input
            value={form.tiktokPixelId}
            onChange={(e) => setForm((f) => ({ ...f, tiktokPixelId: e.target.value }))}
            placeholder="C56Q1ONB3D4MMMSLO3KG"
          />
        </Field>

        <Field label="LinkedIn Partner ID" hint="Só números — em Campaign Manager › Insight Tag">
          <Input
            value={form.linkedinPartnerId}
            onChange={(e) => setForm((f) => ({ ...f, linkedinPartnerId: e.target.value }))}
            placeholder="1234567"
          />
        </Field>

        <Field
          label="LinkedIn Conversion ID"
          hint="Opcional — sem ele o pixel carrega mas nenhuma conversão é registrada"
        >
          <Input
            value={form.linkedinConversionId}
            onChange={(e) => setForm((f) => ({ ...f, linkedinConversionId: e.target.value }))}
            placeholder="12345678"
          />
        </Field>

        <Field label="Nome do evento de conversão" hint="Disparado ao concluir o funil ou clicar no CTA final">
          <Input
            value={form.conversionEventName}
            onChange={(e) => setForm((f) => ({ ...f, conversionEventName: e.target.value }))}
            placeholder="Lead"
          />
        </Field>
      </div>

      {saveError && <p className="mt-3 text-xs text-app-danger">{saveError}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={salvar} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : savedNow ? <Check size={14} /> : null}
          {savedNow ? "Salvo" : "Salvar"}
        </Button>

        <Button size="sm" variant="outline" onClick={publicar} disabled={publishing}>
          {publishing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : publishedNow ? (
            <Check size={14} />
          ) : (
            <UploadCloud size={14} />
          )}
          {publishedNow ? "Publicado" : "Publicar"}
        </Button>
      </div>

      {publishError && <p className="mt-2 whitespace-pre-line text-xs text-app-danger">{publishError}</p>}
    </Card>
  );
}
