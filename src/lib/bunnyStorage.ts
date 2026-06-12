// ─── Bunny.net Storage Configuration ─────────────────────────────────────────
//
// Required environment variables:
//   BUNNY_STORAGE_ZONE  – The name of your Bunny.net storage zone
//   BUNNY_API_KEY       – The storage zone API access key (not the main account API key)
//   BUNNY_CDN_URL       – The CDN pull zone URL (e.g., https://rentke.b-cdn.net)
//
// ──────────────────────────────────────────────────────────────────────────────

export interface BunnyUploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Bunny.net Storage.
 *
 * Called from the server-side API route only — never from client code,
 * because the AccessKey must remain secret.
 */
export async function uploadToBunny(
  fileBuffer: ArrayBuffer,
  fileName: string,
  folder: string,
  userId: string
): Promise<BunnyUploadResult> {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_API_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;

  if (!storageZone || !apiKey || !cdnUrl) {
    throw new Error(
      "Bunny.net environment variables (BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_CDN_URL) are not set."
    );
  }

  // Build the remote path inside the storage zone
  const remotePath = `uploads/${userId}/${folder}/${fileName}`;

  // Bunny.net Storage API endpoint
  const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${remotePath}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Bunny.net upload failed (${response.status}): ${errorText}`
    );
  }

  // Construct the public CDN URL (strip trailing slash from cdnUrl to avoid double slashes)
  const baseUrl = cdnUrl.replace(/\/+$/, "");
  const publicUrl = `${baseUrl}/${remotePath}`;

  return { url: publicUrl, path: remotePath };
}
