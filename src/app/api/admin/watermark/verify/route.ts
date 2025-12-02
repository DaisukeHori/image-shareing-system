import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readWatermark } from '@/lib/watermark';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // 画像バッファを取得
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 電子透かしを読み取り
    const watermarkInfo = await readWatermark(imageBuffer);

    if (!watermarkInfo) {
      return NextResponse.json({
        success: true,
        data: {
          found: false,
          message: '電子透かしが見つかりませんでした。この画像には透かしが埋め込まれていないか、形式が異なる可能性があります。',
        },
      });
    }

    // 申請情報を取得
    const supabase = createServiceClient();
    const { data: requestData } = await supabase
      .from('approval_requests')
      .select(`
        *,
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email,
          department:departments (
            name
          )
        ),
        image:images (
          original_filename
        ),
        approver:users!approval_requests_approved_by_fkey (
          name
        )
      `)
      .eq('request_number', watermarkInfo.requestId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        watermark: watermarkInfo,
        request: requestData || null,
      },
    });
  } catch (error) {
    console.error('Watermark verify error:', error);
    return NextResponse.json(
      { success: false, error: '検証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
