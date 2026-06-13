function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(" ");
  let line = "";
  let lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines = lines.slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function formatValue(value: string): string {
  return `$${Number(String(value).replace(/[^0-9.]/g, "")).toLocaleString()}`;
}

export async function generateShareCard(opts: {
  imageUrl: string;
  name: string;
  value: string;
  valueLabel?: string;
}): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);

  const imgH = W;
  try {
    const img = await loadImage(opts.imageUrl);
    drawCover(ctx, img, 0, 0, W, imgH);
  } catch {
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, W, imgH);
  }

  ctx.strokeStyle = "#C9A84C";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, imgH - 6);

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, imgH, W, H - imgH);

  ctx.textAlign = "center";

  ctx.fillStyle = "#ededed";
  ctx.font = "600 56px Georgia, serif";
  const nameBottom = wrapText(ctx, opts.name, W / 2, imgH + 95, W - 120, 66);

  ctx.fillStyle = "#C9A84C";
  ctx.font = "32px Inter, Arial, sans-serif";
  ctx.fillText((opts.valueLabel ?? "CURRENT VALUE").toUpperCase(), W / 2, nameBottom + 55);

  ctx.fillStyle = "#00C853";
  ctx.font = "bold 100px Inter, Arial, sans-serif";
  ctx.fillText(formatValue(opts.value), W / 2, nameBottom + 165);

  ctx.fillStyle = "#C9A84C";
  ctx.font = "600 42px Georgia, serif";
  ctx.fillText("SCANIFY", W / 2, H - 45);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
}

export async function shareCard(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: "image/jpeg" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
