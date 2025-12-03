import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '使い方ガイド',
  description: '画像管理システムの使い方を説明します。画像の申請からダウンロードまでの流れを確認できます。',
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
