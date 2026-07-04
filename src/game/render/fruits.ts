import type { FruitKind } from '../../core/types';

const FRUIT_COLORS: Record<FruitKind, { fill: string; stroke: string }> = {
  mango: { fill: '#ffb703', stroke: '#d68c00' },
  orange: { fill: '#fb8500', stroke: '#c96600' },
  grape: { fill: '#8338ec', stroke: '#5f2bb3' },
  watermelon: { fill: '#ff5c7a', stroke: '#d43f5c' },
  mangosteen: { fill: '#6a3093', stroke: '#4a2068' },
  banana: { fill: '#ffe066', stroke: '#e0c34a' },
};

/**
 * Every fruit has a distinct silhouette, not just a distinct color, so the
 * board reads clearly for colorblind players and at a glance for elderly
 * eyes (ADR-0004).
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: FruitKind,
  cx: number,
  cy: number,
  size: number,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const { fill, stroke } = FRUIT_COLORS[fruit];
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, size * 0.03);
  switch (fruit) {
    case 'mango':
      drawMango(ctx, cx, cy, size);
      break;
    case 'orange':
      drawOrange(ctx, cx, cy, size);
      break;
    case 'grape':
      drawGrape(ctx, cx, cy, size);
      break;
    case 'watermelon':
      drawWatermelon(ctx, cx, cy, size);
      break;
    case 'mangosteen':
      drawMangosteen(ctx, cx, cy, size);
      break;
    case 'banana':
      drawBanana(ctx, cx, cy, size);
      break;
  }
  ctx.restore();
}

function drawMango(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const w = size * 0.32;
  const h = size * 0.34;
  const path = new Path2D();
  path.moveTo(cx - w * 0.2, cy - h);
  path.bezierCurveTo(cx + w, cy - h * 0.9, cx + w * 1.1, cy + h * 0.6, cx, cy + h);
  path.bezierCurveTo(cx - w * 1.1, cy + h * 0.6, cx - w * 0.9, cy - h * 0.6, cx - w * 0.2, cy - h);
  path.closePath();
  ctx.fill(path);
  ctx.stroke(path);
}

function drawOrange(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size * 0.34;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#2d6a4f';
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.3, cy - r * 0.95, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size * 0.13;
  const offsets: [number, number][] = [
    [0, -r * 1.6],
    [-r * 1.3, -r * 0.3],
    [r * 1.3, -r * 0.3],
    [-r * 0.7, r * 1.1],
    [r * 0.7, r * 1.1],
    [0, r * 1.9],
  ];
  for (const [dx, dy] of offsets) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawWatermelon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size * 0.36;
  const flatY = cy + r * 0.15;
  ctx.beginPath();
  ctx.arc(cx, flatY, r, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = '#2d6a4f';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - r, flatY);
  ctx.lineTo(cx + r, flatY);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#3d2b1f';
  const seeds: [number, number][] = [
    [-r * 0.35, r * 0.3],
    [r * 0.35, r * 0.3],
    [0, r * 0.6],
  ];
  for (const [dx, dy] of seeds) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + dy, r * 0.06, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMangosteen(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size * 0.32;
  const bodyY = cy + r * 0.15;
  ctx.beginPath();
  ctx.arc(cx, bodyY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = '#3a5a40';
  const crownBaseY = bodyY - r * 0.7;
  for (let i = -2; i <= 2; i++) {
    const angle = (i * 20 * Math.PI) / 180;
    const tipX = cx + Math.sin(angle) * r * 0.55;
    const tipY = crownBaseY - Math.cos(angle) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, crownBaseY + r * 0.15);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX + r * 0.15, crownBaseY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBanana(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const w = size * 0.4;
  const h = size * 0.22;
  const path = new Path2D();
  path.moveTo(cx - w, cy + h * 0.7);
  path.quadraticCurveTo(cx, cy - h * 1.8, cx + w, cy - h * 0.2);
  path.quadraticCurveTo(cx + w * 0.55, cy - h * 0.5, cx, cy - h * 0.35);
  path.quadraticCurveTo(cx - w * 0.55, cy - h * 0.1, cx - w, cy + h * 0.7);
  path.closePath();
  ctx.fill(path);
  ctx.stroke(path);
}
