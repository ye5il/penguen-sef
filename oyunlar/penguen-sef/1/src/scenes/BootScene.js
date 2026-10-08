// Görselleri ve marka yazı tiplerini yükler, sonra Lisem'e "hazır" der.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = this.add.graphics();
    const label = this.add.text(360, 600, 'Yükleniyor...', { fontFamily: 'monospace', fontSize: '34px', color: '#1f2430' }).setOrigin(0.5);
    this.load.on('progress', (v) => {
      bar.clear();
      bar.fillStyle(0x1d3557, 1).fillRect(160, 650, 400, 30);
      bar.fillStyle(0x5b8def, 1).fillRect(165, 655, Math.round((390 * v) / 5) * 5, 20);
    });
    this.load.on('loaderror', (f) => label.setText('Yükleme hatası: ' + f.key));
    this.load.pack('main', 'assets/pack.json');
  }

  create() {
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
