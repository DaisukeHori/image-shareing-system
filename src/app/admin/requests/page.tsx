'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  department: { id: string; name: string } | null;
}

interface Image {
  id: string;
  original_filename: string;
  storage_path: string;
}

type PurposeType = 'hotpepper' | 'website' | 'sns' | 'print' | 'other';

interface ApprovalRequest {
  id: string;
  request_number: string;
  user: User;
  image: Image;
  purpose: string;
  purpose_type: PurposeType | null;
  purpose_other: string | null;
  usage_end_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'downloaded';
  approver: { id: string; name: string } | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  downloaded_at: string | null;
  deletion_confirmed_user: boolean;
  deletion_confirmed_approver: boolean;
  created_at: string;
}

const purposeTypeLabels: Record<PurposeType, string> = {
  hotpepper: 'ホットペッパー',
  website: 'HP/ブログ',
  sns: 'SNS',
  print: 'チラシ等',
  other: 'その他',
};

const statusLabels: Record<string, { text: string; class: string }> = {
  pending: { text: '承認待ち', class: 'bg-yellow-100 text-yellow-800' },
  approved: { text: '承認済み', class: 'bg-green-100 text-green-800' },
  rejected: { text: '却下', class: 'bg-red-100 text-red-800' },
  expired: { text: '期限切れ', class: 'bg-gray-100 text-gray-800' },
  downloaded: { text: 'ダウンロード済み', class: 'bg-blue-100 text-blue-800' },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  async function fetchRequests() {
    try {
      const url = statusFilter
        ? `/api/admin/requests?status=${statusFilter}`
        : '/api/admin/requests';

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('ja-JP');
  }

  function formatDateOnly(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP');
  }

  function isExpiredUsage(usageEndDate: string | null) {
    if (!usageEndDate) return false;
    return new Date(usageEndDate) < new Date();
  }

  function getImageUrl(storagePath: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">承認申請一覧</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">すべてのステータス</option>
          <option value="pending">承認待ち</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下</option>
          <option value="expired">期限切れ</option>
          <option value="downloaded">ダウンロード済み</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申請番号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申請者
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                画像
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                利用目的
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掲載終了日
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申請日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className={isExpiredUsage(request.usage_end_date) && request.status === 'downloaded' ? 'bg-red-50' : ''}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {request.request_number}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {request.user.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {request.user.department?.name || '未所属'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={getImageUrl(request.image.storage_path)}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                    <span className="ml-2 text-sm text-gray-500 max-w-[100px] truncate">
                      {request.image.original_filename}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {request.purpose_type ? purposeTypeLabels[request.purpose_type] : '-'}
                  </div>
                  {request.purpose_type === 'other' && request.purpose_other && (
                    <div className="text-xs text-gray-500 truncate max-w-[150px]" title={request.purpose_other}>
                      {request.purpose_other}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {request.usage_end_date ? (
                    <div className={`text-sm ${isExpiredUsage(request.usage_end_date) ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                      {formatDateOnly(request.usage_end_date)}
                      {isExpiredUsage(request.usage_end_date) && (
                        <span className="block text-xs">期限切れ</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                  {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && (
                    <div className="text-xs mt-1">
                      {request.deletion_confirmed_user && request.deletion_confirmed_approver ? (
                        <span className="text-green-600">削除確認済</span>
                      ) : (
                        <span className="text-red-600">
                          {!request.deletion_confirmed_user && '本人未確認 '}
                          {!request.deletion_confirmed_approver && '承認者未確認'}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${statusLabels[request.status].class}`}
                  >
                    {statusLabels[request.status].text}
                  </span>
                  {request.approver && (
                    <div className="text-xs text-gray-500 mt-1">
                      承認: {request.approver.name}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(request.created_at)}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  申請がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
