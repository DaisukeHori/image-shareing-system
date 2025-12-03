import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ファイル管理',
  description: 'フォルダの作成、画像・動画のアップロード・削除・権限設定を行います。',
};

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
