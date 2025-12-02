import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// ユーザー一覧取得
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
      .from('users')
      .select(`
        *,
        department:departments!users_department_id_fkey (
          id,
          name
        )
      `)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ユーザー作成
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
    const { email, name, department_id, role, is_ceo } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスと名前は必須です' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 重複チェック
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // 社長が既に存在する場合のチェック
    if (is_ceo) {
      const { data: existingCeo } = await supabase
        .from('users')
        .select('id')
        .eq('is_ceo', true)
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
      .insert({
        email: email.toLowerCase(),
        name,
        department_id: department_id || null,
        role: role || 'user',
        is_ceo: is_ceo || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
