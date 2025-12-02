-- =============================================
-- 動画サポートの追加
-- file_type: 'image' または 'video' を区別
-- duration: 動画の長さ（秒）
-- =============================================

-- imagesテーブルにファイルタイプ列を追加
ALTER TABLE images
ADD COLUMN IF NOT EXISTS file_type VARCHAR(10) NOT NULL DEFAULT 'image'
CHECK (file_type IN ('image', 'video'));

-- 動画の長さ（秒）を格納する列を追加
ALTER TABLE images
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- 既存のレコードをimageに設定（すでにDEFAULTで設定されるが明示的に）
UPDATE images SET file_type = 'image' WHERE file_type IS NULL;

-- コメント追加
COMMENT ON COLUMN images.file_type IS 'ファイルの種類: image または video';
COMMENT ON COLUMN images.duration IS '動画の長さ（秒）、画像の場合はNULL';
