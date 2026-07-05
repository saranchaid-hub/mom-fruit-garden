import { STRINGS } from '../strings';

export function renderTitle(container: HTMLElement, onPlay: () => void): void {
  container.innerHTML = '';

  const heading = document.createElement('h1');
  heading.className = 'title-heading';
  heading.textContent = STRINGS.appTitle;

  const playButton = document.createElement('button');
  playButton.className = 'primary-button';
  playButton.textContent = STRINGS.play;
  playButton.addEventListener('click', onPlay);

  container.append(heading, playButton);
}
