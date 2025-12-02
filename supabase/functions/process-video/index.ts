// Supabase Edge Function for video thumbnail and preview generation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FFmpeg WASM for Deno
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.7";
import { fetchFile, toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ファイルサイズの制限（30MB）
const MAX_FILE_SIZE = 30 * 1024 * 1024;

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageId, storagePath, fileSize } = await req.json();

    if (!imageId || !storagePath) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabaseクライアント作成
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 処理状態を更新
    await supabase
      .from("images")
      .update({ processing_status: "processing" })
      .eq("id", imageId);

    // ファイルサイズチェック
    const isLargeFile = fileSize && fileSize > MAX_FILE_SIZE;

    // 動画ファイルをダウンロード
    const { data: videoData, error: downloadError } = await supabase.storage
      .from("images")
      .download(storagePath);

    if (downloadError || !videoData) {
      throw new Error(`Failed to download video: ${downloadError?.message}`);
    }

    // FFmpegを初期化
    const ffmpeg = new FFmpeg();

    // FFmpeg WASMをロード
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    // 入力ファイルを書き込み
    const inputFileName = "input.mp4";
    await ffmpeg.writeFile(inputFileName, new Uint8Array(await videoData.arrayBuffer()));

    // サムネイル生成（最初のフレーム）
    const thumbnailFileName = "thumbnail.jpg";
    await ffmpeg.exec([
      "-i", inputFileName,
      "-ss", "00:00:00.1",
      "-vframes", "1",
      "-vf", "scale=320:-1",
      "-q:v", "2",
      thumbnailFileName
    ]);

    const thumbnailData = await ffmpeg.readFile(thumbnailFileName);
    const thumbnailBlob = new Blob([thumbnailData], { type: "image/jpeg" });

    // サムネイルをアップロード
    const thumbnailPath = storagePath.replace(/\.[^.]+$/, "_thumb.jpg");
    const { error: thumbUploadError } = await supabase.storage
      .from("images")
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (thumbUploadError) {
      throw new Error(`Failed to upload thumbnail: ${thumbUploadError.message}`);
    }

    let previewPath = null;

    // 小さいファイルの場合のみ低画質プレビューを生成
    if (!isLargeFile) {
      try {
        const previewFileName = "preview.mp4";
        await ffmpeg.exec([
          "-i", inputFileName,
          "-vf", "scale=480:-2",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "35",
          "-c:a", "aac",
          "-b:a", "64k",
          "-movflags", "+faststart",
          "-t", "30", // 最大30秒
          previewFileName
        ]);

        const previewData = await ffmpeg.readFile(previewFileName);
        const previewBlob = new Blob([previewData], { type: "video/mp4" });

        previewPath = storagePath.replace(/\.[^.]+$/, "_preview.mp4");
        const { error: previewUploadError } = await supabase.storage
          .from("images")
          .upload(previewPath, previewBlob, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (previewUploadError) {
          console.error("Failed to upload preview:", previewUploadError.message);
          previewPath = null;
        }
      } catch (previewError) {
        console.error("Preview generation failed:", previewError);
        // プレビュー生成に失敗してもサムネイルは保存
      }
    }

    // データベースを更新
    const { error: updateError } = await supabase
      .from("images")
      .update({
        thumbnail_path: thumbnailPath,
        preview_path: previewPath,
        processing_status: "completed",
      })
      .eq("id", imageId);

    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        thumbnailPath,
        previewPath,
        message: isLargeFile ? "Thumbnail only (file too large for preview)" : "Full processing completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Processing error:", error);

    // エラー時はステータスを更新
    try {
      const { imageId } = await req.json().catch(() => ({}));
      if (imageId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from("images")
          .update({ processing_status: "failed" })
          .eq("id", imageId);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message || "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
