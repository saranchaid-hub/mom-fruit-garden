import type { Board, FruitKind, Pos, SpecialType, TurnEvent } from '../../core/types';

export interface RenderPiece {
  pieceId: number;
  fruit: FruitKind | null;
  special: SpecialType;
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

export function createRenderPieces(board: Board): Map<number, RenderPiece> {
  const pieces = new Map<number, RenderPiece>();
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cell = board.cells[y * board.width + x];
      if (cell?.piece) {
        pieces.set(cell.piece.id, {
          pieceId: cell.piece.id,
          fruit: cell.piece.fruit,
          special: cell.piece.special,
          x,
          y,
          scale: 1,
          alpha: 1,
        });
      }
    }
  }
  return pieces;
}

function findPieceIdAt(renderPieces: Map<number, RenderPiece>, pos: Pos): number | undefined {
  for (const piece of renderPieces.values()) {
    if (Math.round(piece.x) === pos.x && Math.round(piece.y) === pos.y) {
      return piece.pieceId;
    }
  }
  return undefined;
}

const SWAP_MS = 150;
const CLEAR_MS = 140;
const FALL_MS_PER_CELL = 70;
const MIN_FALL_MS = 120;
const RESHUFFLE_MS = 220;

function animate(durationMs: number, onUpdate: (t: number) => void): Promise<void> {
  if (durationMs <= 0) {
    onUpdate(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    function step(now: number): void {
      const t = Math.min(1, (now - start) / durationMs);
      onUpdate(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

async function playSwap(
  event: Extract<TurnEvent, { kind: 'swap' }>,
  renderPieces: Map<number, RenderPiece>,
): Promise<void> {
  const idA = findPieceIdAt(renderPieces, event.a);
  const idB = findPieceIdAt(renderPieces, event.b);
  const pieceA = idA !== undefined ? renderPieces.get(idA) : undefined;
  const pieceB = idB !== undefined ? renderPieces.get(idB) : undefined;
  if (!pieceA || !pieceB) {
    return;
  }

  const aStart = { x: pieceA.x, y: pieceA.y };
  const bStart = { x: pieceB.x, y: pieceB.y };

  await animate(SWAP_MS, (t) => {
    pieceA.x = lerp(aStart.x, bStart.x, t);
    pieceA.y = lerp(aStart.y, bStart.y, t);
    pieceB.x = lerp(bStart.x, aStart.x, t);
    pieceB.y = lerp(bStart.y, aStart.y, t);
  });

  if (event.illegal) {
    await animate(SWAP_MS, (t) => {
      pieceA.x = lerp(bStart.x, aStart.x, t);
      pieceA.y = lerp(bStart.y, aStart.y, t);
      pieceB.x = lerp(aStart.x, bStart.x, t);
      pieceB.y = lerp(aStart.y, bStart.y, t);
    });
  }
}

async function playClear(
  event: Extract<TurnEvent, { kind: 'clear' }>,
  renderPieces: Map<number, RenderPiece>,
): Promise<void> {
  const ids = event.cells.map((pos) => findPieceIdAt(renderPieces, pos)).filter((id): id is number => id !== undefined);
  const pieces = ids.map((id) => renderPieces.get(id)).filter((p): p is RenderPiece => p !== undefined);
  if (pieces.length === 0) {
    return;
  }
  await animate(CLEAR_MS, (t) => {
    for (const piece of pieces) {
      piece.scale = 1 - t;
      piece.alpha = 1 - t;
    }
  });
  for (const id of ids) {
    renderPieces.delete(id);
  }
}

async function playFall(
  event: Extract<TurnEvent, { kind: 'fall' }>,
  renderPieces: Map<number, RenderPiece>,
): Promise<void> {
  const moves = event.moves
    .map((move) => ({ piece: renderPieces.get(move.pieceId), from: move.from, to: move.to }))
    .filter((m): m is { piece: RenderPiece; from: Pos; to: Pos } => m.piece !== undefined);
  if (moves.length === 0) {
    return;
  }
  const maxDistance = Math.max(...moves.map((m) => m.to.y - m.from.y));
  const duration = Math.max(MIN_FALL_MS, maxDistance * FALL_MS_PER_CELL);
  await animate(duration, (t) => {
    for (const { piece, from, to } of moves) {
      piece.y = lerp(from.y, to.y, t);
      piece.x = to.x;
    }
  });
}

async function playRefill(
  event: Extract<TurnEvent, { kind: 'refill' }>,
  renderPieces: Map<number, RenderPiece>,
): Promise<void> {
  const spawned = event.spawns.map(({ piece, at }) => {
    const renderPiece: RenderPiece = {
      pieceId: piece.id,
      fruit: piece.fruit,
      special: piece.special,
      x: at.x,
      y: at.y - 2,
      scale: 1,
      alpha: 1,
    };
    renderPieces.set(piece.id, renderPiece);
    return { renderPiece, targetY: at.y };
  });
  if (spawned.length === 0) {
    return;
  }
  await animate(Math.max(MIN_FALL_MS, 2 * FALL_MS_PER_CELL), (t) => {
    for (const { renderPiece, targetY } of spawned) {
      renderPiece.y = lerp(targetY - 2, targetY, t);
    }
  });
}

async function playReshuffle(
  event: Extract<TurnEvent, { kind: 'reshuffle' }>,
  renderPieces: Map<number, RenderPiece>,
): Promise<void> {
  const moves = event.mapping
    .map(({ pieceId, to }) => ({ piece: renderPieces.get(pieceId), to }))
    .filter((m): m is { piece: RenderPiece; to: Pos } => m.piece !== undefined);
  if (moves.length === 0) {
    return;
  }
  const starts = moves.map(({ piece }) => ({ x: piece.x, y: piece.y }));
  await animate(RESHUFFLE_MS, (t) => {
    moves.forEach(({ piece, to }, i) => {
      const start = starts[i];
      if (!start) return;
      piece.x = lerp(start.x, to.x, t);
      piece.y = lerp(start.y, to.y, t);
    });
  });
}

export async function playPhases(phases: TurnEvent[][], renderPieces: Map<number, RenderPiece>): Promise<void> {
  for (const phase of phases) {
    await Promise.all(
      phase.map((event) => {
        switch (event.kind) {
          case 'swap':
            return playSwap(event, renderPieces);
          case 'clear':
            return playClear(event, renderPieces);
          case 'fall':
            return playFall(event, renderPieces);
          case 'refill':
            return playRefill(event, renderPieces);
          case 'reshuffle':
            return playReshuffle(event, renderPieces);
          case 'jellyClear':
          case 'score':
            return Promise.resolve();
        }
      }),
    );
  }
}
