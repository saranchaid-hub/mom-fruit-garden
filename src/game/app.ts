import { dailyLevelFor } from '../core/daily';
import { getLevel, LEVEL_COUNT } from '../core/levels';
import { setMusicEnabled, setMusicEnabledFlag, startMusic } from './audio/music';
import { setSfxEnabled } from './audio/sfx';
import { unlockAudio } from './audio/context';
import { todayDateKey } from './dailyDate';
import {
  hasMercyBonus,
  loadSave,
  markTutorialSeen,
  MERCY_BONUS_MOVES,
  recordDailyBloom,
  recordLevelFailure,
  recordLevelResult,
  updateSettings,
} from './save';
import { renderCalendar } from './screens/calendar';
import { flowerGlyphFor } from './screens/calendarMonth';
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
  calendarEl: HTMLElement;
  playEl: HTMLElement;
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  dialogRoot: HTMLElement;
}

type ScreenName = 'title' | 'map' | 'calendar' | 'play';

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
    elements.calendarEl.hidden = name !== 'calendar';
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
    const todayBloomed = save.dailyBlooms.includes(todayDateKey());
    renderMap(elements.mapEl, save, goToPlay, openSettings, goToCalendar, todayBloomed);
    showOnly('map');
  }

  function goToCalendar(): void {
    ensureAudioStarted();
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    renderCalendar(elements.calendarEl, save, todayDateKey(), goToDailyGarden, goToMap, openSettings);
    showOnly('calendar');
  }

  function goToPlay(levelId: number): void {
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    const level = getLevel(levelId);
    const mercyBonus = hasMercyBonus(save, levelId);
    const effectiveLevel = mercyBonus ? { ...level, moves: level.moves + MERCY_BONUS_MOVES } : level;
    // The play screen must be visible BEFORE startPlayScreen runs: its
    // resize() measures hud.offsetHeight, which is 0 while the screen is
    // display:none — that made the canvas claim the full window height and
    // overflow the bottom edge on landscape (desktop) displays.
    showOnly('play');
    cleanupPlay = startPlayScreen(
      elements.canvas,
      elements.hud,
      effectiveLevel,
      {
        onWin: (stars, score) => {
          save = recordLevelResult(save, levelId, stars, LEVEL_COUNT);
          showWinDialog(elements.dialogRoot, { kind: 'level', stars, score }, goToMap);
        },
        onLose: () => {
          save = recordLevelFailure(save, levelId);
          showLoseDialog(elements.dialogRoot, () => goToPlay(levelId), goToMap);
        },
      },
      save.settings,
    );
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

  // Plays the Daily Garden (สวนประจำวัน) for `dateKey` — same play screen,
  // same Mercy Moves plumbing as a real level, but NEVER recordLevelResult:
  // the Daily Garden isn't a level (CONTEXT.md — "ไม่ใช่ด่าน ไม่มีดาว ไม่
  // ปลดล็อกอะไร"), so a win goes through recordDailyBloom instead, which
  // never touches stars or unlockedLevel. dailyLevelFor always returns
  // `id: 0`, a reserved id no real level uses, so the existing single-slot
  // `failStreak` in save.ts grants Mercy Moves here exactly as it does for
  // any level — no special-casing needed.
  function goToDailyGarden(dateKey: string): void {
    if (cleanupPlay) {
      cleanupPlay();
      cleanupPlay = null;
    }
    const level = dailyLevelFor(dateKey);
    const mercyBonus = hasMercyBonus(save, level.id);
    const effectiveLevel = mercyBonus ? { ...level, moves: level.moves + MERCY_BONUS_MOVES } : level;
    showOnly('play');
    cleanupPlay = startPlayScreen(
      elements.canvas,
      elements.hud,
      effectiveLevel,
      {
        onWin: () => {
          save = recordDailyBloom(save, dateKey);
          showWinDialog(elements.dialogRoot, { kind: 'daily', flowerGlyph: flowerGlyphFor(dateKey) }, goToCalendar);
        },
        onLose: () => {
          save = recordLevelFailure(save, level.id);
          showLoseDialog(elements.dialogRoot, () => goToDailyGarden(dateKey), goToCalendar, STRINGS.backToCalendar);
        },
      },
      save.settings,
    );
    if (mercyBonus) {
      showToast(STRINGS.mercyBanner);
    }
    // No tutorialByLevel entry exists for id 0, so the tutorial overlay
    // never fires here — intentionally: the Daily Garden reuses mechanics
    // she's already been taught on levels 1-80.
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
