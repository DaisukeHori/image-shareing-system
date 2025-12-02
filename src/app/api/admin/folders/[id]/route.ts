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

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'フォルダ名は必須です' },
        { status: 400 }
      );
    }

    // 自分自身を親にはできない
    if (parent_id === id) {
      return NextResponse.json(
        { success: false, error: '自分自身を親フォルダにすることはできません' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('folders')
      .update({
        name,
        parent_id: parent_id || null,
      })
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

// フォルダ削除
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

    // 子フォルダがあるか確認
    const { count: childCount } = await supabase
      .from('folders')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id);

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { success: false, error: 'このフォルダには子フォルダがあります。先に子フォルダを削除してください' },
        { status: 400 }
      );
    }

    // 画像があるか確認
    const { count: imageCount } = await supabase
      .from('images')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', id);

    if (imageCount && imageCount > 0) {
      return NextResponse.json(
        { success: false, error: 'このフォルダには画像があります。先に画像を削除または移動してください' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folders DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
