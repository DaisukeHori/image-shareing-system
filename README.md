# レボル カットモデル画像管理システム

カットモデル画像の申請・承認・ダウンロードを管理するシステムです。

## 機能概要

### 認証・セキュリティ
- **Azure AD (Microsoft Entra ID) SSO認証**: Office 365アカウントでログイン
- **不可視電子透かし**: LSBステガノグラフィーによる透かし埋め込み（流出時の追跡用）

### 画像・動画管理
- **対応形式**:
  - 画像: JPEG, PNG, WebP, GIF（最大10MB）
  - 動画: MP4, WebM, MOV, AVI, MKV（最大500MB）
- **フォルダ管理**: 無制限の階層構造
- **フォルダごと一括アップロード**: ローカルフォルダをそのままアップロード
- **複数選択**: 複数画像を選んで一括で権限設定・削除
- **権限レベル**:
  - `view`: 閲覧のみ（申請してダウンロード）
  - `download`: 直接ダウンロード可能
  - `edit`: 編集・削除可能

### 承認ワークフロー
- **利用規約同意**: 申請時にレンタルフォト使用同意書への同意が必須
- **利用目的選択**: ホットペッパー/HP/SNS/チラシ/その他
- **掲載終了日設定**: 1年以内で設定必須
- **並列承認**: 所属長または社長のどちらかが承認すればOK
- **管理画面からの承認**: メールだけでなく管理画面からも直接承認・却下可能
- **コメント機能**: 申請時・承認/却下時に相互コメント可能
- **メール通知**: 承認依頼・承認結果をメールで通知
- **ダウンロード制限**: 承認後7日間、1回のみ

### 削除確認ワークフロー
- **自動リマインダー**: 掲載終了日を過ぎると毎日14時(JST)にリマインダーメール送信
- **両者確認必須**: 申請者と承認者の両方が削除確認するまで継続
- **トークンベース**: メールリンクから簡単に確認可能

### ユーザー・所属管理
- **CSVインポート/エクスポート**: ユーザー・所属の一括登録・更新
- **権限管理**: 管理者/一般ユーザー、社長フラグ

### UI/UX
- **レスポンシブ対応**: PC・タブレット・スマホに最適化
- **ヘルプTips**: 各項目にヘルプアイコン付き（初めての方も安心）
- **プレビュー機能**: スワイプ・矢印キーでの画像ナビゲーション

---

## デプロイ手順（詳細ガイド）

このガイドでは、システムを一からデプロイする手順を詳しく説明します。

### 必要なアカウント

以下のサービスのアカウントを事前に作成してください：

