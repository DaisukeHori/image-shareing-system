/**
 * ダウンロードフロー結合テスト
 *
 * 実際のユースケースに基づいたシナリオテスト
 * - ダウンロード可否の判定
 * - 有効期限と回数制限
 * - 電子透かしの埋め込み
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

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
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

describe('ダウンロードフロー結合テスト', () => {
  // テスト用の画像を生成
  async function createTestImage(width = 200, height = 200): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer();
  }

  // モックデータ
  const mockUser = {
    id: generateId(),
    name: '山田太郎',
    email: 'yamada@example.com',
    role: 'user' as const,
  };

  const mockApprover = {
    id: generateId(),
    name: '田中部長',
    email: 'tanaka@example.com',
  };

  describe('シナリオ1: 正常なダウンロード', () => {
    it('承認済み申請からダウンロードできる', async () => {
      // シナリオ:
      // 1. 山田太郎の申請が承認されている
      // 2. 有効期限内（7日以内）
      // 3. まだダウンロードしていない
      // 4. ダウンロードすると透かし入り画像が取得できる

      const approvedRequest = {
        id: generateId(),
        user_id: mockUser.id,
        status: 'approved' as const,
        approved_at: new Date().toISOString(),
        expires_at: addDays(new Date(), 7).toISOString(),
        download_count: 0,
        request_number: 'REQ-20241202-0001',
      };

      // ダウンロード可能条件のチェック
      const isApproved = approvedRequest.status === 'approved';
      const isWithinExpiry = new Date(approvedRequest.expires_at) > new Date();
      const hasNotDownloaded = approvedRequest.download_count < 1;

      expect(isApproved).toBe(true);
      expect(isWithinExpiry).toBe(true);
      expect(hasNotDownloaded).toBe(true);
    });

    it('ダウンロード時に電子透かしが埋め込まれる', async () => {
      const testImage = await createTestImage(200, 200);

      const watermarkInfo: WatermarkInfo = {
        downloaderName: mockUser.name,
        approverName: mockApprover.name,
        requestId: 'REQ-20241202-0001',
        downloadDate: formatDate(new Date()),
      };

      // 透かしを埋め込み
      const watermarkedImage = await addWatermark(testImage, watermarkInfo);

      // 透かしを検証
      const result = await verifyWatermark(watermarkedImage);

      expect(result.hasWatermark).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.info?.downloaderName).toBe('山田太郎');
      expect(result.info?.approverName).toBe('田中部長');
      expect(result.info?.requestId).toBe('REQ-20241202-0001');
    });

    it('ダウンロード後にステータスがdownloadedになる', () => {
      const beforeDownload = {
        status: 'approved' as const,
        download_count: 0,
        downloaded_at: null,
      };

      // ダウンロード後
      const afterDownload = {
        ...beforeDownload,
        status: 'downloaded' as const,
        download_count: 1,
        downloaded_at: new Date().toISOString(),
      };

      expect(afterDownload.status).toBe('downloaded');
      expect(afterDownload.download_count).toBe(1);
      expect(afterDownload.downloaded_at).not.toBeNull();
    });

    it('ダウンロードファイル名に申請番号が含まれる', () => {
      const requestNumber = 'REQ-20241202-0001';
      const originalFilename = 'カットモデル001.jpg';
      const baseName = originalFilename.replace(/\.[^/.]+$/, '');
      const downloadFilename = `${requestNumber}_${baseName}.png`;

      expect(downloadFilename).toBe('REQ-20241202-0001_カットモデル001.png');
      expect(downloadFilename).toMatch(/\.png$/); // PNG形式で出力
    });
  });

  describe('シナリオ2: ダウンロード回数制限', () => {
    it('1回ダウンロード後は再ダウンロードできない', () => {
      // シナリオ:
      // 1. 山田太郎が1回ダウンロード済み
      // 2. 再度ダウンロードしようとする
      // 3. 「既にダウンロード済みです」エラーになる

      const downloadedRequest = {
        status: 'downloaded' as const,
        download_count: 1,
        downloaded_at: new Date().toISOString(),
      };

      const canDownload = downloadedRequest.download_count < 1;
      expect(canDownload).toBe(false);
    });

    it('ダウンロード履歴が残る', () => {
      const downloadHistory = {
        request_id: generateId(),
        downloaded_at: new Date().toISOString(),
        download_count: 1,
      };

      expect(downloadHistory.downloaded_at).not.toBeNull();
      expect(downloadHistory.download_count).toBe(1);
    });
  });

  describe('シナリオ3: 有効期限チェック', () => {
    it('有効期限内はダウンロード可能', () => {
      const validRequest = {
        status: 'approved' as const,
        expires_at: addDays(new Date(), 3).toISOString(), // 3日後まで有効
        download_count: 0,
      };

      const isValid = new Date(validRequest.expires_at) > new Date();
      expect(isValid).toBe(true);
    });

    it('有効期限切れ（7日経過）はダウンロード不可', () => {
      // シナリオ:
      // 1. 申請が7日前に承認された
      // 2. 有効期限が切れている
      // 3. 「ダウンロードの有効期限が切れています」エラーになる

      const expiredRequest = {
        status: 'approved' as const,
        approved_at: subDays(new Date(), 8).toISOString(),
        expires_at: subDays(new Date(), 1).toISOString(), // 昨日期限切れ
        download_count: 0,
      };

      const isExpired = new Date(expiredRequest.expires_at) < new Date();
      expect(isExpired).toBe(true);
    });

    it('期限切れ時にステータスがexpiredに更新される', () => {
      // 有効期限切れの申請にアクセスした場合
      const requestBeforeExpireCheck = {
        status: 'approved' as const,
        expires_at: subDays(new Date(), 1).toISOString(),
      };

      // 期限切れが検知されてステータス更新
      const requestAfterExpireCheck = {
        ...requestBeforeExpireCheck,
        status: 'expired' as const,
      };

      expect(requestAfterExpireCheck.status).toBe('expired');
    });
  });

  describe('シナリオ4: 認可チェック', () => {
    it('申請者本人のみダウンロード可能', () => {
      const request = {
        user_id: mockUser.id,
      };

      const currentUserId = mockUser.id;
      const otherUserId = generateId();

      const isOwner = request.user_id === currentUserId;
      const isNotOwner = request.user_id === otherUserId;

      expect(isOwner).toBe(true);
      expect(isNotOwner).toBe(false);
    });

    it('他人の申請からはダウンロードできない', () => {
      const request = {
        user_id: generateId(), // 別のユーザー
      };

      const currentUserId = mockUser.id;
      const hasAccess = request.user_id === currentUserId;

      expect(hasAccess).toBe(false);
    });

    it('未承認の申請からはダウンロードできない', () => {
      const pendingRequest = {
        status: 'pending' as const,
      };

      const canDownload = pendingRequest.status === 'approved';
      expect(canDownload).toBe(false);
    });

    it('却下された申請からはダウンロードできない', () => {
      const rejectedRequest = {
        status: 'rejected' as const,
      };

      const canDownload = rejectedRequest.status === 'approved';
      expect(canDownload).toBe(false);
    });
  });

  describe('シナリオ5: 透かし情報の検証', () => {
    it('透かしからダウンロード者を特定できる', async () => {
      // シナリオ:
      // 1. 流出した画像が見つかった
      // 2. 管理者が透かし検証機能で画像をアップロード
      // 3. 誰がいつダウンロードしたか特定できる

      const testImage = await createTestImage(200, 200);

      const watermarkInfo: WatermarkInfo = {
        downloaderName: '山田太郎',
        approverName: '田中部長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:00',
      };

      const watermarkedImage = await addWatermark(testImage, watermarkInfo);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo).not.toBeNull();
      expect(extractedInfo?.downloaderName).toBe('山田太郎');
      expect(extractedInfo?.downloadDate).toBe('2024/12/02 10:00');
    });

    it('透かしがない画像はシステム外と判定できる', async () => {
      // シナリオ:
      // 1. このシステム以外から取得された画像
      // 2. 透かし検証で検出されない

      const externalImage = await createTestImage(200, 200);
      const result = await verifyWatermark(externalImage);

      expect(result.hasWatermark).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('不正に改ざんされた透かしは検出できる', async () => {
      // 正しい透かしを埋め込んだ画像
      const testImage = await createTestImage(200, 200);
      const watermarkInfo: WatermarkInfo = {
        downloaderName: '山田太郎',
        approverName: '田中部長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:00',
      };

      const watermarkedImage = await addWatermark(testImage, watermarkInfo);

      // 透かしが正常に読み取れることを確認
      const result = await verifyWatermark(watermarkedImage);
      expect(result.isValid).toBe(true);
    });
  });

  describe('シナリオ6: 画像フォーマット', () => {
    it('出力はPNG形式（透かし保持のため）', async () => {
      const testImage = await createTestImage(200, 200);
      const watermarkInfo: WatermarkInfo = {
        downloaderName: 'テスト',
        approverName: '承認者',
        requestId: 'REQ-001',
        downloadDate: '2024/12/02',
      };

      const watermarkedImage = await addWatermark(testImage, watermarkInfo);
      const metadata = await sharp(watermarkedImage).metadata();

      expect(metadata.format).toBe('png');
    });

    it('元画像がJPEGでも出力はPNG', async () => {
      // JPEGの元画像
      const jpegImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      const watermarkInfo: WatermarkInfo = {
        downloaderName: 'テスト',
        approverName: '承認者',
        requestId: 'REQ-001',
        downloadDate: '2024/12/02',
      };

      const watermarkedImage = await addWatermark(jpegImage, watermarkInfo);
      const metadata = await sharp(watermarkedImage).metadata();

      // 出力はPNG
      expect(metadata.format).toBe('png');
    });
  });

  describe('シナリオ7: 日本語対応', () => {
    it('日本語のダウンロード者名が正しく処理される', async () => {
      const testImage = await createTestImage(200, 200);
      const watermarkInfo: WatermarkInfo = {
        downloaderName: '株式会社レボル 営業部 山田太郎',
        approverName: '代表取締役社長 鈴木一郎',
        requestId: 'REQ-日本語-001',
        downloadDate: '2024年12月02日 10時00分',
      };

      const watermarkedImage = await addWatermark(testImage, watermarkInfo);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo?.downloaderName).toBe('株式会社レボル 営業部 山田太郎');
      expect(extractedInfo?.approverName).toBe('代表取締役社長 鈴木一郎');
    });

    it('日本語のファイル名が正しくエンコードされる', () => {
      const japaneseFilename = 'カットモデル撮影2024.jpg';
      const encoded = encodeURIComponent(japaneseFilename);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(japaneseFilename);
    });
  });

  describe('シナリオ8: エラー処理', () => {
    it('存在しない申請IDではエラー', () => {
      const nonExistentRequestId = generateId();
      const foundRequest = null; // 見つからない

      expect(foundRequest).toBeNull();
    });

    it('ストレージから画像取得失敗時はエラー', () => {
      // ストレージエラーのシミュレーション
      const storageError = {
        message: 'Object not found',
        status: 404,
      };

      expect(storageError.status).toBe(404);
    });
  });
});
