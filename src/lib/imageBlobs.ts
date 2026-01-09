// Utilities to keep scanner memory usage low on mobile (Android WebView)

export type JpegQuality = number;

export function getCssHsl(varName: string, alpha?: number): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return alpha === undefined ? 'hsl(0 0% 100%)' : `hsl(0 0% 100% / ${alpha})`;
  if (alpha === undefined) return `hsl(${raw})`;
  return `hsl(${raw} / ${alpha})`;
}

export function constrainSize(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number; scale: number } {
  const side = Math.max(width, height);
  if (side <= maxSide) return { width, height, scale: 1 };
  const scale = maxSide / side;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}

export async function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: JpegQuality
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('canvas.toBlob returned null'));
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function safeRevokeObjectUrl(url?: string | null) {
  if (!url) return;
  if (!url.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

export async function drawImageToCanvas(
  sourceUrl: string,
  maxSide: number
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }>
{
  // Use ImageBitmap to reduce overhead vs <img> decode on some devices
  const bitmap = await loadImageBitmap(sourceUrl);
  const { width, height } = constrainSize(bitmap.width, bitmap.height, maxSide);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return { canvas, width, height };
}
