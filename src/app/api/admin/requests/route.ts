import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendApprovalResultEmail } from '@/lib/email';
import { addDays } from 'date-fns';

// 承認申請一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = createServiceClient();

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email,
          department:departments!users_department_id_fkey (
            id,
            name
          )
        ),
        image:images (
          id,
          original_filename,
          storage_path
        ),
        approver:users!approval_requests_approved_by_fkey (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Requests GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 管理者による承認・却下処理
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId, action, rejectionReason, approverComment } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: '申請IDとアクションは必須です' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: '無効なアクションです' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: '却下理由を入力してください' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 申請を取得
    const { data: requestData, error: fetchError } = await supabase
      .from('approval_requests')
      .select(`
        *,
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { success: false, error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 既に処理済みか確認
    if (requestData.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'この申請は既に処理されています' },
        { status: 400 }
      );
    }

    const isApprove = action === 'approve';
    const expiresAt = isApprove ? addDays(new Date(), 7).toISOString() : null;

    // 申請を更新
    const updateData = isApprove
      ? {
          status: 'approved' as const,
          approved_by: session.user.id,
          approved_at: new Date().toISOString(),
          expires_at: expiresAt,
          approver_comment: approverComment?.trim() || null,
        }
      : {
          status: 'rejected' as const,
          rejected_by: session.user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          approver_comment: approverComment?.trim() || null,
        };

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      throw updateError;
    }

    // 既存のトークンを無効化
    await supabase
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .is('used_at', null);

    // 申請者にメール通知
    try {
      await sendApprovalResultEmail(
        {
          id: requestData.id,
          request_number: requestData.request_number,
          status: isApprove ? 'approved' : 'rejected',
        },
        {
          email: requestData.user.email,
          name: requestData.user.name,
        },
        {
          name: session.user.name || '管理者',
        }
      );
    } catch (emailError) {
      console.error('Failed to send result email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: isApprove ? '承認しました' : '却下しました',
    });
  } catch (error) {
    console.error('Admin request action error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
