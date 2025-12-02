import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限レベル: view < download < edit
type PermissionLevel = 'view' | 'download' | 'edit';
type DefaultPermission = 'none' | 'view' | 'download' | 'edit';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  default_permission?: DefaultPermission;
}

interface FolderWithLevel extends Folder {
  permission_level: PermissionLevel;
}

// ユーザーがアクセス可能なフォルダ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const userId = session.user.id;

    // クエリパラメータから親フォルダIDを取得
    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get('parent_id'); // nullまたはフォルダID

    // 1. ユーザーが直接権限を持つフォルダを取得
    let folderPermData: Array<{ folder_id: string; level: PermissionLevel }> | null = null;

    const { data: folderPermDataWithLevel, error: folderPermErrorWithLevel } = await supabase
      .from('folder_permissions')
      .select('folder_id, level')
      .eq('user_id', userId);

    if (folderPermErrorWithLevel && folderPermErrorWithLevel.message?.includes('level')) {
      const { data: folderPermDataNoLevel, error: folderPermErrorNoLevel } = await supabase
        .from('folder_permissions')
        .select('folder_id')
        .eq('user_id', userId);

      if (folderPermErrorNoLevel) throw folderPermErrorNoLevel;
      folderPermData = (folderPermDataNoLevel || []).map((item: { folder_id: string }) => ({
        ...item,
        level: 'view' as PermissionLevel,
      }));
    } else if (folderPermErrorWithLevel) {
      throw folderPermErrorWithLevel;
    } else {
      folderPermData = folderPermDataWithLevel;
    }

    // フォルダIDと権限レベルのマップ（明示的な権限）
    const folderPermMap = new Map<string, PermissionLevel>();
    (folderPermData || []).forEach((fp) => {
      folderPermMap.set(fp.folder_id, fp.level || 'view');
    });

    const permittedFolderIds = Array.from(folderPermMap.keys());

    // 2. 全フォルダを取得（default_permission含む）
    const { data: allFoldersRaw, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, default_permission')
      .order('name');

    if (allFoldersError) throw allFoldersError;

    // default_permissionがない場合は'none'をデフォルトに
    const allFolders: Folder[] = (allFoldersRaw || []).map((f: Record<string, unknown>) => ({
      id: f.id as string,
      name: f.name as string,
      parent_id: f.parent_id as string | null,
      default_permission: (f.default_permission as DefaultPermission) || 'none',
    }));

    // 3. デフォルト権限がnone以外のフォルダも権限マップに追加
    allFolders.forEach((f) => {
      if (f.default_permission && f.default_permission !== 'none' && !folderPermMap.has(f.id)) {
        // デフォルト権限を使用（明示的な権限がない場合）
        folderPermMap.set(f.id, f.default_permission as PermissionLevel);
        permittedFolderIds.push(f.id);
      }
    });

    // 3. 権限を持つフォルダの子孫フォルダも含めて、アクセス可能なフォルダを特定
    const accessibleFolderIds = new Set<string>();
    const folderLevelMap = new Map<string, PermissionLevel>();

    // 直接権限を持つフォルダとその子孫を再帰的に追加
    function addFolderAndDescendants(folderId: string, level: PermissionLevel) {
      accessibleFolderIds.add(folderId);
      const existing = folderLevelMap.get(folderId);
      const levelOrder: Record<PermissionLevel, number> = { view: 0, download: 1, edit: 2 };
      if (!existing || levelOrder[level] > levelOrder[existing]) {
        folderLevelMap.set(folderId, level);
      }

      // 子フォルダを再帰的に追加
      (allFolders || []).forEach((f: Folder) => {
        if (f.parent_id === folderId && !accessibleFolderIds.has(f.id)) {
          addFolderAndDescendants(f.id, level);
        }
      });
    }

    permittedFolderIds.forEach((folderId) => {
      const level = folderPermMap.get(folderId) || 'view';
      addFolderAndDescendants(folderId, level);
    });

    // 4. 指定された親フォルダの子フォルダをフィルタリング
    const childFolders: FolderWithLevel[] = [];

    if (parentId === null || parentId === 'null' || parentId === '') {
      // ルートレベル: 権限を持つフォルダのうち、親がnullまたは親が権限範囲外のもの
      (allFolders || []).forEach((f: Folder) => {
        if (accessibleFolderIds.has(f.id)) {
          // このフォルダがルートレベルに表示されるべきか判断
          // 親がない、または親が権限範囲外の場合
          const parentAccessible = f.parent_id ? accessibleFolderIds.has(f.parent_id) : false;
          if (!f.parent_id || !parentAccessible) {
            childFolders.push({
              ...f,
              permission_level: folderLevelMap.get(f.id) || 'view',
            });
          }
        }
      });
    } else {
      // 特定のフォルダ内: そのフォルダの子フォルダのうち、権限があるもの
      (allFolders || []).forEach((f: Folder) => {
        if (f.parent_id === parentId && accessibleFolderIds.has(f.id)) {
          childFolders.push({
            ...f,
            permission_level: folderLevelMap.get(f.id) || 'view',
          });
        }
      });
    }

    // 5. パンくずリスト用に全フォルダ情報も返す（権限があるもののみ）
    const accessibleFolders = (allFolders || [])
      .filter((f: Folder) => accessibleFolderIds.has(f.id))
      .map((f: Folder) => ({
        ...f,
        permission_level: folderLevelMap.get(f.id) || 'view',
      }));

    return NextResponse.json({
      success: true,
      data: childFolders,
      flat: accessibleFolders,
    });
  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
