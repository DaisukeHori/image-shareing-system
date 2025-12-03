import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// アップロード完了後にDBに登録
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
    const { path, filename, originalFilename, contentType, fileSize, folderId, isVideo } = body;

    if (!path || !filename || !originalFilename || !contentType) {
      return NextResponse.json(
        { success: false, error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ファイルが実際にアップロードされているか確認
    const { data: fileData, error: fileError } = await supabase.storage
      .from('images')
      .list('images', {
        search: filename,
      });

    // ファイルが見つからない場合でも、パスで直接確認
    const { data: existsData } = await supabase.storage
      .from('images')
      .createSignedUrl(path, 60);

    if (!existsData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: 'アップロードされたファイルが見つかりません' },
        { status: 400 }
      );
    }

    // DBに画像/動画情報を保存
    // 注意: Edge Function (FFmpeg WASM) はSupabaseのDeno環境で動作しないため、
    // 動画のサムネイル生成は無効化。ブラウザの標準プレーヤーでプレビュー表示。
    const { data, error } = await supabase
      .from('images')
      .insert({
        folder_id: folderId || null,
        filename,
        original_filename: originalFilename,
        storage_path: path,
        file_size: fileSize || 0,
        mime_type: contentType,
        file_type: isVideo ? 'video' : 'image',
        processing_status: 'none', // サムネイル生成は無効化
      })
      .select()
      .single();

    if (error) throw error;

    // 動画のサムネイル生成は現在無効化（Edge Function/FFmpegの制限のため）
    // 将来的にクライアントサイドでのサムネイル生成を検討

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Image registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `ファイル登録に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
