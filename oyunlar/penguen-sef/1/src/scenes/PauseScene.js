import { txt, button, panel, keyMenu, soundButton } from '../systems/ui.js';
import { S } from '../config/strings.tr.js';
import { keysFor } from '../systems/Keys.js';

const W = 720;

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.add.zone(W / 2, 640, W, 1280).setInteractive();
    this.add.rectangle(W / 2, 640, W, 1280, 0x0b1b2b, 0.6);
    panel(this, W / 2, 640, 560, 520);
    txt(this, W / 2, 470, S.paused, 56);
    const b = [
      button(this, W / 2, 580, 440, 100, S.resume, () => this.resume(), { color: 0x5cb85c, size: 42 }),
      button(this, W / 2, 700, 440, 84, S.restart, () => this.restart(), { color: 0x9aa5b1, size: 32 }),
      button(this, W / 2, 805, 440, 84, S.mainMenu, () => this.toMenu(), { color: 0xe05a47, size: 32 }),
    ];
    keyMenu(this, b);
    soundButton(this, 44, 42);
    keysFor(this).on('keydown-ESC', () => this.resume());
    keysFor(this).on('keydown-P', () => this.resume());
  }

  resume() {
    this.scene.resume('Game');
    this.scene.stop();
  }

  restart() {
    this.scene.stop('Game');
    this.scene.start('Game');
  }

  toMenu() {
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
