'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function GuidePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <h1 className="text-lg font-bold text-white">使い方ガイド</h1>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* イントロ */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-6">
            <span className="text-4xl">📖</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">画像管理システムの使い方</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            このガイドでは、画像の申請からダウンロードまでの流れを説明します。
            初めての方は順番にお読みください。
          </p>
        </div>

        {/* 基本的な流れ */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">1</span>
            基本的な流れ
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: 1,
                icon: '🔍',
                title: '画像を探す',
                desc: 'フォルダを開いて使いたい画像を見つけます',
                color: 'blue',
              },
              {
                step: 2,
                icon: '📝',
                title: '申請する',
                desc: '利用目的と掲載期限を入力して申請',
                color: 'emerald',
              },
              {
                step: 3,
                icon: '⏳',
                title: '承認を待つ',
                desc: '管理者が内容を確認して承認します',
                color: 'amber',
              },
              {
                step: 4,
                icon: '📥',
                title: 'ダウンロード',
                desc: '承認後、画像をダウンロードできます',
                color: 'violet',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div className={`text-xs font-bold text-${item.color}-600 mb-1`}>STEP {item.step}</div>
                <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 画像の探し方 */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold">2</span>
            画像の探し方
          </h3>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">📁</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">フォルダで整理されています</h4>
                  <p className="text-sm text-gray-600">
                    画像はフォルダごとに分類されています。フォルダをクリックして中を確認しましょう。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">🏠</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">パンくずリストで現在地を確認</h4>
                  <p className="text-sm text-gray-600">
                    画面上部のパンくずリストで今いる場所がわかります。「ルート」をクリックすると最初に戻れます。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">🔄</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">並び替えで見つけやすく</h4>
                  <p className="text-sm text-gray-600">
                    右上の並び替えメニューでファイル名順や作成日順に並べ替えることができます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* アクセス権限について */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">🔐</span>
            アクセス権限について
          </h3>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-4">
              フォルダごとにアクセス権限が設定されています。あなたの権限によって、できることが異なります。
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">👁️</span>
                <div>
                  <span className="font-medium text-gray-900">閲覧のみ</span>
                  <p className="text-xs text-gray-500">画像を見ることはできますが、ダウンロード申請はできません</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">📥</span>
                <div>
                  <span className="font-medium text-gray-900">ダウンロード可</span>
                  <p className="text-xs text-gray-500">画像の閲覧とダウンロード申請ができます（通常はこの権限です）</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <span className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">✏️</span>
                <div>
                  <span className="font-medium text-gray-900">編集可</span>
                  <p className="text-xs text-gray-500">閲覧・申請に加えて、画像のアップロードや削除もできます</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700">
                💡 アクセスできないフォルダがある場合は、管理者にお問い合わせください
              </p>
            </div>
          </div>
        </section>

        {/* 申請の仕方 */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold">3</span>
            申請の仕方
          </h3>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">画像をタップ</h4>
                  <p className="text-sm text-gray-600">
                    使いたい画像をタップすると、拡大プレビューが表示されます。「申請」ボタンを押してください。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">利用目的を選択</h4>
                  <p className="text-sm text-gray-600">
                    ホットペッパー、公式HP、SNS、チラシなどから選択します。「その他」の場合は詳細を記入してください。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">掲載終了日を設定</h4>
                  <p className="text-sm text-gray-600">
                    画像の掲載を終了する予定日を設定します。最長1年まで設定可能です。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">同意書を確認して申請</h4>
                  <p className="text-sm text-gray-600">
                    利用規約をよく読み、同意のうえ申請してください。同意書は最後までスクロールする必要があります。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ダウンロード方法 */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600 font-bold">4</span>
            ダウンロード方法
          </h3>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">承認されると通知が表示されます</h4>
                  <p className="text-sm text-gray-600">
                    申請が承認されると、ホーム画面上部に緑色のバナーが表示されます。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">申請履歴タブを開く</h4>
                  <p className="text-sm text-gray-600">
                    「申請履歴」タブを開くと、承認済みの申請に「ダウンロード」ボタンが表示されます。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">📥</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">ダウンロードボタンをタップ</h4>
                  <p className="text-sm text-gray-600">
                    確認画面が表示されるので、内容を確認してダウンロードしてください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 注意事項 */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold">!</span>
            注意事項
          </h3>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-1">申請した目的以外には使用しないでください</h4>
                  <p className="text-sm text-red-700">
                    ホットペッパー用に申請した画像をSNSで使用するなど、目的外利用は禁止です。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-1">掲載期限を守ってください</h4>
                  <p className="text-sm text-red-700">
                    設定した掲載終了日を過ぎたら、速やかに画像を削除してください。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-1">画像には電子透かしが埋め込まれています</h4>
                  <p className="text-sm text-red-700">
                    不正利用防止のため、ダウンロードした画像には見えない透かしが入っています。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-1">第三者への譲渡・共有は禁止です</h4>
                  <p className="text-sm text-red-700">
                    ダウンロードした画像を他の人に渡したり、共有したりしないでください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* よくある質問 */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">❓</span>
            よくある質問
          </h3>
          <div className="space-y-4">
            {[
              {
                q: '申請してからどのくらいで承認されますか？',
                a: '通常1〜2営業日以内に承認されます。急ぎの場合は管理者にご連絡ください。',
              },
              {
                q: '申請をキャンセルできますか？',
                a: 'はい、承認待ちの状態であれば「申請履歴」からキャンセルできます。',
              },
              {
                q: 'ダウンロード期限はありますか？',
                a: '承認から7日以内にダウンロードしてください。期限を過ぎると再申請が必要です。',
              },
              {
                q: '同じ画像を複数の目的で使いたい場合は？',
                a: '目的ごとに別々に申請してください。それぞれ承認が必要です。',
              },
              {
                q: '掲載期限を延長したい場合は？',
                a: '新しく申請し直す必要があります。現在の申請の掲載終了確認後、再申請してください。',
              },
              {
                q: '一部のフォルダが見えません',
                a: 'フォルダはアクセス権限があるものだけが表示されます。必要なフォルダにアクセスできない場合は、管理者に権限の付与を依頼してください。',
              },
              {
                q: '画像は見れるけど申請ボタンがありません',
                a: 'そのフォルダに対して「閲覧のみ」の権限が設定されています。ダウンロード申請が必要な場合は、管理者に「ダウンロード可」の権限を依頼してください。',
              },
              {
                q: 'ログインできません',
                a: 'ログインはAzure ADで認証されます。パスワードを忘れた場合はIT管理者にお問い合わせください。',
              },
            ].map((item, i) => (
              <details key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors list-none">
                  <span className="font-medium text-gray-900">{item.q}</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTAボタン */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
          >
            <span>画像を探しに行く</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
