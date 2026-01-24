import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#667eea',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://stredniskoly.vercel.app'),
  title: {
    default: 'Simulátor přijímacích zkoušek na SŠ | Zjisti své šance',
    template: '%s | Přijímačky na SŠ',
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
  authors: [{ name: 'Simulátor přijímacích zkoušek' }],
  creator: 'Simulátor přijímacích zkoušek',
  publisher: 'Simulátor přijímacích zkoušek',
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
    url: 'https://stredniskoly.vercel.app',
    siteName: 'Simulátor přijímacích zkoušek',
    title: 'Simulátor přijímacích zkoušek na SŠ',
    description:
      'Zjistěte své šance na přijetí na střední školu. Data z let 2024-2025.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Simulátor přijímacích zkoušek na střední školy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulátor přijímacích zkoušek na SŠ',
    description:
      'Zjistěte své šance na přijetí na střední školu. Data z let 2024-2025.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://stredniskoly.vercel.app',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
