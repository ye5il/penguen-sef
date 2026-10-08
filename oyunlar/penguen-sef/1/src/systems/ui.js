// Ortak arayüz yardımcıları
import { sfx } from './Sfx.js';
import { Settings } from './Run.js';
import { keysFor } from './Keys.js';

const L = window.LisemOyun;

// Piksel yazı tipi (assets/fonts, stil.css'teki @font-face)
export const FONT = '"Pixelify Sans", monospace';

// Piksel ızgarası: sprite'lar 5 kat büyütülür, paneller de bu adımla çizilir
export const P = 5;
const snap = (v) => Math.round(v / P) * P;
const shadeOf = (c, amt) => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return (amt > 0 ? col.brighten(amt) : col.darken(-amt)).color;
};

// Köşeleri basamaklı piksel kutu: kontur, dolgu, üstte açık, altta koyu şerit, alt gölge
export function pixelBox(g, x, y, w, h, fill, o = {}) {
  x = snap(x);
  y = snap(y);
  w = snap(w);
  h = snap(h);
  if (o.shadow !== false) {
    g.fillStyle(0x000000, 0.25);
    g.fillRect(x + P, y + h, w - 2 * P, P);
    g.fillRect(x + w, y + P * 2, P, h - P * 2);
  }
  g.fillStyle(o.border ?? COLORS.inkHex, 1);
  g.fillRect(x + P, y, w - 2 * P, h);
  g.fillRect(x, y + P, w, h - 2 * P);
  g.fillStyle(fill, o.alpha ?? 1);
  g.fillRect(x + 2 * P, y + P, w - 4 * P, h - 2 * P);
  g.fillRect(x + P, y + 2 * P, w - 2 * P, h - 4 * P);
  g.fillStyle(shadeOf(fill, 18), 1).fillRect(x + 2 * P, y + P, w - 4 * P, P);
  g.fillStyle(shadeOf(fill, -14), 1).fillRect(x + 2 * P, y + h - 2 * P, w - 4 * P, P);
  return g;
}

const brand = (name, fallback) => (L ? L.renk(name) : fallback) || fallback;
const toNum = (hex) => parseInt(hex.replace('#', ''), 16);

export const COLORS = {
  ink: '#2b2d42',
  inkHex: 0x2b2d42,
  blue: toNum(brand('--color-accent', '#5b8def')),
  pink: toNum(brand('--color-accent-2', '#ec7ba8')),
  green: 0x5cb85c,
  orange: 0xf0a03c,
  red: 0xe05a47,
  gray: 0x9aa5b1,
  cream: 0xfffbf0,
  pageBg: brand('--page-bg', '#faf8f3'),
  gold: '#f0b932',
};

// "Hareketi azalt" açıksa sarsıntı ve parlama yok
export const calm = () => !!(L && L.hareketiAzalt());

export function txt(scene, x, y, s, size = 24, color = COLORS.ink, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: size + 'px',
    fontStyle: o.weight === '500' ? '500' : '700',
    color,
    stroke: o.stroke || '#000000',
    strokeThickness: o.stroke ? (o.strokeThickness || 5) : 0,
    align: o.align || 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing || 0,
  });
  t.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  return t;
}

export function panel(scene, x, y, w, h, color = COLORS.cream, o = {}) {
  return pixelBox(scene.add.graphics(), x - w / 2, y - h / 2, w, h, color, o);
}

// Kap: container döndürür; .setEnabled(bool), .setLabel(str), .press()
export function button(scene, x, y, w, h, label, onClick, o = {}) {
  const color = o.color ?? COLORS.blue;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (col) => {
    g.clear();
    pixelBox(g, -w / 2, -h / 2, w, h, col);
  };
  draw(color);
  const t = txt(scene, 0, 0, label, o.size || 30, '#ffffff', { stroke: '#2b2d42', strokeThickness: 5 });
  const z = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  c.add([g, t, z]);
  c.enabled = true;
  c.press = () => {
    if (!c.enabled) return;
    sfx('click');
    onClick();
  };
  z.on('pointerover', () => c.enabled && draw(shadeOf(color, 12)));
  z.on('pointerout', () => draw(c.enabled ? color : COLORS.gray));
  z.on('pointerdown', (p, lx, ly, ev) => {
    ev?.stopPropagation?.();
    c.press();
  });
  c.setEnabled = (v) => {
    c.enabled = v;
    draw(v ? color : COLORS.gray);
    t.setAlpha(v ? 1 : 0.7);
    return c;
  };
  c.setLabel = (s) => {
    t.setText(s);
    return c;
  };
  c.setFocus = (v) => {
    draw(v ? shadeOf(color, 16) : c.enabled ? color : COLORS.gray);
    t.setColor(v ? '#fff6a0' : '#ffffff');
    return c;
  };
  c.zone = z;
  return c;
}

// Klavyeyle gezilebilen düğme listesi: ↑↓ seç, Enter/Boşluk bas
export function keyMenu(scene, buttons, { start = 0 } = {}) {
  let i = start;
  let shown = false;
  const show = () => buttons.forEach((b, k) => b.setFocus(shown && k === i));
  const kb = keysFor(scene);
  const move = (d) => {
    if (!shown) shown = true;
    else i = (i + d + buttons.length) % buttons.length;
    show();
  };
  kb.on('keydown-UP', () => move(-1));
  kb.on('keydown-DOWN', () => move(1));
  kb.on('keydown-LEFT', () => move(-1));
  kb.on('keydown-RIGHT', () => move(1));
  const go = () => buttons[shown ? i : start]?.press();
  kb.on('keydown-ENTER', go);
  kb.on('keydown-SPACE', go);
}

// Sol üstteki ses düğmesi (Lisem kuralı: sağ üst sitenin "Kapat" düğmesine ayrılmış)
export function soundButton(scene, x = 44, y = 42) {
  const img = scene.add.image(x, y, Settings.sound ? 'btn_sound_on' : 'btn_sound_off').setScale(4).setInteractive({ useHandCursor: true }).setDepth(9000);
  const refresh = () => img.setTexture(Settings.sound ? 'btn_sound_on' : 'btn_sound_off');
  img.on('pointerdown', (p, lx, ly, ev) => {
    ev?.stopPropagation?.();
    toggleSound();
  });
  soundWatchers.add(refresh);
  scene.events.once('shutdown', () => soundWatchers.delete(refresh));
  return img;
}

const soundWatchers = new Set();

export function toggleSound() {
  Settings.sound = !Settings.sound;
  if (Settings.sound) sfx('click');
  soundWatchers.forEach((f) => f());
}

export function floatText(scene, x, y, s, color = '#ffffff', size = 28, o = {}) {
  const t = txt(scene, x, y, s, size, color, { stroke: '#2b2d42', strokeThickness: 6, wrap: o.wrap });
  t.setDepth(o.depth ?? 6000);
  scene.tweens.add({
    targets: t,
    y: y - (o.rise ?? 60),
    alpha: { from: 1, to: 0 },
    duration: o.duration ?? 1300,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
  return t;
}

// Görseli kutuya sığdır
export function fitImage(img, maxW, maxH) {
  const s = Math.min(maxW / img.width, maxH / img.height);
  img.setScale(s);
  return img;
}

