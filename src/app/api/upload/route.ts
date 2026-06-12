import { NextRequest, NextResponse } from "next/server";
import { uploadToBunny } from "@/lib/bunnyStorage";

// ─── Force Node.js runtime (Edge runtime may not have fetch + env vars) ───────
export const runtime = "nodejs";

// ─── POST /api/upload ─────────────────────────────────────────────────────────
//
// Accepts multipart/form-data with:
//   - "file"     – The image file to upload (required)
//   - "folder"   – Storage subfolder e.g. "properties" | "units" | "profiles"
//   - "userId"   – The user's UID for namespacing
//   - "token"    – Firebase ID token for authorization
//
// Returns JSON:
//   { url: string, path: string }
//
// ──────────────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";
    const userId = (formData.get("userId") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send a 'file' field in the form data." },
        { status: 400 }
      );
    }

    // ── File type validation ───────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type '${file.type}' is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── File size validation ───────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    // ── Authorization check ────────────────────────────────────────────────
    // The userId must be provided to namespace the upload
    if (!userId) {
      return NextResponse.json(
        { error: "Missing 'userId' field." },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Read the file bytes
    const arrayBuffer = await file.arrayBuffer();

    const result = await uploadToBunny(arrayBuffer, fileName, folder, userId);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
