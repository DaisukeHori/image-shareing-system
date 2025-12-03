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

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <HelpTip
          title="管理画面の概要"
          content="システム全体の状況を確認できます。承認待ちがある場合は早めに対応してください。"
          highlight
        />
      </div>
      <p className="text-sm text-gray-500 mb-6">システム全体の状況を一目で確認できます</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="登録ユーザー数"
          value={stats?.totalUsers ?? 0}
          color="blue"
          description="システムに登録されているユーザーの総数"
        />
        <StatCard
          title="登録画像数"
          value={stats?.totalImages ?? 0}
          color="green"
          description="アップロードされた画像・動画の総数"
        />
        <StatCard
          title="承認待ち"
          value={stats?.pendingRequests ?? 0}
          color="yellow"
          description="ユーザーからの申請で未処理のもの"
          highlight={stats?.pendingRequests ? stats.pendingRequests > 0 : false}
        />
        <StatCard
          title="本日の承認"
          value={stats?.approvedToday ?? 0}
          color="purple"
          description="今日承認された申請の件数"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            クイックアクション
          </h2>
          <HelpTip
            content="よく使う機能にすぐアクセスできます。各項目をクリックすると該当ページに移動します。"
            size="sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            href="/admin/users"
            title="ユーザー追加"
            description="新しいスタッフを登録"
            icon="👤"
          />
          <QuickAction
            href="/admin/images"
            title="画像アップロード"
            description="カットモデル画像を追加"
            icon="📷"
          />
          <QuickAction
            href="/admin/requests"
            title="承認申請確認"
            description="保留中の申請を確認"
            icon="📋"
          />
        </div>
      </div>

      {/* ヒントセクション */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">管理のヒント</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 承認待ちの申請は早めに対応しましょう</li>
              <li>• 掲載期限が切れた申請は定期的に確認してください</li>
              <li>• 不明な点はページ内の<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-xs mx-1">?</span>マークをクリックしてください</li>
            </ul>
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
  description,
  highlight = false,
}: {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  description?: string;
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 transition-all ${highlight ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500">{title}</p>
        {description && (
          <HelpTip content={description} size="sm" />
        )}
      </div>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
      {highlight && value > 0 && (
        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          対応が必要です
        </p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all hover:shadow-md group"
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>}
        <div>
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </a>
  );
}
