import type { Board, Pos } from '../../core/types';

export interface Layout {
  tileSize: number;
  originX: number;
  originY: number;
}

export function computeLayout(board: Board, cssWidth: number, cssHeight: number): Layout {
  const maxTileByWidth = cssWidth / board.width;
  const maxTileByHeight = cssHeight / board.height;
  const tileSize = Math.floor(Math.min(maxTileByWidth, maxTileByHeight));
  const boardWidth = tileSize * board.width;
  const boardHeight = tileSize * board.height;
  return {
    tileSize,
    originX: (cssWidth - boardWidth) / 2,
    originY: (cssHeight - boardHeight) / 2,
  };
}

export function cellCenter(layout: Layout, x: number, y: number): { x: number; y: number } {
  return {
    x: layout.originX + (x + 0.5) * layout.tileSize,
    y: layout.originY + (y + 0.5) * layout.tileSize,
  };
}

export function pixelToCell(layout: Layout, px: number, py: number): Pos {
  const localX = px - layout.originX;
  const localY = py - layout.originY;
  return { x: Math.floor(localX / layout.tileSize), y: Math.floor(localY / layout.tileSize) };
}

export function setupHiDpiCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawBoardBackground(ctx: CanvasRenderingContext2D, board: Board, layout: Layout): void {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = board.cells[y * board.width + x];
      if (!cell || cell.kind === 'hole') {
        continue;
      }
      const px = layout.originX + x * layout.tileSize;
      const py = layout.originY + y * layout.tileSize;
      const inset = 2;
      // A flower cell tints its whole background, the way jelly does. The bud
      // alone is not enough: a piece sits on top of nearly every cell, so the
      // bud can only ever peek out from a corner at a few pixels across —
      // invisible to the elderly player this game is built for. The tint is
      // readable at a glance and can never be covered. Jelly still wins the
      // background when a cell has both, since jelly is the objective and
      // the flower is only a bonus; the bud on top still marks it.
      ctx.fillStyle = cell.jelly
        ? '#bfe3c7'
        : cell.basket
          ? '#e3c99b'
          : cell.flower
            ? '#ffd4e4'
            : '#ffe8bf';
      roundRect(ctx, px + inset, py + inset, layout.tileSize - inset * 2, layout.tileSize - inset * 2, 8);
      ctx.fill();
      if (cell.basket) {
        drawBasketCell(ctx, px, py, layout.tileSize);
      }
      if (cell.flower) {
        drawFlowerBudCell(ctx, px, py, layout.tileSize);
      }
    }
  }
}

/**
 * ตะกร้า (basket cell): a small woven basket resting low in the cell, drawn
 * as part of the background so it sits underneath whatever piece is
 * currently on the cell. Deliberately kept in the bottom third of the tile
 * — a piece's own silhouette tops out around `size * 0.36` from center
 * (see fruits.ts), so its bottom edge never quite reaches the basket's rim,
 * and the rim stays visible even with a piece sitting on top of it.
 */
function drawBasketCell(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number): void {
  const cx = px + tileSize / 2;
  const topY = py + tileSize * 0.68;
  const botY = py + tileSize * 0.92;
  const topHalf = tileSize * 0.31;
  const botHalf = tileSize * 0.2;

  const body = new Path2D();
  body.moveTo(cx - topHalf, topY);
  body.lineTo(cx + topHalf, topY);
  body.lineTo(cx + botHalf, botY);
  body.lineTo(cx - botHalf, botY);
  body.closePath();

  ctx.save();
  ctx.fillStyle = '#c68a45';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = Math.max(1, tileSize * 0.025);
  ctx.fill(body);
  ctx.stroke(body);

  // Weave lines: a couple of horizontal strokes that taper with the
  // trapezoid so the basket reads as woven, not just a solid block.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, tileSize * 0.018);
  for (const frac of [0.4, 0.72]) {
    const wy = topY + (botY - topY) * frac;
    const half = topHalf + (botHalf - topHalf) * frac;
    ctx.beginPath();
    ctx.moveTo(cx - half, wy);
    ctx.lineTo(cx + half, wy);
    ctx.stroke();
  }

  // Rim: a thicker stroke along the top edge.
  ctx.strokeStyle = '#5c3a19';
  ctx.lineWidth = Math.max(1.5, tileSize * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx - topHalf * 1.04, topY);
  ctx.lineTo(cx + topHalf * 1.04, topY);
  ctx.stroke();

  ctx.restore();
}

/**
 * ช่องดอกไม้ (flower cell): a small closed bud drawn in the cell background,
 * in the board's soft palette. Kept deliberately low-contrast (partial
 * alpha) and modest in size relative to the pieces — this is a background
 * hint that a match here grants a bonus move, not a piece to pay attention
 * to in its own right. Once the flower blooms `cell.flower` flips to false
 * and this simply stops being drawn.
 *
 * Anchored in the cell's bottom-right corner rather than dead-center: every
 * matchable fruit's silhouette (fruits.ts) stays within roughly `size * 0.36`
 * of the cell center in any direction, but the piece sitting on this same
 * cell is drawn centered too, so a center-anchored bud would sit directly
 * behind it and never be visible. The corner keeps clear of all six shapes
 * with margin to spare.
 */
function drawFlowerBudCell(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number): void {
  const cx = px + tileSize * 0.85;
  const cy = py + tileSize * 0.84;
  const budRx = tileSize * 0.095;
  const budRy = tileSize * 0.12;

  ctx.save();

  // Short stem pointing further into the corner.
  ctx.strokeStyle = 'rgba(58, 90, 64, 0.55)';
  ctx.lineWidth = Math.max(1, tileSize * 0.018);
  ctx.beginPath();
  ctx.moveTo(cx + budRx * 0.3, cy + budRy * 0.8);
  ctx.lineTo(cx + budRx * 0.85, cy + budRy);
  ctx.stroke();

  // Sepals flanking the bud's base.
  ctx.fillStyle = 'rgba(58, 90, 64, 0.5)';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + dir * budRx * 0.5, cy + budRy * 0.5, budRx * 0.3, budRy * 0.22, dir * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Closed bud.
  ctx.fillStyle = 'rgba(232, 152, 166, 0.65)';
  ctx.strokeStyle = 'rgba(196, 108, 128, 0.6)';
  ctx.lineWidth = Math.max(1, tileSize * 0.014);
  ctx.beginPath();
  ctx.ellipse(cx, cy, budRx, budRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
