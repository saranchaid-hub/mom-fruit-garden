import type { Layout } from './render/renderer';
import { pixelToCell } from './render/renderer';
import type { Board, Pos } from '../core/types';

export interface BoardInputCallbacks {
  onSwapIntent: (a: Pos, b: Pos) => void;
  onSelectionChange: (pos: Pos | null) => void;
  isLocked: () => boolean;
}

const SWIPE_THRESHOLD_RATIO = 0.35;

function inBounds(board: Board, pos: Pos): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < board.width && pos.y < board.height;
}

function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * Unifies swipe-to-swap and tap-tap-to-swap on the same canvas: a drag past
 * the threshold resolves as a swipe; a short tap with no drag resolves as
 * tap-tap selection. Pointer Events cover mouse, touch, and pen alike.
 */
export function attachBoardInput(
  canvas: HTMLCanvasElement,
  getLayout: () => Layout,
  getBoard: () => Board,
  callbacks: BoardInputCallbacks,
): () => void {
  let downCell: Pos | null = null;
  let downClient: { x: number; y: number } | null = null;
  let swipeHandled = false;
  let selected: Pos | null = null;

  function setSelected(pos: Pos | null): void {
    selected = pos;
    callbacks.onSelectionChange(pos);
  }

  function cellFromEvent(e: PointerEvent): Pos | null {
    const rect = canvas.getBoundingClientRect();
    const pos = pixelToCell(getLayout(), e.clientX - rect.left, e.clientY - rect.top);
    return inBounds(getBoard(), pos) ? pos : null;
  }

  function onPointerDown(e: PointerEvent): void {
    if (callbacks.isLocked()) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    downCell = cell;
    downClient = { x: e.clientX, y: e.clientY };
    swipeHandled = false;
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!downCell || !downClient || swipeHandled || callbacks.isLocked()) return;
    const layout = getLayout();
    const dx = e.clientX - downClient.x;
    const dy = e.clientY - downClient.y;
    if (Math.hypot(dx, dy) < layout.tileSize * SWIPE_THRESHOLD_RATIO) return;

    const direction: Pos = Math.abs(dx) > Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 };
    const target: Pos = { x: downCell.x + direction.x, y: downCell.y + direction.y };
    if (inBounds(getBoard(), target)) {
      swipeHandled = true;
      setSelected(null);
      callbacks.onSwapIntent(downCell, target);
    }
  }

  function onPointerUp(e: PointerEvent): void {
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    const wasSwipe = swipeHandled;
    downCell = null;
    downClient = null;
    swipeHandled = false;
    if (wasSwipe || callbacks.isLocked()) return;

    const cell = cellFromEvent(e);
    if (!cell) return;

    if (!selected) {
      setSelected(cell);
      return;
    }
    if (selected.x === cell.x && selected.y === cell.y) {
      setSelected(null);
      return;
    }
    if (isAdjacent(selected, cell)) {
      const from = selected;
      setSelected(null);
      callbacks.onSwapIntent(from, cell);
    } else {
      setSelected(cell);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
  };
}
