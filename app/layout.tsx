// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Silent Shield',
  description: 'NFC emergency info shield',
  icons: {
    icon: '/next.svg', // reuse existing icon so we don’t get favicon errors
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
