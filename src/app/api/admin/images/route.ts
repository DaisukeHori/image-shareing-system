import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// 動的レンダリングを強制（キャッシュ無効化）
export const dynamic = 'force-dynamic';

// 最大実行時間を延長（秒単位、Vercel Proの場合は300まで可能）
export const maxDuration = 120;

// 画像一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folder_id');

    const supabase = createServiceClient();

    let query = supabase
      .from('images')
      .select(`
        *,
        folder:folders (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      // ルートフォルダの場合、folder_idがnullの画像のみ表示
      query = query.is('folder_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Images GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 画像アップロード
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
    const folderId = formData.get('folder_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    // 動画かどうかの判定（video/で始まるMIMEタイプも許可）
    const isVideo = allowedVideoTypes.includes(file.type) || file.type.startsWith('video/');

    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: '対応形式: 画像(JPEG, PNG, WebP, GIF) / 動画(MP4, WebM, MOV, AVI, MKV)' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック (画像: 50MB, 動画: 500MB)
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    const maxSizeLabel = isVideo ? '500MB' : '50MB';
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `ファイルサイズは${maxSizeLabel}以下にしてください` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ユニークなファイル名を生成
    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const storagePath = `images/${filename}`;

    // Storageにアップロード
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // DBに画像/動画情報を保存
    const { data, error } = await supabase
      .from('images')
      .insert({
        folder_id: folderId || null,
        filename,
        original_filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        file_type: isVideo ? 'video' : 'image',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Images POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
