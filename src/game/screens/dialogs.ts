import type { Stars } from '../save';
import { STRINGS } from '../strings';

function starText(stars: Stars): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

// A level win awards stars off a score threshold; a Daily Garden win never
// does (CONTEXT.md: "ไม่ใช่ด่าน — ไม่มีดาว") and shows the bloom that just
// landed instead. One dialog function handles both shapes rather than
// forking the dialog code — the `kind` discriminant picks which content
// block renders, and the caller (app.ts) supplies whichever destination
// callback fits (goToMap for a level, goToCalendar for a Daily Garden).
export type WinOutcome = { kind: 'level'; stars: Stars; score: number } | { kind: 'daily'; flowerGlyph: string };

export function showWinDialog(root: HTMLElement, outcome: WinOutcome, onContinue: () => void): void {
  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  const confetti = document.createElement('div');
  confetti.className = 'dialog-confetti';
  confetti.textContent = '🎉 🌟 🎉';

  const heading = document.createElement('h2');
  heading.textContent = STRINGS.winTitle;

  dialog.append(confetti, heading);

  if (outcome.kind === 'level') {
    const starsEl = document.createElement('div');
    starsEl.className = 'dialog-stars';
    starsEl.textContent = starText(outcome.stars);

    const scoreEl = document.createElement('p');
    scoreEl.textContent = `${STRINGS.score}: ${outcome.score}`;

    dialog.append(starsEl, scoreEl);
  } else {
    const flowerEl = document.createElement('div');
    flowerEl.className = 'dialog-flower';
    flowerEl.textContent = outcome.flowerGlyph;

    const bloomText = document.createElement('p');
    bloomText.textContent = STRINGS.dailyBloomText;

    dialog.append(flowerEl, bloomText);
  }

  const continueButton = document.createElement('button');
  continueButton.className = 'primary-button';
  continueButton.textContent = STRINGS.continueLabel;
  continueButton.addEventListener('click', () => {
    root.innerHTML = '';
    onContinue();
  });
  dialog.appendChild(continueButton);

  overlay.appendChild(dialog);
  root.appendChild(overlay);
}

export function showLoseDialog(
  root: HTMLElement,
  onRetry: () => void,
  onBack: () => void,
  backLabel: string = STRINGS.backToMap,
): void {
  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  const heading = document.createElement('h2');
  heading.textContent = STRINGS.loseTitle;

  const retryButton = document.createElement('button');
  retryButton.className = 'primary-button';
  retryButton.textContent = STRINGS.retry;
  retryButton.addEventListener('click', () => {
    root.innerHTML = '';
    onRetry();
  });

  const backButton = document.createElement('button');
  backButton.className = 'secondary-button';
  backButton.textContent = backLabel;
  backButton.addEventListener('click', () => {
    root.innerHTML = '';
    onBack();
  });

  dialog.append(heading, retryButton, backButton);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}
