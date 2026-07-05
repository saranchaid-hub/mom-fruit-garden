import type { Settings } from '../save';
import { STRINGS } from '../strings';

export function showSettingsDialog(
  root: HTMLElement,
  settings: Settings,
  onChange: (patch: Partial<Settings>) => void,
  onClose: () => void,
): void {
  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  const heading = document.createElement('h2');
  heading.textContent = STRINGS.settingsTitle;
  dialog.appendChild(heading);

  function addToggle(label: string, key: 'music' | 'sfx' | 'hints', initial: boolean): void {
    const row = document.createElement('label');
    row.className = 'settings-row';
    const text = document.createElement('span');
    text.textContent = label;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initial;
    checkbox.className = 'settings-checkbox';
    checkbox.addEventListener('change', () => onChange({ [key]: checkbox.checked }));
    row.append(text, checkbox);
    dialog.appendChild(row);
  }

  addToggle(STRINGS.settingsMusic, 'music', settings.music);
  addToggle(STRINGS.settingsSfx, 'sfx', settings.sfx);
  addToggle(STRINGS.settingsHints, 'hints', settings.hints);

  const speedRow = document.createElement('label');
  speedRow.className = 'settings-row';
  const speedText = document.createElement('span');
  speedText.textContent = STRINGS.settingsSlowAnimation;
  const speedCheckbox = document.createElement('input');
  speedCheckbox.type = 'checkbox';
  speedCheckbox.checked = settings.animSpeed === 'slow';
  speedCheckbox.className = 'settings-checkbox';
  speedCheckbox.addEventListener('change', () => onChange({ animSpeed: speedCheckbox.checked ? 'slow' : 'normal' }));
  speedRow.append(speedText, speedCheckbox);
  dialog.appendChild(speedRow);

  const closeButton = document.createElement('button');
  closeButton.className = 'primary-button';
  closeButton.textContent = STRINGS.back;
  closeButton.addEventListener('click', () => {
    root.innerHTML = '';
    onClose();
  });
  dialog.appendChild(closeButton);

  overlay.appendChild(dialog);
  root.appendChild(overlay);
}
