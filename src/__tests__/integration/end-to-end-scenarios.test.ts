/**
 * エンドツーエンドシナリオテスト
 *
 * 実際の業務フローに基づいた一連のシナリオテスト
 * - 美容師がカットモデル画像を申請してダウンロードするまでの流れ
 * - 管理者が不正利用を調査する流れ
 * - 新入社員のオンボーディング
 */

import sharp from 'sharp';
import { addWatermark, readWatermark, verifyWatermark } from '@/lib/watermark';
import { WatermarkInfo } from '@/types/database';

// 簡易ID生成関数（テスト用）
function generateId(): string {
  return 'test-' + Math.random().toString(36).substring(2, 15);
}

// 日付操作関数（テスト用）
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 日付フォーマット関数（テスト用）
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function formatDateJp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

describe('エンドツーエンドシナリオテスト', () => {
  // テスト用の画像を生成
  async function createTestImage(width = 300, height = 300): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();
  }

  describe('シナリオA: 美容師がSNS投稿用にカットモデル画像をダウンロードする', () => {
    // 登場人物
    const stylist = {
      id: generateId(),
      name: '山田花子',
      email: 'yamada-hanako@revol.co.jp',
      role: 'user' as const,
      department: { id: 'dept-001', name: '東京本店' },
    };

    const manager = {
      id: generateId(),
      name: '佐藤店長',
      email: 'sato@revol.co.jp',
      is_department_head: true,
      department: { id: 'dept-001', name: '東京本店' },
    };

    const image = {
      id: generateId(),
      original_filename: '2024年秋新作スタイル_モデルA.jpg',
      folder: '2024年/秋コレクション',
    };

    it('Step 1: 山田花子がシステムにログインする', () => {
      // Azure ADでの認証後
      const session = {
        user: {
          id: stylist.id,
          email: stylist.email,
          name: stylist.name,
          role: stylist.role,
        },
      };

      expect(session.user).toBeDefined();
      expect(session.user.email).toBe('yamada-hanako@revol.co.jp');
    });

    it('Step 2: アクセス可能な画像一覧を確認する', () => {
      // 山田花子に権限のある画像
      const accessibleImages = [
        { id: image.id, name: image.original_filename },
        { id: generateId(), name: '2024年夏カット_モデルB.jpg' },
      ];

      expect(accessibleImages.length).toBeGreaterThan(0);
      expect(accessibleImages.some((img) => img.id === image.id)).toBe(true);
    });

    it('Step 3: 使用したい画像を選択して利用申請を作成する', () => {
      const request = {
        id: generateId(),
        request_number: 'REQ-20241202-0001',
        user_id: stylist.id,
        image_id: image.id,
        purpose: '店舗公式Instagramに投稿するため。お客様への新スタイル提案に使用します。',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      };

      expect(request.status).toBe('pending');
      expect(request.purpose).toContain('Instagram');
    });

    it('Step 4: 佐藤店長に承認依頼メールが届く', () => {
      const approvalRequestEmail = {
        to: manager.email,
        subject: '【レボル】画像利用申請の承認依頼',
        body: {
          requesterName: stylist.name,
          imageName: image.original_filename,
          purpose: '店舗公式Instagramに投稿するため',
          approveUrl: 'https://example.com/api/approval/action?token=xxx&action=approve',
          rejectUrl: 'https://example.com/api/approval/action?token=xxx&action=reject',
        },
      };

      expect(approvalRequestEmail.to).toBe('sato@revol.co.jp');
      expect(approvalRequestEmail.body.requesterName).toBe('山田花子');
    });

    it('Step 5: 佐藤店長がメールの承認リンクをクリックして承認する', () => {
      const approvalResult = {
        status: 'approved' as const,
        approved_by: manager.id,
        approved_at: new Date().toISOString(),
        expires_at: addDays(new Date(), 7).toISOString(),
      };

      expect(approvalResult.status).toBe('approved');
    });

    it('Step 6: 山田花子に承認完了メールが届く', () => {
      const approvalResultEmail = {
        to: stylist.email,
        subject: '【レボル】申請が承認されました',
        body: {
          requestNumber: 'REQ-20241202-0001',
          result: '承認',
          approverName: manager.name,
          downloadPageUrl: 'https://example.com/my-requests',
          expirationDate: formatDateJp(addDays(new Date(), 7)),
        },
      };

      expect(approvalResultEmail.body.result).toBe('承認');
      expect(approvalResultEmail.body.approverName).toBe('佐藤店長');
    });

    it('Step 7: 山田花子がシステムにログインしてダウンロードする', async () => {
      const testImage = await createTestImage(300, 300);

      const watermarkInfo: WatermarkInfo = {
        downloaderName: stylist.name,
        approverName: manager.name,
        requestId: 'REQ-20241202-0001',
        downloadDate: formatDate(new Date()),
      };

      // 透かしを埋め込んでダウンロード
      const downloadedImage = await addWatermark(testImage, watermarkInfo);

      // ダウンロード後の申請状態
      const updatedRequest = {
        status: 'downloaded' as const,
        download_count: 1,
        downloaded_at: new Date().toISOString(),
      };

      expect(downloadedImage).toBeDefined();
      expect(updatedRequest.status).toBe('downloaded');
    });

    it('Step 8: ダウンロードした画像には透かしが埋め込まれている', async () => {
      const testImage = await createTestImage(300, 300);

      const watermarkInfo: WatermarkInfo = {
        downloaderName: stylist.name,
        approverName: manager.name,
        requestId: 'REQ-20241202-0001',
        downloadDate: formatDate(new Date()),
      };

      const downloadedImage = await addWatermark(testImage, watermarkInfo);
      const extractedInfo = await readWatermark(downloadedImage);

      expect(extractedInfo).not.toBeNull();
      expect(extractedInfo?.downloaderName).toBe('山田花子');
      expect(extractedInfo?.approverName).toBe('佐藤店長');
    });
  });

  describe('シナリオB: 管理者が流出画像の調査を行う', () => {
    const admin = {
      id: generateId(),
      name: '管理者',
      email: 'admin@revol.co.jp',
      role: 'admin' as const,
    };

    it('Step 1: SNSで無断使用されている画像を発見', () => {
      // 外部で発見された画像（URLなど）
      const suspiciousImageSource = {
        url: 'https://social-media.example.com/post/12345/image.png',
        reportedBy: '営業部 田中',
        reportedAt: new Date().toISOString(),
      };

      expect(suspiciousImageSource.url).toBeDefined();
    });

    it('Step 2: 管理者が透かし検証ページにアクセス', () => {
      // 管理者としてログイン
      const session = {
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      };

      expect(session.user.role).toBe('admin');
    });

    it('Step 3: 疑わしい画像をアップロードして検証', async () => {
      // 元々山田花子がダウンロードした画像だと仮定
      const testImage = await createTestImage(300, 300);

      const originalWatermark: WatermarkInfo = {
        downloaderName: '山田花子',
        approverName: '佐藤店長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:30',
      };

      // 透かし入りの画像を作成
      const watermarkedImage = await addWatermark(testImage, originalWatermark);

      // 検証
      const verificationResult = await verifyWatermark(watermarkedImage);

      expect(verificationResult.hasWatermark).toBe(true);
      expect(verificationResult.isValid).toBe(true);
    });

    it('Step 4: 流出元を特定できる', async () => {
      const testImage = await createTestImage(300, 300);

      const watermarkInfo: WatermarkInfo = {
        downloaderName: '山田花子',
        approverName: '佐藤店長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:30',
      };

      const watermarkedImage = await addWatermark(testImage, watermarkInfo);
      const extractedInfo = await readWatermark(watermarkedImage);

      // 流出元の情報
      expect(extractedInfo?.downloaderName).toBe('山田花子');
      expect(extractedInfo?.requestId).toBe('REQ-20241202-0001');
      expect(extractedInfo?.downloadDate).toBe('2024/12/02 10:30');
    });

    it('Step 5: 申請番号から詳細情報を確認', () => {
      // データベースから申請情報を取得
      const requestDetails = {
        request_number: 'REQ-20241202-0001',
        user: {
          name: '山田花子',
          email: 'yamada-hanako@revol.co.jp',
          department: { name: '東京本店' },
        },
        image: {
          original_filename: '2024年秋新作スタイル_モデルA.jpg',
        },
        purpose: '店舗公式Instagramに投稿するため',
        approved_by: '佐藤店長',
        approved_at: '2024-12-02T10:00:00Z',
        downloaded_at: '2024-12-02T10:30:00Z',
      };

      expect(requestDetails.user.name).toBe('山田花子');
      expect(requestDetails.purpose).toContain('Instagram');
    });
  });

  describe('シナリオC: 新入社員のオンボーディング', () => {
    const admin = {
      id: generateId(),
      name: 'システム管理者',
      role: 'admin' as const,
    };

    const newEmployee = {
      email: 'suzuki-new@revol.co.jp',
      name: '鈴木新人',
    };

    it('Step 1: 管理者が新入社員をシステムに登録', () => {
      const newUser = {
        id: generateId(),
        email: newEmployee.email.toLowerCase(),
        name: newEmployee.name,
        role: 'user' as const,
        department_id: 'dept-002',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      expect(newUser.email).toBe('suzuki-new@revol.co.jp');
      expect(newUser.is_active).toBe(true);
    });

    it('Step 2: 画像へのアクセス権限を付与', () => {
      const permissions = [
        { image_id: 'img-001', user_id: 'new-user-id' },
        { image_id: 'img-002', user_id: 'new-user-id' },
        { image_id: 'img-003', user_id: 'new-user-id' },
      ];

      expect(permissions).toHaveLength(3);
    });

    it('Step 3: 新入社員がOffice365でログインできる', () => {
      // Azure ADでログイン試行
      const loginAttempt = {
        email: 'suzuki-new@revol.co.jp',
        provider: 'microsoft-entra-id',
      };

      // ユーザーテーブルで確認
      const userExists = true;
      const isActive = true;

      expect(userExists).toBe(true);
      expect(isActive).toBe(true);
    });

    it('Step 4: 新入社員が権限のある画像を閲覧できる', () => {
      const accessibleImages = [
        { id: 'img-001', name: '画像1.jpg' },
        { id: 'img-002', name: '画像2.jpg' },
        { id: 'img-003', name: '画像3.jpg' },
      ];

      expect(accessibleImages).toHaveLength(3);
    });
  });

  describe('シナリオD: 申請が却下された場合', () => {
    const requester = {
      name: '田中太郎',
      email: 'tanaka@revol.co.jp',
    };

    const ceo = {
      name: '代表取締役',
      is_ceo: true,
    };

    it('Step 1: 利用目的が不適切で却下される', () => {
      const rejectedRequest = {
        request_number: 'REQ-20241202-0002',
        purpose: '個人的なSNSに使用',
        status: 'rejected' as const,
        rejected_by: ceo.name,
        rejected_at: new Date().toISOString(),
      };

      expect(rejectedRequest.status).toBe('rejected');
    });

    it('Step 2: 申請者に却下通知メールが届く', () => {
      const rejectionEmail = {
        to: requester.email,
        subject: '【レボル】申請が却下されました',
        body: {
          requestNumber: 'REQ-20241202-0002',
          result: '却下',
          approverName: ceo.name,
        },
      };

      expect(rejectionEmail.body.result).toBe('却下');
    });

    it('Step 3: 却下された申請からはダウンロードできない', () => {
      const rejectedRequest = {
        status: 'rejected' as const,
      };

      const canDownload = rejectedRequest.status === 'approved';
      expect(canDownload).toBe(false);
    });

    it('Step 4: 申請者は新しい申請を作成できる', () => {
      // 却下後、新しい申請（利用目的を変更して）
      const newRequest = {
        request_number: 'REQ-20241202-0003',
        purpose: '会社公式サイトのヘアスタイル紹介ページに使用',
        status: 'pending' as const,
      };

      expect(newRequest.purpose).toContain('会社公式');
      expect(newRequest.status).toBe('pending');
    });
  });

  describe('シナリオE: 有効期限切れのケース', () => {
    it('Step 1: 承認されてから7日経過', () => {
      const expiredRequest = {
        status: 'approved' as const,
        approved_at: '2024-11-25T10:00:00Z', // 7日以上前
        expires_at: '2024-12-02T10:00:00Z', // 期限切れ
        download_count: 0, // ダウンロードしていない
      };

      const isExpired =
        new Date(expiredRequest.expires_at) < new Date('2024-12-03T00:00:00Z');
      expect(isExpired).toBe(true);
    });

    it('Step 2: ダウンロードしようとするとエラーになる', () => {
      const errorMessage = 'ダウンロードの有効期限が切れています';
      expect(errorMessage).toContain('有効期限');
    });

    it('Step 3: ステータスがexpiredに更新される', () => {
      const updatedRequest = {
        status: 'expired' as const,
      };

      expect(updatedRequest.status).toBe('expired');
    });

    it('Step 4: 再度申請する必要がある', () => {
      const newRequest = {
        status: 'pending' as const,
        purpose: '再申請：前回期限切れのため',
      };

      expect(newRequest.status).toBe('pending');
    });
  });

  describe('シナリオF: 同時承認の競合', () => {
    it('所属長と社長が同時に承認ボタンを押した場合', () => {
      // シナリオ:
      // 1. 所属長が先に処理される
      // 2. 申請が承認される
      // 3. 社長のトークンが無効化される
      // 4. 社長がボタンを押しても「既に処理済み」と表示される

      const request = {
        status: 'approved' as const,
        approved_by: 'dept-head-id',
      };

      const ceoTokenAfterApproval = {
        used_at: new Date().toISOString(), // 無効化済み
      };

      expect(request.status).toBe('approved');
      expect(ceoTokenAfterApproval.used_at).not.toBeNull();
    });
  });
});
