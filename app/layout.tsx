import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ARC Watch — Ecosystem Intelligence', description: 'A real-time view of the ARC ecosystem.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
