import sgMail from '@sendgrid/mail';
import { createServiceClient } from './supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface ApprovalRequest {
  id: string;
  request_number: string;
  purpose: string;
  purpose_type?: string | null;
  purpose_other?: string | null;
  requester_comment?: string | null;
  image: {
    id: string;
    original_filename: string;
    storage_path: string;
  };
}

const purposeTypeLabels: Record<string, string> = {
  hotpepper: 'ホットペッパービューティー',
  website: '公式HP/ブログ',
  sns: '公式SNS',
  print: 'チラシ・DM・POP等',
  other: 'その他',
};

function getImagePublicUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
}

/**
 * Bulletproof email button generator
 * Uses VML for Outlook and standard CSS for other clients
 * Based on https://buttons.cm/ approach
 */
function createEmailButton(
  href: string,
  text: string,
  bgColor: string,
  options?: { width?: number; height?: number }
): string {
  const width = options?.width || 200;
  const height = options?.height || 48;

  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="17%" stroke="f" fillcolor="${bgColor}">
      <w:anchorlock/>
      <center>
    <![endif]-->
    <a href="${href}" target="_blank" rel="noopener" style="background-color:${bgColor}; border-radius:8px; color:#ffffff; display:inline-block; font-family:'Helvetica Neue',Arial,sans-serif; font-size:16px; font-weight:bold; line-height:${height}px; text-align:center; text-decoration:none; width:${width}px; -webkit-text-size-adjust:none;">
      ${text}
    </a>
    <!--[if mso]>
      </center>
    </v:roundrect>
    <![endif]-->
  `;
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
    const imageUrl = getImagePublicUrl(request.image.storage_path);

    // 利用目的の表示文字列を構築
    let purposeDisplay = '';
    if (request.purpose_type && request.purpose_type !== 'other') {
      purposeDisplay = purposeTypeLabels[request.purpose_type] || request.purpose_type;
    } else if (request.purpose_type === 'other' && request.purpose_other) {
      purposeDisplay = `その他: ${request.purpose_other}`;
    } else {
      purposeDisplay = request.purpose;
    }

    const emailContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">カットモデル画像 利用申請</h2>

        <p style="color: #333; font-size: 16px;">以下の画像利用申請が届いています。</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 120px;">申請番号:</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${request.request_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">申請者:</td>
              <td style="padding: 8px 0; color: #1e293b;">${requester.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">所属:</td>
              <td style="padding: 8px 0; color: #1e293b;">${requester.department?.name || '未所属'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">利用目的:</td>
              <td style="padding: 8px 0; color: #1e293b;">${purposeDisplay}</td>
            </tr>
          </table>
        </div>

        ${request.requester_comment ? `
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde68a;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 8px 0;">📝 申請者からのコメント:</p>
          <p style="color: #78350f; margin: 0; white-space: pre-wrap;">${request.requester_comment}</p>
        </div>
        ` : ''}

        <div style="margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">申請画像:</p>
          <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; text-align: center;">
            <img src="${imageUrl}" alt="${request.image.original_filename}" style="max-width: 100%; max-height: 300px; border-radius: 4px; object-fit: contain;">
            <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">${request.image.original_filename}</p>
          </div>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 10px;">
                ${createEmailButton(approveUrl, '✓ 承認する', '#22c55e', { width: 150, height: 48 })}
              </td>
              <td style="padding-left: 10px;">
                ${createEmailButton(rejectUrl, '✕ 却下する', '#ef4444', { width: 150, height: 48 })}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #0369a1; font-size: 13px; margin: 0;">
            ※このリンクは7日間有効です。<br>
            ※いずれかの承認者が承認した時点で申請は承認されます。
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
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

export async function sendRequestConfirmationEmail(
  request: ApprovalRequest,
  requester: User
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const imageUrl = getImagePublicUrl(request.image.storage_path);

  // 利用目的の表示文字列を構築
  let purposeDisplay = '';
  if (request.purpose_type && request.purpose_type !== 'other') {
    purposeDisplay = purposeTypeLabels[request.purpose_type] || request.purpose_type;
  } else if (request.purpose_type === 'other' && request.purpose_other) {
    purposeDisplay = `その他: ${request.purpose_other}`;
  } else {
    purposeDisplay = request.purpose;
  }

  const emailContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">カットモデル画像 利用申請を受け付けました</h2>

      <p style="color: #333; font-size: 16px;">${requester.name} 様</p>

      <p style="color: #333; font-size: 16px;">以下の内容で利用申請を受け付けました。承認者の審査をお待ちください。</p>

      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 120px;">申請番号:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${request.request_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">所属:</td>
            <td style="padding: 8px 0; color: #1e293b;">${requester.department?.name || '未所属'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">利用目的:</td>
            <td style="padding: 8px 0; color: #1e293b;">${purposeDisplay}</td>
          </tr>
        </table>
      </div>

      ${request.requester_comment ? `
      <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde68a;">
        <p style="color: #92400e; font-weight: bold; margin: 0 0 8px 0;">📝 申請時のコメント:</p>
        <p style="color: #78350f; margin: 0; white-space: pre-wrap;">${request.requester_comment}</p>
      </div>
      ` : ''}

      <div style="margin: 20px 0;">
        <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">申請画像:</p>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; text-align: center;">
          <img src="${imageUrl}" alt="${request.image.original_filename}" style="max-width: 100%; max-height: 300px; border-radius: 4px; object-fit: contain;">
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">${request.image.original_filename}</p>
        </div>
      </div>

      <div style="margin: 30px 0; text-align: center;">
        ${createEmailButton(`${appUrl}?tab=requests`, '申請履歴を確認する', '#2563eb', { width: 220, height: 48 })}
      </div>

      <div style="background: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="color: #0369a1; font-size: 13px; margin: 0;">
          ※承認結果はメールでお知らせします。<br>
          ※承認待ち状態の申請は、サイト上からキャンセルすることができます。
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        このメールはレボル カットモデル画像管理システムから自動送信されています。
      </p>
    </div>
  `;

  try {
    await sgMail.send({
      to: requester.email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `【申請受付】カットモデル画像利用申請 (${request.request_number})`,
      html: emailContent,
    });

    console.log(`Request confirmation email sent to ${requester.email}`);
  } catch (error) {
    console.error(`Failed to send confirmation email:`, error);
    throw error;
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
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid ${isApproved ? '#22c55e' : '#ef4444'}; padding-bottom: 10px;">
        カットモデル画像 利用申請 ${isApproved ? '承認' : '却下'}
      </h2>

      <p style="color: #333; font-size: 16px;">${requester.name} 様</p>

      <p style="color: #333; font-size: 16px;">
        申請番号 <strong>${request.request_number}</strong> の画像利用申請が
        <strong style="color: ${isApproved ? '#22c55e' : '#ef4444'};">
          ${isApproved ? '承認' : '却下'}
        </strong>
        されました。
      </p>

      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 100px;">承認者:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${approver.name}</td>
          </tr>
          ${
            !isApproved && request.rejection_reason
              ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">却下理由:</td>
            <td style="padding: 8px 0; color: #dc2626;">${request.rejection_reason}</td>
          </tr>
          `
              : ''
          }
        </table>
      </div>

      ${
        isApproved
          ? `
        <div style="margin: 30px 0; text-align: center;">
          ${createEmailButton(`${appUrl}?tab=requests`, '画像をダウンロード', '#22c55e', { width: 220, height: 48 })}
        </div>

        <div style="background: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #0369a1; font-size: 13px; margin: 0;">
            ※承認後7日以内に1回のみダウンロード可能です。<br>
            ※ダウンロードした画像には電子透かしが入ります。
          </p>
        </div>
      `
          : `
        <div style="background: #fef2f2; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #dc2626; font-size: 13px; margin: 0;">
            申請は却下されました。内容を確認の上、必要に応じて再申請してください。
          </p>
        </div>
      `
      }

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
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
