import sgMail from '@sendgrid/mail';
import { createServiceClient } from './supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface ApprovalRequest {
  id: string;
  request_number: string;
  purpose: string;
  image: {
    id: string;
    original_filename: string;
    storage_path: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    manager_user_id: string | null;
  } | null;
}

export async function sendApprovalRequestEmail(
  request: ApprovalRequest,
  requester: User
) {
  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // 承認者を取得（所属長と社長）
  const approvers: { id: string; email: string; name: string }[] = [];

  // 所属長を取得
  if (requester.department?.manager_user_id) {
    const { data: manager } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', requester.department.manager_user_id)
      .single();

    if (manager) {
      approvers.push(manager);
    }
  }

  // 社長を取得
  const { data: ceo } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('is_ceo', true)
    .single();

  if (ceo && !approvers.some((a) => a.id === ceo.id)) {
    approvers.push(ceo);
  }

  if (approvers.length === 0) {
    console.warn('No approvers found for request:', request.id);
    return;
  }

  // 各承認者に対してトークンを生成してメールを送信
  for (const approver of approvers) {
    // 承認用トークンを生成
    const approveToken = uuidv4().replace(/-/g, '');
    const rejectToken = uuidv4().replace(/-/g, '');
    const tokenExpiry = addDays(new Date(), 7);

    // トークンをDBに保存
    await supabase.from('approval_tokens').insert([
      {
        request_id: request.id,
        approver_id: approver.id,
        token: approveToken,
        action: 'approve',
        expires_at: tokenExpiry.toISOString(),
      },
      {
        request_id: request.id,
        approver_id: approver.id,
        token: rejectToken,
        action: 'reject',
        expires_at: tokenExpiry.toISOString(),
      },
    ]);

    const approveUrl = `${appUrl}/api/approval/action?token=${approveToken}`;
    const rejectUrl = `${appUrl}/api/approval/action?token=${rejectToken}`;

    const emailContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">カットモデル画像 利用申請</h2>

        <p>以下の画像利用申請が届いています。</p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>申請番号:</strong> ${request.request_number}</p>
          <p><strong>申請者:</strong> ${requester.name}</p>
          <p><strong>所属:</strong> ${requester.department?.name || '未所属'}</p>
          <p><strong>画像:</strong> ${request.image.original_filename}</p>
          <p><strong>利用目的:</strong></p>
          <p style="white-space: pre-wrap;">${request.purpose}</p>
        </div>

        <div style="margin: 24px 0;">
          <a href="${approveUrl}"
             style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin-right: 12px;">
            承認する
          </a>
          <a href="${rejectUrl}"
             style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px;">
            却下する
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          ※このリンクは7日間有効です。<br>
          ※いずれかの承認者が承認した時点で申請は承認されます。
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

        <p style="color: #999; font-size: 12px;">
          このメールはレボル カットモデル画像管理システムから自動送信されています。
        </p>
      </div>
    `;

    try {
      await sgMail.send({
        to: approver.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `【要承認】カットモデル画像利用申請 (${request.request_number})`,
        html: emailContent,
      });

      console.log(`Approval email sent to ${approver.email}`);
    } catch (error) {
      console.error(`Failed to send email to ${approver.email}:`, error);
      throw error;
    }
  }
}

export async function sendApprovalResultEmail(
  request: {
    id: string;
    request_number: string;
    status: string;
    rejection_reason?: string | null;
  },
  requester: { email: string; name: string },
  approver: { name: string }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const isApproved = request.status === 'approved';

  const emailContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">
        カットモデル画像 利用申請 ${isApproved ? '承認' : '却下'}
      </h2>

      <p>${requester.name} 様</p>

      <p>
        申請番号 <strong>${request.request_number}</strong> の画像利用申請が
        <strong style="color: ${isApproved ? '#22c55e' : '#ef4444'};">
          ${isApproved ? '承認' : '却下'}
        </strong>
        されました。
      </p>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>承認者:</strong> ${approver.name}</p>
        ${
          !isApproved && request.rejection_reason
            ? `<p><strong>却下理由:</strong> ${request.rejection_reason}</p>`
            : ''
        }
      </div>

      ${
        isApproved
          ? `
        <p>
          <a href="${appUrl}"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            画像をダウンロード
          </a>
        </p>

        <p style="color: #666; font-size: 14px;">
          ※承認後7日以内に1回のみダウンロード可能です。<br>
          ※ダウンロードした画像には電子透かしが入ります。
        </p>
      `
          : ''
      }

      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

      <p style="color: #999; font-size: 12px;">
        このメールはレボル カットモデル画像管理システムから自動送信されています。
      </p>
    </div>
  `;

  try {
    await sgMail.send({
      to: requester.email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `【${isApproved ? '承認' : '却下'}】カットモデル画像利用申請 (${request.request_number})`,
      html: emailContent,
    });

    console.log(`Result email sent to ${requester.email}`);
  } catch (error) {
    console.error(`Failed to send result email:`, error);
    throw error;
  }
}
