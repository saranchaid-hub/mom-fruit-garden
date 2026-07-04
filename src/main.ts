const canvas = document.getElementById('board') as HTMLCanvasElement;
const rawCtx = canvas.getContext('2d');
if (!rawCtx) {
  throw new Error('Canvas 2D context is not available');
}
const ctx: CanvasRenderingContext2D = rawCtx;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(size);
}

function mangoPath(size: number): Path2D {
  const path = new Path2D();
  const cx = size / 2;
  const cy = size / 2 + size * 0.06;
  const w = size * 0.32;
  const h = size * 0.34;
  path.moveTo(cx - w * 0.2, cy - h);
  path.bezierCurveTo(cx + w, cy - h * 0.9, cx + w * 1.1, cy + h * 0.6, cx, cy + h);
  path.bezierCurveTo(cx - w * 1.1, cy + h * 0.6, cx - w * 0.9, cy - h * 0.6, cx - w * 0.2, cy - h);
  path.closePath();
  return path;
}

function draw(size: number): void {
  ctx.clearRect(0, 0, size, size);

  ctx.font = `${size * 0.06}px "Noto Sans Thai", sans-serif`;
  ctx.fillStyle = '#5b3a29';
  ctx.textAlign = 'center';
  ctx.fillText('สวนผลไม้ของแม่', size / 2, size * 0.08);

  const mango = mangoPath(size);
  ctx.fillStyle = '#ffb703';
  ctx.fill(mango);
  ctx.strokeStyle = '#d68c00';
  ctx.lineWidth = size * 0.01;
  ctx.stroke(mango);
}

window.addEventListener('resize', resize);
resize();
