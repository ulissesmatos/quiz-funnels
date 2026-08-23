import {
  BarChart3,
  Check,
  CreditCard,
  GitBranch,
  Globe,
  Repeat2,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { PLAN } from "@/server/billing/plan";

import { MarketingImage } from "./marketing-image";
import { SiteHeader } from "./site-header";

const RECURSOS = [
  {
    Icone: Sparkles,
    accent: "bg-marketing-violet/20 text-marketing-violet",
    titulo: "Copiloto de IA",
    descricao:
      "Descreva o que você vende e o copiloto monta as telas, a lógica de pontuação e o checkout. No modo cuidadoso, ele planeja tudo antes de construir e você aprova antes de aplicar.",
  },
  {
    Icone: GitBranch,
    accent: "bg-marketing-blue/20 text-marketing-blue",
    titulo: "Lógica condicional de verdade",
    descricao:
      "Perguntas que mudam o caminho do visitante com base na resposta anterior — não é um formulário longo disfarçado de quiz.",
  },
  {
    Icone: CreditCard,
    accent: "bg-marketing-coral/20 text-marketing-coral",
    titulo: "Checkout nativo",
    descricao: "Pix, cartão e boleto direto no funil via Mercado Pago, sem redirecionar o visitante pra outra página.",
  },
  {
    Icone: Repeat2,
    accent: "bg-marketing-orange/20 text-marketing-orange",
    titulo: "Order bump e upsell",
    descricao: "Oferta extra antes do pagamento e upsell de um clique depois — com o cartão já salvo, sem redigitar nada.",
  },
  {
    Icone: Globe,
    accent: "bg-marketing-mint/20 text-marketing-mint",
    titulo: "Domínio próprio",
    descricao: "Publique em www.suamarca.com.br sem redirecionamento nem marca d'água do FunilQuiz.",
  },
  {
    Icone: BarChart3,
    accent: "bg-marketing-blue/20 text-marketing-blue",
    titulo: "Pixels e analytics",
    descricao: "Meta, Google Ads, TikTok, LinkedIn e GTM configuráveis no funil, com analytics de abandono por tela.",
  },
];

const PASSOS = [
  {
    Icone: Wand2,
    accent: "bg-marketing-violet",
    titulo: "Descreva ou monte do zero",
    descricao: "Conte pro copiloto o que você vende, ou comece de um funil em branco e construa tela por tela.",
  },
  {
    Icone: SlidersHorizontal,
    accent: "bg-marketing-coral",
    titulo: "Personalize cada detalhe",
    descricao: "Cores, perguntas, preço, cupom — o funil é seu, a IA só acelera o primeiro rascunho.",
  },
  {
    Icone: Rocket,
    accent: "bg-marketing-mint text-marketing-ink",
    titulo: "Publique no seu domínio",
    descricao: "Um clique e o funil está no ar, pronto pra receber tráfego e pagamento.",
  },
];

const FAQ = [
  {
    pergunta: "Preciso saber programar?",
    resposta: "Não. O construtor é visual, arrastar-e-soltar, e o copiloto de IA monta o primeiro rascunho a partir de uma descrição em texto.",
  },
  {
    pergunta: "Como funciona o pagamento do meu produto?",
    resposta:
      "Você conecta sua própria conta Mercado Pago (Pix, cartão e boleto) e o dinheiro cai direto nela — o FunilQuiz nunca fica no meio da transação.",
  },
  {
    pergunta: "Tem taxa por venda?",
    resposta: "Não. A cobrança é só a assinatura mensal. O que você vende no checkout não paga comissão nenhuma pro FunilQuiz.",
  },
  {
    pergunta: "Posso usar meu próprio domínio?",
    resposta: "Sim. Aponte seu domínio nas configurações e publique sem redirecionamento nem marca d'água.",
  },
  {
    pergunta: "Dá pra rastrear conversão com Meta Ads ou Google Ads?",
    resposta: "Sim — Meta, Google Ads, TikTok, LinkedIn e Google Tag Manager, tudo configurável direto no funil.",
  },
];

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="bg-white text-marketing-ink">
      <SiteHeader isLoggedIn={isLoggedIn} />
      <main>
        <Hero />
        <Recursos />
        <ComoFunciona />
        <CopilotoSpotlight />
        <CheckoutSpotlight />
        <Precos />
        <Faq />
        <CtaFinal />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_84%_40%,#dbe7ff_0,transparent_28%),radial-gradient(circle_at_15%_90%,#eff4ff_0,transparent_25%)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 md:grid-cols-2 md:px-8 md:pt-20 md:pb-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ccdafa] bg-[#f3f7ff] px-3 py-1 text-xs font-medium text-marketing-blue">
            <Sparkles size={13} />
            Copiloto de IA incluso
          </span>

          <h1 className="mt-5 text-4xl leading-[1.06] font-bold tracking-[-0.045em] md:text-5xl">
            Página parada não vende. Funil que faz perguntas, sim.
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-marketing-muted">
            A IA monta um quiz de vendas completo — com checkout, order bump e upsell — a partir de uma descrição do
            que você vende. Sem agência, sem programar.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/cadastro"
              className="rounded-lg bg-marketing-blue px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-marketing-blue/25 transition-transform hover:-translate-y-0.5 hover:bg-[#2455d6]"
            >
              Criar funil grátis
            </Link>
            <a
              href="#como-funciona"
              className="rounded-lg border border-marketing-border bg-white px-5 py-3 text-sm font-semibold text-marketing-ink transition-colors hover:border-[#b9c9ef] hover:bg-[#f7f9ff]"
            >
              Ver como funciona
            </a>
          </div>

          <p className="mt-4 text-xs text-marketing-muted">{PLAN.trialDays} dias grátis · cancele quando quiser</p>
        </div>

        <ProductVisual
          file="hero"
          alt="Tela de um quiz interativo do FunilQuiz no celular"
          priority
          size="max-w-sm md:max-w-md"
        />
      </div>
    </section>
  );
}

