import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// 一括削除
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '削除する所属を指定してください' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 一括削除
    const { error } = await supabase
      .from('departments')
      .delete()
      .in('id', ids);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} 件の所属を削除しました`,
    });
  } catch (error) {
    console.error('Departments bulk delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
