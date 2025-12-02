-- 申請者と承認者間のコメント機能

-- 申請者のコメント（申請時に承認者へ）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS requester_comment TEXT;

-- 承認者のコメント（承認・却下時に申請者へ）
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS approver_comment TEXT;

-- コメント: rejection_reason は却下時の理由として既存
-- approver_comment は承認時にも使えるコメント欄として追加
