-- =============================================
-- フォルダ単位のアクセス権限テーブル追加
-- =============================================

-- フォルダアクセス権限テーブル（ユーザー単位）
CREATE TABLE IF NOT EXISTS folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(folder_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user ON folder_permissions(user_id);

-- RLSを有効化
ALTER TABLE folder_permissions ENABLE ROW LEVEL SECURITY;
