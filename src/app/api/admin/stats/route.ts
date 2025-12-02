import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

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

    // 各種統計を取得
    const [usersResult, imagesResult, pendingResult, approvedTodayResult] =
      await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase
          .from('approval_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('approval_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('approved_at', new Date().toISOString().split('T')[0]),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersResult.count || 0,
        totalImages: imagesResult.count || 0,
        pendingRequests: pendingResult.count || 0,
        approvedToday: approvedTodayResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
