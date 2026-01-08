/**
 * Document Edge Detection and Perspective Correction
 * 100% offline - no external APIs or ML services
 * 
 * Uses canvas-based image processing for:
 * - Edge detection (Sobel/Canny-like)
 * - Contour finding
 * - Quadrilateral detection
 * - Perspective transformation
 */

export interface Point {
  x: number;
  y: number;
}

export interface Quadrilateral {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface DetectionResult {
  detected: boolean;
  quad: Quadrilateral | null;
  confidence: number;
  stable: boolean;
}

// Store previous detections for stability check
let previousQuads: Quadrilateral[] = [];
const STABILITY_THRESHOLD = 5; // Number of frames to consider stable
const STABILITY_TOLERANCE = 15; // Pixel tolerance for stability

/**
 * Apply grayscale conversion
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  const data = imageData.data;
  
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    // Using luminance formula
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  
  return gray;
}

/**
 * Apply Gaussian blur (3x3 kernel)
 */
function gaussianBlur(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const blurred = new Uint8ClampedArray(gray.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[k++];
        }
      }
      blurred[y * width + x] = Math.round(sum / kernelSum);
    }
  }
  
  return blurred;
}

/**
 * Sobel edge detection
 */
function sobelEdgeDetection(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(gray.length);
  
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      let k = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          gx += pixel * sobelX[k];
          gy += pixel * sobelY[k];
          k++;
        }
      }
      
      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      edges[y * width + x] = magnitude;
    }
  }
  
  return edges;
}

/**
 * Apply threshold to edges
 */
function threshold(edges: Uint8ClampedArray, thresholdValue: number): Uint8ClampedArray {
  const binary = new Uint8ClampedArray(edges.length);
  
  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i] > thresholdValue ? 255 : 0;
  }
  
  return binary;
}

/**
 * Simple contour detection using boundary tracing
 */
