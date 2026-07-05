import type { LevelDef } from '../../core/levels';
import { starsForScore } from '../../core/objectives';
import { createSession, trySwap } from '../../core/session';
import type { Pos } from '../../core/types';
import { attachBoardInput } from '../input';
import { drawColorBomb, drawFruit, drawSpecialOverlay } from '../render/fruits';
import { createRenderPieces, playPhases, type RenderPiece } from '../render/playback';
import { cellCenter, computeLayout, drawBoardBackground, roundRect, setupHiDpiCanvas, type Layout } from '../render/renderer';
import type { Stars } from '../save';
import { STRINGS } from '../strings';

export interface PlayCallbacks {
  onWin: (stars: Stars, score: number) => void;
  onLose: () => void;
}

export function startPlayScreen(
  canvas: HTMLCanvasElement,
  hud: HTMLElement,
  level: LevelDef,
  callbacks: PlayCallbacks,
): () => void {
  const session = createSession(level, Date.now());
  let renderPieces: Map<number, RenderPiece> = createRenderPieces(session.board);
  let selected: Pos | null = null;
  let locked = false;
  let running = true;
  let finished = false;
  let rafId = 0;
  let layout: Layout = computeLayout(session.board, 1, 1);
  let ctx: CanvasRenderingContext2D = setupHiDpiCanvas(canvas, 1, 1);

  function updateHud(): void {
    const progress = session.objectiveProgress;
    hud.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'hud-row';
    const moves = document.createElement('span');
    moves.textContent = `${STRINGS.movesLeft}: ${session.movesLeft}`;
    const score = document.createElement('span');
    score.textContent = `${STRINGS.score}: ${session.score}`;
    row.append(moves, score);

    const objective = document.createElement('div');
    objective.className = 'hud-objective';
    objective.textContent = `${STRINGS.objectiveText(level.objective)} (${progress.current}/${progress.target})`;

    hud.append(row, objective);
  }

  function resize(): void {
    const availableHeight = window.innerHeight - hud.offsetHeight;
    const cssSize = Math.min(window.innerWidth, availableHeight) * 0.92;
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
      const { x, y } = cellCenter(layout, piece.x, piece.y);
      const size = layout.tileSize * piece.scale;
      if (piece.special === 'colorBomb') {
        drawColorBomb(ctx, x, y, size, piece.alpha);
      } else if (piece.fruit) {
        drawFruit(ctx, piece.fruit, x, y, size, piece.alpha);
        drawSpecialOverlay(ctx, piece.special, x, y, size);
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  function checkOutcome(): void {
    if (finished) return;
    if (session.outcome === 'won') {
      finished = true;
      const stars = starsForScore(session.score, level.starScores);
      callbacks.onWin(stars, session.score);
    } else if (session.outcome === 'lost') {
      finished = true;
      callbacks.onLose();
    }
  }

  async function handleSwapIntent(a: Pos, b: Pos): Promise<void> {
    if (locked || finished) return;
    locked = true;
    try {
      const result = trySwap(session, a, b);
      await playPhases(result.phases, renderPieces);
    } finally {
      renderPieces = createRenderPieces(session.board);
      locked = false;
      updateHud();
      checkOutcome();
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
      isLocked: () => locked || finished,
    },
  );

  updateHud();
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
