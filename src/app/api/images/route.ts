import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限レベル: view < download < edit
type PermissionLevel = 'view' | 'download' | 'edit';
type DefaultPermission = 'none' | 'view' | 'download' | 'edit';

// 画像データの型定義
interface ImageData {
  id: string;
  original_filename: string;
  storage_path: string;
  folder_id: string | null;
  folder: { id: string; name: string } | null;
  file_type?: 'image' | 'video';
  mime_type?: string;
}

interface ImageWithLevel extends ImageData {
  permission_level: PermissionLevel;
}

// ユーザーがアクセス可能な画像一覧
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

    // クエリパラメータからフォルダIDを取得
    const searchParams = request.nextUrl.searchParams;
    const filterFolderId = searchParams.get('folder_id'); // nullまたはフォルダID

    // 1. 画像単位の権限を持つ画像を取得（権限レベル付き）
    // まずlevelカラムありで試す
    let imagePermData: Array<{ level?: PermissionLevel; image: ImageData | null }> | null = null;

    const { data: imagePermDataWithLevel, error: imagePermErrorWithLevel } = await supabase
      .from('image_permissions')
      .select(`
        level,
        image:images (
          id,
          original_filename,
          storage_path,
          folder_id,
          folder:folders (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId);

    if (imagePermErrorWithLevel && imagePermErrorWithLevel.message?.includes('level')) {
      // levelカラムがない場合はlevelなしで再試行
      const { data: imagePermDataNoLevel, error: imagePermErrorNoLevel } = await supabase
        .from('image_permissions')
        .select(`
          image:images (
            id,
            original_filename,
            storage_path,
            folder_id,
            folder:folders (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId);

      if (imagePermErrorNoLevel) throw imagePermErrorNoLevel;
      // levelがない場合はデフォルトでviewを設定
      imagePermData = (imagePermDataNoLevel || []).map((item: { image: ImageData | null }) => ({ ...item, level: 'view' as PermissionLevel }));
    } else if (imagePermErrorWithLevel) {
      throw imagePermErrorWithLevel;
    } else {
      imagePermData = imagePermDataWithLevel;
    }

    // 2. フォルダ単位の権限を持つフォルダを取得（権限レベル付き）
    let folderPermData: Array<{ folder_id: string; level: PermissionLevel }> | null = null;

    const { data: folderPermDataWithLevel, error: folderPermErrorWithLevel } = await supabase
      .from('folder_permissions')
      .select('folder_id, level')
      .eq('user_id', userId);

    if (folderPermErrorWithLevel && folderPermErrorWithLevel.message?.includes('level')) {
      // levelカラムがない場合はlevelなしで再試行
      const { data: folderPermDataNoLevel, error: folderPermErrorNoLevel } = await supabase
        .from('folder_permissions')
        .select('folder_id')
        .eq('user_id', userId);

      if (folderPermErrorNoLevel) throw folderPermErrorNoLevel;
      // levelがない場合はデフォルトでviewを設定
      folderPermData = (folderPermDataNoLevel || []).map((item: { folder_id: string }) => ({ ...item, level: 'view' as PermissionLevel }));
    } else if (folderPermErrorWithLevel) {
      throw folderPermErrorWithLevel;
    } else {
      folderPermData = folderPermDataWithLevel;
    }

    // フォルダIDと権限レベルのマップ（明示的なユーザー権限）
    const folderPermMap = new Map<string, PermissionLevel>();
    (folderPermData || []).forEach((fp: { folder_id: string; level: PermissionLevel }) => {
      folderPermMap.set(fp.folder_id, fp.level || 'view');
    });

    // 3. 全フォルダを取得してデフォルト権限をチェック
    const { data: allFolders, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, default_permission');

    if (allFoldersError) throw allFoldersError;

    // デフォルト権限がnone以外のフォルダを権限マップに追加
    (allFolders || []).forEach((f: { id: string; default_permission?: DefaultPermission }) => {
      const defaultPerm = f.default_permission || 'none';
      if (defaultPerm !== 'none' && !folderPermMap.has(f.id)) {
        // 明示的な権限がない場合、デフォルト権限を使用
        folderPermMap.set(f.id, defaultPerm as PermissionLevel);
      }
    });

    const permittedFolderIds = Array.from(folderPermMap.keys());

    // 3. フォルダ権限を持つフォルダ内の画像を取得
    let folderImages: ImageData[] = [];
    if (permittedFolderIds.length > 0) {
      const { data: folderImagesData, error: folderImagesError } = await supabase
        .from('images')
        .select(`
          id,
          original_filename,
          storage_path,
          folder_id,
          folder:folders (
            id,
            name
          )
        `)
        .in('folder_id', permittedFolderIds);

      if (folderImagesError) throw folderImagesError;
      folderImages = (folderImagesData as ImageData[]) || [];
    }

    // 画像データを抽出・マージ（重複排除、より高い権限を優先）
    const levelOrder: Record<PermissionLevel, number> = { view: 0, download: 1, edit: 2 };
    const imagesMap = new Map<string, ImageWithLevel>();

    // 画像単位の権限から
    (imagePermData || []).forEach((item) => {
      if (item.image) {
        const level = item.level || 'view';
        const existing = imagesMap.get(item.image.id);
        if (!existing || levelOrder[level] > levelOrder[existing.permission_level]) {
          imagesMap.set(item.image.id, { ...item.image, permission_level: level });
        }
      }
    });

    // フォルダ権限から
    folderImages.forEach((img) => {
      const folderLevel = img.folder_id ? folderPermMap.get(img.folder_id) : undefined;
      if (folderLevel) {
        const existing = imagesMap.get(img.id);
        if (!existing || levelOrder[folderLevel] > levelOrder[existing.permission_level]) {
          imagesMap.set(img.id, { ...img, permission_level: folderLevel });
        }
      }
    });

    let images = Array.from(imagesMap.values());

    // フォルダIDでフィルタリング
    if (filterFolderId !== null) {
      if (filterFolderId === 'null' || filterFolderId === '') {
        // ルートフォルダ（フォルダなし）の画像のみ
        images = images.filter((img) => img.folder_id === null);
      } else {
        // 指定されたフォルダ内の画像のみ
        images = images.filter((img) => img.folder_id === filterFolderId);
      }
    }

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error('Images GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
