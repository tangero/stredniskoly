import type { Metadata, Viewport } from 'next';
import { Cabin } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import BugReportButton from '@/components/BugReportButton';
import './globals.css';
import { SITE_URL } from '@/lib/site.mjs';

const cabin = Cabin({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0074e4',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Najdi si svou střední školu | Přijímačky na střední školy',
    template: '%s | Přijímačky na střední školy',
  },
  description:
    'Prozkoumejte střední školy, obory a možnosti dojíždění. Kalendář přijímání 2027 a historické výsledky škol do roku 2026.',
  keywords: [
    'přijímací zkoušky',
    'střední škola',
    'gymnázium',
    'přijímačky',
    'simulátor',
    'JPZ',
    'CERMAT',
    'body',
    'šance na přijetí',
  ],
  authors: [{ name: 'Přijímačky na školu' }],
  creator: 'Přijímačky na školu',
  publisher: 'Přijímačky na školu',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: SITE_URL,
    siteName: 'Přijímačky na školu',
    title: 'Vyhledávání středních škol, přijímačky a dojíždění',
    description:
      'Najděte si střední školu a ověřte dojíždění. Kalendář přijímání 2027 a historické výsledky škol do roku 2026.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vyhledávání středních škol, přijímačky a dojíždění',
    description:
      'Najděte si střední školu a ověřte dojíždění. Kalendář přijímání 2027 a historické výsledky škol do roku 2026.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`antialiased min-h-screen ${cabin.className}`} style={{ backgroundColor: '#ffffff', color: '#28313b' }}>
        {children}
        <BugReportButton />
        <Analytics />
        <Script
          id="matomo-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var _paq = window._paq = window._paq || [];
              _paq.push(['trackPageView']);
              _paq.push(['enableLinkTracking']);
              (function() {
                var u="https://ma.hlidacstatu.cz/";
                _paq.push(['setTrackerUrl', u+'matomo.php']);
                _paq.push(['setSiteId', '7']);
                var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
