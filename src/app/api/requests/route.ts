import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendApprovalRequestEmail } from '@/lib/email';

// ユーザーの申請一覧取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        image:images (
          id,
          original_filename,
          storage_path
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

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

// 新規申請作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { image_id, purpose } = body;

    if (!image_id || !purpose) {
      return NextResponse.json(
        { success: false, error: '画像と利用目的は必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ユーザーがこの画像にアクセス権限を持っているか確認
    const { data: permission } = await supabase
      .from('image_permissions')
      .select('id')
      .eq('image_id', image_id)
      .eq('user_id', session.user.id)
      .single();

    if (!permission) {
      return NextResponse.json(
        { success: false, error: 'この画像へのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // 既に保留中の申請がないか確認
    const { data: existingRequest } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('image_id', image_id)
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'この画像には既に保留中の申請があります' },
        { status: 400 }
      );
    }

    // 申請を作成
    const { data: newRequest, error: insertError } = await supabase
      .from('approval_requests')
      .insert({
        user_id: session.user.id,
        image_id,
        purpose,
      })
      .select(`
        *,
        image:images (
          id,
          original_filename,
          storage_path
        )
      `)
      .single();

    if (insertError) throw insertError;

    // 承認者（所属長と社長）にメール通知を送信
    try {
      await sendApprovalRequestEmail(newRequest, session.user);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // メール送信失敗でも申請自体は成功させる
    }

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    console.error('Requests POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
