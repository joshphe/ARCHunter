import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arc-hunter-lake.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ARC Watch — Ecosystem Intelligence',
  description: 'Track ARC ecosystem projects, launchpad fees, and on-chain activity in one place.',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'ARC Watch',
    title: 'ARC Watch — Ecosystem Intelligence',
    description: 'Track ARC ecosystem projects, launchpad fees, and on-chain activity in one place.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ARC Watch — Ecosystem Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARC Watch — Ecosystem Intelligence',
    description: 'Track ARC ecosystem projects, launchpad fees, and on-chain activity in one place.',
    images: [{ url: '/opengraph-image', alt: 'ARC Watch — Ecosystem Intelligence' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
