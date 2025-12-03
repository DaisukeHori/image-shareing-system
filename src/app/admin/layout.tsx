import type { Metadata } from 'next';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export const metadata: Metadata = {
  title: {
    default: '管理画面',
    template: '%s | 管理画面 | レボル 画像管理',
  },
  description: '画像管理システムの管理画面です。ユーザー管理、ファイル管理、申請承認を行います。',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
