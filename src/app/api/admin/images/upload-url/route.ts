import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// 署名付きアップロードURLを生成
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
    const { filename, contentType, fileSize, folderId } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { success: false, error: 'ファイル名とコンテンツタイプが必要です' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    const isVideo = allowedVideoTypes.includes(contentType);

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: '対応形式: 画像(JPEG, PNG, WebP, GIF) / 動画(MP4, WebM, MOV, AVI, MKV)' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック (画像: 50MB, 動画: 500MB)
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    const maxSizeLabel = isVideo ? '500MB' : '50MB';
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: `ファイルサイズは${maxSizeLabel}以下にしてください` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ユニークなファイル名を生成
    const ext = filename.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${ext}`;
    const storagePath = `images/${uniqueFilename}`;

    // 署名付きアップロードURLを生成（有効期限: 10分）
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('Failed to create signed URL:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
        filename: uniqueFilename,
        originalFilename: filename,
        contentType,
        fileSize,
        folderId: folderId || null,
        isVideo,
      },
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { success: false, error: 'アップロードURL生成に失敗しました' },
      { status: 500 }
    );
  }
}
