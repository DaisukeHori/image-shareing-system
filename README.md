# レボル カットモデル画像管理システム

カットモデル画像の申請・承認・ダウンロードを管理するシステムです。

## 機能概要

- **Azure AD (Microsoft Entra ID) SSO認証**: Office 365アカウントでログイン
- **画像管理**: フォルダ構造での画像管理、アクセス権限設定（個人単位）
- **承認ワークフロー**: 所属長または社長による並列承認
- **不可視電子透かし**: LSBステガノグラフィーによる透かし埋め込み（流出時の追跡用）
- **ダウンロード制限**: 承認後7日間、1回のみダウンロード可能
- **メール通知**: SendGridによる承認依頼・結果通知

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

**確認方法：**
- 左メニューの **「Table Editor」** をクリック
- `users`, `departments`, `folders`, `images` などのテーブルが表示されていればOK

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

**AUTH_SECRETの生成方法：**

ターミナル（コマンドプロンプト）で以下のコマンドを実行：
```bash
openssl rand -base64 32
```

Windowsの場合やopensslがない場合は、以下のWebサイトで生成できます：
- https://generate-secret.vercel.app/32

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

## 運用ガイド

### 部署の作成

1. 管理画面 → **「部署管理」** をクリック
2. **「新規作成」** をクリック
3. 部署名を入力して **「保存」**

### ユーザー（スタッフ）の追加

1. 管理画面 → **「ユーザー管理」** をクリック
2. **「新規作成」** をクリック
3. 以下を入力：
   - メールアドレス（Azure ADのメール）
   - 名前
   - 役割（一般ユーザー / 管理者）
   - 所属部署
   - 所属長の場合は「所属長」にチェック
4. **「保存」**

### フォルダの作成

1. 管理画面 → **「画像管理」** をクリック
2. フォルダリストの **「+」** ボタンをクリック
3. フォルダ名を入力して作成

### 画像のアップロード

1. 管理画面 → **「画像管理」** をクリック
2. 保存先フォルダを選択
3. **「画像をアップロード」** をクリック
4. ファイルを選択（JPEG, PNG, WebP対応）

### アクセス権限の設定

1. 画像一覧で画像をホバー
2. **「権限設定」** アイコンをクリック
3. アクセスを許可するユーザーをチェック
4. **「保存」**

---

## 利用ガイド（一般ユーザー向け）

### 画像の利用申請

1. ログイン
2. **「画像一覧」** から使いたい画像を選択
3. **「利用申請」** をクリック
4. 利用目的を入力して **「申請」**
5. 所属長または社長に承認依頼メールが届く

### 承認後のダウンロード

1. 承認通知メールを受け取る
2. システムにログイン
3. **「申請一覧」** から承認済みの申請を確認
4. **「ダウンロード」** をクリック
5. 電子透かし入りの画像がダウンロードされる

**注意：**
- ダウンロードは**1回のみ**
- 承認から**7日以内**にダウンロードが必要

---

## トラブルシューティング

### ログインできない

1. **usersテーブルを確認**
   - メールアドレスが**小文字**で登録されているか
   - `is_active` が `true` か

2. **Azure AD設定を確認**
   - リダイレクトURIが正しいか
   - APIアクセス許可に管理者の同意があるか

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
- 単体テスト: 33件
- 結合テスト: 104件

---

## ライセンス

プライベート / 非公開
