// Gömülü piksel sprite'ları (src/sprites.js) tuvale çizip Phaser dokusu yapar.
// Resim dosyası indirilmez: iPhone Safari, Lisem'in kısıtlı ("null" kökenli)
// çerçevesinde indirilen resimleri açamıyor ve Phaser yerlerine yeşil kutu koyuyordu.
import { SPRITES } from '../sprites.js';

const CODES = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~';
const INDEX = Object.fromEntries([...CODES].map((ch, i) => [ch, i]));

export function addSpriteTextures(scene) {
  for (const [key, s] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) continue;
    const canvas = document.createElement('canvas');
    canvas.width = s.w;
    canvas.height = s.h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(s.w, s.h);
    const d = img.data;
    for (let i = 0; i < s.px.length; i++) {
      const ch = s.px[i];
      if (ch === '.') continue;
      const c = s.pal[INDEX[ch]];
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = c[3];
    }
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(key, canvas);
  }
}
