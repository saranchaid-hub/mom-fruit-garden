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
      ctx.fillStyle = cell.jelly ? '#bfe3c7' : '#ffe8bf';
      roundRect(ctx, px + inset, py + inset, layout.tileSize - inset * 2, layout.tileSize - inset * 2, 8);
      ctx.fill();
    }
  }
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
