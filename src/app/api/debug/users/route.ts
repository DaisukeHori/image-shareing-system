import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    // 管理者のみアクセス可能
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        currentRole: session?.user?.role,
      }, { status: 401 });
    }

    const supabase = createServiceClient();

    // まずシンプルなクエリでテスト
    const { data: simpleData, error: simpleError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active');

    // 次にリレーション付きクエリ
    const { data: fullData, error: fullError } = await supabase
      .from('users')
      .select(`
        *,
        department:departments (
          id,
          name
        )
      `)
      .order('name');

    return NextResponse.json({
      success: true,
      currentUser: {
        email: session.user.email,
        role: session.user.role,
        id: session.user.id,
      },
      simpleQuery: {
        data: simpleData,
        error: simpleError,
        count: simpleData?.length || 0,
      },
      fullQuery: {
        data: fullData,
        error: fullError,
        count: fullData?.length || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
