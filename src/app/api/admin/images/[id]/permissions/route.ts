import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限レベル: view < download < edit
type PermissionLevel = 'view' | 'download' | 'edit';

// 画像権限取得
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

    // まずlevelカラムありで試す
    let { data, error } = await supabase
      .from('image_permissions')
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
      .eq('image_id', id);

    // levelカラムがない場合はlevelなしで再試行
    if (error && error.message?.includes('level')) {
      const result = await supabase
        .from('image_permissions')
        .select(`
          id,
          user_id,
          user:users (
            id,
            name,
            email
          )
        `)
        .eq('image_id', id);

      if (result.error) throw result.error;
      // levelがない場合はデフォルトでviewを設定
      data = (result.data || []).map((item: Record<string, unknown>) => ({ ...item, level: 'view' }));
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Image permissions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      .from('image_permissions')
      .delete()
      .eq('image_id', id);

    // 新しい権限を追加
    if (permissionList.length > 0) {
      // まずlevelカラムありで試す
      let records = permissionList.map((p) => ({
        image_id: id,
        user_id: p.user_id,
        level: p.level,
      }));

      let { error } = await supabase
        .from('image_permissions')
        .insert(records);

      // levelカラムがない場合はlevelなしで再試行
      if (error && error.message?.includes('level')) {
        console.log('level column not found, retrying without level');
        const recordsWithoutLevel = permissionList.map((p) => ({
          image_id: id,
          user_id: p.user_id,
        }));

        const result = await supabase
          .from('image_permissions')
          .insert(recordsWithoutLevel);

        if (result.error) throw result.error;
      } else if (error) {
        throw error;
      }
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
