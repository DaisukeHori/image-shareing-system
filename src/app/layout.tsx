import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/common/SessionProvider';

export const metadata: Metadata = {
  title: {
    default: 'レボル 画像管理システム',
    template: '%s | レボル 画像管理',
  },
  description: 'カットモデル画像の申請・承認・管理を行うシステムです。安全な画像共有と透かし機能で不正利用を防止します。',
  keywords: ['画像管理', 'カットモデル', '申請システム', '承認システム', 'レボル'],
  authors: [{ name: 'レボル' }],
  creator: 'レボル',
  publisher: 'レボル',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // icons are auto-generated from icon.tsx and apple-icon.tsx
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'レボル 画像管理',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'レボル 画像管理システム',
    title: 'レボル 画像管理システム',
    description: 'カットモデル画像の申請・承認・管理を行うシステムです。',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
