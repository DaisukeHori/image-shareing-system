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
          storage_path,
          file_type,
          mime_type
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
    const { image_id, purpose_type, purpose_other, usage_end_date, agreed_to_terms } = body;

    // バリデーション
    if (!image_id || !purpose_type || !usage_end_date) {
      return NextResponse.json(
        { success: false, error: '画像、利用目的、掲載終了日は必須です' },
        { status: 400 }
      );
    }

    if (!agreed_to_terms) {
      return NextResponse.json(
        { success: false, error: '利用規約への同意が必要です' },
        { status: 400 }
      );
    }

    // 利用目的タイプの検証
    const validPurposeTypes = ['hotpepper', 'website', 'sns', 'print', 'other'];
    if (!validPurposeTypes.includes(purpose_type)) {
      return NextResponse.json(
        { success: false, error: '無効な利用目的です' },
        { status: 400 }
      );
    }

    // その他の場合は詳細が必須
    if (purpose_type === 'other' && !purpose_other?.trim()) {
      return NextResponse.json(
        { success: false, error: 'その他の利用目的の詳細を入力してください' },
        { status: 400 }
      );
    }

    // 掲載終了日のバリデーション（明日から1年以内）
    const endDate = new Date(usage_end_date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    maxDate.setHours(23, 59, 59, 999);

    if (endDate < tomorrow || endDate > maxDate) {
      return NextResponse.json(
        { success: false, error: '掲載終了日は明日から1年以内で指定してください' },
        { status: 400 }
      );
    }

    // 表示用の利用目的テキストを生成
    const purposeLabels: Record<string, string> = {
      hotpepper: '自店のホットペッパービューティー掲載ページ',
      website: '自店の公式ホームページおよびブログ',
      sns: '自店の公式SNSアカウント',
      print: '自店で使用するチラシ、DM、POPなどの販促物',
      other: 'その他',
    };
    const purpose = purpose_type === 'other'
      ? `その他: ${purpose_other}`
      : purposeLabels[purpose_type];

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
        purpose_type,
        purpose_other: purpose_type === 'other' ? purpose_other : null,
        usage_end_date,
        agreed_to_terms: true,
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
