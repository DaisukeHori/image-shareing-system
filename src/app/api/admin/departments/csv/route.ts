import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// CSVエクスポート
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
      .from('departments')
      .select(`
        id,
        name,
        manager:users!departments_manager_user_id_fkey (
          email
        )
      `)
      .order('name');

    if (error) throw error;

    // CSV形式に変換
    const csvHeader = '所属名,所属長メールアドレス';
    const csvRows = data.map((dept: { name: string; manager: { email: string } | null }) =>
      `"${dept.name}","${dept.manager?.email || ''}"`
    );
    const csv = [csvHeader, ...csvRows].join('\n');

    // BOMを追加してExcelで文字化けしないようにする
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="departments.csv"',
      },
    });
  } catch (error) {
    console.error('Departments CSV export error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CSVインポート
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);

    const supabase = createServiceClient();

    // ユーザー一覧を取得（メールアドレスからIDを引くため）
    const { data: users } = await supabase
      .from('users')
      .select('id, email');

    const userMap = new Map<string, string>(users?.map((u: { id: string; email: string }) => [u.email.toLowerCase(), u.id]) || []);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const lineNumber = i + 2; // ヘッダー行 + 0-indexed

      // CSV解析（簡易版：ダブルクォート対応）
      const matches = line.match(/("([^"]*)"|[^,]*)/g);
      if (!matches || matches.length < 1) {
        results.errors.push(`行${lineNumber}: 形式が不正です`);
        continue;
      }

      const name = matches[0]?.replace(/^"|"$/g, '').trim();
      const managerEmail = matches[1]?.replace(/^"|"$/g, '').trim() || '';

      if (!name) {
        results.errors.push(`行${lineNumber}: 所属名が空です`);
        continue;
      }

      // 所属長のユーザーIDを取得
      let managerUserId: string | null = null;
      if (managerEmail) {
        managerUserId = userMap.get(managerEmail.toLowerCase()) || null;
        if (!managerUserId) {
          results.errors.push(`行${lineNumber}: 所属長 "${managerEmail}" が見つかりません`);
        }
      }

      // 既存の所属を検索
      const { data: existing } = await supabase
        .from('departments')
        .select('id')
        .eq('name', name)
        .single();

      if (existing) {
        // 更新
        const { error } = await supabase
          .from('departments')
          .update({ manager_user_id: managerUserId })
          .eq('id', existing.id);

        if (error) {
          results.errors.push(`行${lineNumber}: 更新失敗 - ${error.message}`);
        } else {
          results.updated++;
        }
      } else {
        // 新規作成
        const { error } = await supabase
          .from('departments')
          .insert({ name, manager_user_id: managerUserId });

        if (error) {
          results.errors.push(`行${lineNumber}: 作成失敗 - ${error.message}`);
        } else {
          results.created++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Departments CSV import error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
