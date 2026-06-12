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
      input.capture = "environment";
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

// ─── Bunny.net Upload (via API route) ────────────────────────────────────────

/**
 * Upload a File to Bunny.net via our internal API route.
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
  const photoFile =
    file instanceof File
      ? file
      : new File([file], fileName || `photo_${Date.now()}.jpg`, {
          type: file.type || "image/jpeg",
        });

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

// ─── Camera Action Handler (for use in bottom sheets / action sheets) ─────────

/**
 * Presents a small action sheet / bottom-sheet-style picker for
 * "Take Photo" vs "Choose from Gallery".
 * Returns the uploaded URL, or null if cancelled.
 */
export async function pickAndUploadPhoto(
  folder: string,
  userId: string
): Promise<string | null> {
  const file = await takePhoto("camera");
  if (file) {
    const result = await uploadPhoto(file, folder, userId);
    return result.url;
  }

  const galleryFile = await takePhoto("gallery");
  if (galleryFile) {
    const result = await uploadPhoto(galleryFile, folder, userId);
    return result.url;
  }

  return null;
}
