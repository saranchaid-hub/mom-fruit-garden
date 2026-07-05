import { getLevel, LEVEL_COUNT } from '../core/levels';
import { loadSave, recordLevelResult } from './save';
import { showLoseDialog, showWinDialog } from './screens/dialogs';
import { renderMap } from './screens/map';
import { startPlayScreen } from './screens/play';
import { renderTitle } from './screens/title';

export interface AppElements {
  titleEl: HTMLElement;
  mapEl: HTMLElement;
  playEl: HTMLElement;
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  dialogRoot: HTMLElement;
}

type ScreenName = 'title' | 'map' | 'play';

export function startApp(elements: AppElements): void {
  let save = loadSave();
  let cleanupPlay: (() => void) | null = null;

  function showOnly(name: ScreenName): void {
    elements.titleEl.hidden = name !== 'title';
    elements.mapEl.hidden = name !== 'map';
    elements.playEl.hidden = name !== 'play';
  }

  function goToTitle(): void {
    renderTitle(elements.titleEl, goToMap);
    showOnly('title');
  }

  function goToMap(): void {
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    renderMap(elements.mapEl, save, goToPlay);
    showOnly('map');
  }

  function goToPlay(levelId: number): void {
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    const level = getLevel(levelId);
    cleanupPlay = startPlayScreen(elements.canvas, elements.hud, level, {
      onWin: (stars, score) => {
        save = recordLevelResult(save, levelId, stars, LEVEL_COUNT);
        showWinDialog(elements.dialogRoot, stars, score, goToMap);
      },
      onLose: () => {
        showLoseDialog(elements.dialogRoot, () => goToPlay(levelId), goToMap);
      },
    });
    showOnly('play');
  }

  goToTitle();
}
