import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({ weight: ['300', '400', '500', '700'], subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LinguaFuse Mixer',
  description: 'Translate dialogue in audio while preserving the background music.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className={`${roboto.className} min-h-screen bg-slate-950 text-white`}>{children}</body>
    </html>
  );
}
