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
        <div className="grid sm:grid-cols-3 gap-4">
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
              icon: '🖼️',
              title: 'ファイル追加',
              desc: 'フォルダを作成して画像をアップロード',
              href: '/admin/images',
              color: 'emerald',
            },
            {
              step: 3,
              icon: '✅',
              title: '申請を承認',
              desc: 'ユーザーの申請を処理',
              href: '/admin/requests',
              color: 'amber',
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

      {/* 所属管理 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">🏢</span>
          所属管理
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">所属（部署）とは？</h4>
              <p className="text-sm text-gray-600">
                「所属」はユーザーをグループ分けするための機能です。
                店舗名、部署名、チーム名など、組織に合わせて自由に作成できます。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">所属を使うメリット</h4>
              <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside ml-2">
                <li><strong>権限の一括設定</strong>：フォルダへのアクセス権限を所属単位で設定できます。個別にユーザーを指定する手間が省けます。</li>
                <li><strong>ユーザーの管理</strong>：どのユーザーがどの部署に属しているか一目でわかります。</li>
                <li><strong>申請の管理</strong>：申請一覧で所属ごとにフィルタリングできます。</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">所属の設定方法</h4>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside ml-2">
                <li>「所属管理」メニューから新しい所属を作成します</li>
                <li>「ユーザー管理」でユーザーを編集し、所属を割り当てます</li>
                <li>「フォルダ管理」でフォルダの権限を所属単位で設定できます</li>
              </ol>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-2">💡 活用例</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 「渋谷店」「新宿店」などの店舗ごとに所属を作成</li>
                <li>• 店舗ごとに閲覧できるフォルダを分ける</li>
                <li>• 新人が入社したら該当店舗の所属に追加するだけでOK</li>
              </ul>
            </div>
          </div>
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
                「ユーザー管理」→「新規作成」から、名前・メールアドレスを入力して追加します。
                ログイン認証はAzure ADで行うため、パスワードはこのシステムでは管理しません。
                所属（部署）を設定すると、権限管理がしやすくなります。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                ユーザーの権限レベル
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
                所属の割り当て
              </h4>
              <p className="text-sm text-gray-600 ml-8">
                ユーザーを所属（部署）に割り当てることで、フォルダへのアクセス権限を所属単位で管理できます。
                1人のユーザーを複数の所属に割り当てることも可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* アクセス権限 */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">🔐</span>
          アクセス権限の種類
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-6">
            フォルダごとに、ユーザーまたは所属に対して以下の3段階のアクセス権限を設定できます。
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-2xl">👁️</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 text-sm bg-gray-600 text-white rounded-full font-medium">閲覧のみ</span>
                </div>
                <p className="text-sm text-gray-600">
                  フォルダ内の画像を<strong>見ることだけ</strong>ができます。
                  ダウンロード申請はできません。プレビュー表示のみ可能です。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-2xl">📥</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full font-medium">ダウンロード可</span>
                </div>
                <p className="text-sm text-gray-600">
                  画像の閲覧に加えて、<strong>ダウンロード申請</strong>ができます。
                  申請後、管理者の承認を経てダウンロードが可能になります。
                  一般ユーザーにはこの権限を設定することが多いです。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl">
              <div className="w-12 h-12 bg-emerald-200 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-2xl">✏️</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-full font-medium">編集可</span>
                </div>
                <p className="text-sm text-gray-600">
                  すべての操作が可能です。閲覧・申請に加えて、
                  <strong>画像のアップロード、削除、移動</strong>ができます。
                  管理者や特定の担当者にのみ付与することを推奨します。
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 className="font-bold text-amber-800 mb-2">⚠️ 注意点</h4>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>権限が設定されていないユーザーは、そのフォルダにアクセスできません</li>
              <li>親フォルダの権限は子フォルダに自動的に継承されます</li>
              <li>子フォルダで個別に権限を設定すると、継承された権限を上書きできます</li>
            </ul>
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
              <h4 className="font-bold text-gray-900 mb-2">フォルダの作成・管理</h4>
              <p className="text-sm text-gray-600">
                「ファイル管理」画面でフォルダを作成・削除・移動できます。
                階層構造で整理することで、画像を分類しやすくなります（例：2024年 → 春 → キャンペーン）。
                フォルダにはアクセス権限を設定できます。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">画像のアップロード</h4>
              <p className="text-sm text-gray-600">
                「アップロード」ボタンで画像や動画をアップロードできます。
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
              q: 'ユーザーがログインできない場合は？',
              a: 'ログイン認証はAzure ADで管理されています。Azure ADの管理画面でユーザーアカウントの状態を確認するか、IT管理者にお問い合わせください。',
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
              q: '所属（部署）を追加するには？',
              a: 'サイドメニューの「所属管理」から新しい所属を追加できます。その後、ユーザー管理でユーザーに所属を割り当てます。',
            },
            {
              q: 'フォルダにアクセスできないと言われた場合は？',
              a: 'そのユーザー（または所属）に対してフォルダのアクセス権限が設定されているか確認してください。権限が未設定の場合、フォルダは表示されません。',
            },
            {
              q: '一般ユーザーにどの権限を設定すればいいですか？',
              a: '通常は「ダウンロード可」を設定します。これにより画像の閲覧と申請が可能になります。「編集可」は管理者など特定の担当者のみに設定してください。',
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
