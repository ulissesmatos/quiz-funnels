import type { Metadata } from "next";

import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSubscription } from "@/server/billing/queries";
import { PLAN } from "@/server/billing/plan";
import { listCoupons } from "@/server/coupons/queries";
import { listFunnels } from "@/server/funnels/queries";
import { getMercadoPagoConnection } from "@/server/mercadopago/connections";
import { getOrganizationSettings } from "@/server/settings/queries";
import { listWebhookSubscriptions } from "@/server/webhooks/queries";

import { BillingSection } from "./billing-section";
import { CouponsManager } from "./coupons-manager";
import { MercadoPagoSection } from "./mercadopago-section";
import { ThemeModeForm } from "./theme-mode-form";
import { WebhooksManager } from "./webhooks-manager";

export const metadata: Metadata = { title: "Configurações" };

const MENSAGENS_DE_ERRO: Record<string, string> = {
  cancelado: "Conexão com o Mercado Pago cancelada.",
  estado_invalido: "Não foi possível confirmar essa conexão — tente conectar de novo.",
  nao_configurado: "Mercado Pago não está configurado neste ambiente.",
  falha_na_troca: "A Mercado Pago recusou a conexão. Tente novamente.",
};

type PageProps = { searchParams: Promise<{ mp_conectado?: string; mp_erro?: string }> };

export default async function ConfiguracoesPage({ searchParams }: PageProps) {
  const { organization } = await requireOrganization();
  const { mp_conectado, mp_erro } = await searchParams;

  const [{ defaultThemeMode }, webhooks, funnels, mercadoPagoConnection, coupons, subscription] = await Promise.all([
    getOrganizationSettings(),
    listWebhookSubscriptions(organization.id),
    listFunnels(organization.id),
    getMercadoPagoConnection(organization.id),
    listCoupons(organization.id),
    getOrganizationSubscription(organization.id),
  ]);

  const mercadoPagoMensagem = mp_conectado
    ? ({ tipo: "sucesso", texto: "Mercado Pago conectado." } as const)
    : mp_erro
      ? ({ tipo: "erro", texto: MENSAGENS_DE_ERRO[mp_erro] ?? "Não foi possível conectar." } as const)
      : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-app-muted">Preferências gerais desta organização.</p>
      </header>

      <BillingSection
        status={subscription?.status ?? null}
        trialEndsAt={subscription?.trialEndsAt ?? null}
        currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
        priceLabel={new Intl.NumberFormat("pt-BR", { style: "currency", currency: PLAN.currency }).format(
          PLAN.priceCents / 100,
        )}
      />

      <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="font-medium">Aparência do sistema</h2>
        <p className="mt-1 text-sm text-app-muted">
          Modo de cor do painel e do editor — a interface que você usa para montar os funis, não os
          funis em si. Cada funil publicado tem o próprio tema, trocável na aba Tema do editor, e
          nasce nesse mesmo modo por padrão até alguém trocar.
        </p>
        <div className="mt-4">
          <ThemeModeForm inicial={defaultThemeMode} />
        </div>
      </section>

      <MercadoPagoSection
        connected={mercadoPagoConnection !== null}
        liveMode={mercadoPagoConnection?.liveMode ?? true}
        mensagem={mercadoPagoMensagem}
      />

      <section className="mb-6">
        <h2 className="mb-3 font-medium">Cupons de desconto</h2>
        <CouponsManager coupons={coupons} funnels={funnels.map((f) => ({ id: f.id, name: f.name }))} />
      </section>

      <section>
        <h2 className="mb-3 font-medium">Webhooks</h2>
        <WebhooksManager webhooks={webhooks} funnels={funnels.map((f) => ({ id: f.id, name: f.name }))} />
      </section>
    </div>
  );
}
