import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendApprovalResultEmail } from '@/lib/email';
import { addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return createErrorPage('トークンが無効です');
    }

    const supabase = createServiceClient();

    // トークンを検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .select(`
        *,
        request:approval_requests (
          id,
          request_number,
          status,
          user:users!approval_requests_user_id_fkey (
            id,
            name,
            email
          ),
          image:images (
            id,
            original_filename
          )
        ),
        approver:users!approval_tokens_approver_id_fkey (
          id,
          name
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return createErrorPage('トークンが見つかりません');
    }

    // トークンの有効期限チェック
    if (new Date(tokenData.expires_at) < new Date()) {
      return createErrorPage('トークンの有効期限が切れています');
    }

    // トークンが既に使用済みか確認
    if (tokenData.used_at) {
      return createErrorPage('このトークンは既に使用されています');
    }

    // 申請が既に処理済みか確認
    if (tokenData.request.status !== 'pending') {
      return createResultPage(
        '申請は既に処理されています',
        `この申請は既に${tokenData.request.status === 'approved' ? '承認' : '却下'}されています。`
      );
    }

    const isApprove = tokenData.action === 'approve';
    const expiresAt = isApprove ? addDays(new Date(), 7).toISOString() : null;

    // 申請を更新
    const updateData = isApprove
      ? {
          status: 'approved',
          approved_by: tokenData.approver_id,
          approved_at: new Date().toISOString(),
          expires_at: expiresAt,
        }
      : {
          status: 'rejected',
          rejected_by: tokenData.approver_id,
          rejected_at: new Date().toISOString(),
        };

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', tokenData.request_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return createErrorPage('更新に失敗しました');
    }

    // トークンを使用済みにマーク
    await supabase
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // 同じ申請の他のトークンも無効化
    await supabase
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('request_id', tokenData.request_id)
      .is('used_at', null);

    // 申請者にメール通知
    try {
      await sendApprovalResultEmail(
        {
          id: tokenData.request.id,
          request_number: tokenData.request.request_number,
          status: isApprove ? 'approved' : 'rejected',
        },
        {
          email: tokenData.request.user.email,
          name: tokenData.request.user.name,
        },
        {
          name: tokenData.approver.name,
        }
      );
    } catch (emailError) {
      console.error('Failed to send result email:', emailError);
    }

    return createResultPage(
      isApprove ? '承認しました' : '却下しました',
      isApprove
        ? `申請番号 ${tokenData.request.request_number} を承認しました。申請者にダウンロードリンクが送信されます。`
        : `申請番号 ${tokenData.request.request_number} を却下しました。申請者に通知されます。`,
      isApprove
    );
  } catch (error) {
    console.error('Approval action error:', error);
    return createErrorPage('処理中にエラーが発生しました');
  }
}

function createErrorPage(message: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>エラー - レボル 画像管理システム</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: #fee2e2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        h1 { color: #ef4444; margin: 0 0 16px; font-size: 24px; }
        p { color: #666; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✕</div>
        <h1>エラー</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function createResultPage(title: string, message: string, isSuccess = true) {
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - レボル 画像管理システム</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: ${isSuccess ? '#dcfce7' : '#fef3c7'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        h1 { color: ${isSuccess ? '#22c55e' : '#f59e0b'}; margin: 0 0 16px; font-size: 24px; }
        p { color: #666; margin: 0; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${isSuccess ? '✓' : '!'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
