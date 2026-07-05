import type { Stars } from '../save';
import { STRINGS } from '../strings';

function starText(stars: Stars): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function showWinDialog(root: HTMLElement, stars: Stars, score: number, onContinue: () => void): void {
  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  const heading = document.createElement('h2');
  heading.textContent = STRINGS.winTitle;

  const starsEl = document.createElement('div');
  starsEl.className = 'dialog-stars';
  starsEl.textContent = starText(stars);

  const scoreEl = document.createElement('p');
  scoreEl.textContent = `${STRINGS.score}: ${score}`;

  const continueButton = document.createElement('button');
  continueButton.className = 'primary-button';
  continueButton.textContent = STRINGS.continueLabel;
  continueButton.addEventListener('click', () => {
    root.innerHTML = '';
    onContinue();
  });

  dialog.append(heading, starsEl, scoreEl, continueButton);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}

export function showLoseDialog(root: HTMLElement, onRetry: () => void, onBackToMap: () => void): void {
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
  backButton.textContent = STRINGS.backToMap;
  backButton.addEventListener('click', () => {
    root.innerHTML = '';
    onBackToMap();
  });

  dialog.append(heading, retryButton, backButton);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}
