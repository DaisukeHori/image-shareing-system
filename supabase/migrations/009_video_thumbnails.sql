-- 動画サムネイルと低画質プレビュー用のカラムを追加
ALTER TABLE images
ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS preview_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- 処理状態を追跡するカラム
ALTER TABLE images
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'none';
-- none: 処理不要（画像）, pending: 処理待ち, processing: 処理中, completed: 完了, failed: 失敗

COMMENT ON COLUMN images.thumbnail_path IS '動画のサムネイル画像パス（JPEG）';
COMMENT ON COLUMN images.preview_path IS '低画質プレビュー動画パス';
COMMENT ON COLUMN images.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN images.processing_status IS '動画処理状態: none, pending, processing, completed, failed';
