import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendDeletionReminderEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// Vercel Cron または外部スケジューラーから呼び出される
// 毎日14:00 JST に実行
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cron からの呼び出しを想定）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const today = new Date().toISOString().split('T')[0];

    // 期限切れのダウンロード済み申請を検索
    // 条件: status = 'downloaded' AND usage_end_date < 今日 AND (本人または承認者が未確認)
    const { data: expiredRequests, error } = await supabase
      .from('approval_requests')
      .select(`
        id,
        request_number,
        usage_end_date,
        deletion_confirmed_user,
        deletion_confirmed_approver,
        deletion_token_user,
        deletion_token_approver,
        image:images (
          id,
          original_filename
        ),
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email
        ),
        approver:users!approval_requests_approved_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('status', 'downloaded')
      .not('usage_end_date', 'is', null)
      .lt('usage_end_date', today)
      .or('deletion_confirmed_user.eq.false,deletion_confirmed_approver.eq.false');

    if (error) {
      throw error;
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: '期限切れの申請はありません',
        processed: 0,
      });
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const req of expiredRequests) {
      try {
        // トークンがなければ生成
        let userToken = req.deletion_token_user;
        let approverToken = req.deletion_token_approver;
        const updates: Record<string, unknown> = {
          deletion_reminder_sent_at: new Date().toISOString(),
        };

        if (!userToken) {
          userToken = uuidv4().replace(/-/g, '');
          updates.deletion_token_user = userToken;
        }

        if (!approverToken) {
          approverToken = uuidv4().replace(/-/g, '');
          updates.deletion_token_approver = approverToken;
        }

        // トークンを更新
        await supabase
          .from('approval_requests')
          .update(updates)
          .eq('id', req.id);

        const baseParams = {
          requestNumber: req.request_number,
          imageName: req.image?.original_filename || '不明',
          usageEndDate: req.usage_end_date!,
          userName: req.user?.name || '不明',
        };

        // 申請者に未確認の場合はメール送信
        if (!req.deletion_confirmed_user && req.user?.email) {
          const userConfirmUrl = `${appUrl}/confirm-deletion?token=${userToken}&role=user`;
          await sendDeletionReminderEmail(
            req.user.email,
            { ...baseParams, confirmUrl: userConfirmUrl },
            'user'
          );
        }

        // 承認者に未確認の場合はメール送信
        if (!req.deletion_confirmed_approver && req.approver?.email) {
          const approverConfirmUrl = `${appUrl}/confirm-deletion?token=${approverToken}&role=approver`;
          await sendDeletionReminderEmail(
            req.approver.email,
            { ...baseParams, confirmUrl: approverConfirmUrl },
            'approver'
          );
        }

        processedCount++;
      } catch (err) {
        console.error(`Failed to process request ${req.id}:`, err);
        errors.push(`${req.request_number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `削除リマインダーを送信しました`,
      processed: processedCount,
      total: expiredRequests.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Deletion reminders cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POSTでも呼び出し可能に（手動実行用）
export async function POST(request: NextRequest) {
  return GET(request);
}
