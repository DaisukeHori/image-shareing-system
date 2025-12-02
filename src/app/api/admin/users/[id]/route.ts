import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// ユーザー更新
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
    const { email, name, department_id, role, is_ceo, is_active } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスと名前は必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 社長が既に存在する場合のチェック
    if (is_ceo) {
      const { data: existingCeo } = await supabase
        .from('users')
        .select('id')
        .eq('is_ceo', true)
        .neq('id', id)
        .single();

      if (existingCeo) {
        return NextResponse.json(
          { success: false, error: '社長は既に登録されています' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        email: email.toLowerCase(),
        name,
        department_id: department_id || null,
        role: role || 'user',
        is_ceo: is_ceo || false,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Users PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ユーザー削除
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

    // 自分自身は削除できない
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: '自分自身は削除できません' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
