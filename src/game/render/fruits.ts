import type { FruitKind, SpecialType } from '../../core/types';
import { roundRect } from './renderer';

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

/**
 * A pulsing warm halo drawn UNDER any special piece, so specials pop out from
 * plain fruit at a glance (elderly-friendly: motion + brightness, not just a
 * subtle marking). `pulse` is 0..1, advanced by the render loop each frame.
 */
export function drawSpecialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  pulse: number,
): void {
  const r = size * (0.46 + 0.06 * pulse);
  const gradient = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  gradient.addColorStop(0, `rgba(255, 246, 200, ${0.6 + 0.3 * pulse})`);
  gradient.addColorStop(0.65, `rgba(255, 214, 90, ${0.35 + 0.25 * pulse})`);
  gradient.addColorStop(1, 'rgba(255, 214, 90, 0)');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Drawn on top of a fruit sprite for stripedH/stripedV/wrapped/rain. Color
 * bomb has no fruit to overlay (its fruit is null) and is drawn standalone
 * via drawColorBomb instead. Stripes, the wrapper, and rain's cross are all
 * two-tone (dark under white) so they stay visible on both light fruits
 * (banana) and dark ones (mangosteen). Rain draws as a single thick cross
 * through the center — deliberately bolder and simpler than the three thin
 * parallel stripe lines, so it reads as a distinct special at a glance
 * rather than "striped both ways".
 */
export function drawSpecialOverlay(
  ctx: CanvasRenderingContext2D,
  special: SpecialType,
  cx: number,
  cy: number,
  size: number,
): void {
  if (special === 'none' || special === 'colorBomb') {
    return;
  }
  ctx.save();
  ctx.lineCap = 'round';
  const r = size * 0.36;

  if (special === 'stripedH' || special === 'stripedV') {
    const strokeStripes = (color: string, width: number): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, width);
      for (const offset of [-r * 0.45, 0, r * 0.45]) {
        ctx.beginPath();
        if (special === 'stripedH') {
          ctx.moveTo(cx - r * 0.85, cy + offset);
          ctx.lineTo(cx + r * 0.85, cy + offset);
        } else {
          ctx.moveTo(cx + offset, cy - r * 0.85);
          ctx.lineTo(cx + offset, cy + r * 0.85);
        }
        ctx.stroke();
      }
    };
    strokeStripes('rgba(60, 35, 20, 0.85)', size * 0.1);
    strokeStripes('rgba(255, 255, 255, 0.95)', size * 0.05);
  } else if (special === 'wrapped') {
    const half = r * 0.95;
    ctx.strokeStyle = 'rgba(60, 35, 20, 0.85)';
    ctx.lineWidth = Math.max(1, size * 0.09);
    roundRect(ctx, cx - half, cy - half, half * 2, half * 2, size * 0.12);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = Math.max(1, size * 0.04);
    roundRect(ctx, cx - half, cy - half, half * 2, half * 2, size * 0.12);
    ctx.stroke();
  } else if (special === 'rain') {
    const half = r * 0.9;
    const strokeCross = (color: string, width: number): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, width);
      ctx.beginPath();
      ctx.moveTo(cx - half, cy);
      ctx.lineTo(cx + half, cy);
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx, cy + half);
      ctx.stroke();
    };
    // Same stroke weight as the stripes: rain reads as different because
    // it is one cross rather than three parallel lines, so it does not need
    // to be thicker — and a thicker cross buried the fruit silhouette
    // underneath, which players still need in order to plan matches
    // (ADR-0004: fruits must stay distinguishable by shape).
    strokeCross('rgba(60, 35, 20, 0.85)', size * 0.1);
    strokeCross('rgba(255, 255, 255, 0.95)', size * 0.05);
  }
  ctx.restore();
}

/**
 * ผลไม้ลูกใหญ่ (Big Fruit, ADR-0006), drawn as a สับปะรด (pineapple) —
 * deliberately NOT one of the six matchable fruit kinds, so the shape alone
 * tells the player "this one is not for matching" at a glance. Two shape
 * cues carry that message even in grayscale (ADR-0004): a tall barrel body
 * (taller/narrower than any matchable fruit's silhouette) topped by a
 * prominent spiky leaf crown — the crown is deliberately large, easily the
 * single most distinctive feature — plus a diamond cross-hatch texture on
 * the body that no matchable fruit has. It is also drawn noticeably larger
 * than a normal fruit (a normal fruit's silhouette tops out around
 * `size * 0.36` in any one dimension; this piece spans roughly `size * 0.9`
 * top-to-bottom) while still keeping clear of the cell edges. It never gets
 * the special-piece glow (drawn only when `piece.special !== 'none'`, and a
 * big fruit's special is always 'none') because it is not a special piece.
 */
