'use client';

import Link from 'next/link';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function GuideModal({ isOpen, onClose, isAdmin = false }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="flex min-h-full items-start justify-center p-4 pt-10 pb-20">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* ヘッダー */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <span className="text-2xl">📖</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">使い方ガイド</h2>
                <p className="text-xs text-white/70">画像申請の流れを確認</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
            {/* 基本的な流れ */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">1</span>
                基本的な流れ
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { step: 1, icon: '🔍', title: '画像を探す', color: 'blue' },
                  { step: 2, icon: '📝', title: '申請する', color: 'emerald' },
                  { step: 3, icon: '⏳', title: '承認を待つ', color: 'amber' },
                  { step: 4, icon: '📥', title: 'ダウンロード', color: 'violet' },
                ].map((item) => (
                  <div key={item.step} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className={`w-8 h-8 mx-auto bg-${item.color}-100 rounded-lg flex items-center justify-center mb-2`}>
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div className={`text-[10px] font-bold text-${item.color}-600 mb-0.5`}>STEP {item.step}</div>
                    <p className="text-xs font-medium text-gray-900">{item.title}</p>
                  </div>
                ))}
              </div>
              {/* 承認待ちの補足説明 */}
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">⏳</span>
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">承認を待つ（STEP 3）について</p>
                    <p>申請後、管理者が内容を確認して承認・却下を行います。承認されるとメールで通知が届き、ダウンロードが可能になります。</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 申請方法 */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-sm">2</span>
                申請の仕方
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {[
                  { num: 1, text: '使いたい画像をタップして「申請」ボタンを押す' },
                  { num: 2, text: '利用目的（ホットペッパー、SNSなど）を選択' },
                  { num: 3, text: '同意書を最後まで読んで同意にチェック' },
                  { num: 4, text: '「申請する」ボタンを押して完了' },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {item.num}
                    </span>
                    <p className="text-sm text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 注意事項 */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm">!</span>
                注意事項
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                {[
                  '申請した目的以外には使用しないでください',
                  '画像には電子透かしが埋め込まれています',
                  '第三者への譲渡・共有は禁止です',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-red-500">⚠️</span>
                    <p className="text-sm text-red-800">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">❓</span>
                よくある質問
              </h3>
              <div className="space-y-2">
                {[
                  { q: '申請をキャンセルできますか？', a: '承認待ちの状態であれば「申請履歴」からキャンセルできます。' },
                  { q: 'ダウンロード期限はありますか？', a: '承認から7日以内にダウンロードしてください。期限を過ぎると再申請が必要です。' },
                  { q: '一部のフォルダが見えません', a: 'アクセス権限があるフォルダのみ表示されます。管理者にお問い合わせください。' },
                ].map((item, i) => (
                  <details key={i} className="bg-gray-50 rounded-xl overflow-hidden group">
                    <summary className="p-3 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors list-none">
                      <span className="font-medium text-gray-900 text-sm">{item.q}</span>
                      <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-3 pb-3 text-sm text-gray-600">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* 管理者向けセクション */}
            {isAdmin && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">⚙️</span>
                  管理者の方へ
                </h3>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-indigo-900">
                    あなたは<span className="font-bold text-indigo-700">管理者権限</span>をお持ちです。ユーザーからの画像利用申請を承認・却下できます。
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-indigo-700">管理画面でできること:</p>
                    <ul className="text-xs text-indigo-800 space-y-1 ml-4">
                      <li>• ユーザーからの申請を承認・却下</li>
                      <li>• ユーザー管理（権限の付与など）</li>
                      <li>• フォルダ・画像の管理</li>
                      <li>• 申請履歴の確認・CSV出力</li>
                    </ul>
                  </div>
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    管理画面を開く
                  </Link>
                  <Link
                    href="/admin/requests"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    承認申請を管理する
                  </Link>
                  <Link
                    href="/admin/guide"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    管理者ガイドを見る
                  </Link>
                </div>
              </section>
            )}
          </div>

          {/* フッター */}
          <div className="sticky bottom-0 bg-gray-50 border-t p-4">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
