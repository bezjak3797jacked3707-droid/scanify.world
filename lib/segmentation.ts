// Extracts a rough outline of the photographed object by detecting what's
// visually different from the background near the photo's corners.
// Returns null if detection isn't confident — callers should fall back to
// a generic shape in that case, never block or fail the real scan.

function colorDistance(a: number[], b: number[]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }
  
  function sampleBackground(data: Uint8ClampedArray, size: number): number[] {
    const patch = 6;
    const corners = [
      [0, 0], [size - patch, 0], [0, size - patch], [size - patch, size - patch],
    ];
    let r = 0, g = 0, b = 0, count = 0;
    for (const [cx, cy] of corners) {
      for (let y = cy; y < cy + patch; y++) {
        for (let x = cx; x < cx + patch; x++) {
          const idx = (y * size + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
    }
    return [r / count, g / count, b / count];
  }
  
  export async function extractOutline(file: File): Promise<number[][] | null> {
    try {
      const size = 100;
      const img = new Image();
      const url = URL.createObjectURL(file);
  
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      });
  
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return null; }
  
      // Stretch to a fixed 100x100 working space — matches the same normalized
      // coordinate space the fallback silhouettes already use, so no aspect
      // ratio math is needed anywhere downstream.
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      URL.revokeObjectURL(url);
  
      const bg = sampleBackground(data, size);
      const THRESHOLD = 35;
  
      const mask = new Uint8Array(size * size);
      let fgCount = 0;
      let sumX = 0;
      let sumY = 0;
  
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const dist = colorDistance([data[idx], data[idx + 1], data[idx + 2]], bg);
          if (dist > THRESHOLD) {
            mask[y * size + x] = 1;
            fgCount++;
            sumX += x;
            sumY += y;
          }
        }
      }
  
      // Too little detected difference from background — likely a low-contrast
      // photo or uneven background. Bail out to the safe generic fallback.
      if (fgCount < size * size * 0.03) return null;
  
      const centroidX = sumX / fgCount;
      const centroidY = sumY / fgCount;
  
      // Cast rays outward from the centroid, find the outermost foreground
      // pixel along each — traces the actual detected shape as a polygon.
      const RAY_COUNT = 20;
      const points: number[][] = [];
  
      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = (i / RAY_COUNT) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let lastFg: number[] | null = null;
  
        for (let r = 0; r < size; r++) {
          const px = Math.round(centroidX + dx * r);
          const py = Math.round(centroidY + dy * r);
          if (px < 0 || px >= size || py < 0 || py >= size) break;
          if (mask[py * size + px]) lastFg = [px, py];
        }
        if (lastFg) points.push(lastFg);
      }
  
      // Too sparse/unreliable a trace — safer to fall back than show a broken shape.
      if (points.length < RAY_COUNT * 0.6) return null;
  
      return points;
    } catch {
      return null;
    }
  }