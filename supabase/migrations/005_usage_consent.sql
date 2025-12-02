-- =============================================
-- 利用同意・利用期間・削除確認機能の追加
-- =============================================

-- 利用目的タイプのENUM型を作成
DO $$ BEGIN
    CREATE TYPE purpose_type AS ENUM (
        'hotpepper',
        'website',
        'sns',
        'print',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- approval_requestsテーブルに新しいカラムを追加
-- 利用目的タイプ
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS purpose_type purpose_type;

-- その他の場合の詳細
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS purpose_other TEXT;

-- 利用終了日
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS usage_end_date DATE;

-- 利用規約への同意
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE;

-- 削除確認（ユーザー）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_confirmed_user BOOLEAN NOT NULL DEFAULT FALSE;

-- 削除確認日時（ユーザー）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_confirmed_user_at TIMESTAMP WITH TIME ZONE;

-- 削除確認（承認者）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_confirmed_approver BOOLEAN NOT NULL DEFAULT FALSE;

-- 削除確認日時（承認者）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_confirmed_approver_at TIMESTAMP WITH TIME ZONE;

-- 削除リマインダー最終送信日時
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- 削除確認トークン（ユーザー用）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_token_user VARCHAR(64);

-- 削除確認トークン（承認者用）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deletion_token_approver VARCHAR(64);

-- コメント追加
COMMENT ON COLUMN approval_requests.purpose_type IS '利用目的タイプ: hotpepper, website, sns, print, other';
COMMENT ON COLUMN approval_requests.purpose_other IS 'その他の場合の詳細';
COMMENT ON COLUMN approval_requests.usage_end_date IS '利用終了日';
COMMENT ON COLUMN approval_requests.agreed_to_terms IS '利用規約への同意';
COMMENT ON COLUMN approval_requests.deletion_confirmed_user IS 'ユーザーによる削除確認';
COMMENT ON COLUMN approval_requests.deletion_confirmed_approver IS '承認者による削除確認';
COMMENT ON COLUMN approval_requests.deletion_reminder_sent_at IS '削除リマインダー最終送信日時';

-- インデックス追加（期限切れチェック用）
CREATE INDEX IF NOT EXISTS idx_approval_requests_usage_end_date
ON approval_requests(usage_end_date)
WHERE status = 'downloaded' AND usage_end_date IS NOT NULL;
