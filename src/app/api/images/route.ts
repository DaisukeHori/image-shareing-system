import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

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

    // 1. 画像単位の権限を持つ画像を取得
    const { data: imagePermData, error: imagePermError } = await supabase
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

    if (imagePermError) throw imagePermError;

    // 2. フォルダ単位の権限を持つフォルダのIDを取得
    const { data: folderPermData, error: folderPermError } = await supabase
      .from('folder_permissions')
      .select('folder_id')
      .eq('user_id', userId);

    if (folderPermError) throw folderPermError;

    const permittedFolderIds = folderPermData?.map((fp: { folder_id: string }) => fp.folder_id) || [];

    // 3. フォルダ権限を持つフォルダ内の画像を取得
    interface ImageData {
      id: string;
      original_filename: string;
      storage_path: string;
      folder_id: string | null;
      folder: { id: string; name: string } | null;
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

    // 画像データを抽出・マージ（重複排除）
    interface PermissionWithImage {
      image: ImageData | null;
    }

    const imagesMap = new Map<string, ImageData>();

    // 画像単位の権限から
    (imagePermData as PermissionWithImage[] || []).forEach((item) => {
      if (item.image && !imagesMap.has(item.image.id)) {
        imagesMap.set(item.image.id, item.image);
      }
    });

    // フォルダ権限から
    folderImages.forEach((img) => {
      if (!imagesMap.has(img.id)) {
        imagesMap.set(img.id, img);
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
