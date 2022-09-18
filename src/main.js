import { Mounting } from './mounting.js';
import { MountingHud } from './hud.js';

Hooks.once('init', () => {
  console.log('initializing');
  console.log(Mounting);
  Mounting.initialize();
});

Hooks.once('ready', async function () {
  ui.notifications.warn('This is a test.');
  console.log('test');
});

Hooks.on('renderTokenHUD', async function (app, html, data) {
  console.log(Mounting.hud);
  MountingHud.render(app, html, data);
});
