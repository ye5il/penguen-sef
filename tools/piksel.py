"""Penguen Şef piksel art üreticisi.

1) Bütün sprite'ları gerçek piksel ızgarasında (kenar yumuşatma YOK) çizer, koyu
   1 piksellik konturu otomatik ekler ve PNG olarak yazar:
   oyunlar/penguen-sef/kaynak/gorseller/  (yayınlanmaz; düzenlenebilir kaynak)
2) Bu PNG'lerin piksellerini oyunun src/sprites.js dosyasına gömer. Oyun açılışta
   onları tuvale kendisi çizer: resim dosyası İNDİRİLMEZ. (iPhone Safari, Lisem'in
   kısıtlı çerçevesinde indirilen resimleri açamıyor; yeşil çerçeveli kutular çıkıyordu.)

Var olan PNG'lerin üzerine YAZMAZ: kendi çiziminizi aynı adla koyup betiği
çalıştırırsanız oyuna o gömülür. Hepsini yeniden çizmek için:  --force
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / "oyunlar" / "penguen-sef" / "1"
IMG_DIR = ROOT / "oyunlar" / "penguen-sef" / "kaynak" / "gorseller"
SPRITES_JS = GAME / "src" / "sprites.js"

# ---------------------------------------------------------------- palet
K = (29, 32, 51)          # kontur
W = (255, 255, 255)
W2 = (210, 222, 236)      # beyaz gölgesi
G1 = (160, 170, 184)
G2 = (104, 114, 130)
NV = (44, 62, 92)         # lacivert penguen
NV2 = (30, 42, 66)
BL = (74, 124, 206)
BL2 = (50, 88, 156)
OR = (247, 159, 31)
OR2 = (205, 112, 18)
PK = (255, 150, 172)
RD = (226, 72, 60)
RD2 = (158, 40, 40)
YL = (250, 214, 80)
YL2 = (214, 160, 30)
BR = (140, 88, 44)
BR2 = (92, 56, 28)
TN = (226, 166, 92)
TN2 = (178, 116, 58)
CR = (255, 242, 214)
GR = (112, 192, 92)
GR2 = (56, 122, 60)
SA = (244, 140, 100)
SL = (148, 160, 180)      # fok
SL2 = (108, 120, 142)
SL3 = (198, 208, 222)
IC = (180, 222, 244)
IC2 = (132, 188, 226)
CH = (112, 64, 38)        # kakao
PI = (255, 176, 196)
WD = (200, 140, 84)
WD2 = (150, 98, 54)
ST = (204, 214, 226)
ST2 = (150, 162, 178)
CLEAR = "clear"


class Pix:
    """Küçük piksel tuvali: şekiller piksel merkezine göre doldurulur (yumuşatma yok)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[y][x] = None if c == CLEAR else c

    def get(self, x, y):
        return self.p[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c, half=None):
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    if half == "top" and y + 0.5 > cy:
                        continue
                    if half == "bottom" and y + 0.5 < cy:
                        continue
                    self.set(x, y, c)

    def circle(self, cx, cy, r, c):
        self.ellipse(cx, cy, r, r, c)

    def poly(self, pts, c):
        n = len(pts)
        for y in range(self.h):
            for x in range(self.w):
                px, py = x + 0.5, y + 0.5
                inside = False
                j = n - 1
                for i in range(n):
                    xi, yi = pts[i]
                    xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def dots(self, pts, c):
        for x, y in pts:
            self.set(x, y, c)

    def rim(self, color, shade, dx=1, dy=1):
        """color renkli piksellerden (dx,dy) komşusu aynı renk olmayanları gölgele."""
        hits = [(x, y) for y in range(self.h) for x in range(self.w)
                if self.p[y][x] == color and self.get(x + dx, y + dy) != color]
        for x, y in hits:
            self.p[y][x] = shade

    def outline(self, c=K):
        """Dolu piksellerin dışına 1 piksellik kontur (4 komşuluk)."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.p[y][x] is None and any(self.get(x + a, y + b) not in (None,) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.p[y][x] = c

    def ascii(self, rows, pal, ox=0, oy=0):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != ".":
                    self.set(ox + x, oy + y, pal[ch])

    def image(self, alpha=None):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c is not None:
                    im.putpixel((x, y), c + ((alpha or 255),) if len(c) == 3 else c)
        return im


# ================================================================ karakterler (26x32)
def penguin(body=NV, body2=NV2, hat=False, scarf=None, emperor=False):
    p = Pix(26, 32)
    p.ellipse(9, 30, 3.2, 1.7, OR)
    p.ellipse(17, 30, 3.2, 1.7, OR)
    p.ellipse(3.6, 21.5, 2.3, 5.5, body2)
    p.ellipse(22.4, 21.5, 2.3, 5.5, body2)
    p.ellipse(13, 21.5, 10, 9, body)
    p.ellipse(13, 14, 8.5, 7.5, body)
    p.ellipse(13, 22.5, 7, 7.5, W)
    p.ellipse(13, 15.2, 6.5, 5.2, W)
    p.rim(W, W2, 1, 1)
    if emperor:
        p.ellipse(6.6, 16, 1.5, 3, YL)
        p.ellipse(19.4, 16, 1.5, 3, YL)
    p.rect(9, 13, 10, 14, K)
    p.rect(15, 13, 16, 14, K)
    p.dots([(9, 13), (15, 13)], W)
    p.dots([(7, 16), (18, 16)], PK)
    p.rect(11, 16, 14, 16, OR)
    p.rect(12, 17, 13, 17, OR2)
    if scarf:
        p.rect(6, 21, 19, 22, scarf[0])
        p.rect(6, 22, 19, 22, scarf[1])
        p.rect(15, 23, 17, 25, scarf[0])
    if hat:
        p.circle(9, 4.6, 3.2, W)
        p.circle(13, 3.6, 3.6, W)
        p.circle(17, 4.6, 3.2, W)
        p.rect(8, 6, 17, 8, W)
        p.rect(8, 8, 17, 8, W2)
    if emperor:
        p.poly([(8, 9), (8.5, 3), (11, 6), (13, 1.5), (15, 6), (17.5, 3), (18, 9)], YL)
        p.rect(8, 8, 17, 8, YL2)
        p.dots([(12, 5), (13, 5)], RD)
    p.outline()
    return p


def seal():
    p = Pix(26, 32)
    p.ellipse(4.5, 28.5, 3.2, 2.2, SL2)
    p.ellipse(21.5, 28.5, 3.2, 2.2, SL2)
    p.ellipse(13, 23.5, 11, 8, SL)
    p.ellipse(13, 13.5, 8.2, 7.2, SL)
    p.ellipse(13, 24.5, 7, 5.8, SL3)
    p.rim(SL, SL2, 1, 1)
    p.ellipse(13, 16.6, 4.4, 2.8, SL3)
    p.rect(12, 14, 13, 15, K)
    p.rect(8, 10, 9, 11, K)
    p.rect(16, 10, 17, 11, K)
    p.dots([(8, 10), (16, 10)], W)
    for y in (16, 18):
        p.line(8, y, 5, y - 1 + (y - 16), K)
        p.line(17, y, 20, y - 1 + (y - 16), K)
    p.dots([(7, 15), (18, 15)], PK)
    p.outline()
    return p


def bear():
    p = Pix(26, 32)
    p.circle(6.5, 6.5, 2.8, W)
    p.circle(19.5, 6.5, 2.8, W)
    p.circle(6.5, 6.5, 1.3, PK)
    p.circle(19.5, 6.5, 1.3, PK)
    p.ellipse(13, 24, 11, 8, W)
    p.ellipse(13, 12.5, 8.6, 7.6, W)
    p.rim(W, W2, 1, 1)
    p.ellipse(13, 16, 4.2, 3.2, CR)
    p.rect(12, 13, 13, 14, K)
    p.dots([(11, 16), (12, 17), (13, 17), (14, 16)], K)
    p.rect(9, 10, 9, 11, K)
    p.rect(16, 10, 16, 11, K)
    p.ellipse(13, 25, 6.5, 5, CR)
    p.outline()
    return p


def gull():
    p = Pix(26, 32)
    p.rect(11, 27, 11, 30, OR)
    p.rect(15, 27, 15, 30, OR)
    p.dots([(10, 30), (12, 30), (14, 30), (16, 30)], OR)
    p.poly([(3, 22), (7, 19), (8, 25)], G1)
    p.ellipse(13, 21.5, 8.5, 7, W)
    p.ellipse(16.5, 21.5, 5.5, 4, G1)
    p.rect(19, 23, 21, 24, G2)
    p.circle(12, 11.5, 6.3, W)
    p.rim(W, W2, 1, 1)
    p.poly([(17, 10.5), (24, 12), (17, 13.5)], YL)
    p.set(21, 12, RD)
    p.rect(13, 10, 14, 10, K)
    p.line(12, 8, 15, 8, G2)
    p.outline()
    return p


# ================================================================ yemekler (20x20)
def plate(p, cy=14.5):
    p.ellipse(10, cy, 9, 4, W2)
    p.ellipse(10, cy - 0.5, 6.6, 2.6, W)


def d_grilled_fish():
    p = Pix(20, 20)
    plate(p)
    p.ellipse(9, 11.5, 6.5, 3, TN2)
    p.ellipse(9, 11, 5.5, 2.2, TN)
    for x in (6, 9, 12):
        p.dots([(x, 10), (x + 1, 11), (x + 2, 12)], BR2)
    p.circle(15.5, 11.5, 2.5, YL)
    p.set(15, 11, W)
    p.outline()
    return p


def d_fish_soup():
    p = Pix(20, 20)
    p.ellipse(10, 11.5, 8.5, 6.5, BL, half="bottom")
    p.rim(BL, BL2, 1, 1)
    p.ellipse(10, 11.5, 8.5, 2.6, BL2)
    p.ellipse(10, 11.4, 7, 1.8, OR)
    p.dots([(7, 11), (12, 11)], CR)
    p.dots([(9, 12), (14, 12)], OR2)
    p.dots([(9, 8), (10, 8), (11, 8), (10, 7), (10, 9)], GR)
    p.set(10, 8, GR2)
    p.outline()
    return p


def d_calamari():
    p = Pix(20, 20)
    plate(p)
    for cx, cy in ((6, 11.5), (10, 10.5), (14, 11.5)):
        p.circle(cx, cy, 2.7, TN)
        p.rim(TN, TN2, 1, 1)
        p.rect(int(cx) - 1, int(cy) - 1, int(cx), int(cy), W)
    p.circle(16, 15, 1.4, RD)
    p.outline()
    return p


def d_fish_burger():
    p = Pix(20, 20)
    p.ellipse(10, 16.5, 7.5, 2, TN)
    p.rect(3, 13, 16, 14, GR)
    p.dots([(3, 15), (6, 15), (9, 15), (12, 15), (15, 15)], GR)
    p.rect(3, 11, 16, 12, BR)
    p.rect(4, 10, 15, 10, RD)
    p.ellipse(10, 10, 8, 6, TN, half="top")
    p.rim(TN, TN2, 1, 1)
    p.dots([(6, 6), (9, 5), (12, 6), (14, 8), (8, 8)], CR)
    p.outline()
    return p


def d_sushi():
    p = Pix(20, 20)
    p.rect(1, 13, 18, 16, WD)
    p.rect(1, 16, 18, 16, WD2)
    for cx in (5, 10, 15):
        p.circle(cx, 11, 2.8, GR2)
        p.circle(cx, 11, 1.8, W)
        p.set(cx - 1 if cx % 2 else cx, 11, SA)
        p.rect(cx - 1, 10, cx, 11, SA)
    p.dots([(17, 12), (18, 12)], GR)
    p.outline()
    return p


def d_pizza():
    p = Pix(20, 20)
    plate(p)
    p.ellipse(10, 11.5, 7.5, 4.5, TN2)
    p.ellipse(10, 11.3, 6.2, 3.4, YL)
    p.dots([(7, 10), (12, 11), (9, 13), (14, 12), (6, 12)], RD)
    p.dots([(10, 10), (13, 9), (8, 12)], PK)
    p.line(10, 8, 10, 15, TN2)
    p.outline()
    return p


def d_cocoa():
    p = Pix(20, 20)
    p.rect(4, 7, 13, 17, RD)
    p.rim(RD, RD2, 1, 1)
    p.rect(14, 9, 16, 9, RD)
    p.rect(16, 9, 16, 14, RD)
    p.rect(14, 14, 16, 14, RD)
    p.rect(5, 7, 12, 8, CH)
    p.rect(5, 5, 6, 6, W)
    p.rect(8, 4, 9, 5, W)
    p.rect(11, 5, 12, 6, W)
    p.outline()
    p.dots([(6, 1), (7, 2), (10, 0), (11, 1)], G1)
    return p


def d_ice_cream():
    p = Pix(20, 20)
    p.poly([(4.5, 12), (15.5, 12), (10, 19.6)], TN)
    for y in (14, 16):
        p.line(6, y, 14, y, TN2)
    p.line(8, 12, 11, 18, TN2)
    p.ellipse(10, 10.6, 5, 3.4, PI)
    p.ellipse(10, 6.8, 4.4, 3.1, CR)
    p.ellipse(10, 3.6, 3.4, 2.5, CH)
    p.rim(PI, (230, 140, 166), 1, 1)
    p.dots([(7, 9), (7, 5), (9, 2)], W)
    p.outline()
    return p


# ================================================================ arayüz
def from_ascii(rows, pal, w=None, h=None, pad=1, outline=True):
    w = w or len(rows[0]) + pad * 2
    h = h or len(rows) + pad * 2
    p = Pix(w, h)
    p.ascii(rows, pal, pad, pad)
    if outline:
        p.outline()
    return p


HEART = [".rr.rr.", "rwrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."]


def heart(c, c2):
    return from_ascii(HEART, {"r": c, "w": c2})


def coin():
    p = Pix(10, 10)
    p.circle(5, 5, 3.7, YL)
    p.rim(YL, YL2, 1, 1)
    p.rect(5, 3, 5, 6, YL2)
    p.set(3, 3, W)
    p.outline()
    return p


def star(fill, shade):
    p = Pix(15, 15)
    pts = []
    for i in range(10):
        r = 6.6 if i % 2 == 0 else 2.9
        a = math.radians(-90 + i * 36)
        pts.append((7.5 + r * math.cos(a), 8 + r * math.sin(a)))
    p.poly(pts, fill)
    p.rim(fill, shade, 1, 1)
    p.outline()
    return p


def bubble(width):
    p = Pix(width, 31)
    p.rect(2, 1, width - 3, 24, W)
    p.rect(1, 2, width - 2, 23, W)
    p.poly([(width / 2 - 4, 24), (width / 2 + 2, 24), (width / 2 - 3, 29)], W)
    p.rect(2, 23, width - 3, 23, W2)
    p.outline()
    return p


def ic_angry():
    p = Pix(13, 13)
    p.circle(6.5, 6.5, 5.2, RD)
    p.dots([(3, 4), (4, 5), (9, 4), (8, 5)], K)
    p.rect(4, 8, 8, 8, K)
    p.dots([(3, 9), (9, 9)], K)
    p.outline()
    return p


def ic_check():
    p = Pix(11, 11)
    p.circle(5.5, 5.5, 4.4, GR)
    p.dots([(3, 5), (4, 6), (5, 7), (6, 6), (7, 5), (8, 4)], W)
    p.outline()
    return p


def round_btn(color, color2):
    p = Pix(14, 14)
    p.rect(2, 1, 11, 12, color)
    p.rect(1, 2, 12, 11, color)
    p.rect(2, 11, 11, 11, color2)
    p.rect(12, 3, 12, 10, color2)
    return p


def btn_pause():
    p = round_btn(BL, BL2)
    p.rect(4, 4, 5, 9, W)
    p.rect(8, 4, 9, 9, W)
    p.outline()
    return p


def btn_sound(on):
    p = round_btn(OR if on else G1, OR2 if on else G2)
    p.rect(3, 5, 4, 8, W)
    p.poly([(5, 5), (8, 2.5), (8, 11.5), (5, 9)], W)
    if on:
        p.dots([(10, 4), (11, 5), (11, 6), (11, 7), (11, 8), (10, 9)], W)
    else:
        p.dots([(9, 5), (10, 6), (11, 7), (11, 5), (9, 7)], W)
    p.outline()
    return p


def fx_spark():
    p = Pix(5, 5)
    p.rect(2, 0, 2, 4, YL)
    p.rect(0, 2, 4, 2, YL)
    p.set(2, 2, W)
    return p


def fx_smoke():
    p = Pix(6, 6)
    p.circle(3, 3, 2.9, W)
    return p


# ================================================================ ortam
def floor_dining():
    p = Pix(16, 16)
    p.rect(0, 0, 15, 15, (226, 240, 248))
    p.rect(15, 0, 15, 15, (200, 222, 236))
    p.rect(0, 15, 15, 15, (200, 222, 236))
    p.dots([(3, 3), (4, 3), (5, 2)], W)
    return p


def wall_kitchen():
    p = Pix(16, 16)
    p.rect(0, 0, 15, 15, (236, 241, 245))
    p.rect(0, 7, 15, 7, (208, 216, 226))
    p.rect(0, 15, 15, 15, (208, 216, 226))
    p.rect(7, 0, 7, 7, (208, 216, 226))
    p.rect(15, 8, 15, 15, (208, 216, 226))
    return p


def wall_dining():
    p = Pix(16, 32)
    p.rect(0, 0, 15, 21, (170, 210, 230))
    p.rect(0, 22, 15, 22, W)
    p.rect(0, 23, 15, 31, (120, 170, 200))
    p.rect(7, 23, 7, 31, (104, 152, 186))
    return p


def window():
    p = Pix(26, 20)
    p.rect(1, 1, 24, 18, W)
    p.rect(3, 3, 22, 16, IC)
    p.poly([(3, 16.5), (9, 8), (13, 13), (17, 9), (22.5, 16.5)], W)
    p.circle(7, 6, 1.6, YL)
    p.rect(12, 3, 13, 16, W)
    p.outline()
    return p


def table():
    p = Pix(30, 18)
    p.rect(4, 7, 5, 16, WD2)
    p.rect(24, 7, 25, 16, WD2)
    p.rect(1, 1, 28, 6, WD)
    p.rect(1, 1, 28, 1, (226, 176, 120))
    p.rect(1, 6, 28, 7, WD2)
    p.outline()
    return p


def trash():
    p = Pix(20, 22)
    p.poly([(3, 6), (17, 6), (15.5, 20.5), (4.5, 20.5)], G1)
    p.rim(G1, G2, 1, 0)
    for x in (7, 10, 13):
        p.rect(x, 9, x, 18, G2)
    p.rect(2, 3, 17, 5, W2)
    p.rect(8, 1, 11, 2, W2)
    p.outline()
    return p


def belt():
    p = Pix(30, 16)
    p.rect(3, 0, 26, 15, (74, 79, 92))
    for y in (1, 9):
        p.rect(4, y, 25, y + 4, (92, 98, 112))
        p.rect(4, y, 25, y, (122, 129, 144))
    p.rect(0, 0, 2, 15, ST)
    p.rect(27, 0, 29, 15, ST)
    p.rect(2, 0, 2, 15, K)
    p.rect(27, 0, 27, 15, K)
    p.dots([(1, 4), (1, 12), (28, 4), (28, 12)], ST2)
    return p


def pass_back():
    p = Pix(80, 32)
    p.rect(0, 0, 79, 31, (92, 99, 117))
    for y in range(0, 32, 8):
        p.rect(0, y, 79, y, (106, 114, 133))
    for x in range(0, 80, 10):
        p.rect(x, 0, x, 31, (106, 114, 133))
    p.rect(6, 13, 73, 14, WD2)
    for x, c in ((12, G1), (24, RD), (60, G1)):
        p.rect(x, 7, x + 8, 12, c)
        p.rect(x - 1, 7, x + 9, 7, c)
    return p


def pass_front():
    p = Pix(96, 40)
    for i in range(8):
        c = RD if i % 2 == 0 else W
        p.rect(i * 12, 0, i * 12 + 11, 6, c)
        p.ellipse(i * 12 + 6, 6, 6, 3.2, c, half="bottom")
    p.rect(0, 6, 7, 39, (170, 210, 230))
    p.rect(88, 6, 95, 39, (170, 210, 230))
    p.rect(2, 31, 93, 35, ST)
    p.rect(2, 36, 93, 39, ST2)
    p.rect(2, 31, 93, 31, W)
    # kontur: tente altı, sütun iç kenarları, tezgâh
    for x in range(96):
        for y in range(1, 12):
            if p.get(x, y) and not p.get(x, y + 1) and 8 <= x <= 87:
                p.set(x, y + 1, K)
    p.rect(7, 9, 7, 30, K)
    p.rect(88, 9, 88, 30, K)
    p.rect(2, 30, 93, 30, K)
    p.rect(2, 35, 93, 35, K)
    return p


# ================================================================ kayıt
ASSETS = {
    "characters": {
        "chef_0": lambda: penguin(hat=True, scarf=(RD, RD2)),
        "cu_penguin": lambda: penguin(body=BL, body2=BL2, scarf=(YL, YL2)),
        "cu_emperor": lambda: penguin(body=(40, 44, 60), body2=(28, 30, 44), emperor=True),
        "cu_seal": seal,
        "cu_gull": gull,
        "cu_bear": bear,
    },
    "items": {
        "it_d_cocoa": d_cocoa, "it_d_grilled_fish": d_grilled_fish, "it_d_fish_soup": d_fish_soup,
        "it_d_calamari": d_calamari, "it_d_fish_burger": d_fish_burger, "it_d_sushi": d_sushi,
        "it_d_pizza": d_pizza, "it_d_ice_cream": d_ice_cream,
    },
    "ui": {
        "heart": lambda: heart(RD, PK), "heart_empty": lambda: heart(G1, W2), "coin": coin,
        "star": lambda: star(YL, YL2), "star_empty": lambda: star(G1, G2),
        "bubble1": lambda: bubble(30), "bubble2": lambda: bubble(52),
        "ic_angry": ic_angry, "ic_check": ic_check, "btn_pause": btn_pause,
        "btn_sound_on": lambda: btn_sound(True), "btn_sound_off": lambda: btn_sound(False),
        "fx_spark": fx_spark, "fx_smoke": fx_smoke,
    },
    "furniture": {
        "floor_dining": floor_dining, "wall_kitchen": wall_kitchen, "wall_dining": wall_dining,
        "window": window, "table": table, "st_trash": trash, "belt": belt,
        "pass_back": pass_back, "pass_front": pass_front,
    },
}


def all_sprites():
    for folder, items in ASSETS.items():
        for key, fn in items.items():
            yield folder, key, fn


# sprites.js: her sprite için genişlik, yükseklik, palet (RGBA) ve piksel dizisi
# ('.' saydam, diğer karakterler palet sırası)
CODES = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~"


def encode(path):
    im = Image.open(path).convert("RGBA")
    pal, rows = [], []
    for y in range(im.height):
        row = []
        for x in range(im.width):
            c = im.getpixel((x, y))
            if c[3] == 0:
                row.append(".")
                continue
            if c not in pal:
                pal.append(c)
            if len(pal) > len(CODES):
                raise ValueError(f"{path.name}: {len(CODES)} renkten fazla")
            row.append(CODES[pal.index(c)])
        rows.append("".join(row))
    return {"w": im.width, "h": im.height, "pal": [list(c) for c in pal], "px": "".join(rows)}


def write_sprites_js(keys):
    out = {key: encode(IMG_DIR / folder / f"{key}.png") for folder, key in keys}
    lines = [
        "// OTOMATİK ÜRETİLDİ — elle değiştirmeyin: python tools/piksel.py",
        "// Piksel sprite'lar (kaynak: oyunlar/penguen-sef/kaynak/gorseller/*.png).",
        "// Açılışta src/systems/Sprites.js bunları tuvale çizer; resim dosyası indirilmez.",
        "export const SPRITES = {",
    ]
    for key, d in out.items():
        lines.append(f"  {key}: {json.dumps(d, separators=(',', ':'))},")
    lines.append("};")
    SPRITES_JS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(out), SPRITES_JS.stat().st_size


def main():
    force = "--force" in sys.argv
    made = skipped = 0
    keys = []
    for folder, key, fn in all_sprites():
        path = IMG_DIR / folder / f"{key}.png"
        keys.append((folder, key))
        if path.exists() and not force:
            skipped += 1
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        fn().image().save(path)
        made += 1
    n, size = write_sprites_js(keys)
    print(f"{made} sprite cizildi, {skipped} mevcut korundu. sprites.js: {n} sprite, {size // 1024} KB.")


if __name__ == "__main__":
    main()
