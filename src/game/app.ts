import { getLevel, LEVEL_COUNT } from '../core/levels';
import { setMusicEnabled, setMusicEnabledFlag, startMusic } from './audio/music';
import { setSfxEnabled } from './audio/sfx';
import { unlockAudio } from './audio/context';
import {
  hasMercyBonus,
  loadSave,
  markTutorialSeen,
  MERCY_BONUS_MOVES,
  recordLevelFailure,
  recordLevelResult,
  updateSettings,
} from './save';
import { showLoseDialog, showWinDialog } from './screens/dialogs';
import { renderMap } from './screens/map';
import { startPlayScreen } from './screens/play';
import { showSettingsDialog } from './screens/settings';
import { renderTitle } from './screens/title';
import { showToast } from './screens/toast';
import { showTutorial } from './screens/tutorial';
import { STRINGS } from './strings';

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
  let audioStarted = false;

  setSfxEnabled(save.settings.sfx);
  // Flag-only: creating/starting an AudioContext before a real user gesture
  // leaves it suspended and drops the first note. Actual playback starts
  // from ensureAudioStarted(), triggered by the first genuine interaction.
  setMusicEnabledFlag(save.settings.music);

  function ensureAudioStarted(): void {
    if (audioStarted) return;
    audioStarted = true;
    unlockAudio();
    startMusic();
  }

  function showOnly(name: ScreenName): void {
    elements.titleEl.hidden = name !== 'title';
    elements.mapEl.hidden = name !== 'map';
    elements.playEl.hidden = name !== 'play';
  }

  function goToTitle(): void {
    renderTitle(elements.titleEl, goToMap, openSettings);
    showOnly('title');
  }

  function goToMap(): void {
    ensureAudioStarted();
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    renderMap(elements.mapEl, save, goToPlay, openSettings);
    showOnly('map');
  }

  function goToPlay(levelId: number): void {
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    const level = getLevel(levelId);
    const mercyBonus = hasMercyBonus(save, levelId);
    const effectiveLevel = mercyBonus ? { ...level, moves: level.moves + MERCY_BONUS_MOVES } : level;
    cleanupPlay = startPlayScreen(
      elements.canvas,
      elements.hud,
      effectiveLevel,
      {
        onWin: (stars, score) => {
          save = recordLevelResult(save, levelId, stars, LEVEL_COUNT);
          showWinDialog(elements.dialogRoot, stars, score, goToMap);
        },
        onLose: () => {
          save = recordLevelFailure(save, levelId);
          showLoseDialog(elements.dialogRoot, () => goToPlay(levelId), goToMap);
        },
      },
      save.settings,
    );
    showOnly('play');
    if (mercyBonus) {
      showToast(STRINGS.mercyBanner);
    }

    const tutorialText = STRINGS.tutorialByLevel[levelId];
    if (tutorialText && !save.tutorialSeen.includes(levelId)) {
      showTutorial(elements.dialogRoot, tutorialText, () => {
        save = markTutorialSeen(save, levelId);
      });
    }
  }

  function openSettings(): void {
    // The dialog overlays whatever screen is already visible underneath —
    // no screen transition happens when opening or closing it.
    showSettingsDialog(
      elements.dialogRoot,
      save.settings,
      (patch) => {
        save = updateSettings(save, patch);
        if (patch.sfx !== undefined) setSfxEnabled(patch.sfx);
        if (patch.music !== undefined) setMusicEnabled(patch.music);
      },
      () => {
        /* nothing to do — the underlying screen was never hidden */
      },
    );
  }

  goToTitle();
}
