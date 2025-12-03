# Revol カットモデル画像管理システム - エンジニア向け技術ドキュメント

## 目次
1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [プロジェクト構成](#3-プロジェクト構成)
4. [データベース設計](#4-データベース設計)
5. [認証・認可](#5-認証認可)
6. [APIエンドポイント一覧](#6-apiエンドポイント一覧)
7. [主要機能の実装詳細](#7-主要機能の実装詳細)
8. [セキュリティ機能](#8-セキュリティ機能)
9. [メール通知システム](#9-メール通知システム)
10. [環境構築](#10-環境構築)

---

## 1. システム概要

カットモデル画像の管理・共有システム。美容室フランチャイズでの画像利用を管理し、
承認ワークフロー、透かし埋め込み、利用期限管理などの機能を提供。

### 主要機能
- Azure AD認証によるシングルサインオン
- 階層的フォルダ構造での画像管理
- 3レベルの権限管理（閲覧/ダウンロード/編集）
- 2段階承認フロー（同意書確認 + 承認者承認）
- 不可視透かし（LSBステガノグラフィ）
- 掲載期限管理と削除確認ワークフロー

---

## 2. 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|------------|------|
| Next.js | 16.0.6 | フレームワーク（App Router） |
| React | 19.x | UIライブラリ |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | スタイリング |

### バックエンド
| 技術 | バージョン | 用途 |
|------|------------|------|
| Next.js API Routes | - | APIサーバー |
| NextAuth.js | 5.x | 認証 |
| Supabase | - | データベース・ストレージ |
| Sharp | - | 画像処理・透かし |
| SendGrid | - | メール送信 |

### インフラ
| 技術 | 用途 |
|------|------|
| Vercel | ホスティング |
| Supabase | PostgreSQL + Storage |
| Azure AD | 認証プロバイダー |

---

## 3. プロジェクト構成

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # ホーム画面
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── auth/              # 認証ページ
│   │   │   ├── signin/
│   │   │   └── error/
│   │   ├── admin/             # 管理画面
│   │   │   ├── page.tsx       # ダッシュボード
│   │   │   ├── users/         # ユーザー管理
│   │   │   ├── departments/   # 部門管理
│   │   │   ├── images/        # ファイル管理
│   │   │   ├── folders/       # フォルダ管理
│   │   │   ├── requests/      # 承認管理
│   │   │   └── watermark/     # 透かし検証
│   │   ├── confirm-deletion/  # 削除確認ページ
│   │   └── api/               # APIルート
│   │       ├── auth/          # 認証API
│   │       ├── requests/      # 申請API
│   │       ├── images/        # 画像API
│   │       ├── folders/       # フォルダAPI
│   │       ├── admin/         # 管理者API
│   │       ├── approval/      # 承認アクションAPI
│   │       ├── download/      # ダウンロードAPI
│   │       └── cron/          # 定期実行API
│   ├── components/            # Reactコンポーネント
│   │   ├── HelpTip.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── common/
│   │       └── SessionProvider.tsx
│   ├── lib/                   # ユーティリティ
│   │   ├── auth.ts           # NextAuth設定
│   │   ├── email.ts          # メール送信
│   │   ├── watermark.ts      # 透かし処理
│   │   └── supabase/         # DB接続
│   └── types/
│       └── database.ts
├── supabase/
│   └── migrations/            # DBマイグレーション
├── public/                    # 静的ファイル
└── docs/                      # ドキュメント
```

---

## 4. データベース設計

### ER図（主要テーブル）

```
users ──────────┬──── departments
   │            │
   │            │
   ├────────────┼──── folder_permissions
   │            │
   ├────────────┼──── image_permissions
   │            │
   └────────────┴──── approval_requests ──── approval_tokens
                                         └── download_tokens

folders ◄────── images
   │               │
   └───────────────┴─── (権限継承)
```

### テーブル詳細

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_ceo BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    azure_ad_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### departments
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### folders
```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    default_permission VARCHAR(20) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### images
```sql
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    file_type VARCHAR(20) DEFAULT 'image',
    duration INTEGER,  -- 動画の場合の長さ（秒）
    default_permission VARCHAR(20) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### approval_requests
```sql
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL,
    purpose_type VARCHAR(20),
    purpose_other TEXT,
    usage_end_date DATE,
    agreed_to_terms BOOLEAN DEFAULT FALSE,
    requester_comment TEXT,
    approver_comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER NOT NULL DEFAULT 0,
    deletion_confirmed_user BOOLEAN DEFAULT FALSE,
    deletion_confirmed_approver BOOLEAN DEFAULT FALSE,
    deletion_confirmed_user_at TIMESTAMP WITH TIME ZONE,
    deletion_confirmed_approver_at TIMESTAMP WITH TIME ZONE,
    deletion_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    deletion_token_user VARCHAR(64),
    deletion_token_approver VARCHAR(64),
    deleted_image_filename VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### folder_permissions / image_permissions
```sql
CREATE TABLE folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'view',  -- view, download, edit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(folder_id, user_id)
);

CREATE TABLE image_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(image_id, user_id)
);
```

### 権限レベル
| レベル | 値 | 説明 |
|--------|------|------|
| 閲覧 | `view` | 画像を見れる。ダウンロードには申請が必要 |
| ダウンロード | `download` | 申請なしでダウンロード可能 |
| 編集 | `edit` | 編集・削除が可能 |

### 権限判定の優先順位
1. 画像の個別権限（`image_permissions`）
2. フォルダの個別権限（`folder_permissions`）
3. フォルダのデフォルト権限（`folders.default_permission`）
4. アクセス不可

---

## 5. 認証・認可

### NextAuth設定（`/src/lib/auth.ts`）

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,  // 8時間
  },
  callbacks: {
    async signIn({ user, account }) {
      // DBにユーザーが登録されているか確認
      const dbUser = await findUserByEmail(user.email);
      if (!dbUser || !dbUser.is_active) {
        return false;  // 登録されていない/無効なユーザーは拒否
      }
      return true;
    },
    async jwt({ token, account }) {
      // DBからユーザー情報を取得してトークンに追加
      const dbUser = await findUserByEmail(token.email);
      token.id = dbUser.id;
      token.role = dbUser.role;
      token.department_id = dbUser.department_id;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.department_id = token.department_id;
      return session;
    },
  },
});
```

### ミドルウェア（`/src/middleware.ts`）

```typescript
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // 認証が必要なルートの保護
  if (!isLoggedIn && !isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // 管理者ルートの保護
  if (isAdminRoute && req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }
});
```

---

## 6. APIエンドポイント一覧

### 認証
| メソッド | パス | 説明 |
|----------|------|------|
| * | `/api/auth/[...nextauth]` | NextAuth認証ハンドラー |

### 申請関連
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/requests` | 自分の申請一覧取得 |
| POST | `/api/requests` | 新規申請作成 |
| DELETE | `/api/requests/[id]` | 申請キャンセル（pending時のみ） |
| POST | `/api/requests/confirm-deletion` | 掲載終了確認（ユーザー） |
| POST | `/api/approval/action` | メールリンクからの承認/却下 |
| POST | `/api/download/[requestId]` | 透かし付きダウンロード |

### 画像・フォルダ
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/images` | アクセス可能な画像一覧 |
| GET | `/api/folders` | アクセス可能なフォルダ一覧 |

### 管理者：ユーザー
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/users` | ユーザー一覧 |
| POST | `/api/admin/users` | ユーザー作成 |
| PUT | `/api/admin/users/[id]` | ユーザー更新 |
| DELETE | `/api/admin/users/[id]` | ユーザー削除 |
| POST | `/api/admin/users/csv` | CSV一括インポート |

### 管理者：部門
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/departments` | 部門一覧 |
| POST | `/api/admin/departments` | 部門作成 |
| PUT | `/api/admin/departments/[id]` | 部門更新 |
| DELETE | `/api/admin/departments/[id]` | 部門削除 |

### 管理者：画像
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/images` | 全画像一覧 |
| POST | `/api/admin/images` | 画像登録 |
| PUT | `/api/admin/images/[id]` | 画像更新 |
| DELETE | `/api/admin/images/[id]` | 画像削除 |
| PUT | `/api/admin/images/[id]/permissions` | 権限設定 |
| POST | `/api/admin/images/upload-url` | 署名付きアップロードURL取得 |
| POST | `/api/admin/images/register` | アップロード後の登録 |

### 管理者：フォルダ
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/folders` | フォルダ一覧（ツリー構造） |
| POST | `/api/admin/folders` | フォルダ作成 |
| PUT | `/api/admin/folders/[id]` | フォルダ更新 |
| DELETE | `/api/admin/folders/[id]` | フォルダ削除（再帰的） |
| PUT | `/api/admin/folders/[id]/permissions` | 権限設定 |

### 管理者：申請
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/requests` | 全申請一覧 |
| POST | `/api/admin/requests` | 承認/却下処理 |
| POST | `/api/admin/requests/confirm-deletion` | 掲載終了確認（管理者） |

### その他
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/stats` | ダッシュボード統計 |
| POST | `/api/admin/watermark/verify` | 透かし検証 |
| GET | `/api/cron/deletion-reminders` | 削除リマインダー送信（Cron） |

---

## 7. 主要機能の実装詳細

### 7.1 透かし（ウォーターマーク）システム

**ファイル**: `/src/lib/watermark.ts`

LSB（Least Significant Bit）ステガノグラフィを使用した不可視透かし。

```typescript
// 透かしデータ構造
interface WatermarkData {
  requestId: string;
  downloaderName: string;
  approverName: string;
  downloadDate: string;
}

// 埋め込み処理
export async function addWatermark(
  imageBuffer: Buffer,
  data: WatermarkData
): Promise<Buffer> {
  // 1. JSON文字列に変換
  const jsonData = JSON.stringify(data);

  // 2. バイナリに変換
  const binaryData = textToBinary(jsonData);

  // 3. 画像のRGBチャンネルのLSBに埋め込み
  const image = await sharp(imageBuffer).raw().toBuffer();
  for (let i = 0; i < binaryData.length; i++) {
    image[i] = (image[i] & 0xFE) | parseInt(binaryData[i]);
  }

  // 4. PNGとして出力（可逆圧縮）
  return sharp(image).png().toBuffer();
}

// 読み取り処理
export async function readWatermark(
  imageBuffer: Buffer
): Promise<WatermarkData | null> {
  // LSBからバイナリを抽出してJSONに復元
}
```

### 7.2 2段階申請フロー

**ファイル**: `/src/app/page.tsx`

```typescript
// Step 1: 基本情報入力
const [requestStep, setRequestStep] = useState<1 | 2>(1);

// Step 2: 同意書確認
const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
const [hasWaitedEnough, setHasWaitedEnough] = useState(false);
const [remainingSeconds, setRemainingSeconds] = useState(10);

// スクロール検知
function handleConsentScroll(e: React.UIEvent<HTMLDivElement>) {
  const target = e.currentTarget;
  const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
  if (isAtBottom) {
    setHasScrolledToBottom(true);
    // 10秒タイマー開始
    if (!consentStartTime) {
      setConsentStartTime(Date.now());
    }
  }
}

// 申請ボタンの有効条件
const canSubmit = hasScrolledToBottom && hasWaitedEnough && agreedToTerms;
```

### 7.3 メールリンク承認

**ファイル**: `/src/app/api/approval/action/route.ts`

```typescript
// トークン検証
const { data: tokenData } = await supabase
  .from('approval_tokens')
  .select('*, approver:users(*)')
  .eq('token', token)
  .is('used_at', null)
  .gt('expires_at', new Date().toISOString())
  .single();

if (!tokenData) {
  return { error: 'トークンが無効または期限切れです' };
}

// 承認/却下処理
if (action === 'approve') {
  await supabase
    .from('approval_requests')
    .update({
      status: 'approved',
      approved_by: tokenData.approver_id,
      approved_at: new Date().toISOString(),
      expires_at: addDays(new Date(), 7).toISOString(),
    })
    .eq('id', tokenData.request_id);
}

// トークン無効化
await supabase
  .from('approval_tokens')
  .update({ used_at: new Date().toISOString() })
  .eq('id', tokenData.id);
```

### 7.4 署名付きアップロード

**ファイル**: `/src/app/api/admin/images/upload-url/route.ts`

```typescript
// クライアントサイドで直接Supabaseにアップロード
export async function POST(request: NextRequest) {
  const { filename, contentType, folderId } = await request.json();

  // 署名付きURLを生成
  const path = `${folderId || 'root'}/${uuid()}_${filename}`;
  const { data, error } = await supabase.storage
    .from('images')
    .createSignedUploadUrl(path, {
      upsert: false,
    });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: path,
  });
}
```

### 7.5 ファイルタイプ検証

**MIMEタイプチェック**:
```typescript
// 許可されるファイル形式
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

// video/* や image/* で始まるMIMEタイプも許可
const isVideo = allowedVideoTypes.includes(contentType) || contentType.startsWith('video/');
const isImage = allowedImageTypes.includes(contentType) || contentType.startsWith('image/');
```

**サイズ制限**:
- 画像: 最大50MB
- 動画: 最大500MB

**フォルダアップロード**:
- `webkitdirectory` 属性を使用
- `accept` 属性は使用しない（ネストフォルダ内ファイルの除外を防ぐ）

---

## 8. セキュリティ機能

### 8.1 認証
- Azure AD/Entra IDによるSSO
- JWTセッション（最大8時間）
- 事前登録制（DBに登録されたユーザーのみログイン可能）

### 8.2 認可
- ロールベースアクセス制御（admin/user）
- リソースレベル権限（view/download/edit）
- APIレベルでの権限チェック

### 8.3 ダウンロード制限
- 1申請につき1回のみ
- 承認後7日間の有効期限
- ワンタイムトークン

### 8.4 透かし
- LSBステガノグラフィ
- 編集不可（PNGの可逆圧縮で保持）
- ダウンロード者・承認者・日時を記録

### 8.5 監査
- 申請履歴の永続化（画像削除後も保持）
- 透かし検証機能
- 削除確認ワークフロー

### 8.6 画像削除時の申請履歴保持

画像が削除されても、関連する申請履歴は保持されます。

**データベース設計**:
```sql
-- approval_requests.image_id は ON DELETE SET NULL
image_id UUID REFERENCES images(id) ON DELETE SET NULL
```

**フロントエンド実装**:
```typescript
// ApprovalRequestインターフェース
interface ApprovalRequest {
  // ...
  image: Image | null;  // 削除された場合はnull
}

// 表示時のnullチェック
{request.image ? (
  <img src={getImageUrl(request.image.storage_path)} />
) : (
  <div className="placeholder">削除済</div>
)}

// ダウンロードボタンの制御
{request.status === 'approved' && request.image && (
  <button>ダウンロード</button>
)}
{request.status === 'approved' && !request.image && (
  <span>画像削除済み</span>
)}
```

**ダウンロード制限**:
- 1申請につき**1回のみ**ダウンロード可能
- `download_count >= 1` でダウンロード拒否
- ダウンロード後、ステータスが `downloaded` に変更

---

## 9. メール通知システム

**ファイル**: `/src/lib/email.ts`

### 送信タイミングと内容

| イベント | 受信者 | 関数名 | 内容 |
|----------|--------|--------|------|
| 申請作成 | 申請者 | `sendRequestConfirmationEmail` | 申請受付確認 |
| 申請作成 | 部門長・社長 | `sendApprovalRequestEmail` | ワンクリック承認リンク |
| 承認 | 申請者 | `sendApprovalResultEmail` | 承認通知・DLリンク |
| 却下 | 申請者 | `sendApprovalResultEmail` | 却下通知・理由 |
| 掲載期限後 | 申請者・承認者 | `sendDeletionReminderEmail` | 削除確認リマインダー |

### メールテンプレート

Outlook対応のため、VML方式のボタンを使用：

```typescript
function createEmailButton(href: string, text: string, bgColor: string) {
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}"
      style="height:48px;width:200px;" arcsize="17%" fillcolor="${bgColor}">
      <center><![endif]-->
    <a href="${href}" style="background-color:${bgColor};...">
      ${text}
    </a>
    <!--[if mso]></center></v:roundrect><![endif]-->
  `;
}
```

---

## 10. 環境構築

### 必要な環境変数

```env
# Next.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Azure AD
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SendGrid
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Cron（Vercel）
CRON_SECRET=your-cron-secret
```

### データベースセットアップ

```bash
# マイグレーション実行（Supabase SQLエディタで）
001_initial_schema.sql
002_folder_permissions.sql
003_permission_levels.sql
004_video_support.sql
005_usage_consent.sql
006_comments.sql
007_default_permission.sql
008_preserve_request_history.sql
```

### ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番起動
npm run start
```

### Vercel Cron設定（`vercel.json`）

```json
{
  "crons": [
    {
      "path": "/api/cron/deletion-reminders",
      "schedule": "0 5 * * *"
    }
  ]
}
```
※ UTC 5:00 = JST 14:00

---

## 付録：トラブルシューティング

### よくあるエラー

| エラー | 原因 | 対処 |
|--------|------|------|
| `この画像へのアクセス権限がありません` | 権限設定が不足 | フォルダ/画像の権限を確認 |
| `ダウンロード期限が切れています` | 7日経過 | 再申請が必要 |
| `既にダウンロード済みです` | 1回制限（`download_count >= 1`） | 再申請が必要 |
| `トークンが無効です` | 期限切れ/使用済み | 再送信または管理画面から処理 |
| `画像が削除されたためダウンロードできません` | 画像がDBから削除済み | 画像の再アップロードが必要 |
| `ファイル登録に失敗しました` | DB登録エラー | サーバーログを確認、MIMEタイプ・ストレージ確認 |

### ログ確認

```typescript
// APIエラーログ
console.error('API名 error:', error);

// Vercelログ
// Vercel Dashboard > Deployments > Functions
```
