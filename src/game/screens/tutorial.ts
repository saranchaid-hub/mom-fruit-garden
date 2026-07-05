import { STRINGS } from '../strings';

export function showTutorial(root: HTMLElement, text: string, onDismiss: () => void): void {
  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay tutorial-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  const message = document.createElement('p');
  message.className = 'tutorial-text';
  message.textContent = text;

  const button = document.createElement('button');
  button.className = 'primary-button';
  button.textContent = STRINGS.tutorialGotIt;

  const dismiss = (): void => {
    root.innerHTML = '';
    onDismiss();
  };
  button.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss();
  });

  dialog.append(message, button);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}
