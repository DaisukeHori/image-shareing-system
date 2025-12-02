-- フォルダにデフォルト権限カラムを追加
-- 値: 'none' | 'view' | 'download' | 'edit'
-- none: 明示的な権限がない場合アクセス不可（現在の動作）
-- view: 全ユーザーが閲覧可能
-- download: 全ユーザーがダウンロード可能
-- edit: 全ユーザーが編集可能

ALTER TABLE folders
ADD COLUMN IF NOT EXISTS default_permission VARCHAR(20) DEFAULT 'none';

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_folders_default_permission
ON folders(default_permission);

-- 画像にもデフォルト権限カラムを追加（フォルダと同様）
ALTER TABLE images
ADD COLUMN IF NOT EXISTS default_permission VARCHAR(20) DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_images_default_permission
ON images(default_permission);