| サービス | 用途 | 費用 |
|---------|------|------|
| [Supabase](https://supabase.com) | データベース・ストレージ | 無料プランあり |
| [Vercel](https://vercel.com) | Webアプリホスティング | 無料プランあり |
| [SendGrid](https://sendgrid.com) | メール送信 | 無料プランあり（100通/日） |
| Azure AD / Microsoft 365 | 認証 | 組織のライセンス |
| [GitHub](https://github.com) | ソースコード管理 | 無料 |

---

## Step 1: Supabaseプロジェクトの作成

### 1.1 Supabaseにサインアップ

1. ブラウザで [https://supabase.com](https://supabase.com) を開く
2. 右上の **「Start your project」** をクリック
3. **GitHub** または **メールアドレス** でサインアップ
4. メール認証が必要な場合は、受信したメールのリンクをクリック

### 1.2 新しいプロジェクトを作成

1. ダッシュボードで **「New Project」** ボタンをクリック
2. 以下の情報を入力：

   | 項目 | 入力値 |
   |------|--------|
   | Organization | 既存の組織を選択、または新規作成 |
   | Name | `revol-image-system`（任意の名前でOK） |
   | Database Password | **強力なパスワードを設定**（必ずメモしてください！） |
   | Region | **Northeast Asia (Tokyo)** を選択 |

3. **「Create new project」** をクリック
4. **2〜3分待つ**（プロジェクトの準備中と表示されます）

### 1.3 データベーススキーマの設定

プロジェクトの準備が完了したら：

1. 左側のメニューから **「SQL Editor」** をクリック
2. 画面中央の **「New query」** をクリック
3. このリポジトリの `supabase/migrations/001_initial_schema.sql` ファイルを開く
4. ファイルの内容を**全て**コピー（Ctrl+A → Ctrl+C）
5. SQL Editorに貼り付け（Ctrl+V）
6. 右下の **「Run」** ボタン（緑色）をクリック
7. 「Success」と表示されれば完了

8. 続けて以下のマイグレーションファイルも**順番に**実行：
   - `supabase/migrations/002_folder_permissions.sql` - フォルダ権限機能
   - `supabase/migrations/003_permission_levels.sql` - 権限レベル機能（view/download/edit）
   - `supabase/migrations/004_video_support.sql` - 動画サポート
   - `supabase/migrations/005_usage_consent.sql` - 利用同意・削除確認機能
   - `supabase/migrations/006_comments.sql` - コメント機能

**確認方法：**
- 左メニューの **「Table Editor」** をクリック
- `users`, `departments`, `folders`, `images`, `folder_permissions` などのテーブルが表示されていればOK

### 1.4 Storageバケットの作成

画像を保存するためのストレージを設定します：

1. 左メニューから **「Storage」** をクリック
2. **「New bucket」** ボタンをクリック
3. 以下を入力：

   | 項目 | 入力値 |
   |------|--------|
   | Name | `images` |
   | Public bucket | **チェックを入れる** |

4. **「Create bucket」** をクリック

### 1.5 APIキーの取得（重要！）

後で使用するキーをメモしておきます：

1. 左メニューから **「Settings」** → **「API」** をクリック
2. 以下の3つの値をメモ帳にコピー：

```
Project URL:        https://xxxxxxxxxx.supabase.co
anon public key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）
service_role key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）
```

**注意**: `service_role key` は絶対に公開しないでください！

---

## Step 2: SendGridの設定

### 2.1 SendGridにサインアップ

1. ブラウザで [https://sendgrid.com](https://sendgrid.com) を開く
2. **「Start for Free」** をクリック
3. 必要事項を入力してアカウントを作成
4. メール認証を完了

### 2.2 APIキーの作成

1. ログイン後、左メニューの **「Settings」** をクリック
2. **「API Keys」** をクリック
3. 右上の **「Create API Key」** をクリック
4. 以下を入力：

   | 項目 | 入力値 |
   |------|--------|
   | API Key Name | `revol-image-system` |
   | API Key Permissions | **Full Access** を選択 |

5. **「Create & View」** をクリック
6. 表示されたAPIキー（`SG.`で始まる長い文字列）を**必ずコピーしてメモ**

**重要**: このAPIキーは**一度しか表示されません**。必ずコピーしてください！

### 2.3 送信元メールアドレスの認証

1. 左メニューの **「Settings」** → **「Sender Authentication」** をクリック
2. **「Single Sender Verification」** セクションを見つける
3. **「Create a Sender」** をクリック
4. フォームに以下を入力：

   | 項目 | 入力値 |
   |------|--------|
   | From Name | `レボル 画像管理システム` |
   | From Email Address | 送信元として使用するメールアドレス |
   | Reply To | 同じメールアドレス |
   | Company Address | 会社の住所 |
   | その他 | 必須項目を埋める |

5. **「Create」** をクリック
6. 入力したメールアドレスに確認メールが届く
7. メール内の **「Verify Single Sender」** リンクをクリック
8. 「Verified」と表示されれば完了

---

## Step 3: Azure AD (Microsoft Entra ID) の設定

### 3.1 Azure Portalにログイン

1. ブラウザで [https://portal.azure.com](https://portal.azure.com) を開く
2. 組織のMicrosoft 365アカウントでログイン

### 3.2 アプリを登録

1. 上部の検索バーに **「アプリの登録」** と入力
2. 検索結果から **「アプリの登録」** をクリック
3. **「新規登録」** ボタンをクリック
4. 以下を入力：

   | 項目 | 入力値 |
   |------|--------|
   | 名前 | `レボル画像管理システム` |
   | サポートされているアカウントの種類 | **この組織ディレクトリのみに含まれるアカウント** |

5. **「リダイレクトURI」** セクション：
   - プラットフォーム: **Web** を選択
   - URI: `https://temporary-placeholder.vercel.app/api/auth/callback/microsoft-entra-id`
   - ※後でVercelのURLに変更します

6. **「登録」** をクリック

### 3.3 必要な情報をメモ

登録完了後の画面で以下をメモ：

```
アプリケーション (クライアント) ID:  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ディレクトリ (テナント) ID:         xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3.4 クライアントシークレットの作成

1. 左メニューの **「証明書とシークレット」** をクリック
2. **「クライアントシークレット」** タブを選択
3. **「新しいクライアントシークレット」** をクリック
4. 以下を入力：

   | 項目 | 入力値 |
   |------|--------|
   | 説明 | `Vercel Production` |
   | 有効期限 | **24か月** を推奨 |

5. **「追加」** をクリック
6. **「値」** 列の文字列を**必ずコピーしてメモ**

**重要**: この値は画面を離れると**二度と表示されません**！

### 3.5 APIアクセス許可の設定

1. 左メニューの **「APIのアクセス許可」** をクリック
2. **「アクセス許可の追加」** をクリック
3. **「Microsoft Graph」** をクリック
4. **「委任されたアクセス許可」** をクリック
5. 検索バーで以下を検索して追加（チェックを入れる）：
   - `openid`
   - `profile`
   - `email`
6. **「アクセス許可の追加」** をクリック
7. **「[組織名]に管理者の同意を与えます」** をクリック（管理者権限が必要）
8. 確認ダイアログで **「はい」** をクリック

---

## Step 4: Vercelへのデプロイ

### 4.1 リポジトリをVercelに接続

1. ブラウザで [https://vercel.com](https://vercel.com) を開く
2. GitHubアカウントでログイン
3. ダッシュボードで **「Add New...」** → **「Project」** をクリック
4. **「Import Git Repository」** でこのリポジトリを選択
5. **「Import」** をクリック

### 4.2 環境変数の設定

**「Environment Variables」** セクションで以下を**1つずつ**追加します：

各項目について：
- **Name** 欄に変数名を入力
- **Value** 欄に値を入力
- **「Add」** をクリック

| 変数名 | 値の説明 |
|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseの「Project URL」 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの「anon public key」 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseの「service_role key」 |
| `AZURE_AD_CLIENT_ID` | Azure ADの「アプリケーション (クライアント) ID」 |
| `AZURE_AD_CLIENT_SECRET` | Azure ADの「クライアントシークレット」の値 |
| `AZURE_AD_TENANT_ID` | Azure ADの「ディレクトリ (テナント) ID」 |
| `AUTH_SECRET` | ランダムな文字列（下記で生成） |
| `SENDGRID_API_KEY` | SendGridのAPIキー（`SG.xxx...`） |
| `SENDGRID_FROM_EMAIL` | SendGridで認証したメールアドレス |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app`（後で設定） |
| `CRON_SECRET` | Vercel Cronの認証用シークレット（下記で生成） |

**AUTH_SECRET / CRON_SECRETの生成方法：**

ターミナル（コマンドプロンプト）で以下のコマンドを実行：
```bash
openssl rand -base64 32
```

Windowsの場合やopensslがない場合は、以下のWebサイトで生成できます：
- https://generate-secret.vercel.app/32

**注意**: AUTH_SECRETとCRON_SECRETは**別々の値**を生成して設定してください。

### 4.3 デプロイ実行

1. すべての環境変数を入力したら **「Deploy」** をクリック
2. 2〜3分でデプロイが完了
3. 完了後、表示されるURL（例: `https://revol-image-xxx.vercel.app`）をメモ

### 4.4 環境変数の更新

1. Vercelダッシュボードでプロジェクトをクリック
2. **「Settings」** タブ → **「Environment Variables」** をクリック
3. `NEXT_PUBLIC_APP_URL` を見つけて編集（右の「...」→「Edit」）
4. 値をデプロイされた実際のURLに変更
5. **「Save」** をクリック

### 4.5 Azure ADリダイレクトURIの更新

1. [Azure Portal](https://portal.azure.com) を開く
2. 登録したアプリを開く
3. 左メニューの **「認証」** をクリック
4. **「リダイレクトURI」** を実際のURLに更新：
   ```
   https://実際のVercelURL/api/auth/callback/microsoft-entra-id
   ```
   例: `https://revol-image-xxx.vercel.app/api/auth/callback/microsoft-entra-id`
5. **「保存」** をクリック

### 4.6 Vercelで再デプロイ

1. Vercelダッシュボードに戻る
2. **「Deployments」** タブをクリック
3. 最新のデプロイの **「...」** メニュー → **「Redeploy」** をクリック
4. 確認ダイアログで **「Redeploy」** をクリック

---

## Step 5: 初期設定

### 5.1 管理者ユーザーの作成

システムにログインできる最初の管理者を作成します：

1. [Supabase](https://supabase.com) にログイン
2. プロジェクトを選択
3. 左メニューから **「Table Editor」** をクリック
4. **「users」** テーブルをクリック
5. **「Insert」** → **「Insert row」** をクリック
6. 以下を入力：

   | カラム | 値 |
   |--------|-----|
   | email | 管理者のAzure ADメールアドレス（**小文字で**） |
   | name | 管理者の名前（例: 山田太郎） |
   | role | `admin` |
   | is_ceo | `false`（社長でない場合） |
   | is_active | `true` |
   | department_id | 空のまま（null） |

7. **「Save」** をクリック

### 5.2 社長ユーザーの作成

承認者として社長を登録します：

1. 同様に **「Insert row」** をクリック
2. 以下を入力：

   | カラム | 値 |
   |--------|-----|
   | email | 社長のAzure ADメールアドレス（**小文字で**） |
   | name | 社長の名前 |
   | role | `admin` |
   | is_ceo | `true` |
   | is_active | `true` |

3. **「Save」** をクリック

### 5.3 動作確認

1. ブラウザでデプロイしたURLを開く
2. **「Microsoftアカウントでログイン」** をクリック
3. 組織のMicrosoft 365アカウントでログイン
4. ログインできれば成功！

**ログインできない場合：**
- usersテーブルのemailが小文字か確認
- is_activeがtrueか確認
- Azure ADのリダイレクトURIが正しいか確認

---

## Step 6: Cronジョブの設定（削除確認リマインダー）

掲載終了日を過ぎた申請に対して自動リマインダーメールを送信するCronジョブが設定されています。

### 6.1 Vercel Cronの設定

`vercel.json` ファイルに以下の設定が含まれています：

```json
{
  "crons": [{
    "path": "/api/cron/deletion-reminders",
    "schedule": "0 5 * * *"
  }]
}
```

これにより毎日UTC 5:00（日本時間14:00）にリマインダーが送信されます。

### 6.2 環境変数の確認

必ず `CRON_SECRET` 環境変数が設定されていることを確認してください。この値がないとCronジョブは認証エラーで失敗します。

### 6.3 手動実行（テスト用）

Cronジョブを手動でテストする場合：

```bash
curl -X GET "https://your-app.vercel.app/api/cron/deletion-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 管理者ガイド

### 所属（部署）の管理

1. 管理画面 → **「所属管理」** をクリック
2. 操作方法：
   - **新規作成**: 「新規作成」ボタンをクリック
   - **編集**: 一覧の「編集」リンクをクリック
   - **削除**: 一覧の「削除」リンクをクリック
   - **CSVインポート**: 「CSVインポート」ボタンでファイルを選択
   - **CSVエクスポート**: 「CSVエクスポート」ボタンでダウンロード

**CSVフォーマット（所属）：**
```
所属名,所属長メールアドレス
営業部,tanaka@example.com
開発部,yamada@example.com
```

### ユーザーの管理

1. 管理画面 → **「ユーザー管理」** をクリック
2. 操作方法：
   - **新規作成**: 「新規作成」ボタンをクリック
   - **編集**: 一覧の「編集」リンクをクリック
   - **削除**: 一覧の「削除」リンクをクリック
   - **CSVインポート**: 「CSVインポート」ボタンでファイルを選択
   - **CSVエクスポート**: 「CSVエクスポート」ボタンでダウンロード

**CSVフォーマット（ユーザー）：**
```
メールアドレス,名前,所属名,権限,社長,有効
tanaka@example.com,田中太郎,営業部,user,いいえ,はい
yamada@example.com,山田花子,開発部,admin,いいえ,はい
```

- **権限**: `admin`（管理者）または `user`（一般）
- **社長**: `はい` または `いいえ`
- **有効**: `はい` または `いいえ`
- 所属名が存在しない場合は自動的に作成されます

### 画像の管理

1. 管理画面 → **「画像管理」** をクリック

**アップロード方法：**
- **画像ボタン**: 複数の画像を個別に選択してアップロード
- **フォルダボタン**: ローカルのフォルダをそのままアップロード（フォルダが自動作成）

**権限設定方法：**
1. **個別設定**: 画像にホバーして「権限」ボタンをクリック
2. **複数一括設定**: 「複数選択」ボタン → 画像を選択 → 「権限設定」
3. **フォルダ単位設定**: フォルダを選択後「フォルダ権限設定」ボタン
   - フォルダ権限を設定すると、そのフォルダ内の全画像に自動的にアクセス権が付与されます

---

## 利用ガイド（一般ユーザー向け）

### 画像の利用申請

1. システムにログイン
2. **「画像を選ぶ」** タブで使いたい画像をタップ
3. 利用目的を入力して **「申請する」** をタップ
4. 所属長または社長に承認依頼メールが届きます

### 承認後のダウンロード

1. 承認通知メールを受け取る
2. システムにログイン
3. **「申請履歴」** タブから承認済みの申請を確認
4. **「ダウンロード」** ボタンをタップ
5. 電子透かし入りの画像がダウンロードされます

**重要：**
- ダウンロードは**1回のみ**可能
- 承認から**7日以内**にダウンロードが必要
- ダウンロードした画像には電子透かしが埋め込まれています（目視では見えません）

### ヘルプTipsの使い方

各ページの項目横にある **?** アイコンをタップすると、その項目の説明が表示されます。

---

## トラブルシューティング

### ログインできない

1. **usersテーブルを確認**
   - メールアドレスが**小文字**で登録されているか
   - `is_active` が `true` か

2. **Azure AD設定を確認**
   - リダイレクトURIが正しいか
   - APIアクセス許可に管理者の同意があるか

### 管理画面が表示されない

1. **ログアウトして再ログイン**
   - セッション情報を最新に更新

2. **usersテーブルのroleを確認**
   - `role` が `admin` になっているか

### 承認メールが届かない

1. **SendGrid設定を確認**
   - APIキーが正しいか
   - 送信元メールアドレスが認証済みか

2. **Vercel環境変数を確認**
   - `SENDGRID_API_KEY` が正しいか
   - `SENDGRID_FROM_EMAIL` が正しいか

3. **迷惑メールフォルダを確認**
   - 初回は迷惑メールに振り分けられる可能性あり

### 透かし検証で検出されない

- ダウンロードした画像は**PNG形式**で保存される
- **JPEG形式に変換すると透かしが失われる**可能性がある
- 検証には元のPNGファイルを使用

### 画像がアップロードできない

1. **ファイル形式を確認**
   - JPEG, PNG, WebPのみ対応
   - GIF, BMPなどは非対応

2. **ファイルサイズを確認**
   - 大きすぎるファイルはタイムアウトする可能性あり

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | Next.js 15 + TypeScript + Tailwind CSS |
| バックエンド | Next.js API Routes |
| データベース | Supabase (PostgreSQL) |
| ストレージ | Supabase Storage |
| 認証 | NextAuth.js v5 + Microsoft Entra ID |
| メール | SendGrid |
| 画像処理 | Sharp |

---

## テスト実行

```bash
# 全テスト実行
npm test

# 単体テストのみ
npm test -- --testPathIgnorePatterns="integration"

# 結合テストのみ
npm test -- --testPathPatterns="integration"
```

テスト件数：
- 単体テスト: 35件
- 結合テスト: 104件
- 合計: 139件

---

## ライセンス

プライベート / 非公開
