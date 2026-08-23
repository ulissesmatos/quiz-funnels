# Fontes visuais da landing

Mistura de captura real e ilustração gerada — o que ler melhor ganha, não uma
regra fixa de "só screenshot" ou "só IA".

| Arquivo final | Fonte | Uso |
| --- | --- | --- |
| `hero.png` | Ilustração gerada (ChatGPT) | Tela do quiz no celular + destaques |
| `como-funciona.png` | Captura real do editor, view "Fluxo" | Telas conectadas / lógica condicional |
| `copiloto.png` | Ilustração gerada (ChatGPT) | Copiloto de IA construindo o funil |
| `checkout.png` | Ilustração gerada (ChatGPT) | Checkout + order bump + upsell |

Duas ilustrações geradas ficaram de fora por enquanto — repetiam texto que já
está em HTML na seção do copiloto, ou combinavam mais com uma futura seção de
Recursos do que com um dos 4 slots atuais. Guardadas em `assets/_unused/`
(`copiloto-chat-detalhado.png`, `recursos-blocos-do-quiz.png`) pra reaproveitar
se a página ganhar mais seções com imagem.

Depois de trocar qualquer arquivo aqui, rode `pnpm img:optimize`. O script
exporta AVIF, WebP e PNG otimizados para `public/marketing/`; o componente
`MarketingImage` fornece automaticamente o formato que o navegador suporta.

As molduras azuis e os cartões de apoio pertencem ao layout em
`src/marketing/landing-page.tsx`. Eles ficam em HTML/CSS de propósito: podem
ser ajustados sem recriar a imagem de baixo.
