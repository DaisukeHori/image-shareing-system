import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ユーザー管理',
  description: 'ユーザーの追加・編集・削除、権限設定を行います。',
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