export function drawBigFruit(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  const rx = size * 0.29;
  const ry = size * 0.33;
  const bodyCy = cy + size * 0.1;
  const bodyTopY = bodyCy - ry;

  const bodyPath = new Path2D();
  bodyPath.ellipse(cx, bodyCy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e2a238';
  ctx.strokeStyle = '#a06c1c';
  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.fill(bodyPath);
  ctx.stroke(bodyPath);

  // Diamond cross-hatch skin texture, clipped to the body so it never
  // bleeds outside the silhouette.
  ctx.save();
  ctx.clip(bodyPath);
  ctx.strokeStyle = 'rgba(122, 76, 15, 0.55)';
  ctx.lineWidth = Math.max(1, size * 0.018);
  const span = rx * 2.4;
  const step = size * 0.13;
  for (let d = -4; d <= 4; d++) {
    const x0 = cx + d * step;
    ctx.beginPath();
    ctx.moveTo(x0 - span * 0.5, bodyCy - ry * 1.3);
    ctx.lineTo(x0 + span * 0.5, bodyCy + ry * 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + span * 0.5, bodyCy - ry * 1.3);
    ctx.lineTo(x0 - span * 0.5, bodyCy + ry * 1.3);
    ctx.stroke();
  }
  ctx.restore();

  // Spiky crown of leaves on top — the primary shape cue, drawn large and
  // fanned out so it reads clearly even as a grayscale silhouette.
  const leafCount = 5;
  const crownBaseY = bodyTopY + size * 0.04;
  ctx.fillStyle = '#4a7c2f';
  ctx.strokeStyle = '#2f5a1c';
  ctx.lineWidth = Math.max(1, size * 0.02);
  for (let i = 0; i < leafCount; i++) {
    const frac = i / (leafCount - 1) - 0.5; // -0.5..0.5
    const angle = frac * 1.35; // radians, fanned spread
    const length = size * (0.34 - Math.abs(frac) * 0.1);
    const baseX = cx + Math.sin(angle) * rx * 0.3;
    const baseHalf = size * 0.05;
    const perpX = Math.cos(angle) * baseHalf;
    const perpY = Math.sin(angle) * baseHalf;
    const tipX = cx + Math.sin(angle) * length;
    const tipY = crownBaseY - Math.cos(angle) * length;
    const leaf = new Path2D();
    leaf.moveTo(baseX - perpX, crownBaseY - perpY);
    leaf.lineTo(tipX, tipY);
    leaf.lineTo(baseX + perpX, crownBaseY + perpY);
    leaf.closePath();
    ctx.fill(leaf);
    ctx.stroke(leaf);
  }

  ctx.restore();
}

export function drawColorBomb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha = 1,
  spin = 0,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const r = size * 0.36;
  const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.08, cx, cy, r);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.35, '#ff6b9d');
  gradient.addColorStop(0.7, '#7c3aed');
  gradient.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.stroke();

  // Slowly orbiting sparkles make the bomb read as "magic" even at rest.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 0; i < 6; i++) {
    const angle = spin + (i * Math.PI) / 3;
    const sx = cx + Math.cos(angle) * r * 0.62;
    const sy = cy + Math.sin(angle) * r * 0.62;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, size * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * ดอกไม้บาน (flowerBloom turn event): the bud at this cell opens into a small
 * flower and fades, and a "+1" floats upward and fades alongside it, telling
 * the player they were just handed an extra move. `progress` runs 0..1 over
 * the effect's whole lifetime (driven by playback.ts's `animate`, same style
 * as `RenderPiece.scale`/`alpha`). Petals open over the first ~55% of the
 * animation and the whole thing fades over the second half, so bloom and
 * fade never fight for the same instant.
 */
export function drawFlowerBloomEffect(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, progress: number): void {
  ctx.save();
  const openT = Math.min(1, progress / 0.55);
  const fadeT = progress < 0.5 ? 0 : (progress - 0.5) / 0.5;
  const bloomAlpha = 1 - fadeT;

  ctx.globalAlpha = bloomAlpha * 0.9;
  const petalR = size * (0.05 + 0.06 * openT);
  const dist = size * 0.11 * openT;
  ctx.fillStyle = '#ff9db3';
  ctx.strokeStyle = '#d9738d';
  ctx.lineWidth = Math.max(1, size * 0.015);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.ellipse(px, py, petalR, petalR * 0.75, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // The "+1" is the actual gameplay message (a free move was just granted);
  // it floats up and fades across the FULL duration, independent of the
  // bloom's own open/fade timing above.
  const floatY = cy - size * 0.15 - size * 0.5 * progress;
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = '#5c3a19';
  ctx.font = `bold ${Math.max(18, Math.round(size * 0.34))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+1', cx, floatY);

  ctx.restore();
}

/**
 * ลงตะกร้า (deliver turn event): a small radiating burst of sparkles at the
 * basket cell, timed alongside the big fruit's squash-and-shrink in
 * playback.ts's `playDeliver` so the payoff moment gets both a shape change
 * on the piece and a distinct flourish around it.
 */
export function drawDeliverSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, progress: number): void {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = '#fff3b0';
  const count = 6;
  const dist = size * (0.1 + 0.3 * progress);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + progress * 1.2;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const r = Math.max(1, size * 0.045 * (1 - progress * 0.5));
    drawSparklePoint(ctx, sx, sy, r);
  }
  ctx.restore();
}

function drawSparklePoint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.3, y - r * 0.3);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.3, y + r * 0.3);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.3, y + r * 0.3);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.3, y - r * 0.3);
  ctx.closePath();
  ctx.fill();
}