function findContours(binary: Uint8ClampedArray, width: number, height: number): Point[][] {
  const visited = new Set<number>();
  const contours: Point[][] = [];
  
  // Direction vectors for 8-connectivity
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (binary[idx] === 255 && !visited.has(idx)) {
        // Start tracing contour
        const contour: Point[] = [];
        let cx = x;
        let cy = y;
        let dir = 0;
        let attempts = 0;
        const maxAttempts = 10000;
        
        do {
          contour.push({ x: cx, y: cy });
          visited.add(cy * width + cx);
          
          // Find next edge pixel
          let found = false;
          for (let i = 0; i < 8; i++) {
            const newDir = (dir + 7 + i) % 8; // Start from dir-1
            const nx = cx + dx[newDir];
            const ny = cy + dy[newDir];
            const nidx = ny * width + nx;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[nidx] === 255) {
              cx = nx;
              cy = ny;
              dir = newDir;
              found = true;
              break;
            }
          }
          
          if (!found) break;
          attempts++;
        } while ((cx !== x || cy !== y) && attempts < maxAttempts);
        
        if (contour.length > 50) {
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
}

/**
 * Douglas-Peucker algorithm for polygon simplification
 */
function simplifyPolygon(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  
  // Find the point with the maximum distance
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPolygon(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolygon(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
}

/**
 * Calculate area of polygon using Shoelace formula
 */
function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area / 2);
}

/**
 * Check if polygon is convex
 */
function isConvex(points: Point[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const d1x = points[(i + 1) % n].x - points[i].x;
    const d1y = points[(i + 1) % n].y - points[i].y;
    const d2x = points[(i + 2) % n].x - points[(i + 1) % n].x;
    const d2y = points[(i + 2) % n].y - points[(i + 1) % n].y;
    const cross = d1x * d2y - d1y * d2x;
    
    if (cross !== 0) {
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Order points in clockwise order: top-left, top-right, bottom-right, bottom-left
 */
function orderPoints(points: Point[]): Quadrilateral {
  // Sort by Y to get top and bottom pairs
  const sorted = [...points].sort((a, b) => a.y - b.y);
  
  // Top two points
  const topPoints = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  // Bottom two points
  const bottomPoints = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  
  return {
    topLeft: topPoints[0],
    topRight: topPoints[1],
    bottomRight: bottomPoints[1],
    bottomLeft: bottomPoints[0]
  };
}

/**
 * Find the best quadrilateral from contours
 */
function findBestQuadrilateral(
  contours: Point[][],
  imageWidth: number,
  imageHeight: number
): { quad: Quadrilateral | null; confidence: number } {
  const imageArea = imageWidth * imageHeight;
  const minArea = imageArea * 0.1; // At least 10% of image
  const maxArea = imageArea * 0.95; // At most 95% of image
  
  let bestQuad: Quadrilateral | null = null;
  let bestScore = 0;
  
  for (const contour of contours) {
    // Simplify contour
    const epsilon = 0.02 * contour.length;
    const simplified = simplifyPolygon(contour, epsilon);
    
    // Look for quadrilaterals (4 points)
    if (simplified.length >= 4 && simplified.length <= 8) {
      // Try to find 4 corner points
      const corners = findCorners(simplified);
      
      if (corners.length === 4) {
        const area = polygonArea(corners);
        
        if (area > minArea && area < maxArea && isConvex(corners)) {
          // Calculate score based on:
          // 1. Area (larger is better, up to a point)
          // 2. Aspect ratio (document-like ratios are better)
          // 3. Regularity (more rectangular is better)
          
          const areaScore = Math.min(area / maxArea, 1);
          
          const quad = orderPoints(corners);
          const width = Math.sqrt(
            (quad.topRight.x - quad.topLeft.x) ** 2 + 
            (quad.topRight.y - quad.topLeft.y) ** 2
          );
          const height = Math.sqrt(
            (quad.bottomLeft.x - quad.topLeft.x) ** 2 + 
            (quad.bottomLeft.y - quad.topLeft.y) ** 2
          );
          
          const aspectRatio = Math.max(width, height) / Math.min(width, height);
          // Favor ratios close to A4 (1.41) or Letter (1.29)
          const aspectScore = 1 - Math.min(Math.abs(aspectRatio - 1.41) / 2, 1);
          
          const score = areaScore * 0.6 + aspectScore * 0.4;
          
          if (score > bestScore) {
            bestScore = score;
            bestQuad = quad;
          }
        }
      }
    }
  }
  
  return { quad: bestQuad, confidence: bestScore };
}

/**
 * Find corner points from simplified polygon
 */
function findCorners(points: Point[]): Point[] {
  if (points.length <= 4) return points;
  
  // Find 4 points that form the largest quadrilateral
  let bestCorners: Point[] = [];
  let bestArea = 0;
  
  // If too many points, use extremes
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  // Find points closest to each extreme
  const corners: Point[] = [
    points.reduce((best, p) => (p.x + p.y < best.x + best.y ? p : best)), // top-left
    points.reduce((best, p) => (p.x - p.y > best.x - best.y ? p : best)), // top-right
    points.reduce((best, p) => (p.x + p.y > best.x + best.y ? p : best)), // bottom-right
    points.reduce((best, p) => (p.x - p.y < best.x - best.y ? p : best)), // bottom-left
  ];
  
  return corners;
}

/**
 * Check if quadrilateral is stable compared to previous detections
 */
function isStable(quad: Quadrilateral): boolean {
  if (previousQuads.length < STABILITY_THRESHOLD) {
    return false;
  }
  
  // Check if all recent quads are close to current
  for (const prevQuad of previousQuads.slice(-STABILITY_THRESHOLD)) {
    if (!quadsClose(quad, prevQuad, STABILITY_TOLERANCE)) {
      return false;
    }
  }
  
  return true;
}

function quadsClose(q1: Quadrilateral, q2: Quadrilateral, tolerance: number): boolean {
  const corners1 = [q1.topLeft, q1.topRight, q1.bottomRight, q1.bottomLeft];
  const corners2 = [q2.topLeft, q2.topRight, q2.bottomRight, q2.bottomLeft];
  
  for (let i = 0; i < 4; i++) {
    const dist = Math.sqrt(
      (corners1[i].x - corners2[i].x) ** 2 + 
      (corners1[i].y - corners2[i].y) ** 2
    );
    if (dist > tolerance) return false;
  }
  
  return true;
}

/**
 * Main detection function - call on each video frame
 */
export function detectDocument(
  video: HTMLVideoElement | HTMLCanvasElement,
  analyzeWidth: number = 640
): DetectionResult {
  try {
    // Create analysis canvas at reduced resolution for performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      return { detected: false, quad: null, confidence: 0, stable: false };
    }
    
    // Calculate dimensions maintaining aspect ratio
    const sourceWidth = video instanceof HTMLVideoElement ? video.videoWidth : video.width;
    const sourceHeight = video instanceof HTMLVideoElement ? video.videoHeight : video.height;
    
    if (sourceWidth === 0 || sourceHeight === 0) {
      return { detected: false, quad: null, confidence: 0, stable: false };
    }
    
    const scale = analyzeWidth / sourceWidth;
    const analyzeHeight = Math.round(sourceHeight * scale);
    
    canvas.width = analyzeWidth;
    canvas.height = analyzeHeight;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, analyzeWidth, analyzeHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, analyzeWidth, analyzeHeight);
    
    // Processing pipeline
    const gray = toGrayscale(imageData);
    const blurred = gaussianBlur(gray, analyzeWidth, analyzeHeight);
    const edges = sobelEdgeDetection(blurred, analyzeWidth, analyzeHeight);
    const binary = threshold(edges, 50);
    const contours = findContours(binary, analyzeWidth, analyzeHeight);
    
    // Find best quadrilateral
    const { quad: scaledQuad, confidence } = findBestQuadrilateral(
      contours, 
      analyzeWidth, 
      analyzeHeight
    );
    
    if (!scaledQuad) {
      previousQuads = [];
      return { detected: false, quad: null, confidence: 0, stable: false };
    }
    
    // Scale quad back to original coordinates
    const inverseScale = 1 / scale;
    const quad: Quadrilateral = {
      topLeft: { x: scaledQuad.topLeft.x * inverseScale, y: scaledQuad.topLeft.y * inverseScale },
      topRight: { x: scaledQuad.topRight.x * inverseScale, y: scaledQuad.topRight.y * inverseScale },
      bottomRight: { x: scaledQuad.bottomRight.x * inverseScale, y: scaledQuad.bottomRight.y * inverseScale },
      bottomLeft: { x: scaledQuad.bottomLeft.x * inverseScale, y: scaledQuad.bottomLeft.y * inverseScale }
    };
    
    // Update stability tracking
    previousQuads.push(quad);
    if (previousQuads.length > STABILITY_THRESHOLD * 2) {
      previousQuads = previousQuads.slice(-STABILITY_THRESHOLD);
    }
    
    const stable = isStable(quad);
    
    return { detected: true, quad, confidence, stable };
  } catch (error) {
    console.error('[DocumentDetection] Error:', error);
    return { detected: false, quad: null, confidence: 0, stable: false };
  }
}

/**
 * Reset detection state (call when scanner closes)
 */
export function resetDetection(): void {
  previousQuads = [];
}

/**
 * Perspective transformation - corrects document to rectangle
 */
export async function applyPerspectiveCorrection(
  sourceCanvas: HTMLCanvasElement,
  quad: Quadrilateral,
  outputWidth?: number,
  outputHeight?: number
): Promise<HTMLCanvasElement> {
  // Calculate output dimensions based on quadrilateral
  const width1 = Math.sqrt(
    (quad.topRight.x - quad.topLeft.x) ** 2 + 
    (quad.topRight.y - quad.topLeft.y) ** 2
  );
  const width2 = Math.sqrt(
    (quad.bottomRight.x - quad.bottomLeft.x) ** 2 + 
    (quad.bottomRight.y - quad.bottomLeft.y) ** 2
  );
  const height1 = Math.sqrt(
    (quad.bottomLeft.x - quad.topLeft.x) ** 2 + 
    (quad.bottomLeft.y - quad.topLeft.y) ** 2
  );
  const height2 = Math.sqrt(
    (quad.bottomRight.x - quad.topRight.x) ** 2 + 
    (quad.bottomRight.y - quad.topRight.y) ** 2
  );
  
  const outWidth = outputWidth || Math.round(Math.max(width1, width2));
  const outHeight = outputHeight || Math.round(Math.max(height1, height2));
  
  // Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outWidth;
  outputCanvas.height = outHeight;
  const ctx = outputCanvas.getContext('2d')!;
  
  // Get source image data
  const srcCtx = sourceCanvas.getContext('2d')!;
  const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcData = srcImageData.data;
  
  // Create output image data
  const dstImageData = ctx.createImageData(outWidth, outHeight);
  const dstData = dstImageData.data;
  
  // Compute inverse perspective transform
  // Using bilinear interpolation for each output pixel
  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      // Normalized coordinates in output (0-1)
      const u = x / (outWidth - 1);
      const v = y / (outHeight - 1);
      
      // Bilinear interpolation of source coordinates
      const srcX = 
        (1 - u) * (1 - v) * quad.topLeft.x +
        u * (1 - v) * quad.topRight.x +
        u * v * quad.bottomRight.x +
        (1 - u) * v * quad.bottomLeft.x;
      
      const srcY = 
        (1 - u) * (1 - v) * quad.topLeft.y +
        u * (1 - v) * quad.topRight.y +
        u * v * quad.bottomRight.y +
        (1 - u) * v * quad.bottomLeft.y;
      
      // Bilinear interpolation of source pixel
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, sourceCanvas.width - 1);
      const y1 = Math.min(y0 + 1, sourceCanvas.height - 1);
      const fx = srcX - x0;
      const fy = srcY - y0;
      
      const dstIdx = (y * outWidth + x) * 4;
      
      for (let c = 0; c < 4; c++) {
        const v00 = srcData[(y0 * sourceCanvas.width + x0) * 4 + c];
        const v10 = srcData[(y0 * sourceCanvas.width + x1) * 4 + c];
        const v01 = srcData[(y1 * sourceCanvas.width + x0) * 4 + c];
        const v11 = srcData[(y1 * sourceCanvas.width + x1) * 4 + c];
        
        const value = 
          (1 - fx) * (1 - fy) * v00 +
          fx * (1 - fy) * v10 +
          (1 - fx) * fy * v01 +
          fx * fy * v11;
        
        dstData[dstIdx + c] = Math.round(value);
      }
    }
  }
  
  ctx.putImageData(dstImageData, 0, 0);
  return outputCanvas;
}

