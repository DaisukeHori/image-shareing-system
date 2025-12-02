/**
 * 電子透かし結合テスト
 * 透かしの埋め込みと読み取りの往復テスト
 */

import sharp from 'sharp';
import { addWatermark, readWatermark, verifyWatermark } from '@/lib/watermark';
import { WatermarkInfo } from '@/types/database';

describe('Watermark Integration Tests', () => {
  // テスト用の画像を生成
  async function createTestImage(width = 100, height = 100): Promise<Buffer> {
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

  describe('Watermark Round Trip', () => {
    it('should embed and extract watermark correctly', async () => {
      const testImage = await createTestImage(200, 200);
      const info: WatermarkInfo = {
        downloaderName: '山田太郎',
        approverName: '鈴木社長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:00',
      };

      // 透かしを埋め込み
      const watermarkedImage = await addWatermark(testImage, info);

      // 透かしを読み取り
      const extractedInfo = await readWatermark(watermarkedImage);

      // 検証
      expect(extractedInfo).not.toBeNull();
      expect(extractedInfo?.downloaderName).toBe(info.downloaderName);
      expect(extractedInfo?.approverName).toBe(info.approverName);
      expect(extractedInfo?.requestId).toBe(info.requestId);
      expect(extractedInfo?.downloadDate).toBe(info.downloadDate);
    });

    it('should preserve image quality', async () => {
      const testImage = await createTestImage(200, 200);
      const originalMetadata = await sharp(testImage).metadata();

      const info: WatermarkInfo = {
        downloaderName: 'テストユーザー',
        approverName: '承認者',
        requestId: 'REQ-001',
        downloadDate: '2024/12/02',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const watermarkedMetadata = await sharp(watermarkedImage).metadata();

      // サイズが同じであることを確認
      expect(watermarkedMetadata.width).toBe(originalMetadata.width);
      expect(watermarkedMetadata.height).toBe(originalMetadata.height);
    });

    it('should handle Japanese characters correctly', async () => {
      const testImage = await createTestImage(200, 200);
      const info: WatermarkInfo = {
        downloaderName: '田中花子',
        approverName: '佐藤部長',
        requestId: 'REQ-日本語-001',
        downloadDate: '2024年12月02日 10時00分',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo?.downloaderName).toBe(info.downloaderName);
      expect(extractedInfo?.approverName).toBe(info.approverName);
      expect(extractedInfo?.requestId).toBe(info.requestId);
      expect(extractedInfo?.downloadDate).toBe(info.downloadDate);
    });

    it('should handle long text correctly', async () => {
      const testImage = await createTestImage(300, 300);
      const info: WatermarkInfo = {
        downloaderName: 'これは非常に長い名前のテストユーザーです。名前が長い場合でも正しく処理されるべきです。',
        approverName: '株式会社レボル代表取締役社長兼CEO山田太郎',
        requestId: 'REQ-20241202-0001-EXTENDED-VERSION',
        downloadDate: '2024年12月02日 10時00分00秒 JST',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo?.downloaderName).toBe(info.downloaderName);
    });
  });

  describe('Watermark Verification', () => {
    it('should verify valid watermark', async () => {
      const testImage = await createTestImage(200, 200);
      const info: WatermarkInfo = {
        downloaderName: 'テストユーザー',
        approverName: '承認者',
        requestId: 'REQ-001',
        downloadDate: '2024/12/02',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const result = await verifyWatermark(watermarkedImage);

      expect(result.hasWatermark).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.info).toEqual(info);
      expect(result.details).toContain('有効な電子透かし');
    });

    it('should detect missing watermark', async () => {
      const testImage = await createTestImage(100, 100);
      const result = await verifyWatermark(testImage);

      expect(result.hasWatermark).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.info).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum size image', async () => {
      // 最小サイズでも動作するか
      const testImage = await createTestImage(50, 50);
      const info: WatermarkInfo = {
        downloaderName: 'A',
        approverName: 'B',
        requestId: 'R1',
        downloadDate: '2024',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo).toEqual(info);
    });

    it('should handle large image', async () => {
      const testImage = await createTestImage(1000, 1000);
      const info: WatermarkInfo = {
        downloaderName: '大きな画像のテスト',
        approverName: '承認者',
        requestId: 'REQ-LARGE-001',
        downloadDate: '2024/12/02',
      };

      const watermarkedImage = await addWatermark(testImage, info);
      const extractedInfo = await readWatermark(watermarkedImage);

      expect(extractedInfo).toEqual(info);
    });

    it('should throw error for too small image', async () => {
      // 非常に小さい画像ではエラーになるべき
      const tinyImage = await createTestImage(5, 5);
      const info: WatermarkInfo = {
        downloaderName: 'これは長いテキストで小さい画像には入らない',
        approverName: '承認者名も長くして容量オーバーを狙う',
        requestId: 'REQ-VERY-LONG-REQUEST-ID-THAT-WONT-FIT',
        downloadDate: '2024/12/02 10:00:00 JST 日本時間',
      };

      await expect(addWatermark(tinyImage, info)).rejects.toThrow(
        '画像サイズが小さすぎて'
      );
    });
  });
});
