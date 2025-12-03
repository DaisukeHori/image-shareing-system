'use client';

import { useEffect, useState } from 'react';
import HelpTip from '@/components/HelpTip';

interface Stats {
  totalUsers: number;
  totalImages: number;
  pendingRequests: number;
  approvedToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const pendingCount = stats?.pendingRequests ?? 0;

  return (
    <div>
      {/* 承認待ちがある場合のアラートバナー */}
      {pendingCount > 0 && (
        <a
          href="/admin/requests"
          className="block mb-6 p-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="font-bold text-lg">
                  {pendingCount}件の承認待ちがあります
                </p>
                <p className="text-sm text-yellow-100">
                  クリックして確認する →
                </p>
              </div>
            </div>
            <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      )}

      {/* ウェルカムセクション */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">管理ダッシュボード</h1>
        <p className="text-sm text-gray-500">今日も一日お疲れ様です。システムの状況をご確認ください。</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="ユーザー"
          value={stats?.totalUsers ?? 0}
          color="blue"
          icon="👥"
          href="/admin/users"
        />
        <StatCard
          title="画像"
          value={stats?.totalImages ?? 0}
          color="green"
          icon="📷"
          href="/admin/images"
        />
        <StatCard
          title="承認待ち"
          value={pendingCount}
          color="yellow"
          icon="⏳"
          href="/admin/requests"
          highlight={pendingCount > 0}
        />
        <StatCard
          title="本日承認"
          value={stats?.approvedToday ?? 0}
          color="purple"
          icon="✅"
        />
      </div>

      {/* メインアクションセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 今すぐやること */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📌</span> 今すぐやること
          </h2>
          <div className="space-y-3">
            {pendingCount > 0 ? (
              <a
                href="/admin/requests"
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {pendingCount}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">申請を承認する</p>
                    <p className="text-xs text-gray-500">ユーザーが待っています</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <span className="text-2xl">✨</span>
                <p className="text-sm text-green-700 font-medium mt-1">すべての申請を処理済み</p>
              </div>
            )}
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚡</span> クイックアクション
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/admin/users"
              title="ユーザー追加"
              icon="👤"
            />
            <QuickAction
              href="/admin/images"
              title="画像追加"
              icon="📷"
            />
            <QuickAction
              href="/admin/folders"
              title="フォルダ作成"
              icon="📁"
            />
            <QuickAction
              href="/admin/watermark"
              title="透かし検証"
              icon="🔍"
            />
          </div>
        </div>
      </div>

      {/* ヒントセクション */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">ヒント</h3>
            <p className="text-sm text-blue-700">
              各項目の<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-xs mx-1">?</span>
              マークをクリックすると、詳しい説明が表示されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  icon,
  href,
  highlight = false,
}: {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  icon?: string;
  href?: string;
  highlight?: boolean;
}) {
  const bgClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-purple-600',
  };

  const content = (
    <div className={`bg-white rounded-xl shadow-sm p-4 transition-all ${highlight ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-lg' : ''} ${href ? 'hover:shadow-md cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold bg-gradient-to-r ${bgClasses[color]} bg-clip-text text-transparent`}>
        {value.toLocaleString()}
      </p>
      {highlight && value > 0 && (
        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          要対応
        </p>
      )}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function QuickAction({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon?: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:shadow-sm transition-all group"
    >
      {icon && <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>}
      <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 text-center">{title}</p>
    </a>
  );
}
