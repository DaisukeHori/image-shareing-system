'use client';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { step: 1, icon: '🔍', title: '画像を探す', color: 'blue' },
                  { step: 2, icon: '📝', title: '申請する', color: 'emerald' },
                  { step: 3, icon: '⏳', title: '承認を待つ', color: 'amber' },
                  { step: 4, icon: '📥', title: 'ダウンロード', color: 'violet' },
                  { step: 5, icon: '📅', title: '掲載終了', color: 'rose' },
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
                  { num: 3, text: '掲載終了日を設定（画像を削除する予定日）' },
                  { num: 4, text: '同意書を最後まで読んで同意にチェック' },
                  { num: 5, text: '「申請する」ボタンを押して完了' },
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

            {/* 掲載終了について */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 text-sm">📅</span>
                掲載終了について
              </h3>
              <div className="bg-rose-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">📧</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">メール通知</p>
                    <p className="text-xs text-gray-600">掲載終了日が近づくとリマインドメールが届きます</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🗑️</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">画像を削除</p>
                    <p className="text-xs text-gray-600">使用していた場所から画像を削除してください</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">削除確認ボタン</p>
                    <p className="text-xs text-gray-600">削除後、確認ボタンを押してください。管理者も確認すると完了です</p>
                  </div>
                </div>
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
                  '掲載終了日を過ぎたら速やかに画像を削除してください',
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
                  { q: '掲載終了日とは何ですか？', a: '画像の使用を終了する予定日です。この日を過ぎたら、ホットペッパーやSNSなど使用していた場所から画像を削除し、削除確認ボタンを押してください。' },
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
