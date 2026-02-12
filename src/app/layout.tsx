import type { Metadata, Viewport } from 'next';
import { Cabin } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import BugReportButton from '@/components/BugReportButton';
import './globals.css';

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
  metadataBase: new URL('https://prijimackynaskolu.cz'),
  title: {
    default: 'Najdi si svou střední školu a zjisti své šance | Přijímačky na střední školy',
    template: '%s | Přijímačky na střední školy',
  },
  description:
    'Zjistěte své šance na přijetí na střední školu. Simulátor využívá reálná data z jednotných přijímacích zkoušek 2024-2025 pro celou ČR.',
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
    url: 'https://prijimackynaskolu.cz',
    siteName: 'Přijímačky na školu',
    title: 'Vyhledávání středních škol, přijímačky a dojíždění',
    description:
      'Najděte si střední školu, zjistěte šance na přijetí a ověřte dostupnost dojíždění. Data z let 2024-2025.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vyhledávání středních škol, přijímačky a dojíždění',
    description:
      'Najděte si střední školu, zjistěte šance na přijetí a ověřte dostupnost dojíždění. Data z let 2024-2025.',
  },
  alternates: {
    canonical: 'https://prijimackynaskolu.cz',
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
