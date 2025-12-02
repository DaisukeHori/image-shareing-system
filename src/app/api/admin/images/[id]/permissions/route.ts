import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限設定更新
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
      .from('image_permissions')
      .delete()
      .eq('image_id', id);

    // 新しい権限を追加
    if (user_ids.length > 0) {
      const permissions = user_ids.map((userId: string) => ({
        image_id: id,
        user_id: userId,
      }));

      const { error } = await supabase
        .from('image_permissions')
        .insert(permissions);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Permissions PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
