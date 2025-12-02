import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// サムネイル再生成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supabase = createServiceClient();

    // 画像情報を取得
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { success: false, error: '画像が見つかりません' },
        { status: 404 }
      );
    }

    // 動画でない場合はエラー
    if (image.file_type !== 'video') {
      return NextResponse.json(
        { success: false, error: '動画ファイルのみサムネイル生成が可能です' },
        { status: 400 }
      );
    }

    // 処理中の場合はエラー
    if (image.processing_status === 'processing') {
      return NextResponse.json(
        { success: false, error: '現在処理中です。しばらくお待ちください' },
        { status: 400 }
      );
    }

    // 処理状態をpendingに更新
    await supabase
      .from('images')
      .update({ processing_status: 'pending' })
      .eq('id', id);

    // Edge Functionを呼び出す
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase設定がありません' },
        { status: 500 }
      );
    }

    // 非同期でEdge Functionを呼び出す
    fetch(`${supabaseUrl}/functions/v1/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        imageId: id,
        storagePath: image.storage_path,
        fileSize: image.file_size || 0,
      }),
    }).catch(err => {
      console.error('Failed to trigger video processing:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'サムネイル生成を開始しました',
    });
  } catch (error) {
    console.error('Regenerate thumbnail error:', error);
    return NextResponse.json(
      { success: false, error: 'サムネイル再生成に失敗しました' },
      { status: 500 }
    );
  }
}
