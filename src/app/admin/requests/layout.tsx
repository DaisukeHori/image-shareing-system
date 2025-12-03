import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '承認申請一覧',
  description: 'ユーザーからの画像ダウンロード申請を確認・承認・却下します。',
};

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
