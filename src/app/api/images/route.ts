import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 権限レベル: view < download < edit
type PermissionLevel = 'view' | 'download' | 'edit';

// ユーザーがアクセス可能な画像一覧
export async function GET() {
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

    // 1. 画像単位の権限を持つ画像を取得（権限レベル付き）
    const { data: imagePermData, error: imagePermError } = await supabase
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

    if (imagePermError) throw imagePermError;

    // 2. フォルダ単位の権限を持つフォルダを取得（権限レベル付き）
    const { data: folderPermData, error: folderPermError } = await supabase
      .from('folder_permissions')
      .select('folder_id, level')
      .eq('user_id', userId);

    if (folderPermError) throw folderPermError;

    // フォルダIDと権限レベルのマップ
    const folderPermMap = new Map<string, PermissionLevel>();
    folderPermData?.forEach((fp: { folder_id: string; level: PermissionLevel }) => {
      folderPermMap.set(fp.folder_id, fp.level);
    });

    const permittedFolderIds = Array.from(folderPermMap.keys());

    // 3. フォルダ権限を持つフォルダ内の画像を取得
    interface ImageData {
      id: string;
      original_filename: string;
      storage_path: string;
      folder_id: string | null;
      folder: { id: string; name: string } | null;
    }

    interface ImageWithLevel extends ImageData {
      permission_level: PermissionLevel;
    }

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
    interface PermissionWithImage {
      level: PermissionLevel;
      image: ImageData | null;
    }

    const levelOrder: Record<PermissionLevel, number> = { view: 0, download: 1, edit: 2 };
    const imagesMap = new Map<string, ImageWithLevel>();

    // 画像単位の権限から
    (imagePermData as PermissionWithImage[] || []).forEach((item) => {
      if (item.image) {
        const existing = imagesMap.get(item.image.id);
        if (!existing || levelOrder[item.level] > levelOrder[existing.permission_level]) {
          imagesMap.set(item.image.id, { ...item.image, permission_level: item.level });
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

    const images = Array.from(imagesMap.values());

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error('Images GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
