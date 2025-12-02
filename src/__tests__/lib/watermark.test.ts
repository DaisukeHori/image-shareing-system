import { WatermarkInfo } from '@/types/database';

// Mock sharp module
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
    }),
    composite: jest.fn().mockReturnThis(),
    withMetadata: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
    extract: jest.fn().mockReturnThis(),
    stats: jest.fn().mockResolvedValue({
      dominant: { r: 50, g: 50, b: 50 },
    }),
  }));
});

describe('Watermark Functions', () => {
  describe('WatermarkInfo Type', () => {
    it('should have correct structure', () => {
      const info: WatermarkInfo = {
        downloaderName: '山田太郎',
        approverName: '鈴木社長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:00',
      };

      expect(info.downloaderName).toBe('山田太郎');
      expect(info.approverName).toBe('鈴木社長');
      expect(info.requestId).toBe('REQ-20241202-0001');
      expect(info.downloadDate).toBe('2024/12/02 10:00');
    });

    it('should encode to JSON correctly', () => {
      const info: WatermarkInfo = {
        downloaderName: 'テストユーザー',
        approverName: '承認者',
        requestId: 'REQ-12345',
        downloadDate: '2024/12/02',
      };

      const jsonString = JSON.stringify(info);
      const parsed = JSON.parse(jsonString);

      expect(parsed.downloaderName).toBe(info.downloaderName);
      expect(parsed.approverName).toBe(info.approverName);
      expect(parsed.requestId).toBe(info.requestId);
      expect(parsed.downloadDate).toBe(info.downloadDate);
    });

    it('should encode to base64 correctly', () => {
      const info: WatermarkInfo = {
        downloaderName: 'テスト',
        approverName: '承認者',
        requestId: 'REQ-001',
        downloadDate: '2024/12/02',
      };

      const base64 = Buffer.from(JSON.stringify(info)).toString('base64');
      const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

      expect(decoded).toEqual(info);
    });
  });

  describe('Watermark Text Generation', () => {
    it('should generate correct watermark text', () => {
      const info: WatermarkInfo = {
        downloaderName: '山田太郎',
        approverName: '鈴木社長',
        requestId: 'REQ-20241202-0001',
        downloadDate: '2024/12/02 10:00',
      };

      const watermarkText = [
        `DL: ${info.downloaderName}`,
        `承認: ${info.approverName}`,
        `日時: ${info.downloadDate}`,
        `ID: ${info.requestId}`,
      ].join(' | ');

      expect(watermarkText).toContain('山田太郎');
      expect(watermarkText).toContain('鈴木社長');
      expect(watermarkText).toContain('REQ-20241202-0001');
      expect(watermarkText).toContain('2024/12/02 10:00');
    });
  });
});
