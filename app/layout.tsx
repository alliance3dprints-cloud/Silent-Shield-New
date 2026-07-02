// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://silentshield.app';
const description =
  'Silent Shield is a wearable NFC tag that gives first responders and good samaritans instant access to emergency contacts, medical information, and critical instructions — no app required.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Silent Shield — NFC Emergency ID',
    template: '%s · Silent Shield',
  },
  description,
  applicationName: 'Silent Shield',
  icons: {
    icon: '/silent-shield-logo.png',
    apple: '/silent-shield-logo.png',
    shortcut: '/silent-shield-logo.png',
  },
  openGraph: {
    title: 'Silent Shield — NFC Emergency ID',
    description,
    url: siteUrl,
    siteName: 'Silent Shield',
    images: [{ url: '/silent-shield-logo.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Silent Shield — NFC Emergency ID',
    description,
    images: ['/silent-shield-logo.png'],
  },
};

export const viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
