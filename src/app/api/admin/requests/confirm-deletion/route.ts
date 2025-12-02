import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 管理者による掲載終了確認
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: '申請IDは必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 申請を取得
    const { data: requestData, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { success: false, error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // ダウンロード済みかつ掲載期限切れかチェック
    if (requestData.status !== 'downloaded') {
      return NextResponse.json(
        { success: false, error: 'ダウンロード済みの申請のみ確認できます' },
        { status: 400 }
      );
    }

    if (!requestData.usage_end_date) {
      return NextResponse.json(
        { success: false, error: '掲載終了日が設定されていません' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    if (requestData.usage_end_date >= today) {
      return NextResponse.json(
        { success: false, error: '掲載期限がまだ切れていません' },
        { status: 400 }
      );
    }

    // 既に確認済みかチェック
    if (requestData.deletion_confirmed_approver) {
      return NextResponse.json(
        { success: false, error: '既に確認済みです' },
        { status: 400 }
      );
    }

    // 確認を更新
    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({
        deletion_confirmed_approver: true,
        deletion_confirmed_approver_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '掲載終了を確認しました',
    });
  } catch (error) {
    console.error('Admin confirm deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
