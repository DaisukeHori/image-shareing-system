import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理者ガイド',
  description: '管理者向けのシステム運用ガイドです。ユーザー管理、権限設定、申請承認の方法を説明します。',
};

export default function AdminGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
