import type { LevelDef } from '../../core/levels';
import { findValidMoves } from '../../core/moves';
import { starsForScore } from '../../core/objectives';
import { createSession, trySwap, useHammer } from '../../core/session';
import type { Pos, TurnEvent } from '../../core/types';
import { playFanfare, playPop, playSpecialFire, playThud } from '../audio/sfx';
import { attachBoardInput } from '../input';
import { drawColorBomb, drawFruit, drawSpecialGlow, drawSpecialOverlay } from '../render/fruits';
import { createRenderPieces, playPhases, type RenderPiece } from '../render/playback';
import { cellCenter, computeLayout, drawBoardBackground, roundRect, setupHiDpiCanvas, type Layout } from '../render/renderer';
import type { Settings, Stars } from '../save';
import { STRINGS } from '../strings';
import { showToast } from './toast';

export interface PlayCallbacks {
  onWin: (stars: Stars, score: number) => void;
  onLose: () => void;
}

const HINT_IDLE_MS = 8000;
const HAMMER_COUNT = 3;
const BOARD_GEN_RETRY_ATTEMPTS = 5;

// Board generation is randomized and can (rarely) fail to find a valid
// starting layout for a given seed. Retrying with a fresh seed is much
// simpler than trying to guarantee every possible seed works up front.
function createSessionWithRetry(level: LevelDef, hammerCount: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < BOARD_GEN_RETRY_ATTEMPTS; attempt++) {
    try {
      return createSession(level, Date.now() + attempt, hammerCount);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function playSoundsFor(phases: TurnEvent[][], justWon: boolean): void {
  if (justWon) {
    playFanfare();
    return;
  }
  const flat = phases.flat();
  if (flat.some((e) => e.kind === 'specialFire' || e.kind === 'comboFire')) {
    playSpecialFire();
  } else if (flat.some((e) => e.kind === 'clear')) {
    playPop();
  }
}

export function startPlayScreen(
  canvas: HTMLCanvasElement,
  hud: HTMLElement,
  level: LevelDef,
  callbacks: PlayCallbacks,
  settings: Settings,
): () => void {
  const session = createSessionWithRetry(level, HAMMER_COUNT);
  let renderPieces: Map<number, RenderPiece> = createRenderPieces(session.board);
  let selected: Pos | null = null;
  let locked = false;
  let running = true;
  let finished = false;
  let hammerArmed = false;
  let hintCells: [Pos, Pos] | null = null;
  let hintTimerId: ReturnType<typeof setTimeout> | null = null;
  let rafId = 0;
  let layout: Layout = computeLayout(session.board, 1, 1);
  let ctx: CanvasRenderingContext2D = setupHiDpiCanvas(canvas, 1, 1);
  const speedMultiplier = settings.animSpeed === 'slow' ? 1.6 : 1;

  function resetHintTimer(): void {
    if (hintTimerId !== null) {
      clearTimeout(hintTimerId);
      hintTimerId = null;
    }
    hintCells = null;
    if (!settings.hints || finished) return;
    hintTimerId = setTimeout(() => {
      const moves = findValidMoves(session.board);
      const move = moves[0];
      if (move) {
        hintCells = move;
      }
    }, HINT_IDLE_MS);
  }

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

    const hammerButton = document.createElement('button');
    hammerButton.className = 'hammer-button';
    if (hammerArmed) hammerButton.classList.add('armed');
    hammerButton.textContent = `🔨 ${STRINGS.hammerLabel} (${session.hammersLeft})`;
    hammerButton.disabled = session.hammersLeft <= 0 || locked || finished;
    hammerButton.addEventListener('click', () => {
      hammerArmed = !hammerArmed;
      selected = null;
      updateHud();
    });

    hud.append(row, objective, hammerButton);
  }

  function resize(): void {
    // Subtract the screen's own padding plus a little breathing room, so the
    // board can never poke past the bottom edge on height-constrained
    // (landscape/desktop) windows. #screen-play has 12px padding per side
    // (24px total vertically), plus 12px breathing room = 36.
    const availableHeight = window.innerHeight - hud.offsetHeight - 36;
    const cssSize = Math.max(160, Math.min(window.innerWidth - 24, availableHeight));
    ctx = setupHiDpiCanvas(canvas, cssSize, cssSize);
    layout = computeLayout(session.board, cssSize, cssSize);
  }

  function drawFrame(): void {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoardBackground(ctx, session.board, layout);

    if (hintCells) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
      for (const pos of hintCells) {
        const { x, y } = cellCenter(layout, pos.x, pos.y);
        const half = layout.tileSize / 2;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + 0.4 * pulse})`;
        ctx.lineWidth = 4;
        roundRect(ctx, x - half + 3, y - half + 3, layout.tileSize - 6, layout.tileSize - 6, 10);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (selected) {
      const { x, y } = cellCenter(layout, selected.x, selected.y);
      const half = layout.tileSize / 2;
      ctx.save();
      ctx.strokeStyle = hammerArmed ? '#e63946' : '#ffffff';
      ctx.lineWidth = 3;
      roundRect(ctx, x - half + 3, y - half + 3, layout.tileSize - 6, layout.tileSize - 6, 10);
      ctx.stroke();
      ctx.restore();
    }

    const now = performance.now();
    const glowPulse = 0.5 + 0.5 * Math.sin(now / 300);
    for (const piece of renderPieces.values()) {
      const { x, y } = cellCenter(layout, piece.x, piece.y);
      const size = layout.tileSize * piece.scale;
      if (piece.special !== 'none' && piece.alpha > 0.5) {
        drawSpecialGlow(ctx, x, y, size, glowPulse);
      }
      if (piece.special === 'colorBomb') {
        drawColorBomb(ctx, x, y, size, piece.alpha, now / 900);
      } else if (piece.fruit) {
        drawFruit(ctx, piece.fruit, x, y, size, piece.alpha);
        drawSpecialOverlay(ctx, piece.special, x, y, size);
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  function checkOutcome(): boolean {
    if (finished) return false;
    if (session.outcome === 'won') {
      finished = true;
      const stars = starsForScore(session.score, level.starScores);
      callbacks.onWin(stars, session.score);
      return true;
    } else if (session.outcome === 'lost') {
      finished = true;
      callbacks.onLose();
    }
    return false;
  }

  async function handleSwapIntent(a: Pos, b: Pos): Promise<void> {
    if (locked || finished) return;
    resetHintTimer();
    locked = true;
    try {
      const result = trySwap(session, a, b);
      if (result.movesUsed === 0 && result.phases.some((phase) => phase.some((e) => e.kind === 'swap' && e.illegal))) {
        playThud();
      }
      await playPhases(result.phases, renderPieces, speedMultiplier);
      if (result.phases.flat().some((e) => e.kind === 'reshuffle')) {
        showToast(STRINGS.reshuffleToast);
      }
      const justWon = session.outcome === 'won';
      playSoundsFor(result.phases, justWon);
    } finally {
      renderPieces = createRenderPieces(session.board);
      locked = false;
      updateHud();
      const won = checkOutcome();
      if (!won) resetHintTimer();
    }
  }

  async function handleHammerTarget(pos: Pos): Promise<void> {
    if (locked || finished) return;
    resetHintTimer();
    locked = true;
    try {
      const result = useHammer(session, pos);
      await playPhases(result.phases, renderPieces, speedMultiplier);
      if (result.phases.flat().some((e) => e.kind === 'reshuffle')) {
        showToast(STRINGS.reshuffleToast);
      }
      const justWon = session.outcome === 'won';
      playSoundsFor(result.phases, justWon);
    } finally {
      renderPieces = createRenderPieces(session.board);
      locked = false;
      updateHud();
      const won = checkOutcome();
      if (!won) resetHintTimer();
    }
  }

  const detachInput = attachBoardInput(
    canvas,
    () => layout,
    () => session.board,
    {
      onSwapIntent: (a, b) => {
        if (hammerArmed) {
          hammerArmed = false;
          void handleHammerTarget(a);
          return;
        }
        void handleSwapIntent(a, b);
      },
      onSelectionChange: (pos) => {
        resetHintTimer();
        if (hammerArmed && pos) {
          hammerArmed = false;
          void handleHammerTarget(pos);
          return;
        }
        selected = pos;
      },
      isLocked: () => locked || finished,
    },
  );

  updateHud();
  resize();
  resetHintTimer();
  window.addEventListener('resize', resize);
  // The Thai webfont can finish loading after the first layout and change the
  // HUD's height — re-measure once fonts settle so the board still fits.
  void document.fonts.ready.then(() => {
    if (running) resize();
  });
  rafId = requestAnimationFrame(drawFrame);

  return () => {
    running = false;
    finished = true;
    if (hintTimerId !== null) clearTimeout(hintTimerId);
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    detachInput();
  };
}
