import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

interface RequestRecord {
  request_number: string;
  user: { name: string; email: string; department: { name: string } | null } | null;
  image: { original_filename: string; storage_path: string } | null;
  purpose_type: string | null;
  purpose_other: string | null;
  requester_comment: string | null;
  status: string;
  approver: { name: string } | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approver_comment: string | null;
  expires_at: string | null;
  downloaded_at: string | null;
  created_at: string;
}

// 申請履歴CSV出力
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const approverOnly = searchParams.get('approver_only') === 'true';

    const supabase = createServiceClient();

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        user:users!approval_requests_user_id_fkey (
          id,
          name,
          email,
          department:departments!users_department_id_fkey (
            id,
            name
          )
        ),
        image:images (
          id,
          original_filename,
          storage_path
        ),
        approver:users!approval_requests_approved_by_fkey (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    // ステータスでフィルタ
    if (status) {
      query = query.eq('status', status);
    }

    // 自分が承認/却下した申請のみ（社長でない場合のオプション）
    if (approverOnly && !session.user.isCeo) {
      // approved_by または rejected_by が自分のIDの場合
      query = query.or(`approved_by.eq.${session.user.id},rejected_by.eq.${session.user.id}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 利用目的のラベル
    const purposeTypeLabels: Record<string, string> = {
      hotpepper: 'ホットペッパー',
      website: 'HP/ブログ',
      sns: 'SNS',
      print: 'チラシ等',
      other: 'その他',
    };

    // ステータスのラベル
    const statusLabels: Record<string, string> = {
      pending: '承認待ち',
      approved: '承認済み',
      rejected: '却下',
      expired: '期限切れ',
      downloaded: 'ダウンロード済み',
    };

    // CSV生成
    const headers = [
      '申請番号',
      '申請者名',
      '申請者メール',
      '所属部署',
      'ファイル名',
      '利用目的タイプ',
      '利用目的詳細',
      '申請者コメント',
      'ステータス',
      '承認者',
      '承認日時',
      '却下理由',
      '承認者コメント',
      'ダウンロード期限',
      'ダウンロード日時',
      '申請日時',
    ];

    const rows = ((data || []) as RequestRecord[]).map((req) => {
      const purposeType = req.purpose_type ? (purposeTypeLabels[req.purpose_type] || req.purpose_type) : '';
      const purposeDetail = req.purpose_type === 'other' ? req.purpose_other || '' : '';

      return [
        req.request_number || '',
        req.user?.name || '',
        req.user?.email || '',
        req.user?.department?.name || '',
        req.image?.original_filename || '',
        purposeType,
        purposeDetail,
        req.requester_comment || '',
        statusLabels[req.status] || req.status,
        req.approver?.name || '',
        req.approved_at ? format(new Date(req.approved_at), 'yyyy/MM/dd HH:mm') : '',
        req.rejection_reason || '',
        req.approver_comment || '',
        req.expires_at ? format(new Date(req.expires_at), 'yyyy/MM/dd HH:mm') : '',
        req.downloaded_at ? format(new Date(req.downloaded_at), 'yyyy/MM/dd HH:mm') : '',
        req.created_at ? format(new Date(req.created_at), 'yyyy/MM/dd HH:mm') : '',
      ];
    });

    // CSVエスケープ関数
    function escapeCSV(value: string): string {
      if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }

    // CSV文字列を生成
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // BOM付きUTF-8で出力（Excelで文字化けしないように）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // ファイル名を生成
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `申請履歴_${timestamp}.csv`;

    return new Response(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Requests CSV export error:', error);
    return NextResponse.json(
      { success: false, error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}
