import sharp from 'sharp';
import { WatermarkInfo } from '@/types/database';

// 電子透かしを画像に埋め込む
export async function addWatermark(
  imageBuffer: Buffer,
  info: WatermarkInfo
): Promise<Buffer> {
  // 透かし情報をテキストに変換
  const watermarkText = [
    `DL: ${info.downloaderName}`,
    `承認: ${info.approverName}`,
    `日時: ${info.downloadDate}`,
    `ID: ${info.requestId}`,
  ].join(' | ');

  // Base64エンコードした透かしデータ（メタデータとして埋め込み用）
  const watermarkData = Buffer.from(JSON.stringify(info)).toString('base64');

  // 画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // 可視的な透かしを作成（画像の下部に半透明のテキスト）
  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          font-family: Arial, sans-serif;
          font-size: 14px;
          fill: rgba(255, 255, 255, 0.7);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
      </style>
      <rect x="0" y="${height - 40}" width="${width}" height="40" fill="rgba(0, 0, 0, 0.4)"/>
      <text x="10" y="${height - 15}" class="watermark">${watermarkText}</text>
    </svg>
  `;

  // 透かしを画像に合成
  const watermarkedImage = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      },
    ])
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: watermarkData,
          Artist: info.downloaderName,
          ImageDescription: `Request: ${info.requestId}`,
        },
      },
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  return watermarkedImage;
}

// 電子透かしを読み取る（復号）
export async function readWatermark(
  imageBuffer: Buffer
): Promise<WatermarkInfo | null> {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    // EXIFデータから透かし情報を読み取り
    if (metadata.exif) {
      // EXIFからCopyrightフィールドを探す
      // sharpのmetadataではexifがバイナリとして返されるため、
      // より詳細な解析にはexif-parserなどが必要だが、
      // ここでは簡易的な実装とする

      // 簡易的にEXIFバイナリから透かしデータを探す
      const exifString = metadata.exif.toString('utf8');

      // Base64エンコードされたJSONを探す
      const base64Pattern = /[A-Za-z0-9+/=]{50,}/g;
      const matches = exifString.match(base64Pattern);

      if (matches) {
        for (const match of matches) {
          try {
            const decoded = Buffer.from(match, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);

            if (
              parsed.downloaderName &&
              parsed.approverName &&
              parsed.requestId
            ) {
              return parsed as WatermarkInfo;
            }
          } catch {
            // このマッチは透かしデータではない
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to read watermark:', error);
    return null;
  }
}

// 画像から可視的な透かし情報を抽出（OCRなしの簡易版）
// 実運用ではOCRサービスを使用することを推奨
export async function extractVisibleWatermark(
  imageBuffer: Buffer
): Promise<string | null> {
  try {
    // 画像の下部40ピクセルを切り出して分析
    const metadata = await sharp(imageBuffer).metadata();
    const height = metadata.height || 600;

    // 下部の透かし領域を切り出し
    const bottomRegion = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: Math.max(0, height - 40),
        width: metadata.width || 800,
        height: Math.min(40, height),
      })
      .toBuffer();

    // 画像の平均輝度を計算して透かし領域の存在を確認
    const { dominant } = await sharp(bottomRegion).stats();

    // 透かし領域（半透明の黒背景）が存在するかを判定
    const avgBrightness = (dominant.r + dominant.g + dominant.b) / 3;

    if (avgBrightness < 100) {
      return '透かし領域を検出しました（詳細な読み取りにはEXIFデータを使用してください）';
    }

    return null;
  } catch (error) {
    console.error('Failed to extract visible watermark:', error);
    return null;
  }
}
