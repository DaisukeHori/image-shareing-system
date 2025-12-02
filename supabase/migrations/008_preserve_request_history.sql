-- 画像削除時に申請履歴を保持するようにする
-- 現在: ON DELETE CASCADE（画像削除時に申請も削除される）
-- 変更後: ON DELETE SET NULL（画像削除時にimage_idをNULLにして履歴を保持）

-- 既存の外部キー制約を削除
ALTER TABLE approval_requests
DROP CONSTRAINT IF EXISTS approval_requests_image_id_fkey;

-- image_idをNULL許容に変更
ALTER TABLE approval_requests
ALTER COLUMN image_id DROP NOT NULL;

-- 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE approval_requests
ADD CONSTRAINT approval_requests_image_id_fkey
FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL;

-- 画像が削除された申請を識別するためのカラムを追加
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS deleted_image_filename VARCHAR(255);

-- 画像削除前にファイル名を保存するトリガー関数
CREATE OR REPLACE FUNCTION save_deleted_image_filename()
RETURNS TRIGGER AS $$
BEGIN
  -- 画像が削除される前に、関連する申請のdeleted_image_filenameを更新
  UPDATE approval_requests
  SET deleted_image_filename = OLD.original_filename
  WHERE image_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（存在しない場合のみ）
DROP TRIGGER IF EXISTS before_image_delete ON images;
CREATE TRIGGER before_image_delete
BEFORE DELETE ON images
FOR EACH ROW
EXECUTE FUNCTION save_deleted_image_filename();
