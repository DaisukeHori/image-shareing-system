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

    // ユーザーがアクセス権限を持つ画像のみ取得
    const { data, error } = await supabase
      .from('image_permissions')
      .select(`
        image:images (
          id,
          original_filename,
          storage_path,
          folder:folders (
            id,
            name
          )
        )
      `)
      .eq('user_id', session.user.id);

    if (error) throw error;

    // 画像データを抽出
    interface PermissionWithImage {
      image: {
        id: string;
        original_filename: string;
        storage_path: string;
        folder: { id: string; name: string } | null;
      } | null;
    }

    const images = (data as PermissionWithImage[])
      .map((item: PermissionWithImage) => item.image)
      .filter((img): img is NonNullable<typeof img> => img !== null);

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error('Images GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
