import { txt, button, panel, keyMenu, soundButton } from '../systems/ui.js';
import { STAR_GOALS, starsForScore } from '../config/tuning.js';
import { S } from '../config/strings.tr.js';
import { sfx } from '../systems/Sfx.js';

const W = 720;
let bestThisSession = 0;

// El sonu: skoru Lisem'e bildirir (en iyi skoru sayfa tutar)
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.d = data;
  }

  create() {
    const { score, served, bestCombo, time, level } = this.d;
    window.LisemOyun?.skor(score);
    bestThisSession = Math.max(bestThisSession, score);
    const stars = starsForScore(score);

    this.add.tileSprite(0, 0, W, 1280, 'floor_dining').setOrigin(0).setTileScale(5);
    this.add.rectangle(W / 2, 640, W, 1280, 0x1d3557, 0.55);
    panel(this, W / 2, 640, 640, 920);
    txt(this, W / 2, 250, S.resultTitle, 60);
    txt(this, W / 2, 330, S.score, 30, '#4a5068', { weight: '500' });
    const scoreT = txt(this, W / 2, 400, '0', 100, '#f0b932', { stroke: '#2b2d42', strokeThickness: 10 });
    this.tweens.addCounter({ from: 0, to: score, duration: 900, ease: 'Cubic.easeOut', onUpdate: (tw) => scoreT.setText(String(Math.round(tw.getValue()))) });

    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 115 + i * 115;
      const s = this.add.image(x, 520, i < stars ? 'star' : 'star_empty').setScale(0);
      this.tweens.add({ targets: s, scale: 6, duration: 300, delay: 600 + i * 220, ease: 'Back.easeOut', onStart: () => i < stars && sfx('pop') });
      txt(this, x, 578, String(STAR_GOALS[i]), 22, '#4a5068', { weight: '500' });
    }

    const mins = Math.floor(time / 60);
    const secs = String(Math.floor(time % 60)).padStart(2, '0');
    const rows = [
      [S.reachedLevel, String(level)],
      [S.served, String(served)],
      [S.bestCombo, String(bestCombo)],
      [S.time, `${mins}:${secs}`],
      [S.bestSession, String(bestThisSession)],
    ];
    rows.forEach(([k, v], i) => {
      const y = 640 + i * 50;
      txt(this, 110, y, k, 28, '#4a5068', { ox: 0, weight: '500' });
      txt(this, 610, y, v, 30, '#2b2d42', { ox: 1 });
    });

    const again = button(this, W / 2, 925, 460, 104, S.playAgain, () => this.scene.start('Game'), { color: 0x5cb85c, size: 44 });
    const menu = button(this, W / 2, 1035, 460, 80, S.mainMenu, () => this.scene.start('Menu'), { color: 0x9aa5b1, size: 32 });
    keyMenu(this, [again, menu]);
    soundButton(this, 44, 42);
    sfx(stars ? 'win' : 'pop');
  }
}
