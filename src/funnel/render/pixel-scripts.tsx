"use client";

import Script from "next/script";

import type { FunnelPixels } from "@/funnel/schema";

/**
 * Injeta o snippet oficial de cada plataforma quando o dono do funil
 * configurou o respectivo ID na aba Rastreamento. Só dispara `PageView`/carga
 * inicial — a conversão em si é imperativa, disparada pelo `TrackedFunnelView`
 * no momento certo (fim do funil ou clique num CTA externo).
 */
export function PixelScripts({ pixels }: { pixels: FunnelPixels }) {
  return (
    <>
      {pixels.metaPixelId && (
        <Script id="qf-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', ${jsString(pixels.metaPixelId)});
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {pixels.googleTagManagerId && (
        <Script id="qf-gtm" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer',${jsString(pixels.googleTagManagerId)});
          `}
        </Script>
      )}

      {pixels.googleAdsId && (
        <>
          <Script
            id="qf-gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(pixels.googleAdsId)}`}
          />
          <Script id="qf-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              window.gtag = function(){dataLayer.push(arguments);};
              gtag('js', new Date());
              gtag('config', ${jsString(pixels.googleAdsId)});
            `}
          </Script>
        </>
      )}

      {pixels.tiktokPixelId && (
        <Script id="qf-tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load(${jsString(pixels.tiktokPixelId)});
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {pixels.linkedinPartnerId && (
        <>
          <Script id="qf-linkedin-insight" strategy="afterInteractive">
            {`
              _linkedin_partner_id = ${jsString(pixels.linkedinPartnerId)};
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
                if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q=[]}
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript";b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);
              })(window.lintrk);
            `}
          </Script>
          {/* Sem JS: cobre quem bloqueia o script acima. Padrão oficial do Insight Tag. */}
          <noscript>
            <img
              height={1}
              width={1}
              style={{ display: "none" }}
              alt=""
              src={`https://px.ads.linkedin.com/collect/?pid=${encodeURIComponent(pixels.linkedinPartnerId)}&fmt=gif`}
            />
          </noscript>
        </>
      )}
    </>
  );
}

/**
 * `JSON.stringify` escapa aspas/backslash; trocar `<` por `<` evita que
 * um valor malicioso feche a tag `<script>` cedo. Os IDs já passam por regex
 * no schema, mas isto é a defesa que realmente importa contra injeção.
 */
function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003C");
}
