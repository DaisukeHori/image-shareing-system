'use client';

import Link from 'next/link';

export default function AdminGuidePage() {
  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
            <span className="text-3xl">📖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">管理者ガイド</h1>
            <p className="text-white/80 text-sm">システムの運用方法を説明します</p>
          </div>
        </div>
      </div>

      {/* クイックスタート */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">🚀</span>
          クイックスタート
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: 1,
              icon: '👤',
              title: 'ユーザー登録',
              desc: '画像を利用するユーザーを追加',
              href: '/admin/users',
              color: 'blue',
            },
            {
              step: 2,
              icon: '📁',
              title: 'フォルダ作成',
              desc: '画像を整理するフォルダを作成',
              href: '/admin/folders',
              color: 'emerald',
            },
            {
              step: 3,
              icon: '🖼️',
              title: 'ファイル追加',
              desc: '画像・動画をアップロード',
              href: '/admin/images',
              color: 'amber',
            },
            {
              step: 4,
              icon: '✅',
              title: '申請を承認',
              desc: 'ユーザーの申請を処理',
              href: '/admin/requests',
              color: 'violet',
            },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <div className={`text-xs font-bold text-${item.color}-600 mb-1`}>STEP {item.step}</div>
              <h4 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ユーザー管理 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">👥</span>
          ユーザー管理
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                ユーザーの追加
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                「ユーザー管理」→「新規作成」から、名前・メールアドレス・パスワードを入力して追加します。
                部署を設定すると、後で管理しやすくなります。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                権限の種類
              </h4>
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded font-medium">admin</span>
                  <span className="text-sm text-gray-600">すべての機能にアクセスできる管理者</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium">user</span>
                  <span className="text-sm text-gray-600">画像の閲覧・申請ができる一般ユーザー</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                アクセス権限の設定
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                ユーザーごとにフォルダへのアクセス権限を設定できます。
                「閲覧のみ」「ダウンロード可」「編集可」の3段階があります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* フォルダ管理 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">📁</span>
          フォルダ管理
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">フォルダの作成</h4>
              <p className="text-sm text-gray-600">
                「フォルダ管理」→「新規作成」でフォルダを作成します。
                親フォルダを選択すると階層構造を作れます（例：2024年 → 春 → キャンペーン）
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">フォルダごとの権限</h4>
              <p className="text-sm text-gray-600">
                フォルダには複数のユーザーや部署に対して権限を設定できます。
                子フォルダは親フォルダの権限を継承しますが、個別に上書きも可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ファイル管理 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">🖼️</span>
          ファイル管理
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">画像のアップロード</h4>
              <p className="text-sm text-gray-600">
                「ファイル管理」→「アップロード」で画像や動画をアップロードできます。
                複数ファイルを一度に選択することも可能です。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">対応フォーマット</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">JPEG</span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">PNG</span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">GIF</span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">WebP</span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">MP4</span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">MOV</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">ファイルの整理</h4>
              <p className="text-sm text-gray-600">
                アップロード後、フォルダを選択して整理できます。
                ファイルの削除は、申請履歴がない場合のみ可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 申請管理 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">📋</span>
          申請管理
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">申請の承認</h4>
              <p className="text-sm text-gray-600">
                「承認待ち」タブに未処理の申請が表示されます。
                申請者、画像、利用目的を確認して「承認」または「却下」を選択します。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">承認時のポイント</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-2">
                <li>利用目的が適切か確認する</li>
                <li>掲載終了日が妥当か確認する</li>
                <li>承認時にコメントを残すとユーザーに伝わります</li>
                <li>却下する場合は理由を必ず記入する</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">履歴の管理</h4>
              <p className="text-sm text-gray-600">
                「履歴」タブで過去の申請を確認できます。
                ステータスでフィルタリングしたり、CSVでエクスポートすることも可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 透かし検証 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">🔍</span>
          透かし検証
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ダウンロードされた画像には電子透かしが埋め込まれています。
              不正利用が疑われる場合、「透かし検証」で画像をアップロードすると、
              誰がいつダウンロードしたかを確認できます。
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-amber-800 mb-2">注意点</h4>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>PNG形式のまま検証してください（JPEG変換すると透かしが失われます）</li>
                <li>リサイズや編集された画像からは検出できません</li>
                <li>スクリーンショットからは検出できません</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* よくある質問 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">❓</span>
          よくある質問
        </h2>
        <div className="space-y-3">
          {[
            {
              q: 'ユーザーのパスワードを忘れた場合は？',
              a: 'ユーザー管理から該当ユーザーを編集し、新しいパスワードを設定してください。',
            },
            {
              q: '誤って画像を削除してしまった場合は？',
              a: '一度削除した画像は復元できません。必要に応じて再アップロードしてください。',
            },
            {
              q: '承認を取り消すことはできますか？',
              a: 'ダウンロード前であれば、履歴から該当の申請を取り消すことができます。',
            },
            {
              q: '部署を追加するには？',
              a: 'ユーザー管理画面の「部署管理」から新しい部署を追加できます。',
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
    </div>
  );
}
