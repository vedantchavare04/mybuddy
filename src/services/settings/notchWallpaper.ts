export type PreparedNotchWallpaper = {
  dataUrl: string;
  luminance: number;
};

const WIDTH = 1050;
const HEIGHT = 200;
const MAX_DATA_URL_LENGTH = 2_400_000;

/** Crops a local image to the Notch's wide capsule ratio and stores only a small WebP. */
export async function prepareNotchWallpaper(
  file: File,
): Promise<PreparedNotchWallpaper> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file to use as your Notch wallpaper.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try a JPG, PNG, or WebP.");
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not prepare the wallpaper preview.");

    const targetRatio = WIDTH / HEIGHT;
    const imageRatio = bitmap.width / bitmap.height;
    const cropWidth = imageRatio > targetRatio
      ? bitmap.height * targetRatio
      : bitmap.width;
    const cropHeight = imageRatio > targetRatio
      ? bitmap.height
      : bitmap.width / targetRatio;
    const cropX = (bitmap.width - cropWidth) / 2;
    const cropY = (bitmap.height - cropHeight) / 2;

    context.drawImage(
      bitmap,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      WIDTH,
      HEIGHT,
    );

    const pixels = context.getImageData(0, 0, WIDTH, HEIGHT).data;
    let luminanceTotal = 0;
    const sampleStride = 4 * 12;
    let sampleCount = 0;
    for (let i = 0; i < pixels.length; i += sampleStride) {
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;
      luminanceTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sampleCount += 1;
    }

    const dataUrl = canvas.toDataURL("image/webp", 0.84);
    if (!dataUrl.startsWith("data:image/webp;base64,")) {
      throw new Error("WebP image processing is unavailable in this app.");
    }
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("This image is still too large after compression. Try another photo.");
    }

    return {
      dataUrl,
      luminance: sampleCount ? luminanceTotal / sampleCount : 0.2,
    };
  } finally {
    bitmap.close();
  }
}

/** A simple dark veil becomes stronger on bright photos for a consistent Notch look. */
export function wallpaperVeilOpacity(luminance: number): number {
  const safeLuminance = Number.isFinite(luminance)
    ? Math.max(0, Math.min(1, luminance))
    : 0.2;
  return 0.16 + safeLuminance * 0.3;
}
