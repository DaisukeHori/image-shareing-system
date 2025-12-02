import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// フォルダ更新
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
    const { name, parent_id } = body;

    // 自分自身を親にはできない
    if (parent_id === id) {
      return NextResponse.json(
        { success: false, error: '自分自身を親フォルダにすることはできません' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 更新するフィールドを動的に構築
    const updateData: { name?: string; parent_id?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (parent_id !== undefined) updateData.parent_id = parent_id || null;

    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Folders PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// フォルダ削除（中身も再帰的に削除）
export async function DELETE(
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

    // 再帰的にフォルダと中身を削除する関数
    async function deleteFolderRecursive(folderId: string) {
      // 子フォルダを取得して再帰的に削除
      const { data: childFolders } = await supabase
        .from('folders')
        .select('id')
        .eq('parent_id', folderId);

      if (childFolders) {
        for (const childFolder of childFolders) {
          await deleteFolderRecursive(childFolder.id);
        }
      }

      // このフォルダ内の画像を取得
      const { data: images } = await supabase
        .from('images')
        .select('id, storage_path')
        .eq('folder_id', folderId);

      if (images && images.length > 0) {
        // Storageから画像ファイルを削除
        const storagePaths = images
          .filter((img) => img.storage_path)
          .map((img) => img.storage_path);

        if (storagePaths.length > 0) {
          await supabase.storage.from('images').remove(storagePaths);
        }

        // DBから画像レコードを削除
        const imageIds = images.map((img) => img.id);
        await supabase.from('images').delete().in('id', imageIds);
      }

      // フォルダ自体を削除
      await supabase.from('folders').delete().eq('id', folderId);
    }

    await deleteFolderRecursive(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folders DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
