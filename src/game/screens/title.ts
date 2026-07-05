import { STRINGS } from '../strings';

export function renderTitle(container: HTMLElement, onPlay: () => void, onSettings: () => void): void {
  container.innerHTML = '';

  const heading = document.createElement('h1');
  heading.className = 'title-heading';
  heading.textContent = STRINGS.appTitle;

  const playButton = document.createElement('button');
  playButton.className = 'primary-button';
  playButton.textContent = STRINGS.play;
  playButton.addEventListener('click', onPlay);

  const settingsButton = document.createElement('button');
  settingsButton.className = 'gear-button';
  settingsButton.textContent = '⚙️';
  settingsButton.setAttribute('aria-label', STRINGS.settingsGearLabel);
  settingsButton.addEventListener('click', onSettings);

  container.append(heading, playButton, settingsButton);
}
