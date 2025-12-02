'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface DeletionInfo {
  request_number: string;
  usage_end_date: string;
  image_name: string;
  user_name: string;
  alreadyConfirmed: boolean;
  bothConfirmed: boolean;
}

function ConfirmDeletionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const role = searchParams.get('role');

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<DeletionInfo | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token || !role) {
      setError('無効なリンクです。');
      setLoading(false);
      return;
    }

    fetchInfo();
  }, [token, role]);

  async function fetchInfo() {
    try {
      const res = await fetch(`/api/confirm-deletion?token=${token}&role=${role}`);
      const data = await res.json();

      if (data.success) {
        setInfo(data.data);
        if (data.data.alreadyConfirmed) {
          setConfirmed(true);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!token || !role) return;

    setConfirming(true);

    try {
      const res = await fetch('/api/confirm-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role }),
      });

      const data = await res.json();

      if (data.success) {
        setConfirmed(true);
        // 情報を再取得
        fetchInfo();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('確認処理に失敗しました');
    } finally {
      setConfirming(false);
    }
  }

  const roleLabel = role === 'user' ? '申請者' : '承認者';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {confirmed ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-4">
              削除確認完了
            </h1>
            <p className="text-gray-600 text-center mb-6">
              {roleLabel}としての削除確認が完了しました。
            </p>
            {info.bothConfirmed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-medium">
                  申請者と承認者の両方が削除を確認しました。
                </p>
                <p className="text-green-600 text-sm mt-1">
                  この案件の削除手続きは完了です。
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800 font-medium">
                  {role === 'user' ? '承認者' : '申請者'}の確認を待っています。
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
              レンタルフォト削除確認
            </h1>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">申請番号</p>
                <p className="text-gray-900 font-medium">{info.request_number}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">ファイル名</p>
                <p className="text-gray-900 font-medium">{info.image_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">申請者</p>
                <p className="text-gray-900 font-medium">{info.user_name}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600 mb-1">掲載終了日</p>
                <p className="text-red-700 font-bold">
                  {new Date(info.usage_end_date).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                掲載終了日を過ぎています。以下のデータを削除したことを確認してください：
              </p>
              <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
                <li>パソコン内のデータ</li>
                <li>スマートフォン内のデータ</li>
                <li>クラウドストレージ</li>
                <li>SNSの下書き</li>
                <li>その他の保存場所</li>
              </ul>
            </div>

            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? '処理中...' : '削除を確認しました'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              確認ボタンを押すと、{roleLabel}として削除確認が記録されます。
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmDeletionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <ConfirmDeletionContent />
    </Suspense>
  );
}
