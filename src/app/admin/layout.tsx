'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const navigation = [
  { name: 'ダッシュボード', href: '/admin', icon: '📊' },
  { name: '所属管理', href: '/admin/departments', icon: '🏢' },
  { name: 'ユーザー管理', href: '/admin/users', icon: '👥' },
  { name: 'フォルダ管理', href: '/admin/folders', icon: '📁' },
  { name: 'ファイル管理', href: '/admin/images', icon: '🖼️' },
  { name: '承認申請一覧', href: '/admin/requests', icon: '📋' },
  { name: '透かし検証', href: '/admin/watermark', icon: '🔍' },
  { name: '使い方ガイド', href: '/admin/guide', icon: '📖' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* モバイル用オーバーレイ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ヘッダー */}
      <header className="bg-white shadow sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* ハンバーガーメニュー（モバイル用） */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
                aria-label="メニューを開く"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <Link href="/admin" className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                レボル 画像管理
              </Link>
              <span className="hidden sm:inline px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                管理画面
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-sm text-gray-600">
                {session?.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <nav
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-0
            w-64 bg-white shadow-lg lg:shadow-sm
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            pt-14 sm:pt-16 lg:pt-0
            overflow-y-auto
          `}
        >
          <div className="p-4">
            {/* モバイル用：ユーザー名表示 */}
            <div className="lg:hidden mb-4 pb-4 border-b">
              <span className="text-sm text-gray-600">{session?.user?.name}</span>
            </div>
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="p-4 border-t">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="block px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ← ユーザー画面へ
            </Link>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
