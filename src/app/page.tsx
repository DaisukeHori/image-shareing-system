'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import HelpTip from '@/components/HelpTip';

interface Image {
  id: string;
  original_filename: string;
  storage_path: string;
  folder: { id: string; name: string } | null;
}

interface ApprovalRequest {
  id: string;
  request_number: string;
  image: Image;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'downloaded';
  purpose: string;
  created_at: string;
  expires_at: string | null;
}

const statusLabels: Record<string, { text: string; class: string }> = {
  pending: { text: '承認待ち', class: 'bg-yellow-100 text-yellow-800' },
  approved: { text: 'ダウンロード可', class: 'bg-green-100 text-green-800' },
  rejected: { text: '却下', class: 'bg-red-100 text-red-800' },
  expired: { text: '期限切れ', class: 'bg-gray-100 text-gray-800' },
  downloaded: { text: 'DL済み', class: 'bg-blue-100 text-blue-800' },
};

export default function Home() {
  const { data: session } = useSession();
  const [images, setImages] = useState<Image[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'requests'>('images');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [imagesRes, requestsRes] = await Promise.all([
        fetch('/api/images'),
        fetch('/api/requests'),
      ]);

      const imagesData = await imagesRes.json();
      const requestsData = await requestsRes.json();

      if (imagesData.success) setImages(imagesData.data);
      if (requestsData.success) setMyRequests(requestsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedImage || !purpose.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: selectedImage.id,
          purpose: purpose.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedImage(null);
        setPurpose('');
        fetchData();
        setActiveTab('requests');
        alert('申請を送信しました。承認をお待ちください。');
      } else {
        alert(data.error || '申請に失敗しました');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('申請に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(requestId: string) {
    try {
      const res = await fetch(`/api/download/${requestId}`);
      const data = await res.json();

      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        fetchData();
      } else {
        alert(data.error || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('Failed to download:', error);
      alert('ダウンロードに失敗しました');
    }
  }

  function getImageUrl(storagePath: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">
              <span className="hidden sm:inline">レボル カットモデル画像管理システム</span>
              <span className="sm:hidden">画像管理</span>
            </h1>
            {/* デスクトップメニュー */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-600">{session?.user?.name}</span>
              {session?.user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  管理画面
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
            {/* モバイルメニュー */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 bg-white shadow-lg rounded-lg py-2 w-48 z-50">
                  <div className="px-4 py-2 text-sm text-gray-600 border-b">
                    {session?.user?.name}
                  </div>
                  {session?.user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                      onClick={() => setShowMenu(false)}
                    >
                      管理画面
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* タブ */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              activeTab === 'images'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            画像を選ぶ
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            申請履歴
            {myRequests.filter((r) => r.status === 'approved').length > 0 && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                {myRequests.filter((r) => r.status === 'approved').length}
              </span>
            )}
          </button>
          <HelpTip content="画像を選んで利用申請を送信します。承認後7日以内に1回だけダウンロードできます。ダウンロード画像には電子透かしが埋め込まれます。" />
        </div>

        {activeTab === 'images' ? (
          <>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              利用可能な画像
            </h2>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={getImageUrl(image.storage_path)}
                        alt={image.original_filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-900 truncate">
                        {image.original_filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {image.folder?.name || 'ルート'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                利用可能な画像がありません。
                <br />
                管理者にアクセス権限を申請してください。
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              申請履歴
            </h2>
            {myRequests.length > 0 ? (
              <>
                {/* モバイル用カードビュー */}
                <div className="sm:hidden space-y-3">
                  {myRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow p-3">
                      <div className="flex gap-3">
                        <img
                          src={getImageUrl(request.image.storage_path)}
                          alt=""
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {request.image.original_filename}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {request.purpose}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${statusLabels[request.status].class}`}
                            >
                              {statusLabels[request.status].text}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                          {request.status === 'approved' && request.expires_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              期限: {formatDate(request.expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      {request.status === 'approved' && (
                        <button
                          onClick={() => handleDownload(request.id)}
                          className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                        >
                          ダウンロード
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* デスクトップ用テーブルビュー */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          画像
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          利用目的
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ステータス
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          申請日
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {myRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center">
                              <img
                                src={getImageUrl(request.image.storage_path)}
                                alt=""
                                className="w-12 h-12 rounded object-cover"
                              />
                              <span className="ml-3 text-sm text-gray-500 max-w-[100px] lg:max-w-[150px] truncate">
                                {request.image.original_filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 max-w-[150px] lg:max-w-xs truncate">
                            {request.purpose}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded ${statusLabels[request.status].class}`}
                            >
                              {statusLabels[request.status].text}
                            </span>
                            {request.status === 'approved' && request.expires_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                期限: {formatDate(request.expires_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {request.status === 'approved' && (
                              <button
                                onClick={() => handleDownload(request.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                ダウンロード
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                申請履歴がありません
              </div>
            )}
          </>
        )}
      </main>

      {/* 申請モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              画像の利用申請
            </h2>
            <div className="mb-4">
              <img
                src={getImageUrl(selectedImage.storage_path)}
                alt={selectedImage.original_filename}
                className="w-full max-h-48 sm:max-h-64 object-contain bg-gray-100 rounded"
              />
              <p className="text-sm text-gray-500 mt-2 truncate">
                {selectedImage.original_filename}
              </p>
            </div>
            <form onSubmit={handleSubmitRequest}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  利用目的 *
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="例：店舗のSNS投稿用として使用します"
                  required
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                申請後、所属長または社長の承認が必要です。
                <br />
                承認後7日以内に1回のみダウンロード可能です。
                <br />
                ダウンロードした画像には電子透かしが入ります。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setPurpose('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !purpose.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {submitting ? '送信中...' : '申請する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* メニュー背景オーバーレイ */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
