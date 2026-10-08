import {
  DISHES, CUSTOMERS, HEARTS, HEAL_EVERY, WRONG_PENALTY, beltSpeed, spawnGap, patience,
  wantedChance, doubleOrderChance, comboMult, levelAt, levelMult, STAR_GOALS,
} from '../config/tuning.js';
import { S } from '../config/strings.tr.js';
import { Settings } from '../systems/Run.js';
import { sfx } from '../systems/Sfx.js';
import { keysFor } from '../systems/Keys.js';
import { txt, floatText, panel, pixelBox, soundButton, calm, P } from '../systems/ui.js';

const W = 720;
const H = 1280;
const HUD_H = 84;
const BELT_X = 360;
const BELT_TOP = 300;
const BELT_END = 800;
const BELT_W = 150;
const SIDES = {
  left: { x: 150, dir: -1 },
  right: { x: 570, dir: 1 },
};
const SEAT_Y = 1015; // müşterinin ayak noktası
const TABLE_Y = 1062;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weighted(list, weightOf) {
  const total = list.reduce((s, x) => s + weightOf(x), 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= weightOf(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

// Tek ekran: yemekler banttan kayar, ◀ / ▶ en öndeki yemeği o taraftaki müşteriye fırlatır.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.debug = new URLSearchParams(location.search).has('debug');
    this.state = 'ready';
    this.t = 0;
    this.score = 0;
    this.hearts = HEARTS;
    this.level = 1;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.sinceHeal = 0;
    this.spawnT = 0.4;
    this.dishes = []; // banttaki yemekler
    this.announced = new Set(Object.keys(DISHES).filter((id) => DISHES[id].at === 0));

    this.drawScene();
    this.createHud();
    this.createControls();
    this.slots = {};
    for (const side of Object.keys(SIDES)) this.slots[side] = { side, ...SIDES[side], cust: null, table: null };
    for (const side of Object.keys(SIDES)) {
      this.slots[side].table = this.add.image(SIDES[side].x, TABLE_Y, 'table').setOrigin(0.5, 1).setScale(P).setDepth(TABLE_Y);
      this.slots[side].bar = this.add.graphics().setDepth(TABLE_Y + 5);
      this.time.delayedCall(side === 'left' ? 150 : 450, () => this.newCustomer(side));
    }
    this.showReady();

    const pause = () => this.pauseGame();
    this.game.events.on(Phaser.Core.Events.BLUR, pause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, pause);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.BLUR, pause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, pause);
      window.__pc = undefined;
    });
    if (this.debug) this.setupDebug();
  }

  // ---------------------------------------------------------------- sahne
  drawScene() {
    this.add.tileSprite(0, HUD_H, W, BELT_TOP - HUD_H, 'wall_kitchen').setOrigin(0).setTileScale(P).setDepth(-10);
    this.add.tileSprite(0, BELT_TOP, W, H - BELT_TOP, 'floor_dining').setOrigin(0).setTileScale(P).setDepth(-10);
    // Mutfak penceresi: arka plan, şef, çerçeve + tezgâh
    this.add.image(BELT_X, 222, 'pass_back').setScale(P).setDepth(1);
    this.chef = this.add.image(BELT_X, 336, 'chef_0').setOrigin(0.5, 1).setScale(P).setDepth(2);
    this.add.image(BELT_X, 210, 'pass_front').setScale(P).setDepth(3);
    // Bant ve sonundaki çöp kutusu
    this.belt = this.add.tileSprite(BELT_X, BELT_TOP, BELT_W, BELT_END - BELT_TOP + 20, 'belt').setOrigin(0.5, 0).setTileScale(P).setDepth(4);
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.15).fillRect(BELT_X + BELT_W / 2, BELT_TOP, P * 2, BELT_END - BELT_TOP + 20);
    this.add.image(BELT_X, 925, 'st_trash').setOrigin(0.5, 1).setScale(P).setDepth(5);
  }

  createHud() {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x1d3557, 0.96).fillRect(0, 0, W, HUD_H);
    g.fillStyle(0x000000, 0.15).fillRect(0, HUD_H, W, 4);
    soundButton(this, 44, 42).setDepth(101);
    const pauseBtn = this.add.image(112, 42, 'btn_pause').setScale(4).setDepth(101).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', (p, lx, ly, ev) => {
      ev?.stopPropagation?.();
      this.pauseGame();
    });
    this.add.image(250, 42, 'coin').setScale(4).setDepth(101);
    this.scoreT = txt(this, 274, 43, '0', 42, '#ffffff', { ox: 0 }).setDepth(101);
    // Sağ üst köşe boş: sitenin "Kapat" düğmesi orada
    this.heartImgs = [];
    for (let i = 0; i < HEARTS; i++) this.heartImgs.push(this.add.image(445 + i * 58, 42, 'heart').setScale(P).setDepth(101));
    // Seviye tabelası: mutfak penceresinin tentesinde
    this.levelT = txt(this, BELT_X, 128, S.level(1), 30, '#ffffff', { stroke: '#1d3557', strokeThickness: 8 }).setDepth(6);
    this.comboT = txt(this, BELT_X, 860, '', 34, '#ffd23f', { stroke: '#1d3557', strokeThickness: 7 }).setDepth(60).setAlpha(0);
  }

  // İki kontrol: ekranın sol / sağ yarısı (büyük düğmeler görsel rehber) ya da ← → / A D
  createControls() {
    const mk = (side, x) => {
      const c = this.add.container(x, 1185).setDepth(90);
      const g = this.add.graphics();
      const draw = (down) => {
        g.clear();
        pixelBox(g, -150, -60, 300, 120, down ? 0x3f71d6 : 0x5b8def);
        // Piksel ok: sütun sütun daralan üçgen (önce kontur, sonra beyaz)
        const d = side === 'left' ? -1 : 1;
        const col = (cx, units, color) => g.fillStyle(color, 1).fillRect(d > 0 ? cx : -cx - P, -Math.round((units * P) / 2), P, units * P);
        for (let i = 0; i < 7; i++) col(60 + i * P, 13 - i * 2, 0x2b2d42);
        for (let i = 0; i < 6; i++) col(65 + i * P, 11 - i * 2, 0xffffff);
      };
      draw(false);
      const label = txt(this, side === 'left' ? 22 : -22, 2, side === 'left' ? S.left : S.right, 40, '#ffffff', { stroke: '#2b2d42', strokeThickness: 6 });
      c.add([g, label]);
      c.flash = () => {
        draw(true);
        c.y = 1190;
        this.time.delayedCall(90, () => {
          draw(false);
          c.y = 1185;
        });
      };
      return c;
    };
    this.btn = { left: mk('left', 180), right: mk('right', 540) };
    // Dokunma alanları: HUD'un altındaki sol ve sağ yarı
    for (const side of ['left', 'right']) {
      const z = this.add.zone(side === 'left' ? W / 4 : (W * 3) / 4, (HUD_H + H) / 2, W / 2, H - HUD_H).setInteractive();
      z.on('pointerdown', () => this.press(side));
    }
    const kb = keysFor(this);
    kb.on('keydown-LEFT', (e) => !e.repeat && this.press('left'));
    kb.on('keydown-A', (e) => !e.repeat && this.press('left'));
    kb.on('keydown-RIGHT', (e) => !e.repeat && this.press('right'));
    kb.on('keydown-D', (e) => !e.repeat && this.press('right'));
    kb.on('keydown-SPACE', (e) => !e.repeat && this.state === 'ready' && this.start());
    kb.on('keydown-ENTER', (e) => !e.repeat && this.state === 'ready' && this.start());
    kb.on('keydown-P', () => this.pauseGame());
    kb.on('keydown-ESC', () => this.pauseGame());
  }

  showReady() {
    const c = this.add.container(BELT_X, 600).setDepth(200);
    c.add(panel(this, 0, 0, 640, 360, 0xfff6d6, { r: 26 }));
    S.howTo.forEach((line, i) => c.add(txt(this, 0, -110 + i * 62, line, 27, '#2b2d42', { weight: '500', wrap: 580 })));
    const go = txt(this, 0, 120, S.tapToStart, 40, '#c0392b');
    c.add(go);
    this.tweens.add({ targets: go, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    this.readyCard = c;
  }

  start() {
    if (this.state !== 'ready') return;
    this.state = 'play';
    sfx('success');
    this.tweens.add({ targets: this.readyCard, alpha: 0, scale: 0.8, duration: 200, onComplete: () => this.readyCard.destroy() });
    Settings.tutorialSeen = true;
  }

  // ---------------------------------------------------------------- girdi
  press(side) {
    if (this.state === 'ready') return this.start();
    if (this.state !== 'play') return;
    this.btn[side].flash();
    // Bantta en öndeki (en aşağıdaki) yemek
    const front = this.dishes.reduce((a, d) => (!a || d.y > a.y ? d : a), null);
    if (!front) {
      sfx('click');
      return;
    }
    this.dishes = this.dishes.filter((d) => d !== front);
    this.throwDish(front, this.slots[side]);
  }

  throwDish(dish, slot) {
    sfx('whoosh');
    const sx = dish.img.x;
    const sy = dish.img.y;
    const tx = slot.x + (slot.side === 'left' ? 20 : -20);
    const ty = TABLE_Y - 78;
    dish.img.setDepth(80);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 260,
      onUpdate: (tw) => {
        const k = tw.getValue();
        dish.img.setPosition(sx + (tx - sx) * k, sy + (ty - sy) * k - Math.sin(k * Math.PI) * 140);
        dish.img.setAngle(slot.dir * 360 * k);
      },
      onComplete: () => {
        dish.img.setAngle(0);
        this.land(dish, slot);
      },
    });
  }

  land(dish, slot) {
    const c = slot.cust;
    const want = c && !c.leaving ? c.order.find((o) => !o.done && o.type === dish.type) : null;
    if (want) {
      want.done = true;
      const mult = comboMult(this.combo);
      const pts = Math.round(DISHES[dish.type].points * mult * (c.vip ? 2 : 1) * levelMult(this.level));
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.served++;
      this.addScore(pts, slot.x, SEAT_Y - 200);
      sfx('coin');
      this.sparkle(dish.img.x, dish.img.y);
      dish.img.setDepth(TABLE_Y + 2).setScale(3);
      c.plates.push(dish.img);
      this.refreshBubble(c);
      this.showCombo();
      this.sinceHeal++;
      if (this.sinceHeal >= HEAL_EVERY) {
        this.sinceHeal = 0;
        if (this.hearts < HEARTS) {
          this.hearts++;
          this.refreshHearts();
          floatText(this, 500, 120, S.heal, '#ff8fa3', 30);
          sfx('pop');
        }
      }
      if (c.order.every((o) => o.done)) this.customerHappy(slot);
      return;
    }
    // Yanlış (ya da boş masa): yemek düşer, kombo sıfırlanır, müşteri sabır kaybeder
    this.combo = 0;
    this.showCombo();
    sfx('fail');
    if (c && !c.leaving) {
      c.p -= WRONG_PENALTY * c.pMax;
      floatText(this, slot.x, SEAT_Y - 220, S.wrong, '#ff8a65', 34);
      if (!calm()) this.tweens.add({ targets: c.img, x: c.img.x + 10, duration: 50, yoyo: true, repeat: 3 });
    }
    this.tweens.add({
      targets: dish.img,
      y: dish.img.y + 160,
      x: dish.img.x + slot.dir * 60,
      angle: slot.dir * 120,
      alpha: 0,
      duration: 450,
      ease: 'Quad.easeIn',
      onComplete: () => dish.img.destroy(),
    });
  }

  // ---------------------------------------------------------------- müşteriler
  unlockedCustomers() {
    return Object.keys(CUSTOMERS).filter((k) => CUSTOMERS[k].at <= this.t);
  }

  unlockedDishes() {
    return Object.keys(DISHES).filter((k) => DISHES[k].at <= this.t);
  }

  newCustomer(side) {
    if (this.state === 'over') return;
    const slot = this.slots[side];
    const typeId = weighted(this.unlockedCustomers(), (k) => (CUSTOMERS[k].vip ? 0.5 : 1));
    const type = CUSTOMERS[typeId];
    const menu = this.unlockedDishes();
    const n = Math.random() < doubleOrderChance(this.t) ? 2 : 1;
    const order = [];
    for (let i = 0; i < n; i++) order.push({ type: pick(menu), done: false });
    const pMax = patience(this.t) * (type.vip ? 0.75 : 1) * (n === 2 ? 1.5 : 1);
    const img = this.add.image(slot.x + slot.dir * 320, SEAT_Y, type.sprite).setOrigin(0.5, 1).setScale(P).setDepth(SEAT_Y);
    img.setFlipX(side === 'right');
    const c = { slot, type, vip: !!type.vip, order, pMax, p: pMax, img, plates: [], leaving: false, arrived: false };
    slot.cust = c;
    this.tweens.add({
      targets: img,
      x: slot.x,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => {
        c.arrived = true;
        this.refreshBubble(c);
        sfx('bell');
      },
    });
    this.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: 120, yoyo: true, repeat: 2 });
  }

  refreshBubble(c) {
    c.bubble?.destroy();
    const n = c.order.length;
    const b = this.add.container(c.slot.x, SEAT_Y - 230).setDepth(SEAT_Y + 10);
    b.add(this.add.image(0, 0, n === 1 ? 'bubble1' : 'bubble2').setScale(P));
    c.order.forEach((o, i) => {
      const x = (i - (n - 1) / 2) * 120;
      const img = this.add.image(x, -18, 'it_' + o.type).setScale(P);
      b.add(img);
      if (o.done) {
        img.setAlpha(0.35);
        b.add(this.add.image(x + 30, 10, 'ic_check').setScale(4));
      }
    });
    if (c.vip) b.add(txt(this, 0, -100, S.vip, 30, '#f0b932', { stroke: '#2b2d42', strokeThickness: 6 }));
    c.bubble = b;
    if (!c.arrived) return;
    this.tweens.add({ targets: b, scale: { from: 0.7, to: 1 }, duration: 160, ease: 'Back.easeOut' });
  }

  customerHappy(slot) {
    const c = slot.cust;
    c.leaving = true;
    c.bubble?.destroy();
    this.time.delayedCall(450, () => this.customerLeave(slot, true));
  }

  customerAngry(slot) {
    const c = slot.cust;
    c.leaving = true;
    c.bubble?.destroy();
    c.img.setTint(0xff9a8a);
    const icon = this.add.image(slot.x, SEAT_Y - 220, 'ic_angry').setScale(P).setDepth(SEAT_Y + 10);
    this.tweens.add({ targets: icon, y: icon.y - 40, alpha: 0, duration: 900, onComplete: () => icon.destroy() });
    floatText(this, slot.x, SEAT_Y - 240, S.angry, '#ff6b6b', 34);
    sfx('angry');
    this.combo = 0;
    this.showCombo();
    this.hearts--;
    this.refreshHearts(true);
    if (!calm()) this.cameras.main.shake(160, 0.006);
    if (this.hearts <= 0) this.gameOver();
    this.customerLeave(slot, false);
  }

  customerLeave(slot, happy) {
    const c = slot.cust;
    slot.bar.clear();
    c.plates.forEach((p) => this.tweens.add({ targets: p, alpha: 0, duration: 250, onComplete: () => p.destroy() }));
    this.tweens.add({
      targets: c.img,
      x: slot.x + slot.dir * 340,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => c.img.destroy(),
    });
    if (happy) this.tweens.add({ targets: c.img, y: SEAT_Y - 20, duration: 120, yoyo: true });
    slot.cust = null;
    this.time.delayedCall(happy ? 500 : 800, () => this.newCustomer(slot.side));
  }

  drawPatience(slot) {
    const c = slot.cust;
    const g = slot.bar;
    g.clear();
    if (!c || !c.arrived || c.leaving) return;
    const f = Math.max(0, c.p / c.pMax);
    const w = 190;
    const x = slot.x - w / 2;
    const y = TABLE_Y + 15;
    g.fillStyle(0x2b2d42, 1).fillRect(x - P, y - P, w + 2 * P, 20 + 2 * P);
    g.fillStyle(0xdfe6ee, 1).fillRect(x, y, w, 20);
    g.fillStyle(f > 0.5 ? 0x5cb85c : f > 0.25 ? 0xf0a03c : 0xe05a47, 1).fillRect(x, y, Math.max(P, Math.round((w * f) / P) * P), 20);
  }

  // ---------------------------------------------------------------- bant
  spawnDish() {
    const needed = [];
    for (const slot of Object.values(this.slots)) {
      const c = slot.cust;
      if (!c || c.leaving) continue;
      for (const o of c.order) if (!o.done) needed.push({ type: o.type, urgency: 1.2 - c.p / c.pMax });
    }
    const type = needed.length && Math.random() < wantedChance(this.t) ? weighted(needed, (n) => n.urgency).type : pick(this.unlockedDishes());
    const img = this.add.image(BELT_X, BELT_TOP + 10, 'it_' + type).setScale(0).setDepth(10);
    this.tweens.add({ targets: img, scale: P, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.chef, y: 326, duration: 110, yoyo: true });
    this.dishes.push({ type, img, get y() { return this.img.y; } });
  }

  dropToTrash(d) {
    this.dishes = this.dishes.filter((x) => x !== d);
    this.tweens.add({ targets: d.img, y: 880, scale: 2, alpha: 0.6, duration: 260, ease: 'Quad.easeIn', onComplete: () => d.img.destroy() });
    sfx('trash');
  }

  // ---------------------------------------------------------------- skor / kalpler / kombo
  addScore(n, x, y) {
    this.score += n;
    this.scoreT.setText(String(this.score));
    this.tweens.add({ targets: this.scoreT, scale: { from: 1.25, to: 1 }, duration: 160 });
    floatText(this, x, y, `+${n}`, '#ffd23f', 40);
    const nextStar = STAR_GOALS.find((g) => this.score - n < g && this.score >= g);
    if (nextStar) sfx('win');
  }

  refreshHearts(lost = false) {
    this.heartImgs.forEach((h, i) => h.setTexture(i < this.hearts ? 'heart' : 'heart_empty'));
    if (lost) {
      const h = this.heartImgs[this.hearts];
      if (h) this.tweens.add({ targets: h, scale: { from: 2.2, to: 1.45 }, duration: 300 });
    }
  }

  showCombo() {
    const m = comboMult(this.combo);
    if (m <= 1) {
      this.tweens.add({ targets: this.comboT, alpha: 0, duration: 200 });
      return;
    }
    const was = this.comboT.text;
    this.comboT.setText(S.combo(m)).setAlpha(1);
    if (was !== this.comboT.text) this.tweens.add({ targets: this.comboT, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.easeOut' });
  }

  sparkle(x, y) {
    const em = this.add.particles(x, y, 'fx_spark', { speed: { min: 80, max: 220 }, scale: { start: P, end: 1 }, lifespan: 500, emitting: false }).setDepth(85);
    em.explode(10);
    this.time.delayedCall(600, () => em.destroy());
  }

  // ---------------------------------------------------------------- döngü
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.state !== 'play') return;
    this.t += dt;
    const v = beltSpeed(this.t);
    this.belt.tilePositionY -= (v * dt) / P;

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnDish();
      this.spawnT = spawnGap(this.t) * Phaser.Math.FloatBetween(0.85, 1.15);
    }
    for (const d of [...this.dishes]) {
      d.img.y += v * dt;
      if (d.img.y >= BELT_END) this.dropToTrash(d);
    }
    for (const slot of Object.values(this.slots)) {
      const c = slot.cust;
      if (c && c.arrived && !c.leaving) {
        c.p -= dt;
        if (c.p <= 0) this.customerAngry(slot);
      }
      this.drawPatience(slot);
    }
    const lvl = levelAt(this.t);
    if (lvl > this.level) {
      this.level = lvl;
      this.levelUp(lvl);
    }
    for (const [id, d] of Object.entries(DISHES)) {
      if (!this.announced.has(id) && d.at <= this.t) {
        this.announced.add(id);
        this.announce(id);
      }
    }
  }

  // Her seviyede: tabela güncellenir, kısa duyuru çıkar (zorluk tuning.js'te sürekli artar)
  levelUp(lvl) {
    this.levelT.setText(S.level(lvl));
    this.tweens.add({ targets: this.levelT, scale: { from: 1.6, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    const c = this.add.container(BELT_X, 440).setDepth(150);
    c.add(panel(this, 0, 0, 440, 130, 0xffe9a8));
    c.add(txt(this, 0, -18, S.level(lvl), 46, '#c0392b'));
    c.add(txt(this, 0, 32, S.levelUp, 24, '#2b2d42', { weight: '500' }));
    c.setScale(0.3).setAlpha(0);
    sfx('win');
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: 410, delay: 1300, duration: 350, onComplete: () => c.destroy() });
    this.tweens.add({ targets: this.chef, y: 320, duration: 120, yoyo: true, repeat: 1 });
  }

  announce(id) {
    const c = this.add.container(BELT_X, 560).setDepth(150);
    c.add(panel(this, 0, 0, 560, 120, 0xfff6d6, { r: 22 }));
    c.add(this.add.image(-210, 0, 'it_' + id).setScale(4));
    c.add(txt(this, 30, 0, S.newDish(DISHES[id].name), 30, '#c0392b', { wrap: 400 }));
    c.setScale(0.3).setAlpha(0);
    sfx('ding');
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: 530, delay: 1600, duration: 350, onComplete: () => c.destroy() });
  }

  gameOver() {
    if (this.state === 'over') return;
    this.state = 'over';
    for (const d of this.dishes) this.tweens.add({ targets: d.img, alpha: 0, duration: 300 });
    this.time.delayedCall(1300, () =>
      this.scene.start('Result', { score: this.score, served: this.served, bestCombo: this.bestCombo, time: this.t, level: this.level }),
    );
  }

  pauseGame() {
    if (this.state === 'over' || !this.sys.isActive() || this.scene.isActive('Pause')) return;
    this.scene.pause();
    this.scene.launch('Pause');
    this.scene.bringToTop('Pause');
  }

  // ---------------------------------------------------------------- hata ayıklama (?debug)
  setupDebug() {
    window.__pc = {
      scene: this,
      skip: (sec) => (this.t += sec),
      hearts: (n) => {
        this.hearts = n;
        this.refreshHearts();
      },
      stats: () => ({ t: +this.t.toFixed(1), level: this.level, speed: Math.round(beltSpeed(this.t)), gap: +spawnGap(this.t).toFixed(2), patience: +patience(this.t).toFixed(1), wanted: +wantedChance(this.t).toFixed(2) }),
      front: () => this.dishes.reduce((a, d) => (!a || d.y > a.y ? d : a), null)?.type,
      wants: () => Object.fromEntries(Object.entries(this.slots).map(([k, s]) => [k, s.cust ? s.cust.order.filter((o) => !o.done).map((o) => o.type) : null])),
    };
  }
}
