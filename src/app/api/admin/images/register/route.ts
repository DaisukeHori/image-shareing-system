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
        processing_status: isVideo ? 'pending' : 'none',
      })
      .select()
      .single();

    if (error) throw error;

    // 動画の場合はEdge Functionを呼び出してサムネイル生成
    if (isVideo && data) {
      // 非同期でEdge Functionを呼び出す（レスポンスを待たない）
      triggerVideoProcessing(data.id, path, fileSize || 0).catch(err => {
        console.error('Failed to trigger video processing:', err);
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Image registration error:', error);
    return NextResponse.json(
      { success: false, error: 'ファイル登録に失敗しました' },
      { status: 500 }
    );
  }
}

// 動画処理をトリガーする関数
async function triggerVideoProcessing(imageId: string, storagePath: string, fileSize: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        imageId,
        storagePath,
        fileSize,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Video processing trigger failed:', errorText);
    }
  } catch (error) {
    console.error('Error triggering video processing:', error);
  }
}
