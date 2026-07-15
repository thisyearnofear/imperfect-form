import type { Metadata } from 'next';
import { Press_Start_2P } from 'next/font/google';
import './globals.css';
import '@/styles/animations.css';
import '@/styles/session-register.css';
import { BRAND } from '@/lib/brandPositioning';
// Removed static import of network-elements.css in favor of dynamic loading

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
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

// Using client-only providers to prevent SSR issues
import ClientOnlyProviders from '@/components/providers/ClientOnlyProviders';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        {/* Mobile-specific meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />

        {/* Farcaster Mini App Frame metadata - Latest v1 standard */}
        <meta
          name="fc:frame"
          content='{"version":"next","imageUrl":"https://imperfectform.fun/embed.png","button":{"title":"Start Workout","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://imperfectform.fun","splashImageUrl":"https://imperfectform.fun/splash.png","splashBackgroundColor":"#000000"}}}'
        />

        {/* Mini App specific metadata - Current standard */}
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://imperfectform.fun/embed.png","button":{"title":"Start Workout","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://imperfectform.fun","splashImageUrl":"https://imperfectform.fun/splash.png","splashBackgroundColor":"#000000"}}}'
        />

        {/* Dynamic CSS loading script - client-side only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Only load network styles when needed - client-side only
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
                  } catch (e) {
                    // Silently fail if localStorage is not available
                  }
                }
                // Load after DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', loadNetworkCSS);
                } else {
                  loadNetworkCSS();
                }
              }
            `,
          }}
        />
        {/* Modal styling - only target specific wallet modals when actually open */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* Only apply backdrop styles when modals are explicitly open */
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

          /* Fix for Radix UI Dialog accessibility warning */
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
      <body className={`${pressStart2P.className} antialiased`}>
        <ClientOnlyProviders>{children}</ClientOnlyProviders>
      </body>
    </html>
  );
}
