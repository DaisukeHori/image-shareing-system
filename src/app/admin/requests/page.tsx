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
  requester_comment: string | null;
  approver_comment: string | null;
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
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<{ requestId: string; requestNumber: string; requesterComment: string | null } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ requestId: string; requestNumber: string; requesterComment: string | null } | null>(null);
  const [approverComment, setApproverComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [detailModal, setDetailModal] = useState<ApprovalRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);
  const [resultModal, setResultModal] = useState<{ type: 'approve' | 'reject'; requestNumber: string } | null>(null);
  const [confirmingDeletionId, setConfirmingDeletionId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [activeTab, statusFilter]);

  async function fetchRequests() {
    try {
      let url = '/api/admin/requests';
      const params = new URLSearchParams();

      if (activeTab === 'pending') {
        params.append('status', 'pending');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        // 履歴タブの場合はpending以外を表示
        if (activeTab === 'history' && !statusFilter) {
          setRequests(data.data.filter((r: ApprovalRequest) => r.status !== 'pending'));
        } else {
          setRequests(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDeletion(requestId: string) {
    setConfirmingDeletionId(requestId);
    try {
      const res = await fetch('/api/admin/requests/confirm-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || '確認に失敗しました');
      }
    } catch (error) {
      console.error('Confirm deletion error:', error);
      alert('確認に失敗しました');
    } finally {
      setConfirmingDeletionId(null);
    }
  }

  async function handleApproveSubmit() {
    if (!approveModal) return;

    setActionLoading(approveModal.requestId);
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: approveModal.requestId,
          action: 'approve',
          approverComment: approverComment.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultModal({ type: 'approve', requestNumber: approveModal.requestNumber });
        setApproveModal(null);
        setApproverComment('');
        fetchRequests();
      } else {
        alert(data.error || '承認に失敗しました');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('承認に失敗しました');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    setActionLoading(rejectModal.requestId);
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: rejectModal.requestId,
          action: 'reject',
          rejectionReason,
          approverComment: approverComment.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultModal({ type: 'reject', requestNumber: rejectModal.requestNumber });
        setRejectModal(null);
        setRejectionReason('');
        setApproverComment('');
        fetchRequests();
      } else {
        alert(data.error || '却下に失敗しました');
      }
    } catch (error) {
      console.error('Reject error:', error);
      alert('却下に失敗しました');
    } finally {
      setActionLoading(null);
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

  // 未処理の申請数をカウント
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">承認申請管理</h1>

        {/* タブ */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('pending'); setStatusFilter(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            承認待ち
            {activeTab !== 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('history'); setStatusFilter(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            履歴
          </button>
        </div>

        {/* 履歴タブの場合のみステータスフィルター表示 */}
        {activeTab === 'history' && (
          <div className="flex justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">すべての履歴</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
              <option value="expired">期限切れ</option>
              <option value="downloaded">ダウンロード済み</option>
            </select>
          </div>
        )}
      </div>

      {/* モバイル用カードビュー */}
      <div className="sm:hidden space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`bg-white shadow rounded-lg p-4 ${
              isExpiredUsage(request.usage_end_date) && request.status === 'downloaded' ? 'border-l-4 border-red-500' : ''
            }`}
          >
            <div className="flex gap-3 mb-3">
              <img
                src={getImageUrl(request.image.storage_path)}
                alt=""
                className="w-16 h-16 rounded object-cover flex-shrink-0 cursor-pointer"
                onClick={() => setPreviewImage({
                  url: getImageUrl(request.image.storage_path),
                  filename: request.image.original_filename
                })}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setDetailModal(request)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {request.request_number}
                  </button>
                  {request.requester_comment && (
                    <span className="text-blue-500" title="コメントあり">💬</span>
                  )}
                </div>
                <p className="text-sm text-gray-900">{request.user.name}</p>
                <p className="text-xs text-gray-500">{request.user.department?.name || '未所属'}</p>
              </div>
              <span className={`self-start px-2 py-1 text-xs rounded whitespace-nowrap ${statusLabels[request.status].class}`}>
                {statusLabels[request.status].text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <p className="text-xs text-gray-500">利用目的</p>
                <p className="text-gray-900">
                  {request.purpose_type ? purposeTypeLabels[request.purpose_type] : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">掲載終了日</p>
                <p className={`${isExpiredUsage(request.usage_end_date) ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                  {request.usage_end_date ? formatDateOnly(request.usage_end_date) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">申請日</p>
                <p className="text-gray-900">{formatDateOnly(request.created_at)}</p>
              </div>
              {request.approver && (
                <div>
                  <p className="text-xs text-gray-500">承認者</p>
                  <p className="text-gray-900">{request.approver.name}</p>
                </div>
              )}
            </div>

            {request.rejection_reason && (
              <div className="mb-3 p-2 bg-red-50 rounded text-xs text-red-600">
                却下理由: {request.rejection_reason}
              </div>
            )}

            {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && (
              <div className="mb-3 text-xs">
                {request.deletion_confirmed_user && request.deletion_confirmed_approver ? (
                  <span className="text-green-600">削除確認済</span>
                ) : (
                  <>
                    <span className="text-red-600 block mb-2">
                      {!request.deletion_confirmed_user && '本人未確認 '}
                      {!request.deletion_confirmed_approver && '承認者未確認'}
                    </span>
                    {!request.deletion_confirmed_approver && (
                      <button
                        onClick={() => handleConfirmDeletion(request.id)}
                        disabled={confirmingDeletionId === request.id}
                        className="w-full px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {confirmingDeletionId === request.id ? '確認中...' : '掲載終了を確認'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {request.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setApproveModal({
                      requestId: request.id,
                      requestNumber: request.request_number,
                      requesterComment: request.requester_comment,
                    });
                    setApproverComment('');
                  }}
                  disabled={actionLoading === request.id}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === request.id ? '処理中...' : '承認'}
                </button>
                <button
                  onClick={() => {
                    setRejectModal({
                      requestId: request.id,
                      requestNumber: request.request_number,
                      requesterComment: request.requester_comment,
                    });
                    setRejectionReason('');
                    setApproverComment('');
                  }}
                  disabled={actionLoading === request.id}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  却下
                </button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            申請がありません
          </div>
        )}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden sm:block bg-white shadow rounded-lg overflow-hidden">
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className={isExpiredUsage(request.usage_end_date) && request.status === 'downloaded' ? 'bg-red-50' : ''}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <button
                    onClick={() => setDetailModal(request)}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {request.request_number}
                  </button>
                  {request.requester_comment && (
                    <span className="ml-1 text-blue-500" title="コメントあり">💬</span>
                  )}
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
                      className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage({
                        url: getImageUrl(request.image.storage_path),
                        filename: request.image.original_filename
                      })}
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
                  {request.rejection_reason && (
                    <div className="text-xs text-red-500 mt-1" title={request.rejection_reason}>
                      理由: {request.rejection_reason.length > 20 ? request.rejection_reason.substring(0, 20) + '...' : request.rejection_reason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(request.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setApproveModal({
                            requestId: request.id,
                            requestNumber: request.request_number,
                            requesterComment: request.requester_comment,
                          });
                          setApproverComment('');
                        }}
                        disabled={actionLoading === request.id}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === request.id ? '処理中...' : '承認'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectModal({
                            requestId: request.id,
                            requestNumber: request.request_number,
                            requesterComment: request.requester_comment,
                          });
                          setRejectionReason('');
                          setApproverComment('');
                        }}
                        disabled={actionLoading === request.id}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        却下
                      </button>
                    </div>
                  )}
                  {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && !request.deletion_confirmed_approver && (
                    <button
                      onClick={() => handleConfirmDeletion(request.id)}
                      disabled={confirmingDeletionId === request.id}
                      className="px-3 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {confirmingDeletionId === request.id ? '確認中...' : '掲載終了確認'}
                    </button>
                  )}
                  {request.status !== 'pending' && !(request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && !request.deletion_confirmed_approver) && (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  申請がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 承認モーダル */}
      {approveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              申請を承認 - {approveModal.requestNumber}
            </h3>

            {approveModal.requesterComment && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-1">申請者からのコメント:</p>
                <p className="text-sm text-blue-900">{approveModal.requesterComment}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申請者へのコメント（任意）
              </label>
              <textarea
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900"
                rows={3}
                placeholder="承認に際して伝えたいことがあれば入力してください"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setApproveModal(null);
                  setApproverComment('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleApproveSubmit}
                disabled={actionLoading === approveModal.requestId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === approveModal.requestId ? '処理中...' : '承認する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 却下理由モーダル */}
      {rejectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              申請を却下 - {rejectModal.requestNumber}
            </h3>

            {rejectModal.requesterComment && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-1">申請者からのコメント:</p>
                <p className="text-sm text-blue-900">{rejectModal.requesterComment}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                却下理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-gray-900"
                rows={3}
                placeholder="却下理由を入力してください"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申請者へのコメント（任意）
              </label>
              <textarea
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-gray-900"
                rows={2}
                placeholder="却下理由以外に伝えたいことがあれば入力してください"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectionReason('');
                  setApproverComment('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.requestId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.requestId ? '処理中...' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {detailModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                申請詳細 - {detailModal.request_number}
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={getImageUrl(detailModal.image.storage_path)}
                  alt=""
                  className="w-20 h-20 rounded object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{detailModal.image.original_filename}</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${statusLabels[detailModal.status].class}`}>
                    {statusLabels[detailModal.status].text}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">申請者</p>
                  <p className="font-medium">{detailModal.user.name}</p>
                  <p className="text-xs text-gray-500">{detailModal.user.department?.name || '未所属'}</p>
                </div>
                <div>
                  <p className="text-gray-500">申請日時</p>
                  <p className="font-medium">{formatDate(detailModal.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">利用目的</p>
                  <p className="font-medium">
                    {detailModal.purpose_type ? purposeTypeLabels[detailModal.purpose_type] : '-'}
                  </p>
                  {detailModal.purpose_other && (
                    <p className="text-xs text-gray-500">{detailModal.purpose_other}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">掲載終了日</p>
                  <p className={`font-medium ${detailModal.usage_end_date && isExpiredUsage(detailModal.usage_end_date) ? 'text-red-600' : ''}`}>
                    {detailModal.usage_end_date ? formatDateOnly(detailModal.usage_end_date) : '-'}
                  </p>
                </div>
              </div>

              {detailModal.requester_comment && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">申請者からのコメント:</p>
                  <p className="text-sm text-blue-900">{detailModal.requester_comment}</p>
                </div>
              )}

              {detailModal.approver_comment && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">承認者からのコメント:</p>
                  <p className="text-sm text-green-900">{detailModal.approver_comment}</p>
                </div>
              )}

              {detailModal.rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-1">却下理由:</p>
                  <p className="text-sm text-red-900">{detailModal.rejection_reason}</p>
                </div>
              )}

              {detailModal.approver && (
                <div className="text-sm">
                  <p className="text-gray-500">承認者</p>
                  <p className="font-medium">{detailModal.approver.name}</p>
                  {detailModal.approved_at && (
                    <p className="text-xs text-gray-500">{formatDate(detailModal.approved_at)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 画像プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage.url}
              alt={previewImage.filename}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="mt-4 text-white text-sm text-center">{previewImage.filename}</p>
          </div>
        </div>
      )}

      {/* 承認/却下完了モーダル */}
      {resultModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              resultModal.type === 'approve' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {resultModal.type === 'approve' ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3 className={`text-lg font-bold mb-2 ${
              resultModal.type === 'approve' ? 'text-green-600' : 'text-red-600'
            }`}>
              {resultModal.type === 'approve' ? '承認しました' : '却下しました'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              申請番号 {resultModal.requestNumber} を
              {resultModal.type === 'approve' ? '承認' : '却下'}しました。
              <br />
              申請者に通知メールが送信されます。
            </p>
            <button
              onClick={() => setResultModal(null)}
              className={`w-full px-4 py-2 text-white rounded-lg text-sm ${
                resultModal.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
