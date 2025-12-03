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
          // エスケープされたダブルクォート
          current += '"';
          i++;
        } else {
          // クォート終了
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

  // 最後のフィールドを追加
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
      .from('users')
      .select(`
        email,
        name,
        role,
        is_ceo,
        is_active,
        department:departments!users_department_id_fkey (
          name
        )
      `)
      .order('name');

    if (error) throw error;

    // CSV形式に変換（データがない場合はヘッダーのみのテンプレートを出力）
    const csvHeader = 'メールアドレス,名前,所属名,権限,社長,有効';
    const csvRows = (data || []).map((user: {
      email: string;
      name: string;
      role: string;
      is_ceo: boolean;
      is_active: boolean;
      department: { name: string } | null;
    }) =>
      `"${user.email}","${user.name}","${user.department?.name || ''}","${user.role}","${user.is_ceo ? 'はい' : 'いいえ'}","${user.is_active ? 'はい' : 'いいえ'}"`
    );
    const csv = [csvHeader, ...csvRows].join('\n');

    // BOMを追加してExcelで文字化けしないようにする
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="users.csv"',
      },
    });
  } catch (error) {
    console.error('Users CSV export error:', error);
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
    const expectedHeaders = ['メールアドレス', '名前', '所属名', '権限', '社長', '有効'];
    const requiredHeaders = ['メールアドレス', '名前'];

    // 最初の2つのカラムが必須ヘッダーと一致するかチェック
    const headerValid = requiredHeaders.every((h, i) =>
      headerFields[i]?.toLowerCase() === h.toLowerCase() ||
      headerFields[i] === h
    );

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

    // 所属一覧を取得（名前からIDを引くため）
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    const deptMap = new Map<string, string>(departments?.map((d: { id: string; name: string }) => [d.name, d.id]) || []);

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

      if (fields.length < 2) {
        results.errors.push(`行${lineNumber}: 形式が不正です（列数: ${fields.length}）`);
        continue;
      }

      const email = fields[0] || '';
      const name = fields[1] || '';
      const departmentName = fields[2] || '';
      const role = fields[3] || 'user';
      const isCeoStr = fields[4] || '';
      const isActiveStr = fields[5] || '';

      if (!email) {
        results.errors.push(`行${lineNumber}: メールアドレスが空です`);
        continue;
      }

      if (!name) {
        results.errors.push(`行${lineNumber}: 名前が空です`);
        continue;
      }

      // 所属IDを取得
      let departmentId: string | null = null;
      if (departmentName) {
        departmentId = deptMap.get(departmentName) || null;
        if (!departmentId) {
          // 所属が存在しない場合は作成
          const { data: newDept, error: deptError } = await supabase
            .from('departments')
            .insert({ name: departmentName })
            .select()
            .single();

          if (deptError) {
            results.errors.push(`行${lineNumber}: 所属 "${departmentName}" の作成に失敗しました`);
          } else if (newDept) {
            departmentId = newDept.id;
            deptMap.set(departmentName, newDept.id);
          }
        }
      }

      // 権限の正規化
      const normalizedRole = role === 'admin' || role === '管理者' ? 'admin' : 'user';

      // 社長フラグ
      const isCeo = isCeoStr === 'はい' || isCeoStr === 'true' || isCeoStr === '1';

      // 有効フラグ（デフォルトはtrue）
      const isActive = isActiveStr === '' || isActiveStr === 'はい' || isActiveStr === 'true' || isActiveStr === '1';

      // 既存のユーザーを検索
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        // 更新
        const { error } = await supabase
          .from('users')
          .update({
            name,
            department_id: departmentId,
            role: normalizedRole,
            is_ceo: isCeo,
            is_active: isActive,
          })
          .eq('id', existing.id);

        if (error) {
          results.errors.push(`行${lineNumber}: 更新失敗 - ${error.message}`);
        } else {
          results.updated++;
        }
      } else {
        // 新規作成
        const { error } = await supabase
          .from('users')
          .insert({
            email: email.toLowerCase(),
            name,
            department_id: departmentId,
            role: normalizedRole,
            is_ceo: isCeo,
            is_active: isActive,
          });

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
    console.error('Users CSV import error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
