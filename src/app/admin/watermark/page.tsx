'use client';

import { useState, useRef } from 'react';
import HelpTip from '@/components/HelpTip';

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
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 透かしデータは画像の最初の数百ピクセルにのみ埋め込まれているため、
   * 大きな画像でも上部400行だけを切り取って送信することでサイズを削減
   */
  async function extractWatermarkRegion(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // 透かしデータは画像の上部に埋め込まれている
        // 400行あれば十分（透かしデータは通常数百バイト程度）
        const WATERMARK_ROWS = 400;
        const cropHeight = Math.min(WATERMARK_ROWS, img.height);

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = cropHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 画像の上部だけを描画
        ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);

        // PNGとしてエクスポート（無損失圧縮で透かしを保持）
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png'
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // プレビュー表示
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setLoading(true);

    try {
      // 大きな画像の場合、透かし領域だけを抽出して送信
      // これにより12MBの画像でも数百KBに削減可能
      let fileToSend: Blob = file;

      if (file.size > 2 * 1024 * 1024) { // 2MB以上の場合は切り取り
        try {
          fileToSend = await extractWatermarkRegion(file);
          console.log(`Image cropped: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(fileToSend.size / 1024).toFixed(0)}KB`);
        } catch (cropError) {
          console.warn('Failed to crop image, using original:', cropError);
          // 切り取りに失敗した場合は元のファイルを使用
        }
      }

      const formData = new FormData();
      formData.append('file', fileToSend, file.name);

      const res = await fetch('/api/admin/watermark/verify', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        // HTTPエラーの場合
        let errorMessage = `サーバーエラー (${res.status})`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSONパースに失敗した場合はステータスコードを表示
        }
        setErrorModal(errorMessage);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setErrorModal(data.error || '検証に失敗しました。画像形式をご確認ください。');
      }
    } catch (error) {
      console.error('Verify failed:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setErrorModal(`検証に失敗しました: ${errorMessage}`);
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
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
            <span className="text-3xl">🔍</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">電子透かし検証</h1>
              <HelpTip
                title="電子透かしとは？"
                content="ダウンロードした画像には、目に見えない電子透かしが埋め込まれます。この機能で透かしを読み取り、誰がいつダウンロードしたかを確認できます。"
                highlight
              />
            </div>
            <p className="text-white/80 text-sm">画像の不正利用を調査できます</p>
          </div>
        </div>
      </div>

      {/* アップロードセクション */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <span className="text-xl">📤</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              画像の透かしを検証
            </h2>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <HelpTip
                content="PNG形式のままアップロードしてください。JPEG変換やリサイズをすると透かしが失われます。"
                size="sm"
              />
              PNG形式推奨
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          ダウンロードされた画像をアップロードすると、埋め込まれた電子透かし情報を読み取り、
          <span className="font-medium text-gray-900">誰がいつダウンロードしたか</span>を確認できます。
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 cursor-pointer font-medium">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
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
              className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-violet-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-700 font-medium">検証中...</p>
          <p className="text-sm text-gray-500 mt-1">電子透かしを解析しています</p>
        </div>
      )}

      {previewUrl && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* プレビュー */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🖼️</span>
              アップロードした画像
            </h3>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={previewUrl}
                alt="検証対象の画像"
                className="w-full"
              />
            </div>
          </div>

          {/* 結果 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-lg">📋</span>
              検証結果
            </h3>

            {result?.found ? (
              <div className="space-y-5">
                {/* 透かし情報 */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-emerald-800">
                        電子透かしを検出しました
                      </h4>
                    </div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">📖</span>
            使い方
          </h3>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { step: 1, icon: '📤', title: '画像を選択', desc: 'ダウンロードされた画像を選択' },
              { step: 2, icon: '🔄', title: '自動検証', desc: 'システムが透かしを解析' },
              { step: 3, icon: '✅', title: '結果確認', desc: 'ダウンロード者情報を表示' },
              { step: 4, icon: '📋', title: '調査完了', desc: '不正利用の追跡が可能' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-gray-50 rounded-xl p-4 text-center h-full">
                  <div className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h4 className="font-bold text-amber-800 mb-2">注意事項</h4>
                <ul className="space-y-1.5 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    ダウンロードした<strong>PNG形式のまま</strong>アップロードしてください
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    JPEG形式に変換すると透かしが失われます
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    画像をリサイズ・編集すると透かしが失われます
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    スクリーンショットからは透かしを検出できません
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エラーモーダル */}
      {errorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">検証エラー</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">{errorModal}</p>

            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-gray-500 font-medium mb-1">考えられる原因:</p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                <li>画像がJPEG形式で保存された（PNG形式が必要）</li>
                <li>画像が編集・リサイズされた</li>
                <li>スクリーンショットで保存された</li>
                <li>このシステムからダウンロードした画像ではない</li>
              </ul>
            </div>

            <button
              onClick={() => setErrorModal(null)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
