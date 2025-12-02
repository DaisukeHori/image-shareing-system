'use client';

import { useState, useRef } from 'react';

interface WatermarkInfo {
  downloaderName: string;
  approverName: string;
  requestId: string;
  downloadDate: string;
}

interface RequestInfo {
  id: string;
  request_number: string;
  purpose: string;
  status: string;
  created_at: string;
  downloaded_at: string | null;
  user: {
    name: string;
    email: string;
    department: { name: string } | null;
  };
  image: {
    original_filename: string;
  };
  approver: {
    name: string;
  } | null;
}

interface VerifyResult {
  found: boolean;
  message?: string;
  watermark?: WatermarkInfo;
  request?: RequestInfo | null;
}

export default function WatermarkVerifyPage() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // プレビュー表示
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/watermark/verify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert(data.error || '検証に失敗しました');
      }
    } catch (error) {
      console.error('Verify failed:', error);
      alert('検証に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('ja-JP');
  }

  function reset() {
    setResult(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">電子透かし検証</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          画像の透かしを検証
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          ダウンロードされた画像をアップロードすると、埋め込まれた電子透かし情報を読み取って、誰がいつダウンロードしたかを確認できます。
        </p>

        <div className="flex items-center gap-4">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            画像を選択
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {previewUrl && (
            <button
              onClick={reset}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-gray-500">検証中...</div>
        </div>
      )}

      {previewUrl && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* プレビュー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              アップロードした画像
            </h3>
            <img
              src={previewUrl}
              alt="検証対象の画像"
              className="w-full rounded-lg"
            />
          </div>

          {/* 結果 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              検証結果
            </h3>

            {result?.found ? (
              <div className="space-y-6">
                {/* 透かし情報 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">
                    電子透かしを検出しました
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="w-28 text-gray-500">ダウンロード者:</dt>
                      <dd className="font-medium text-gray-900">
                        {result.watermark?.downloaderName}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-28 text-gray-500">承認者:</dt>
                      <dd className="font-medium text-gray-900">
                        {result.watermark?.approverName}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-28 text-gray-500">申請番号:</dt>
                      <dd className="font-medium text-gray-900">
                        {result.watermark?.requestId}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-28 text-gray-500">ダウンロード日時:</dt>
                      <dd className="font-medium text-gray-900">
                        {result.watermark?.downloadDate}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 詳細な申請情報 */}
                {result.request && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">
                      申請詳細情報
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="w-28 text-gray-500">申請者名:</dt>
                        <dd className="text-gray-900">
                          {result.request.user.name}
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="w-28 text-gray-500">メール:</dt>
                        <dd className="text-gray-900">
                          {result.request.user.email}
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="w-28 text-gray-500">所属:</dt>
                        <dd className="text-gray-900">
                          {result.request.user.department?.name || '未所属'}
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="w-28 text-gray-500">元画像:</dt>
                        <dd className="text-gray-900">
                          {result.request.image.original_filename}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-gray-500 mb-1">利用目的:</dt>
                        <dd className="text-gray-900 bg-white p-2 rounded border">
                          {result.request.purpose}
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="w-28 text-gray-500">申請日:</dt>
                        <dd className="text-gray-900">
                          {formatDate(result.request.created_at)}
                        </dd>
                      </div>
                      {result.request.downloaded_at && (
                        <div className="flex">
                          <dt className="w-28 text-gray-500">DL日時:</dt>
                          <dd className="text-gray-900">
                            {formatDate(result.request.downloaded_at)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">
                  電子透かしが見つかりません
                </h4>
                <p className="text-sm text-yellow-700">
                  {result?.message ||
                    'この画像には電子透かしが埋め込まれていないか、このシステム以外で作成された可能性があります。'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使い方 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">使い方</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>
            検証したい画像（システムからダウンロードされた画像）を選択します
          </li>
          <li>システムが自動的に電子透かしの有無を検証します</li>
          <li>
            透かしが見つかった場合、ダウンロードした人、承認者、日時などの情報が表示されます
          </li>
          <li>
            透かしが見つからない場合、その画像はこのシステムからダウンロードされたものではない可能性があります
          </li>
        </ol>
      </div>
    </div>
  );
}
