import { startApp } from './game/app';

startApp({
  titleEl: document.getElementById('screen-title') as HTMLElement,
  mapEl: document.getElementById('screen-map') as HTMLElement,
  playEl: document.getElementById('screen-play') as HTMLElement,
  canvas: document.getElementById('board') as HTMLCanvasElement,
  hud: document.getElementById('hud') as HTMLElement,
  dialogRoot: document.getElementById('dialog-root') as HTMLElement,
});
