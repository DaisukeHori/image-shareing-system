import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限レベル: view < download < edit
type PermissionLevel = 'view' | 'download' | 'edit';

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
        level,
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
    const { permissions } = body;

    // 新形式: permissions = [{ user_id, level }]
    // 旧形式: user_ids = [user_id] (後方互換性)
    const permissionList: { user_id: string; level: PermissionLevel }[] = [];

    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        if (p.user_id && ['view', 'download', 'edit'].includes(p.level)) {
          permissionList.push({ user_id: p.user_id, level: p.level });
        }
      }
    } else if (Array.isArray(body.user_ids)) {
      // 旧形式の後方互換性
      for (const userId of body.user_ids) {
        permissionList.push({ user_id: userId, level: 'view' });
      }
    }

    const supabase = createServiceClient();

    // 既存の権限を削除
    await supabase
      .from('folder_permissions')
      .delete()
      .eq('folder_id', id);

    // 新しい権限を追加
    if (permissionList.length > 0) {
      const records = permissionList.map((p) => ({
        folder_id: id,
        user_id: p.user_id,
        level: p.level,
      }));

      const { error } = await supabase
        .from('folder_permissions')
        .insert(records);

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
