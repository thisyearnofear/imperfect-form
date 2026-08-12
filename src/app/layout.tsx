import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import '@/styles/studio-shell.css';
import '@/styles/curl-instrument.css';
import '@/styles/studio-card.css';
import '@/styles/session-recap.css';
import '@/styles/lab-analysis-card.css';
import '@/styles/studio-motion.css';
import '@/styles/studio-boot.css';
import '@/styles/recovery.css';
import '@/styles/animations.css';
import '@/styles/session-register.css';
import '@/styles/buttons.css';
import '@/styles/sandow-spine.css';
import { BRAND } from '@/lib/brandPositioning';
import ClientOnlyProviders from '@/components/providers/ClientOnlyProviders';

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const STUDIO_BG = '#061013';

/** Canonical production origin. Override per-deploy via NEXT_PUBLIC_SITE_URL. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = `${BRAND.name} — make one rep better with private camera coaching and a physical SO-101 coach`;

const SITE_DESCRIPTION =
  'Make one rep better with private camera coaching and a physical SO-101 coach that can show the correction.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} | Make one rep better`,
    template: `%s · ${BRAND.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name, url: SITE_URL }],
  creator: BRAND.name,
  publisher: BRAND.name,
  keywords: [
    'form coaching',
    'pose detection',
    'AI fitness coach',
    'AI exercise form coach',
    'camera coaching',
    'exercise form',
    'workout feedback',
    'physical AI',
    'MoveNet',
    'on-device pose',
    'private fitness',
    'Farcaster mini app',
    'onchain fitness',
  ],
  category: 'health-fitness',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '1024x1024', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: `${BRAND.name} | Make one rep better`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: BRAND.name,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    alternateLocale: ['en_GB'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ifdotfun',
    creator: '@ifdotfun',
    title: `${BRAND.name} | Make one rep better`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: STUDIO_BG },
    { media: '(prefers-color-scheme: light)', color: STUDIO_BG },
  ],
};

/** JSON-LD structured data for rich social + search results. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: BRAND.name,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires a camera and WebGL-capable browser.',
  image: OG_IMAGE,
  icon: `${SITE_URL}/icon.png`,
  screenshot: OG_IMAGE,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'On-device pose detection (no video upload)',
    'Real-time rep counting and form scoring',
    'AI coaching personas',
    'Path into physical AI demonstration',
    'Farcaster mini app',
  ],
  publisher: {
    '@type': 'Organization',
    name: BRAND.name,
    url: SITE_URL,
    sameAs: ['https://x.com/ifdotfun', 'https://twitter.com/ifdotfun'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* Press Start kept for earned Arcade register only — not the default shell */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        {/* viewport, theme-color, apple-web-app, format-detection, icons, manifest
            and canonical are emitted by the `metadata` + `viewport` exports above. */}

        {/* Farcaster Frame + Mini App launch metadata */}
        <meta
          name="fc:frame"
          content={`{"version":"next","imageUrl":"${SITE_URL}/og-image.png","button":{"title":"Start coaching","action":{"type":"launch_frame","name":"Imperfect Form","url":"${SITE_URL}","splashImageUrl":"${SITE_URL}/splash.png","splashBackgroundColor":"${STUDIO_BG}"}}}`}
        />
        <meta
          name="fc:miniapp"
          content={`{"version":"1","imageUrl":"${SITE_URL}/og-image.png","button":{"title":"Start coaching","action":{"type":"launch_frame","name":"Imperfect Form","url":"${SITE_URL}","splashImageUrl":"${SITE_URL}/splash.png","splashBackgroundColor":"${STUDIO_BG}"}}}`}
        />

        {/* Structured data for rich social + search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Set data-shell synchronously before any theme context mounts:
                // day-0 (studio) must own the page chrome so ChainThemeContext's
                // debounced apply (100ms) skips painting chain colours over it.
                // Mirrors the synchronous getHasTrained() read in page.tsx.
                try {
                  var hasTrained = window.localStorage.getItem('imf_hasTrained') === '1';
                  document.documentElement.setAttribute('data-shell', hasTrained ? 'earned' : 'studio');
                } catch (e) {}

                function loadNetworkCSS() {
                  try {
                    if (
                      localStorage.getItem('selectedNetwork') === 'monad' ||
                      localStorage.getItem('selectedNetwork') === 'celo' ||
                      localStorage.getItem('selectedWalletProvider') === 'signature'
                    ) {
                      var link = document.createElement('link');
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
