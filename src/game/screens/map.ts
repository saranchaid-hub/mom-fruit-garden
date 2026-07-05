import { ALL_LEVELS } from '../../core/levels';
import type { SaveData } from '../save';
import { STRINGS } from '../strings';

const SECTION_SIZE = 10;

function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function sectionsOf<T>(items: T[], size: number): T[][] {
  const sections: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    sections.push(items.slice(i, i + size));
  }
  return sections;
}

export function renderMap(
  container: HTMLElement,
  save: SaveData,
  onSelectLevel: (levelId: number) => void,
  onSettings: () => void,
): void {
  container.innerHTML = '';

  const settingsButton = document.createElement('button');
  settingsButton.className = 'gear-button';
  settingsButton.textContent = '⚙️';
  settingsButton.setAttribute('aria-label', STRINGS.settingsGearLabel);
  settingsButton.addEventListener('click', onSettings);
  container.appendChild(settingsButton);

  const scroll = document.createElement('div');
  scroll.className = 'map-scroll';

  const sections = sectionsOf(ALL_LEVELS, SECTION_SIZE);
  sections.forEach((levels, sectionIndex) => {
    const section = document.createElement('section');
    section.className = 'garden-section';

    const heading = document.createElement('h2');
    heading.className = 'garden-heading';
    heading.textContent = `🌸 ${STRINGS.gardenName(sectionIndex + 1)}`;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'level-grid';

    for (const level of levels) {
      const locked = level.id > save.unlockedLevel;
      const stars = save.stars[level.id] ?? 0;

      const button = document.createElement('button');
      button.className = 'level-button';
      button.disabled = locked;
      button.setAttribute(
        'aria-label',
        locked ? `${STRINGS.level(level.id)} (${STRINGS.locked})` : STRINGS.level(level.id),
      );

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

    section.appendChild(grid);
    scroll.appendChild(section);
  });

  container.appendChild(scroll);
}
