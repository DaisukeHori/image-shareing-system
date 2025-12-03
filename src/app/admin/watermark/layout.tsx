import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '透かし検証',
  description: '画像に埋め込まれた電子透かしを検証し、ダウンロード履歴を確認します。',
};

export default function WatermarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
