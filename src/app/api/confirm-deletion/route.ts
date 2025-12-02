import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// 削除確認処理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, role } = body;

    if (!token || !role) {
      return NextResponse.json(
        { success: false, error: 'トークンとロールは必須です' },
        { status: 400 }
      );
    }

    if (role !== 'user' && role !== 'approver') {
      return NextResponse.json(
        { success: false, error: '無効なロールです' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // トークンで申請を検索
    const tokenColumn = role === 'user' ? 'deletion_token_user' : 'deletion_token_approver';
    const { data: request_data, error: findError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq(tokenColumn, token)
      .single();

    if (findError || !request_data) {
      return NextResponse.json(
        { success: false, error: '無効なトークンです。リンクが期限切れか、既に使用されている可能性があります。' },
        { status: 404 }
      );
    }

    // 削除確認を更新
    const updateData = role === 'user'
      ? { deletion_confirmed_user: true, deletion_confirmed_user_at: new Date().toISOString() }
      : { deletion_confirmed_approver: true, deletion_confirmed_approver_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', request_data.id);

    if (updateError) {
      throw updateError;
    }

    // 両者が確認済みかチェック
    const { data: updatedRequest } = await supabase
      .from('approval_requests')
      .select('deletion_confirmed_user, deletion_confirmed_approver')
      .eq('id', request_data.id)
      .single();

    const bothConfirmed = updatedRequest?.deletion_confirmed_user && updatedRequest?.deletion_confirmed_approver;

    return NextResponse.json({
      success: true,
      message: '削除確認が完了しました。',
      bothConfirmed,
    });
  } catch (error) {
    console.error('Confirm deletion error:', error);
    return NextResponse.json(
      { success: false, error: '削除確認に失敗しました' },
      { status: 500 }
    );
  }
}

// トークンの検証（ページ表示用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    if (!token || !role) {
      return NextResponse.json(
        { success: false, error: 'トークンとロールは必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // トークンで申請を検索
    const tokenColumn = role === 'user' ? 'deletion_token_user' : 'deletion_token_approver';
    const { data: request_data, error } = await supabase
      .from('approval_requests')
      .select(`
        id,
        request_number,
        usage_end_date,
        deletion_confirmed_user,
        deletion_confirmed_approver,
        image:images (
          id,
          original_filename,
          storage_path
        ),
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq(tokenColumn, token)
      .single();

    if (error || !request_data) {
      return NextResponse.json(
        { success: false, error: '無効なトークンです' },
        { status: 404 }
      );
    }

    // 既に確認済みかチェック
    const alreadyConfirmed = role === 'user'
      ? request_data.deletion_confirmed_user
      : request_data.deletion_confirmed_approver;

    return NextResponse.json({
      success: true,
      data: {
        request_number: request_data.request_number,
        usage_end_date: request_data.usage_end_date,
        image_name: request_data.image?.original_filename,
        user_name: request_data.user?.name,
        alreadyConfirmed,
        bothConfirmed: request_data.deletion_confirmed_user && request_data.deletion_confirmed_approver,
      },
    });
  } catch (error) {
    console.error('Get deletion info error:', error);
    return NextResponse.json(
      { success: false, error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
