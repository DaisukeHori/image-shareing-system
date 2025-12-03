import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '所属管理',
  description: '所属（部署）の追加・編集・削除を行います。',
};

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
