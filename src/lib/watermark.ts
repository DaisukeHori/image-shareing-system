import sharp from 'sharp';
import { WatermarkInfo } from '@/types/database';

// マジックバイト（透かしデータの開始を示す）
const MAGIC_BYTES = [0x52, 0x56, 0x4c, 0x57]; // "RVLW" (Revol Watermark)
const END_MARKER = [0x45, 0x4e, 0x44]; // "END"

/**
 * LSBステガノグラフィーによる不可視電子透かしの埋め込み
 * 画像のRGBチャンネルの最下位ビットに情報を埋め込む
 * 画像の見た目にはほとんど影響を与えない
 */
export async function addWatermark(
  imageBuffer: Buffer,
  info: WatermarkInfo
): Promise<Buffer> {
  // 透かし情報をJSONに変換
  const watermarkData = JSON.stringify(info);
  const dataBytes = Buffer.from(watermarkData, 'utf8');

  // データ長を4バイトで格納（最大4GB）
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32BE(dataBytes.length, 0);

  // 埋め込むデータ: マジックバイト + 長さ + データ + 終了マーカー
  const embedData = Buffer.concat([
    Buffer.from(MAGIC_BYTES),
    lengthBytes,
    dataBytes,
    Buffer.from(END_MARKER),
  ]);

  // 画像をRGBAで読み込み
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { width = 0, height = 0 } = metadata;

  // 生のピクセルデータを取得
  const { data, info: rawInfo } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 必要なビット数を計算（各バイトを8ビットで表現）
  const requiredBits = embedData.length * 8;
  const availablePixels = width * height;
  const availableBits = availablePixels * 3; // RGB各チャンネルの最下位ビット

  if (requiredBits > availableBits) {
    throw new Error('画像サイズが小さすぎて透かしを埋め込めません');
  }

  // ピクセルデータをコピー
  const pixels = Buffer.from(data);

  // LSBステガノグラフィーでデータを埋め込み
  let bitIndex = 0;
  for (let byteIndex = 0; byteIndex < embedData.length; byteIndex++) {
    const byte = embedData[byteIndex];
    for (let bit = 7; bit >= 0; bit--) {
      const bitValue = (byte >> bit) & 1;
      const pixelIndex = Math.floor(bitIndex / 3);
      const channelOffset = bitIndex % 3; // 0=R, 1=G, 2=B (Aはスキップ)
      const dataIndex = pixelIndex * 4 + channelOffset; // RGBA形式

      // 最下位ビットを設定
      pixels[dataIndex] = (pixels[dataIndex] & 0xfe) | bitValue;
      bitIndex++;
    }
  }

  // 透かし入り画像を生成（PNG形式で無損失保存）
  const watermarkedImage = await sharp(pixels, {
    raw: {
      width: rawInfo.width,
      height: rawInfo.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 6 }) // PNG形式で無損失保存（透かしを確実に保持）
    .toBuffer();

  return watermarkedImage;
}

/**
 * LSBステガノグラフィーによる不可視電子透かしの読み取り
 */
export async function readWatermark(
  imageBuffer: Buffer
): Promise<WatermarkInfo | null> {
  try {
    // 画像をRGBAで読み込み
    const image = sharp(imageBuffer);
    const { data } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // マジックバイトを探す
    const magicBytes = extractBits(data, 0, MAGIC_BYTES.length * 8);
    const isMagicValid = MAGIC_BYTES.every(
      (byte, i) => magicBytes[i] === byte
    );

    if (!isMagicValid) {
      return null;
    }

    // データ長を読み取り（マジックバイトの後）
    const lengthBytes = extractBits(data, MAGIC_BYTES.length * 8, 4 * 8);
    const dataLength =
      (lengthBytes[0] << 24) |
      (lengthBytes[1] << 16) |
      (lengthBytes[2] << 8) |
      lengthBytes[3];

    // データ長の妥当性チェック
    if (dataLength <= 0 || dataLength > 10000) {
      return null;
    }

    // 透かしデータを読み取り
    const startBit = (MAGIC_BYTES.length + 4) * 8;
    const watermarkBytes = extractBits(data, startBit, dataLength * 8);

    // バイト配列を文字列に変換
    const watermarkStr = Buffer.from(watermarkBytes).toString('utf8');

    // JSONをパース
    const parsed = JSON.parse(watermarkStr);

    // 必要なフィールドがあるか確認
    if (
      parsed.downloaderName &&
      parsed.approverName &&
      parsed.requestId &&
      parsed.downloadDate
    ) {
      return parsed as WatermarkInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to read watermark:', error);
    return null;
  }
}

/**
 * ピクセルデータからビットを抽出してバイト配列に変換
 */
function extractBits(
  pixelData: Buffer,
  startBit: number,
  numBits: number
): number[] {
  const bytes: number[] = [];
  let currentByte = 0;
  let bitsRead = 0;

  for (let i = 0; i < numBits; i++) {
    const bitIndex = startBit + i;
    const pixelIndex = Math.floor(bitIndex / 3);
    const channelOffset = bitIndex % 3;
    const dataIndex = pixelIndex * 4 + channelOffset;

    if (dataIndex >= pixelData.length) {
      break;
    }

    const bitValue = pixelData[dataIndex] & 1;
    currentByte = (currentByte << 1) | bitValue;
    bitsRead++;

    if (bitsRead === 8) {
      bytes.push(currentByte);
      currentByte = 0;
      bitsRead = 0;
    }
  }

  return bytes;
}

/**
 * 透かしの検証結果の詳細情報を取得
 */
export async function verifyWatermark(imageBuffer: Buffer): Promise<{
  hasWatermark: boolean;
  isValid: boolean;
  info: WatermarkInfo | null;
  details: string;
}> {
  try {
    const info = await readWatermark(imageBuffer);

    if (!info) {
      return {
        hasWatermark: false,
        isValid: false,
        info: null,
        details: '電子透かしが見つかりませんでした',
      };
    }

    // 全ての必須フィールドがあるか確認
    const requiredFields = [
      'downloaderName',
      'approverName',
      'requestId',
      'downloadDate',
    ];
    const missingFields = requiredFields.filter(
      (field) => !info[field as keyof WatermarkInfo]
    );

    if (missingFields.length > 0) {
      return {
        hasWatermark: true,
        isValid: false,
        info,
        details: `不完全な透かしデータ: ${missingFields.join(', ')} が欠けています`,
      };
    }

    return {
      hasWatermark: true,
      isValid: true,
      info,
      details: '有効な電子透かしを検出しました',
    };
  } catch (error) {
    return {
      hasWatermark: false,
      isValid: false,
      info: null,
      details: `検証エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}
