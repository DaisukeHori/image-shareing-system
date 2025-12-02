import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// デフォルト権限の型
type DefaultPermission = 'none' | 'view' | 'download' | 'edit';

// フォルダ一覧取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('name');

    if (error) throw error;

    // default_permissionがない場合は'none'をデフォルトとして設定
    const dataWithDefaults = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      default_permission: item.default_permission || 'none',
    }));

    // ツリー構造に変換
    interface FolderItem {
      id: string;
      name: string;
      parent_id: string | null;
      default_permission: DefaultPermission;
      created_at: string;
      updated_at: string;
      children?: FolderItem[];
    }

    const buildTree = (items: FolderItem[], parentId: string | null = null): FolderItem[] => {
      return items
        .filter((item: FolderItem) => item.parent_id === parentId)
        .map((item: FolderItem) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(dataWithDefaults as FolderItem[]);

    return NextResponse.json({ success: true, data: tree, flat: dataWithDefaults });
  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// フォルダ作成
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
    const { name, parent_id } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'フォルダ名は必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Folders POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
