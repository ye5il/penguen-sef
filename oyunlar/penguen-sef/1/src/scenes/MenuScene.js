import { txt, button, keyMenu, soundButton, calm, P } from '../systems/ui.js';
import { S } from '../config/strings.tr.js';
import { sfx } from '../systems/Sfx.js';

const W = 720;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.tileSprite(0, 0, W, 1280, 'floor_dining').setOrigin(0).setTileScale(P);
    this.add.rectangle(0, 0, W, 100, 0xaad2e6).setOrigin(0);
    this.add.tileSprite(0, 100, W, 160, 'wall_dining').setOrigin(0).setTileScale(P);
    this.add.image(170, 140, 'window').setScale(P);
    this.add.image(550, 140, 'window').setScale(P);
    this.add.particles(0, -10, 'fx_smoke', {
      x: { min: 0, max: W },
      speedY: { min: 30, max: 70 },
      speedX: { min: -15, max: 15 },
      scale: { min: 2, max: 4 },
      alpha: { start: 0.9, end: 0.3 },
      lifespan: 16000,
      frequency: calm() ? 900 : 220,
    });

    const title = txt(this, W / 2, 300, S.title, 100, '#ffffff', { stroke: '#1d3557', strokeThickness: 16 });
    if (!calm()) this.tweens.add({ targets: title, y: 290, duration: 700, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    txt(this, W / 2, 378, S.subtitle, 32, '#1d3557', { weight: '500' });

    const chef = this.add.image(W / 2, 745, 'chef_0').setScale(8).setOrigin(0.5, 1);
    if (!calm()) this.tweens.add({ targets: chef, y: 735, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    this.add.image(135, 705, 'cu_seal').setScale(6).setOrigin(0.5, 1);
    this.add.image(590, 705, 'cu_bear').setScale(6).setOrigin(0.5, 1).setFlipX(true);
    [['it_d_grilled_fish', 120, 520], ['it_d_fish_burger', 600, 505], ['it_d_sushi', 245, 780], ['it_d_pizza', 480, 780]].forEach(([k, x, y]) => {
      const img = this.add.image(x, y, k).setScale(P);
      if (!calm()) this.tweens.add({ targets: img, y: y - 10, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    S.howTo.forEach((line, i) => txt(this, W / 2, 850 + i * 40, line, 24, '#1d3557', { weight: '500', wrap: 660 }));
    const play = button(this, W / 2, 1060, 460, 110, S.play, () => this.startGame(), { color: 0x5cb85c, size: 48 });
    txt(this, W / 2, 1200, S.keysHint, 22, '#4a5068', { weight: '500' });
    keyMenu(this, [play]);
    soundButton(this, 44, 42);
    // Ekranın herhangi bir yerine dokunmak da başlatır (tek elle, otobüste)
    this.input.on('pointerdown', () => this.startGame());
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    sfx('success');
    this.cameras.main.fadeOut(220, 13, 27, 42);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}
