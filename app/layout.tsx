import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Faro OS',
  description: 'Assistente executivo para vendedores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
