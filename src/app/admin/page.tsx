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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      <div className="space-y-6 animate-pulse">
        {/* スケルトンローディング */}
        <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shadow-sm">
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-white rounded-2xl shadow-sm" />
          <div className="h-48 bg-white rounded-2xl shadow-sm" />
        </div>
      </div>
    );
  }

  const pendingCount = stats?.pendingRequests ?? 0;
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'おはようございます' : currentHour < 18 ? 'こんにちは' : 'お疲れ様です';

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* 承認待ちがある場合のアラートバナー - グラスモーフィズム */}
      {pendingCount > 0 && (
        <a
          href="/admin/requests"
          className="group block relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                    <span className="text-3xl">📋</span>
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                    {pendingCount}
                  </span>
                </div>
                <div className="text-white">
                  <p className="font-bold text-xl tracking-tight">
                    {pendingCount}件の承認待ち
                  </p>
                  <p className="text-sm text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    ユーザーが承認を待っています
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 group-hover:bg-white/30 transition-colors">
                <span className="text-white font-medium text-sm">確認する</span>
                <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </a>
      )}

      {/* ウェルカムセクション - モダンデザイン */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-slate-400 text-sm mb-1">{greeting}</p>
          <h1 className="text-2xl font-bold mb-2">管理ダッシュボード</h1>
          <p className="text-slate-300 text-sm">システム全体の状況を一目で確認できます</p>
        </div>
      </div>

      {/* 統計カード - 3Dエフェクト */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="ユーザー"
          value={stats?.totalUsers ?? 0}
          color="blue"
          icon="👥"
          href="/admin/users"
          description="登録済みユーザー"
          delay={0}
        />
        <StatCard
          title="ファイル"
          value={stats?.totalImages ?? 0}
          color="emerald"
          icon="📁"
          href="/admin/images"
          description="アップロード済み"
          delay={100}
        />
        <StatCard
          title="承認待ち"
          value={pendingCount}
          color="amber"
          icon="⏳"
          href="/admin/requests"
          highlight={pendingCount > 0}
          description={pendingCount > 0 ? "対応が必要です" : "すべて完了"}
          delay={200}
        />
        <StatCard
          title="本日承認"
          value={stats?.approvedToday ?? 0}
          color="violet"
          icon="✅"
          description="今日の実績"
          delay={300}
        />
      </div>

      {/* メインアクションセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今すぐやること - カード改善 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">📌</span>
              今すぐやること
            </h2>
          </div>
          <div className="p-5">
            {pendingCount > 0 ? (
              <a
                href="/admin/requests"
                className="group flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {pendingCount}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">申請を承認する</p>
                    <p className="text-xs text-gray-500 mt-0.5">ユーザーが承認を待っています</p>
                  </div>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow group-hover:shadow-md group-hover:bg-amber-500 transition-all">
                  <svg className="w-5 h-5 text-amber-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </a>
            ) : (
              <div className="relative p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 text-center overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">✨</span>
                  </div>
                  <p className="font-bold text-emerald-800">すべて完了!</p>
                  <p className="text-sm text-emerald-600 mt-1">未処理の申請はありません</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* クイックアクション - ホバーエフェクト改善 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">⚡</span>
              クイックアクション
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                href="/admin/users"
                title="ユーザー管理"
                subtitle="追加・編集"
                icon="👤"
                color="blue"
              />
              <QuickAction
                href="/admin/images"
                title="ファイル管理"
                subtitle="アップロード"
                icon="📁"
                color="emerald"
              />
              <QuickAction
                href="/admin/requests"
                title="申請一覧"
                subtitle="承認・却下"
                icon="📋"
                color="amber"
              />
              <QuickAction
                href="/admin/watermark"
                title="透かし検証"
                subtitle="不正調査"
                icon="🔍"
                color="violet"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 使い方ガイド */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">📖</span>
            管理者ガイド
          </h2>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: 1,
                icon: '👤',
                title: 'ユーザー登録',
                desc: 'まずユーザーを追加します',
                href: '/admin/users'
              },
              {
                step: 2,
                icon: '📁',
                title: 'フォルダ作成',
                desc: '画像を整理するフォルダを作成',
                href: '/admin/folders'
              },
              {
                step: 3,
                icon: '🖼️',
                title: 'ファイル追加',
                desc: '画像・動画をアップロード',
                href: '/admin/images'
              },
              {
                step: 4,
                icon: '✅',
                title: '申請を承認',
                desc: 'ユーザーの申請を処理',
                href: '/admin/requests'
              },
            ].map((item) => (
              <a
                key={item.step}
                href={item.href}
                className="group relative block"
              >
                <div className="bg-gray-50 rounded-xl p-4 text-center h-full hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* システムステータス */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="font-medium text-gray-900">システム正常稼働中</p>
              <p className="text-xs text-gray-500">すべてのサービスが正常に動作しています</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">最終更新</p>
            <p className="text-sm font-medium text-gray-600">{new Date().toLocaleTimeString('ja-JP')}</p>
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
  description,
  delay = 0,
}: {
  title: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber' | 'violet';
  icon?: string;
  href?: string;
  highlight?: boolean;
  description?: string;
  delay?: number;
}) {
  const colorConfig = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      ring: 'ring-blue-400',
    },
    emerald: {
      bg: 'from-emerald-500 to-emerald-600',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      ring: 'ring-emerald-400',
    },
    amber: {
      bg: 'from-amber-500 to-orange-500',
      light: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      ring: 'ring-amber-400',
    },
    violet: {
      bg: 'from-violet-500 to-purple-600',
      light: 'bg-violet-50',
      text: 'text-violet-600',
      border: 'border-violet-200',
      ring: 'ring-violet-400',
    },
  };

  const config = colorConfig[color];

  const content = (
    <div
      className={`group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-all duration-300 ${
        highlight ? `ring-2 ${config.ring} ring-offset-2 shadow-lg` : ''
      } ${href ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 背景デコレーション */}
      <div className={`absolute top-0 right-0 w-20 h-20 ${config.light} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 ${config.light} rounded-xl flex items-center justify-center`}>
            {icon && <span className="text-xl">{icon}</span>}
          </div>
          {href && (
            <svg className={`w-5 h-5 text-gray-300 group-hover:${config.text} group-hover:translate-x-1 transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>

        <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
        <p className={`text-3xl font-bold bg-gradient-to-r ${config.bg} bg-clip-text text-transparent`}>
          {value.toLocaleString()}
        </p>

        {description && (
          <p className={`text-xs mt-2 ${highlight && value > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            {highlight && value > 0 && (
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-1" />
            )}
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <a href={href} className="block">{content}</a>;
  }
  return content;
}

function QuickAction({
  href,
  title,
  subtitle,
  icon,
  color,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
  color: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const colorConfig = {
    blue: {
      hover: 'hover:bg-blue-50 hover:border-blue-200',
      iconBg: 'group-hover:bg-blue-100',
      text: 'group-hover:text-blue-600',
    },
    emerald: {
      hover: 'hover:bg-emerald-50 hover:border-emerald-200',
      iconBg: 'group-hover:bg-emerald-100',
      text: 'group-hover:text-emerald-600',
    },
    amber: {
      hover: 'hover:bg-amber-50 hover:border-amber-200',
      iconBg: 'group-hover:bg-amber-100',
      text: 'group-hover:text-amber-600',
    },
    violet: {
      hover: 'hover:bg-violet-50 hover:border-violet-200',
      iconBg: 'group-hover:bg-violet-100',
      text: 'group-hover:text-violet-600',
    },
  };

  const config = colorConfig[color];

  return (
    <a
      href={href}
      className={`group flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-transparent ${config.hover} transition-all duration-200`}
    >
      <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${config.iconBg} transition-colors`}>
        {icon && <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>}
      </div>
      <div>
        <p className={`text-sm font-semibold text-gray-700 ${config.text} transition-colors`}>{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </a>
  );
}
