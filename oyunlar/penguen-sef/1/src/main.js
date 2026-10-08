import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import ResultScene from './scenes/ResultScene.js';
import { toggleSound, COLORS } from './systems/ui.js';

const params = new URLSearchParams(location.search);

const config = {
  type: Phaser.AUTO,
  // Piksel art: yakın komşu büyütme, kenar yumuşatma yok, tam sayı konumlar
  pixelArt: true,
  // ?st=1 : requestAnimationFrame yerine setTimeout (arka plan sekmelerinde test için)
  fps: params.has('st') ? { forceSetTimeOut: true, target: 60 } : undefined,
  parent: 'oyun',
  width: 720,
  height: 1280,
  backgroundColor: COLORS.pageBg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
    // Klavye src/systems/Keys.js'ten (SDK'nın preventDefault'u Phaser klavyesini susturur)
    keyboard: false,
    // Lisem kuralı: fare basışında preventDefault YOK (yoksa çerçeve odağı kaybolur).
    // Dokunmada Phaser yakalar; böylece taklit fare olayları çift tıklama yapmaz.
    mouse: { preventDefaultDown: false, preventDefaultUp: false, preventDefaultMove: false, preventDefaultWheel: false },
  },
  // Sesler kendi WebAudio sentezimizden (src/systems/Sfx.js)
  audio: { noAudio: true },
  banner: false,
  scene: [BootScene, MenuScene, GameScene, PauseScene, ResultScene],
};

const game = new Phaser.Game(config);
window.__game = game;

// M: sesi aç/kapat (her sahnede)
window.addEventListener('keydown', (ev) => {
  if ((ev.key === 'm' || ev.key === 'M') && !ev.repeat) toggleSound();
});