/**
 * Apply document enhancement filters
 */
export function enhanceDocument(
  canvas: HTMLCanvasElement,
  options: {
    mode: 'color' | 'grayscale' | 'bw';
    brightness: number; // 0-200, 100 = normal
    contrast: number; // 0-200, 100 = normal
    sharpen: boolean;
    removeBackground: boolean;
  }
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const brightnessFactor = options.brightness / 100;
  const contrastFactor = ((options.contrast - 100) / 100) * 255;
  
  // First pass: apply brightness, contrast, and color mode
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Brightness
    r *= brightnessFactor;
    g *= brightnessFactor;
    b *= brightnessFactor;
    
    // Contrast
    r = ((r - 128) * ((255 + contrastFactor) / 255)) + 128;
    g = ((g - 128) * ((255 + contrastFactor) / 255)) + 128;
    b = ((b - 128) * ((255 + contrastFactor) / 255)) + 128;
    
    // Color mode conversion
    if (options.mode === 'grayscale' || options.mode === 'bw') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (options.mode === 'bw') {
        // Adaptive thresholding would be better, but simple threshold works
        const bwValue = gray > 128 ? 255 : 0;
        r = g = b = bwValue;
      } else {
        r = g = b = gray;
      }
    }
    
    // Remove shadows (brighten dark areas)
    if (options.removeBackground) {
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 180 && luminance > 40) {
        const boost = 1 + (180 - luminance) / 400;
        r *= boost;
        g *= boost;
        b *= boost;
      }
    }
    
    // Clamp values
    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Sharpen if requested (using unsharp mask)
  if (options.sharpen) {
    applySharpen(canvas);
  }
  
  return canvas;
}

/**
 * Apply sharpening filter
 */
function applySharpen(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const original = new Uint8ClampedArray(data);
  
  // Sharpening kernel
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += original[idx] * kernel[k++];
          }
        }
        
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}
