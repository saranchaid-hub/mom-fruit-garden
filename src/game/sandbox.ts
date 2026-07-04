import { createSession, trySwap } from '../core/session';
import type { LevelConfig, Pos } from '../core/types';
import { attachBoardInput } from './input';
import { drawFruit } from './render/fruits';
import { createRenderPieces, playPhases, type RenderPiece } from './render/playback';
import { cellCenter, computeLayout, drawBoardBackground, roundRect, setupHiDpiCanvas, type Layout } from './render/renderer';

const SANDBOX_CONFIG: LevelConfig = {
  width: 7,
  height: 7,
  fruits: ['mango', 'orange', 'grape', 'watermelon', 'mangosteen'],
  moves: 999_999,
  objective: { type: 'score', target: Number.MAX_SAFE_INTEGER },
  starScores: [1, 2],
};

export function startSandbox(canvas: HTMLCanvasElement): () => void {
  const session = createSession(SANDBOX_CONFIG, Date.now());
  let renderPieces: Map<number, RenderPiece> = createRenderPieces(session.board);
  let selected: Pos | null = null;
  let locked = false;
  let running = true;
  let rafId = 0;
  let layout: Layout = computeLayout(session.board, 1, 1);
  let ctx: CanvasRenderingContext2D = setupHiDpiCanvas(canvas, 1, 1);

  function resize(): void {
    const cssSize = Math.min(window.innerWidth, window.innerHeight) * 0.92;
    ctx = setupHiDpiCanvas(canvas, cssSize, cssSize);
    layout = computeLayout(session.board, cssSize, cssSize);
  }

  function drawFrame(): void {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoardBackground(ctx, session.board, layout);

    if (selected) {
      const { x, y } = cellCenter(layout, selected.x, selected.y);
      const half = layout.tileSize / 2;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      roundRect(ctx, x - half + 3, y - half + 3, layout.tileSize - 6, layout.tileSize - 6, 10);
      ctx.stroke();
      ctx.restore();
    }

    for (const piece of renderPieces.values()) {
      if (!piece.fruit) continue;
      const { x, y } = cellCenter(layout, piece.x, piece.y);
      drawFruit(ctx, piece.fruit, x, y, layout.tileSize * piece.scale, piece.alpha);
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  async function handleSwapIntent(a: Pos, b: Pos): Promise<void> {
    if (locked) return;
    locked = true;
    try {
      const result = trySwap(session, a, b);
      await playPhases(result.phases, renderPieces);
    } finally {
      // Guarantees the game can never get stuck with input locked, even if a
      // future phase animation (e.g. a special-candy effect in M3) throws.
      renderPieces = createRenderPieces(session.board);
      locked = false;
    }
  }

  const detachInput = attachBoardInput(
    canvas,
    () => layout,
    () => session.board,
    {
      onSwapIntent: (a, b) => void handleSwapIntent(a, b),
      onSelectionChange: (pos) => {
        selected = pos;
      },
      isLocked: () => locked,
    },
  );

  resize();
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(drawFrame);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    detachInput();
  };
}
