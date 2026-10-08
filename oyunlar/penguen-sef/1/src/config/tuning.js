// Oyunun bütün ayarları tek yerde. Süreler saniye, hızlar px/sn (720x1280 tasarım ölçüsü).

// Yemekler; sprite: 'it_' + id. at: elin kaçıncı saniyesinde banta girmeye başlar.
export const DISHES = {
  d_cocoa: { name: 'Sıcak Kakao', points: 6, at: 0 },
  d_grilled_fish: { name: 'Izgara Balık', points: 10, at: 0 },
  d_fish_soup: { name: 'Balık Çorbası', points: 12, at: 0 },
  d_calamari: { name: 'Kalamar Tava', points: 14, at: 20 },
  d_fish_burger: { name: 'Balık Burger', points: 16, at: 40 },
  d_sushi: { name: 'Somon Suşi', points: 18, at: 60 },
  d_pizza: { name: 'Krill Pizza', points: 20, at: 85 },
  d_ice_cream: { name: 'Kar Topu Dondurma', points: 22, at: 110 },
};

// Müşteriler; vip: sabrı kısa, puanı iki kat
export const CUSTOMERS = {
  penguin: { sprite: 'cu_penguin', at: 0 },
  seal: { sprite: 'cu_seal', at: 0 },
  gull: { sprite: 'cu_gull', at: 30 },
  bear: { sprite: 'cu_bear', at: 60 },
  emperor: { sprite: 'cu_emperor', at: 90, vip: true },
};

export const HEARTS = 3;
export const HEAL_EVERY = 12; // bu kadar doğru servis = +1 kalp (en fazla HEARTS)

// ---------------------------------------------------------------- zorluk
// Zorluk HİÇ DURMADAN artar: t1 saniyeye kadar v0 → v1 hızlı tırmanış, sonra saniyede
// slope2 kadar yavaş ama sürekli artış; limit, oyunun insanca oynanabilir kaldığı sınır.
const ramp = (t, t1, v0, v1, slope2, limit) => {
  const v = t <= t1 ? v0 + ((v1 - v0) * t) / t1 : v1 + slope2 * (t - t1);
  return v1 >= v0 ? Math.min(limit, v) : Math.max(limit, v);
};
export const beltSpeed = (t) => ramp(t, 95, 150, 360, 0.7, 560); // px/sn
export const spawnGap = (t) => ramp(t, 110, 1.7, 0.72, -0.0012, 0.42); // sn (en hızlıda bile ~235 px ara)
export const patience = (t) => ramp(t, 150, 14, 8, -0.01, 5.5); // sn
// Banta gelen yemeğin bir müşterinin istediği olma olasılığı: azaldıkça "bırak" kararı artar
export const wantedChance = (t) => ramp(t, 180, 0.68, 0.52, -0.0004, 0.45);
export const doubleOrderChance = (t) => (t < 70 ? 0 : Math.min(0.6, (t - 70) / 200));
export const WRONG_PENALTY = 0.35; // yanlış yemek: sabrın bu oranı gider

// Seviye: her LEVEL_EVERY saniyede bir artar ve duyurulur; puanı da artırır
export const LEVEL_EVERY = 30;
export const levelAt = (t) => 1 + Math.floor(t / LEVEL_EVERY);
export const levelMult = (lvl) => 1 + 0.15 * (lvl - 1);

// Kombo: her 4 doğru servis çarpanı 1 artırır (en fazla x5)
export const comboMult = (combo) => Math.min(5, 1 + Math.floor(combo / 4));

// Skor yıldız eşikleri
export const STAR_GOALS = [350, 1100, 2400];
export const starsForScore = (s) => STAR_GOALS.filter((g) => s >= g).length;
