import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// CSVの1行を解析する関数（ダブルクォートと空フィールド対応）
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

// タブ区切りかカンマ区切りかを判定して行を解析
function parseLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map(f => f.replace(/^"|"$/g, '').trim());
  }
  return parseCSVLine(line);
}

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
        manager:users!fk_manager (
          email
        )
      `)
      .order('name');

    if (error) throw error;

    // CSV形式に変換（データがない場合はヘッダーのみのテンプレートを出力）
    const csvHeader = '所属名,所属長メールアドレス';
    const csvRows = (data || []).map((dept: { name: string; manager: { email: string } | null }) =>
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

    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイルが空です' },
        { status: 400 }
      );
    }

    // ヘッダー行を解析してチェック
    const headerFields = parseLine(lines[0]);
    const expectedHeaders = ['所属名', '所属長メールアドレス'];

    // 最初のカラムが「所属名」かチェック
    const headerValid = headerFields[0] === '所属名' ||
      headerFields[0]?.toLowerCase() === '所属名';

    if (!headerValid) {
      return NextResponse.json(
        {
          success: false,
          error: `CSVのヘッダー形式が不正です。期待される形式: ${expectedHeaders.join(', ')}。実際のヘッダー: ${headerFields.join(', ')}`
        },
        { status: 400 }
      );
    }

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

      // タブ区切りかカンマ区切りかを判定して解析
      const fields = parseLine(line);

      if (fields.length < 1) {
        results.errors.push(`行${lineNumber}: 形式が不正です`);
        continue;
      }

      const name = fields[0] || '';
      const managerEmail = fields[1] || '';

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
