import type { Metadata } from "next";

import { Card, CardHeader } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/misc";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarPreco } from "@/lib/format";
import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSubscription } from "@/server/billing/queries";
import { getPlanForOrganization } from "@/server/billing/plans";
import { listCoupons } from "@/server/coupons/queries";
import { listFunnels } from "@/server/funnels/queries";
import { getMercadoPagoConnection } from "@/server/mercadopago/connections";
import { getOrganizationSettings } from "@/server/settings/queries";
import { listWebhookSubscriptions } from "@/server/webhooks/queries";

import { BillingSection } from "./billing-section";
import { CouponsManager } from "./coupons-manager";
import { MercadoPagoSection } from "./mercadopago-section";
import { OrganizacaoForm } from "./organizacao-form";
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

  const [{ defaultThemeMode }, webhooks, funnels, mercadoPagoConnection, coupons, subscription, plan] =
    await Promise.all([
      getOrganizationSettings(),
      listWebhookSubscriptions(organization.id),
      listFunnels(organization.id),
      getMercadoPagoConnection(organization.id),
      listCoupons(organization.id),
      getOrganizationSubscription(organization.id),
      getPlanForOrganization(organization.id),
    ]);

  const mercadoPagoMensagem = mp_conectado
    ? ({ tipo: "sucesso", texto: "Mercado Pago conectado." } as const)
    : mp_erro
      ? ({ tipo: "erro", texto: MENSAGENS_DE_ERRO[mp_erro] ?? "Não foi possível conectar." } as const)
      : undefined;

  const opcoesDeFunil = funnels.map((f) => ({ id: f.id, name: f.name }));
  const podeGerenciarOrganizacao = organization.role === "owner" || organization.role === "admin";

  return (
    <PageShell width="sm">
      <PageHeader
        title="Configurações"
        description="Preferências desta organização — o que muda aqui é sobre o painel e a conta, não sobre um funil específico."
      />

      {/* Agrupado por assunto em vez de uma pilha só de cards iguais — cada
          seção é um tipo diferente de decisão (identidade, dinheiro,
          aparência, integrações, vendas). */}
      <div className="flex flex-col gap-9">
        <section>
          <SectionLabel>Organização</SectionLabel>
          <Card>
            <OrganizacaoForm
              organizationId={organization.id}
              nomeInicial={organization.name}
              slugInicial={organization.slug}
              podeEditar={podeGerenciarOrganizacao}
            />
          </Card>
        </section>

        <section>
          <SectionLabel>Cobrança</SectionLabel>
          <BillingSection
            status={subscription?.status ?? null}
            trialEndsAt={subscription?.trialEndsAt ?? null}
            currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
            planName={plan?.name ?? null}
            priceLabel={plan ? formatarPreco(plan.monthlyPriceCents, plan.currency) : null}
          />
        </section>

        <section>
          <SectionLabel>Aparência</SectionLabel>
          <Card>
            <CardHeader
              title="Modo de cor do painel e do editor"
              description="A interface que você usa para montar os funis, não os funis em si. Cada funil publicado tem o próprio tema, trocável na aba Tema do editor, e nasce nesse mesmo modo por padrão até alguém trocar."
            />
            <ThemeModeForm inicial={defaultThemeMode} />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionLabel className="mb-0">Pagamentos e integrações</SectionLabel>
          <MercadoPagoSection
            connected={mercadoPagoConnection !== null}
            liveMode={mercadoPagoConnection?.liveMode ?? true}
            mensagem={mercadoPagoMensagem}
          />
          <Card>
            <CardHeader title="Webhooks" />
            <WebhooksManager webhooks={webhooks} funnels={opcoesDeFunil} canUseWebhooks={plan?.canUseWebhooks ?? false} />
          </Card>
        </section>

        <section>
          <SectionLabel>Vendas</SectionLabel>
          <Card>
            <CardHeader title="Cupons de desconto" />
            <CouponsManager coupons={coupons} funnels={opcoesDeFunil} />
          </Card>
        </section>
      </div>
    </PageShell>
  );
}
