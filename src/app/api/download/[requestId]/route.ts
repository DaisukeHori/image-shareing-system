import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { addWatermark } from '@/lib/watermark';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { requestId } = await params;
    const supabase = createServiceClient();

    // 申請情報を取得
    const { data: approvalRequest, error: requestError } = await supabase
      .from('approval_requests')
      .select(`
        *,
        image:images (
          id,
          original_filename,
          storage_path,
          mime_type
        ),
        approver:users!approval_requests_approved_by_fkey (
          id,
          name
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !approvalRequest) {
      return NextResponse.json(
        { success: false, error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 申請者本人か確認
    if (approvalRequest.user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'この申請へのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // 承認済みか確認
    if (approvalRequest.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'この申請はまだ承認されていません' },
        { status: 400 }
      );
    }

    // 有効期限チェック
    if (
      approvalRequest.expires_at &&
      new Date(approvalRequest.expires_at) < new Date()
    ) {
      // ステータスを期限切れに更新
      await supabase
        .from('approval_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);

      return NextResponse.json(
        { success: false, error: 'ダウンロードの有効期限が切れています' },
        { status: 400 }
      );
    }

    // ダウンロード回数チェック（1回のみ）
    if (approvalRequest.download_count >= 1) {
      return NextResponse.json(
        { success: false, error: '既にダウンロード済みです' },
        { status: 400 }
      );
    }

    // Storageから画像を取得
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('images')
      .download(approvalRequest.image.storage_path);

    if (downloadError || !imageData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { success: false, error: '画像の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 画像バッファを取得
    const imageBuffer = Buffer.from(await imageData.arrayBuffer());

    // 電子透かしを追加
    const watermarkedImage = await addWatermark(imageBuffer, {
      downloaderName: session.user.name,
      approverName: approvalRequest.approver?.name || '不明',
      requestId: approvalRequest.request_number,
      downloadDate: format(new Date(), 'yyyy/MM/dd HH:mm', { locale: ja }),
    });

    // ダウンロード回数を更新し、ステータスを変更
    await supabase
      .from('approval_requests')
      .update({
        download_count: approvalRequest.download_count + 1,
        downloaded_at: new Date().toISOString(),
        status: 'downloaded',
      })
      .eq('id', requestId);

    // ファイル名を生成（PNG形式で出力）
    const originalFilename = approvalRequest.image.original_filename;
    const baseName = originalFilename.replace(/\.[^/.]+$/, '');
    const downloadFilename = `${approvalRequest.request_number}_${baseName}.png`;

    // 画像を返す（不可視透かし保持のためPNG形式）
    return new NextResponse(new Uint8Array(watermarkedImage), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'ダウンロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
