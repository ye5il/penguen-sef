import { addSpriteTextures } from '../systems/Sprites.js';

// Sprite'ları gömülü veriden çizer, yazı tiplerini bekler, sonra Lisem'e "hazır" der.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add.text(360, 620, 'Yükleniyor...', { fontFamily: 'monospace', fontSize: '34px', color: '#1f2430' }).setOrigin(0.5);
    addSpriteTextures(this);

    const L = window.LisemOyun;
    const pixelFont = document.fonts
      ? document.fonts.load('700 32px "Pixelify Sans"', 'Penguen Şef ğüşıöç İ 0123')
      : Promise.resolve();
    const wait = new Promise((r) => setTimeout(r, 3000));
    const fonts = Promise.race([Promise.all([L ? L.yaziTipleri() : null, pixelFont]), wait]);
    fonts.finally(() => {
      L?.hazir(); // Lisem sözleşmesi: 20 sn içinde ZORUNLU
      this.scene.start('Menu');
    });
  }
}
