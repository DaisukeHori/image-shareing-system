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

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズが大きすぎます（10MB以下にしてください）' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `サポートされていないファイル形式です: ${file.type}。PNG, JPEG, WebPのみ対応しています。` },
        { status: 400 }
      );
    }

    console.log(`Processing watermark verification: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // 画像バッファを取得
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 電子透かしを読み取り
    let watermarkInfo;
    try {
      watermarkInfo = await readWatermark(imageBuffer);
    } catch (readError) {
      console.error('Watermark read error:', readError);
      return NextResponse.json({
        success: true,
        data: {
          found: false,
          message: '電子透かしの読み取りに失敗しました。画像が破損しているか、形式が異なる可能性があります。',
        },
      });
    }

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
          department:departments!users_department_id_fkey (
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
    let errorMessage = '検証中にエラーが発生しました';

    if (error instanceof Error) {
      if (error.message.includes('unsupported image format') ||
          error.message.includes('Input file is missing')) {
        errorMessage = 'サポートされていない画像形式です。PNG, JPEG, WebP形式の画像を使用してください。';
      } else if (error.message.includes('Input buffer contains unsupported image format')) {
        errorMessage = '画像ファイルが破損しているか、サポートされていない形式です。';
      } else {
        errorMessage = `検証中にエラーが発生しました: ${error.message}`;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
