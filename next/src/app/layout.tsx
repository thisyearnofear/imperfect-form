import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
// Removed static import of network-elements.css in favor of dynamic loading

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Imperfect Form | Onchain Olympians",
  description:
    "Track your fitness with real-time pose detection and have fun competing onchain",
  // Note: favicon.ico is automatically handled by Next.js App Router
  // The favicon.ico file in this directory (src/app/) will be served at /favicon.ico
};

// Using static client component import for AppProviders
import { AppProviders } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Mobile-specific meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        
        {/* Dynamic CSS loading script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Only load network styles when needed
              function loadNetworkCSS() {
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
              }
              // Try to load immediately but also after DOM content loaded
              loadNetworkCSS();
              document.addEventListener('DOMContentLoaded', loadNetworkCSS);
            `,
          }}
        />
        {/* Extra styles to ensure modals have solid backgrounds */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* Force all modal backdrops to be solid black */
          .tw-connect-wallet-modal-overlay,
          [data-dialog-backdrop],
          [data-modal-backdrop],
          [data-overlay],
          [data-backdrop],
          .modal,
          .wallet-modal {
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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
