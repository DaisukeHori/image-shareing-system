import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// サムネイル再生成（現在無効化）
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

    // Edge Function (FFmpeg WASM) はSupabaseのDeno環境で動作しないため、
    // サムネイル再生成機能は現在無効化されています
    return NextResponse.json(
      {
        success: false,
        error: 'サムネイル生成機能は現在利用できません。動画はブラウザの標準プレーヤーで再生されます。'
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Regenerate thumbnail error:', error);
    return NextResponse.json(
      { success: false, error: 'サムネイル再生成に失敗しました' },
      { status: 500 }
    );
  }
}
