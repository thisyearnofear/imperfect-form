import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import '@/styles/studio-shell.css';
import '@/styles/studio-card.css';
import '@/styles/session-recap.css';
import '@/styles/lab-analysis-card.css';
import '@/styles/studio-motion.css';
import '@/styles/studio-boot.css';
import '@/styles/animations.css';
import '@/styles/session-register.css';
import '@/styles/buttons.css';
import { BRAND } from '@/lib/brandPositioning';
import ClientOnlyProviders from '@/components/providers/ClientOnlyProviders';

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: `${BRAND.name} | Move better`,
  description: BRAND.tagline,
  openGraph: {
    title: `${BRAND.name} | Move better`,
    description: BRAND.tagline,
    url: 'https://imperfectform.fun',
    siteName: BRAND.name,
    images: [
      {
        url: 'https://imperfectform.fun/embed.png',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — private camera coaching with a path into physical AI`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} | Move better`,
    description: BRAND.tagline,
    images: ['https://imperfectform.fun/embed.png'],
  },
};

const STUDIO_BG = '#061013';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        {/* Press Start kept for earned Arcade register only — not the default shell */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content={STUDIO_BG} />

        <meta
          name="fc:frame"
          content={`{"version":"next","imageUrl":"https://imperfectform.fun/embed.png","button":{"title":"Start coaching","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://imperfectform.fun","splashImageUrl":"https://imperfectform.fun/splash.png","splashBackgroundColor":"${STUDIO_BG}"}}}`}
        />
        <meta
          name="fc:miniapp"
          content={`{"version":"1","imageUrl":"https://imperfectform.fun/embed.png","button":{"title":"Start coaching","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://imperfectform.fun","splashImageUrl":"https://imperfectform.fun/splash.png","splashBackgroundColor":"${STUDIO_BG}"}}}`}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                function loadNetworkCSS() {
                  try {
                    if (
                      localStorage.getItem('selectedNetwork') === 'monad' ||
                      localStorage.getItem('selectedNetwork') === 'celo' ||
                      localStorage.getItem('selectedWalletProvider') === 'signature'
                    ) {
                      const link = document.createElement('link');
                      link.rel = 'stylesheet';
                      link.href = '/network-elements.css';
                      document.head.appendChild(link);
                    }
                  } catch (e) {}
                }
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', loadNetworkCSS);
                } else {
                  loadNetworkCSS();
                }
              }
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          html, body {
            background-color: ${STUDIO_BG};
            color: #effcf9;
          }
          .tw-connect-wallet-modal-overlay:not([style*="display: none"]),
          [data-dialog-backdrop]:not([style*="display: none"]),
          [data-modal-backdrop]:not([style*="display: none"]),
          [data-overlay]:not([style*="display: none"]),
          [data-backdrop]:not([style*="display: none"]),
          .modal:not([style*="display: none"]),
          .wallet-modal:not([style*="display: none"]) {
            background-color: rgb(0, 0, 0) !important;
            --tw-bg-opacity: 1 !important;
          }
          [role="dialog"]:not([aria-labelledby]) {
            position: relative;
          }
          [role="dialog"]:not([aria-labelledby])::before {
            content: "Dialog Title";
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
        `,
          }}
        />
      </head>
      <body className={`${manrope.className} antialiased`}>
        <ClientOnlyProviders>{children}</ClientOnlyProviders>
      </body>
    </html>
  );
}
