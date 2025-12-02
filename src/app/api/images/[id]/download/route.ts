import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 直接ダウンロード（download/edit権限を持つユーザー向け）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = createServiceClient();
    const userId = session.user.id;

    // 画像情報を取得
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('id, storage_path, folder_id')
      .eq('id', id)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // 権限をチェック（download または edit レベルが必要）
    // 1. 画像単位の権限をチェック
    const { data: imagePerms } = await supabase
      .from('image_permissions')
      .select('level')
      .eq('image_id', id)
      .eq('user_id', userId);

    let hasDownloadPermission = false;

    if (imagePerms && imagePerms.length > 0) {
      const level = imagePerms[0].level;
      if (level === 'download' || level === 'edit') {
        hasDownloadPermission = true;
      }
    }

    // 2. フォルダ単位の権限をチェック
    if (!hasDownloadPermission && image.folder_id) {
      const { data: folderPerms } = await supabase
        .from('folder_permissions')
        .select('level')
        .eq('folder_id', image.folder_id)
        .eq('user_id', userId);

      if (folderPerms && folderPerms.length > 0) {
        const level = folderPerms[0].level;
        if (level === 'download' || level === 'edit') {
          hasDownloadPermission = true;
        }
      }
    }

    if (!hasDownloadPermission) {
      return NextResponse.json(
        { success: false, error: 'Download permission required' },
        { status: 403 }
      );
    }

    // 署名付きURLを生成（1時間有効）
    const { data: signedData, error: signedError } = await supabase.storage
      .from('images')
      .createSignedUrl(image.storage_path, 3600);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      downloadUrl: signedData.signedUrl,
    });
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
