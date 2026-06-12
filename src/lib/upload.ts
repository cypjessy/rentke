// ─── Photo Source Types ───────────────────────────────────────────────────────

export type PhotoSource = "camera" | "gallery";

// ─── Upload Result ────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  path: string;
}

// ─── Web File Input ───────────────────────────────────────────────────────────

/** Open a file picker and return the selected File. */
export function openFilePicker(
  accept: string = "image/*",
  multiple: boolean = false
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        resolve(Array.from(input.files));
      } else {
        reject(new Error("No file selected"));
      }
    };
    input.onerror = () => reject(new Error("File picker error"));
    input.click();
  });
}

// ─── Capacitor Camera ─────────────────────────────────────────────────────────

/** Check if Capacitor is available (running on native or in a Capacitor webview). */
export function isCapacitorAvailable(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform();
  } catch {
    return false;
  }
}

/** Take a photo using Capacitor Camera or web fallback. Returns a File object. */
export async function takePhoto(source: PhotoSource = "camera"): Promise<File | null> {
  if (isCapacitorAvailable()) {
    return takePhotoCapacitor(source);
  }
  return takePhotoWeb(source);
}

async function takePhotoCapacitor(source: PhotoSource): Promise<File | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });

    if (!image.webPath) return null;

    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const ext = blob.type.split("/")[1] || "jpg";
    return new File([blob], `photo_${Date.now()}.${ext}`, { type: blob.type });
  } catch (err: any) {
    if (err?.message?.includes("User cancelled")) return null;
    console.error("Capacitor camera error:", err);
    return null;
  }
}

async function takePhotoWeb(source: PhotoSource): Promise<File | null> {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    }

    const files = await new Promise<File[]>((resolve, reject) => {
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(Array.from(input.files));
        } else {
          reject(new Error("No file selected"));
        }
      };
      input.onerror = () => reject(new Error("File picker error"));
      input.click();
    });

    return files[0] || null;
  } catch {
    return null;
  }
}

// ─── Client-Side Image Compression ───────────────────────────────────────────
//
// Vercel serverless functions have a hard 4.5 MB body limit for incoming
// requests. Modern phone photos (8-12 MB) will fail with 413 without this.
// We compress images client-side to stay safely under that limit.
// ──────────────────────────────────────────────────────────────────────────────

/** Maximum dimension (width or height) after compression. */
const MAX_IMAGE_DIM = 1920;

/** Target maximum file size in bytes (leave headroom below Vercel's 4.5 MB). */
const TARGET_MAX_SIZE = 3.5 * 1024 * 1024;

/**
 * Compress an image file client-side using Canvas.
 * Resizes to at most 1920px on the longest edge and reduces JPEG quality
 * iteratively until the file fits under ~3.5 MB.
 *
 * Returns the original file unchanged if it's already small enough or not an
 * image type.
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress image types
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  // Return as-is if already under the target size
  if (file.size <= TARGET_MAX_SIZE) {
    return file;
  }

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image for compression"));
  });

  // Calculate new dimensions preserving aspect ratio
  let { width, height } = img;
  if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
    const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    return file;
  }

  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);

  // Try JPEG quality from 0.85 down to 0.1 until size fits
  let quality = 0.85;
  let compressedBlob: Blob | null = null;

  while (quality >= 0.1) {
    compressedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );

    if (compressedBlob && compressedBlob.size <= TARGET_MAX_SIZE) break;
    quality -= 0.1;
  }

  if (!compressedBlob) {
    compressedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.1)
    );
  }

  // If compression still failed, return the original file unchanged
  if (!compressedBlob) {
    return file;
  }

  // Build a new filename with .jpg extension
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([compressedBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}

// ─── Bunny.net Upload (via API route) ────────────────────────────────────────

/**
 * Upload a File to Bunny.net via our internal API route.
 *
 * Images larger than ~3.5 MB are automatically compressed client-side to stay
 * under Vercel's 4.5 MB serverless function body limit.
 *
 * @param file      - The File to upload
 * @param folder    - Storage folder path (e.g., "properties", "units", "profiles")
 * @param userId    - The user's UID for namespacing
 * @param fileName  - Optional custom filename (default: auto-generated)
 */
export async function uploadPhoto(
  file: File | Blob,
  folder: string,
  userId: string,
  fileName?: string
): Promise<UploadResult> {
  // Convert Blob to File if needed
  const rawFile =
    file instanceof File
      ? file
      : new File([file], fileName || `photo_${Date.now()}.jpg`, {
          type: file.type || "image/jpeg",
        });

  // Compress large images client-side to avoid Vercel's 4.5 MB body limit
  const photoFile = await compressImage(rawFile);

  const formData = new FormData();
  formData.append("file", photoFile);
  formData.append("folder", folder);
  formData.append("userId", userId);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Upload failed (${response.status}): ${errBody}`);
  }

  const result: UploadResult = await response.json();
  return result;
}

/**
 * Upload multiple files in parallel to Bunny.net.
 */
export async function uploadPhotos(
  files: File[],
  folder: string,
  userId: string
): Promise<UploadResult[]> {
  const results = await Promise.allSettled(
    files.map((file) => uploadPhoto(file, folder, userId))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<UploadResult>).value);
}

// ─── User-Facing Source Chooser ──────────────────────────────────────────────
// Returns true for camera, false for gallery.
export async function askPhotoSource(): Promise<PhotoSource> {
  try {
    if (isCapacitorAvailable()) {
      const { ActionSheet, ActionSheetButtonStyle } = await import("@capacitor/action-sheet");
      const result = await ActionSheet.showActions({
        title: "Add Photo",
        message: "Choose how you want to add a photo",
        options: [
          { title: "📷 Take Photo", style: ActionSheetButtonStyle.Default },
          { title: "🖼️ Choose from Gallery", style: ActionSheetButtonStyle.Default },
          { title: "Cancel", style: ActionSheetButtonStyle.Cancel },
        ],
      });
      if (result.index === 0) return "camera";
      if (result.index === 1) return "gallery";
      return "camera";
    }
  } catch {
    // Fall through
  }
  return "camera";
}

// ─── Camera Action Handler (for use in bottom sheets / action sheets) ─────────

/**
 * Shows a chooser (Camera vs Gallery) then uploads the selected photo.
 * Returns the uploaded URL, or null if cancelled.
 */
export async function pickAndUploadPhoto(
  folder: string,
  userId: string
): Promise<string | null> {
  const source = await askPhotoSource();

  const file = await takePhoto(source);
  if (file) {
    try {
      const result = await uploadPhoto(file, folder, userId);
      return result.url;
    } catch (err) {
      console.error("Upload failed after taking photo:", err);
      return null;
    }
  }

  return null;
}
