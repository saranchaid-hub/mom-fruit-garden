import { ALL_LEVELS } from '../../core/levels';
import type { SaveData } from '../save';
import { STRINGS } from '../strings';

function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function renderMap(container: HTMLElement, save: SaveData, onSelectLevel: (levelId: number) => void): void {
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'level-grid';

  for (const level of ALL_LEVELS) {
    const locked = level.id > save.unlockedLevel;
    const stars = save.stars[level.id] ?? 0;

    const button = document.createElement('button');
    button.className = 'level-button';
    button.disabled = locked;
    button.setAttribute('aria-label', locked ? `${STRINGS.level(level.id)} (${STRINGS.locked})` : STRINGS.level(level.id));

    const number = document.createElement('span');
    number.className = 'level-number';
    number.textContent = String(level.id);

    const starsEl = document.createElement('span');
    starsEl.className = 'level-stars';
    starsEl.textContent = locked ? '🔒' : starText(stars);

    button.append(number, starsEl);
    button.addEventListener('click', () => onSelectLevel(level.id));
    grid.appendChild(button);
  }

  container.appendChild(grid);
}
