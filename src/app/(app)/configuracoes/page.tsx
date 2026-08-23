import type { Metadata } from "next";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarPreco } from "@/lib/format";
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

  const opcoesDeFunil = funnels.map((f) => ({ id: f.id, name: f.name }));

  return (
    <PageShell width="sm">
      <PageHeader title="Configurações" description="Preferências gerais desta organização." />

      {/* Todas as seções usam a mesma casca agora: antes, duas traziam o próprio
          card, uma estava solta na página e duas não tinham card nenhum. */}
      <div className="flex flex-col gap-6">
        <BillingSection
          status={subscription?.status ?? null}
          trialEndsAt={subscription?.trialEndsAt ?? null}
          currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
          priceLabel={formatarPreco(PLAN.priceCents, PLAN.currency)}
        />

        <Card>
          <CardHeader
            title="Aparência do sistema"
            description="Modo de cor do painel e do editor — a interface que você usa para montar os funis, não os funis em si. Cada funil publicado tem o próprio tema, trocável na aba Tema do editor, e nasce nesse mesmo modo por padrão até alguém trocar."
          />
          <ThemeModeForm inicial={defaultThemeMode} />
        </Card>

        <MercadoPagoSection
          connected={mercadoPagoConnection !== null}
          liveMode={mercadoPagoConnection?.liveMode ?? true}
          mensagem={mercadoPagoMensagem}
        />

        {/* Sem `description` nestes dois: os próprios gerenciadores já abrem
            com um parágrafo explicando o que é — repetir aqui duplicaria. */}
        <Card>
          <CardHeader title="Cupons de desconto" />
          <CouponsManager coupons={coupons} funnels={opcoesDeFunil} />
        </Card>

        <Card>
          <CardHeader title="Webhooks" />
          <WebhooksManager webhooks={webhooks} funnels={opcoesDeFunil} />
        </Card>
      </div>
    </PageShell>
  );
}
