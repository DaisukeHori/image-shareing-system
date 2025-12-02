import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/common/SessionProvider';

export const metadata: Metadata = {
  title: 'レボル カットモデル画像管理システム',
  description: 'カットモデル画像の申請・承認システム',
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
