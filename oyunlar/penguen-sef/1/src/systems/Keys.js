// Klavye köprüsü.
// Lisem SDK'sı sayfa kaymasın diye ok tuşları ve Boşluk'ta preventDefault çağırır;
// Phaser'ın klavye yöneticisi de "varsayılanı engellenmiş" olayları YOK SAYAR. Bu yüzden
// tuşları pencereden kendimiz dinleyip yalnızca ÇALIŞAN (duraklatılmamış) sahnelere iletiriz.
const NAMES = {
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
  ' ': 'SPACE', Spacebar: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Esc: 'ESC',
  1: 'ONE', 2: 'TWO', 3: 'THREE',
};

const nameOf = (e) => NAMES[e.key] || (e.key && e.key.length === 1 ? e.key.toLocaleUpperCase('en') : String(e.key).toUpperCase());

const held = new Set();
const listeners = new Set();

function dispatch(type, e) {
  const name = nameOf(e);
  if (type === 'down') held.add(name);
  else held.delete(name);
  for (const l of [...listeners]) {
    if (l.type === type && l.name === name && l.scene.sys.isActive()) l.fn(e);
  }
}

window.addEventListener('keydown', (e) => !e.isComposing && dispatch('down', e));
window.addEventListener('keyup', (e) => dispatch('up', e));
window.addEventListener('blur', () => held.clear());

// spec: 'keydown-SPACE', 'keyup-ENTER' … Sahne kapanınca dinleyici kendiliğinden silinir.
export function onKey(scene, spec, fn) {
  const i = spec.indexOf('-');
  const l = { scene, type: spec.slice(0, i) === 'keyup' ? 'up' : 'down', name: spec.slice(i + 1), fn };
  listeners.add(l);
  scene.events.once('shutdown', () => listeners.delete(l));
  return l;
}

export const isDown = (name) => held.has(name);

// Phaser klavye API'sine benzer küçük sarmalayıcı: keysFor(scene).on('keydown-X', fn)
export const keysFor = (scene) => ({ on: (spec, fn) => onKey(scene, spec, fn) });
