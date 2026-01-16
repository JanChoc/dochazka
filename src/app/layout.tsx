import type { ReactNode } from 'react';
import './globals.css';

/**
 * Root layout for the application. Wraps all pages.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
