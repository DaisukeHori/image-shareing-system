import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// フォルダ権限取得
export async function GET(
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

    const { data, error } = await supabase
      .from('folder_permissions')
      .select(`
        id,
        user_id,
        user:users (
          id,
          name,
          email
        )
      `)
      .eq('folder_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Folder permissions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// フォルダ権限更新
export async function PUT(
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
    const body = await request.json();
    const { user_ids } = body;

    if (!Array.isArray(user_ids)) {
      return NextResponse.json(
        { success: false, error: 'user_ids must be an array' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 既存の権限を削除
    await supabase
      .from('folder_permissions')
      .delete()
      .eq('folder_id', id);

    // 新しい権限を追加
    if (user_ids.length > 0) {
      const permissions = user_ids.map((user_id: string) => ({
        folder_id: id,
        user_id,
      }));

      const { error } = await supabase
        .from('folder_permissions')
        .insert(permissions);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folder permissions PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
