-- =============================================
-- 権限レベルの追加
-- edit: 編集・削除可
-- download: ダウンロード可
-- view: 閲覧のみ
-- (権限なし = レコードが存在しない = 非表示)
-- =============================================

-- 権限レベルのENUM型を作成
DO $$ BEGIN
    CREATE TYPE permission_level AS ENUM ('view', 'download', 'edit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- image_permissionsテーブルに権限レベル列を追加
ALTER TABLE image_permissions
ADD COLUMN IF NOT EXISTS level permission_level NOT NULL DEFAULT 'view';

-- folder_permissionsテーブルに権限レベル列を追加
ALTER TABLE folder_permissions
ADD COLUMN IF NOT EXISTS level permission_level NOT NULL DEFAULT 'view';

-- 既存のレコードをview権限に設定（すでにDEFAULTで設定されるが明示的に）
UPDATE image_permissions SET level = 'view' WHERE level IS NULL;
UPDATE folder_permissions SET level = 'view' WHERE level IS NULL;
