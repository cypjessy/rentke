import { NextRequest, NextResponse } from "next/server";

// ─── Force Node.js runtime ────────────────────────────────────────────────────
export const runtime = "nodejs";

// ─── GET /api/test-bunny-connection ───────────────────────────────────────────
//
// Tests the Bunny.net Storage connection by checking environment variables and
// performing a small upload (then clean-up) to verify the credentials work.
//
// Returns JSON:
//   { success: boolean, message: string, details?: Record<string, unknown> }
//
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_API_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;

  const envStatus: Record<string, string> = {};

  // ── Step 1: Check environment variables ──────────────────────────────────
  if (!storageZone) envStatus.BUNNY_STORAGE_ZONE = "❌ Not set";
  else envStatus.BUNNY_STORAGE_ZONE = "✅ Set";

  if (!apiKey) envStatus.BUNNY_API_KEY = "❌ Not set";
  else envStatus.BUNNY_API_KEY = `✅ Set (${apiKey.slice(0, 4)}…${apiKey.slice(-4)})`;

  if (!cdnUrl) envStatus.BUNNY_CDN_URL = "❌ Not set";
  else envStatus.BUNNY_CDN_URL = `✅ Set (${cdnUrl})`;

  const allSet = storageZone && apiKey && cdnUrl;
  if (!allSet) {
    return NextResponse.json(
      {
        success: false,
        message: "Bunny.net environment variables are not fully configured.",
        details: envStatus,
      },
      { status: 200 }
    );
  }

  // ── Step 2: Test the connection by uploading a small marker file ───────────
  const testFileName = `_test_connection_${Date.now()}.txt`;
  const testFilePath = `uploads/_tests/${testFileName}`;
  const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${testFilePath}`;

  try {
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "text/plain",
      },
      body: `Bunny.net connection test — ${new Date().toISOString()}`,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => "Unknown error");
      return NextResponse.json(
        {
          success: false,
          message: `Connection failed (${uploadResponse.status}): ${errorText}`,
          details: {
            ...envStatus,
            testUpload: `❌ Failed (HTTP ${uploadResponse.status})`,
          },
        },
        { status: 200 }
      );
    }

    // ── Step 3: Clean up — delete the test file ─────────────────────────────
    const deleteResponse = await fetch(uploadUrl, {
      method: "DELETE",
      headers: {
        AccessKey: apiKey,
      },
    });

    const cleanUpOk = deleteResponse.ok || deleteResponse.status === 404;

    return NextResponse.json(
      {
        success: true,
        message: cleanUpOk
          ? "✅ Bunny.net connection is working properly!"
          : "✅ Bunny.net upload works (but clean-up had a minor issue — credentials are valid)",
        details: {
          ...envStatus,
          testUpload: "✅ Successful",
          testCleanup: cleanUpOk ? "✅ Done" : `⚠️ ${deleteResponse.status}`,
          cdnUrl,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Connection error: ${err.message || "Network failure"}`,
        details: {
          ...envStatus,
          testUpload: "❌ Network error — could not reach Bunny.net",
        },
      },
      { status: 200 }
    );
  }
}
