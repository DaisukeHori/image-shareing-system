import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 申請キャンセル（削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { id: requestId } = await params;
    const supabase = createServiceClient();

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 申請を取得して所有者とステータスを確認
    const { data: approvalRequest, error: requestError } = await supabase
      .from('approval_requests')
      .select('id, requester_id, status')
      .eq('id', requestId)
      .single();

    if (requestError || !approvalRequest) {
      return NextResponse.json(
        { success: false, error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 申請者本人かどうか確認
    if (approvalRequest.requester_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '自分の申請のみキャンセルできます' },
        { status: 403 }
      );
    }

    // pending ステータスのみキャンセル可能
    if (approvalRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '承認待ち状態の申請のみキャンセルできます' },
        { status: 400 }
      );
    }

    // 申請を削除
    const { error: deleteError } = await supabase
      .from('approval_requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('Delete request error:', deleteError);
      return NextResponse.json(
        { success: false, error: '申請のキャンセルに失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel request error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
