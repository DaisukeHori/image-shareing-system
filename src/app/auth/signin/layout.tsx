import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログイン',
  description: 'レボル画像管理システムにログインします。',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