function Recursos() {
  return (
    <section id="recursos" className="border-y border-marketing-border bg-marketing-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          eyebrow="Recursos"
          titulo="Tudo que um funil de venda precisa, num lugar só"
          descricao="Sem colar três ferramentas diferentes pra ter quiz, checkout e rastreamento de anúncio funcionando juntos."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map(({ Icone, titulo, descricao, accent }) => (
            <div key={titulo} className="rounded-2xl border border-marketing-border bg-white p-6 shadow-sm shadow-[#0b1633]/5 transition-transform hover:-translate-y-1">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${accent}`}>
                <Icone size={20} />
              </div>
              <h3 className="mt-4 font-semibold">{titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-marketing-muted">{descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section id="como-funciona" className="bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          eyebrow="Como funciona"
          titulo="Do zero ao ar em três passos"
          descricao="O copiloto acelera o primeiro rascunho — o resto do fluxo é o mesmo construtor visual, com ou sem IA."
        />

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {PASSOS.map(({ titulo, descricao, Icone, accent }, index) => (
            <div key={titulo} className="flex flex-col items-center text-center">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg shadow-black/10 ${accent}`}>
                <Icone size={22} />
              </span>
              <span className="mt-4 text-xs font-semibold tracking-wide text-marketing-muted uppercase">
                Passo {index + 1}
              </span>
              <h3 className="mt-1 font-semibold">{titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-marketing-muted">{descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CopilotoSpotlight() {
  return (
    <section className="bg-[#f7f9fe]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ProductVisual file="copiloto" alt="Copiloto de IA aberto no editor do FunilQuiz" label="Copiloto de IA" stat="Descreva. Ele monta." className="md:order-2" />

          <div className="md:order-1">
            <span className="text-xs font-semibold tracking-wide text-marketing-blue uppercase">Copiloto de IA</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Um copiloto que constrói, não só responde</h2>
            <p className="mt-4 leading-relaxed text-marketing-muted">
              Descreva seu produto e o objetivo do funil. O copiloto monta as telas, escreve as perguntas, configura
              a pontuação e já deixa o checkout pronto — explicando cada decisão antes de aplicar.
            </p>

            <ul className="mt-6 flex flex-col gap-3 text-sm">
              <ChecklistItem>Gera funis completos, com dezenas de telas, a partir de uma descrição</ChecklistItem>
              <ChecklistItem>Modo cuidadoso: planeja e detalha antes de construir qualquer tela</ChecklistItem>
              <ChecklistItem>Você aprova cada mudança — a IA nunca publica sozinha</ChecklistItem>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckoutSpotlight() {
  return (
    <section className="bg-marketing-blue text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <span className="text-xs font-semibold tracking-wide text-[#cbdcff] uppercase">Checkout integrado</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Venda sem sair do funil</h2>
          <p className="mt-4 leading-relaxed text-[#dbe6ff]">
            Pix, cartão e boleto processados pelo Mercado Pago, com order bump antes do pagamento e upsell de um
            clique depois — sem redirecionar o visitante pra outra página.
          </p>

          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <ChecklistItem>Cupom de desconto configurável por funil</ChecklistItem>
            <ChecklistItem>Cartão salvo pra upsell sem pedir os dados de novo</ChecklistItem>
            <ChecklistItem>O dinheiro cai direto na sua conta Mercado Pago</ChecklistItem>
          </ul>
        </div>

        <ProductVisual file="checkout" alt="Oferta criada em um funil publicado" label="Oferta no seu funil" stat="Sem redirecionamento" />
      </div>
      </div>
    </section>
  );
}

function Precos() {
  const preco = (PLAN.priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <section id="preco" className="border-t border-marketing-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading eyebrow="Preço" titulo="Um plano, sem pegadinha" descricao="Sem taxa por venda, sem limite artificial de funil pra te empurrar pro plano de cima." />

        <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-[#c9d8ff] bg-white p-8 shadow-2xl shadow-marketing-blue/10">
          <h3 className="font-semibold">{PLAN.name}</h3>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold">R$ {preco}</span>
            <span className="text-marketing-muted">/mês</span>
          </p>
          <p className="mt-1 text-sm text-marketing-muted">{PLAN.trialDays} dias grátis pra testar</p>

          <Link
            href="/cadastro"
            className="mt-6 block rounded-lg bg-marketing-blue px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-marketing-blue/25 transition-transform hover:-translate-y-0.5 hover:bg-[#2455d6]"
          >
            Começar teste grátis
          </Link>

          <ul className="mt-6 flex flex-col gap-2.5 text-sm">
            <ChecklistItem>Funis ilimitados</ChecklistItem>
            <ChecklistItem>Copiloto de IA em todas as telas</ChecklistItem>
            <ChecklistItem>Checkout, order bump e upsell integrados</ChecklistItem>
            <ChecklistItem>Domínio próprio, sem marca d&apos;água</ChecklistItem>
            <ChecklistItem>Equipe multiusuário e webhooks</ChecklistItem>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-3xl bg-white px-4 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow="Perguntas frequentes" titulo="Antes de você perguntar" descricao="" />

      <div className="mt-10 flex flex-col divide-y divide-marketing-border">
        {FAQ.map(({ pergunta, resposta }) => (
          <details key={pergunta} className="group py-4">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {pergunta}
                <span className="text-marketing-muted transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-marketing-muted">{resposta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="border-t border-[#2557d4] bg-[linear-gradient(135deg,#2454d5,#316cec)]">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8 md:py-24">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Seu próximo funil pode estar no ar hoje</h2>
        <p className="mx-auto mt-3 max-w-md text-[#dbe6ff]">
          {PLAN.trialDays} dias grátis, sem compromisso. Descreva o que você vende e deixe o copiloto montar o
          primeiro rascunho.
        </p>
        <Link
          href="/cadastro"
          className="mt-7 inline-block rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-marketing-blue shadow-xl shadow-black/20 transition-transform hover:-translate-y-0.5"
        >
          Criar funil grátis
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-marketing-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-marketing-muted md:flex-row md:px-8">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6 shrink-0" />
          <span>FunilQuiz</span>
        </div>
        <p>© {new Date().getFullYear()} FunilQuiz. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, titulo, descricao }: { eyebrow: string; titulo: string; descricao: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold tracking-wide text-marketing-blue uppercase">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{titulo}</h2>
      {descricao && <p className="mt-3 leading-relaxed text-marketing-muted">{descricao}</p>}
    </div>
  );
}

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={16} className="mt-0.5 shrink-0 text-marketing-mint" />
      <span>{children}</span>
    </li>
  );
}

/**
 * Sem caixa, sem fundo colorido, sem moldura escura por cima — cada imagem já
 * chega pronta (a hero é PNG com alfa de propósito, pra flutuar grande em vez
 * de ficar encolhida dentro de um retângulo). Só um `drop-shadow` leve, que
 * segue o contorno real do conteúdo (inclusive o alfa), não uma caixa.
 */
function ProductVisual({
  file,
  alt,
  label,
  stat,
  priority = false,
  size = "max-w-xl",
  className,
}: {
  file: "hero" | "copiloto" | "checkout";
  alt: string;
  label?: string;
  stat?: string;
  priority?: boolean;
  size?: string;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto w-full ${size} ${className ?? ""}`}>
      <MarketingImage
        file={file}
        alt={alt}
        priority={priority}
        className="drop-shadow-[0_30px_45px_rgba(15,23,60,0.18)]"
      />
      {label && stat && (
        <div className="absolute bottom-2 left-2 rounded-xl border border-marketing-border bg-white px-4 py-3 shadow-lg shadow-black/10">
          <p className="text-[10px] font-semibold tracking-wide text-marketing-muted uppercase">{label}</p>
          <p className="mt-0.5 text-sm font-bold text-marketing-ink">{stat}</p>
        </div>
      )}
    </div>
  );
}
