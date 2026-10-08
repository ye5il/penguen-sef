"""Lisem vitrin kapağı: oyunlar/penguen-sef/kapak.jpg (1600 x 1000, önemli kısım ortada).

Oyunun piksel sprite'larından (tools/piksel.py) yakın komşu büyütmeyle kurulur;
başlık oyunun piksel yazı tipiyle (Pixelify Sans) yazılır.
Kullanım:  python tools/kapak.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import piksel as px

KOK = Path(__file__).resolve().parent.parent
CIKTI = KOK / "oyunlar" / "penguen-sef" / "kapak.jpg"
FONT_DIR = KOK / "oyunlar" / "penguen-sef" / "1" / "assets" / "fonts"
W, H = 1600, 1000
U = 8  # kapakta bir sprite pikseli = 8 görüntü pikseli


def buyut(pix, olcek=U):
    im = pix.image()
    return im.resize((im.width * olcek, im.height * olcek), Image.NEAREST)


def yapistir(zemin, im, merkez_x, taban_y):
    zemin.alpha_composite(im, (int(merkez_x - im.width / 2), int(taban_y - im.height)))


def doseme(zemin, pix, y0, y1, olcek=U):
    karo = buyut(pix, olcek)
    for y in range(y0, y1, karo.height):
        for x in range(0, W, karo.width):
            zemin.alpha_composite(karo.crop((0, 0, karo.width, min(karo.height, y1 - y))), (x, y))


def baslik(d, merkez_x, taban_y, metin, boyut):
    latin = ImageFont.truetype(str(FONT_DIR / "pixelify-sans-latin.woff2"), boyut)
    ext = ImageFont.truetype(str(FONT_DIR / "pixelify-sans-latin-ext.woff2"), boyut)
    parcalar = [(ch, latin if ord(ch) < 256 or ch == "ı" else ext) for ch in metin]
    genislik = sum(f.getlength(ch) for ch, f in parcalar)
    x = merkez_x - genislik / 2
    for ch, f in parcalar:
        d.text((x, taban_y), ch, font=f, fill=(255, 255, 255), stroke_width=12, stroke_fill=(29, 53, 87), anchor="ls")
        x += f.getlength(ch)


def main():
    zemin = Image.new("RGBA", (W, H), (226, 240, 248, 255))
    doseme(zemin, px.wall_kitchen(), 0, 440)
    doseme(zemin, px.floor_dining(), 440, H)

    # Mutfak penceresi + şef, ortadan inen bant
    yapistir(zemin, buyut(px.pass_back(), 6), W // 2, 470)
    yapistir(zemin, buyut(px.penguin(hat=True, scarf=(px.RD, px.RD2)), 6), W // 2, 520)
    yapistir(zemin, buyut(px.pass_front(), 6), W // 2, 480)
    bant = buyut(px.belt(), 6)
    for y in range(480, H, bant.height):
        zemin.alpha_composite(bant, (W // 2 - bant.width // 2, y))
    yapistir(zemin, buyut(px.d_sushi(), 6), W // 2, 720)
    yapistir(zemin, buyut(px.d_fish_burger(), 6), W // 2, 900)

    # Sol: burger isteyen fok; sağ: pizzasına kavuşan kutup ayısı
    for x, karakter, yemek in ((330, px.seal(), px.d_fish_burger()), (1270, px.bear(), px.d_pizza())):
        yapistir(zemin, buyut(px.table(), 8), x, H + 10)
        yapistir(zemin, buyut(karakter, 8), x, H - 70)
        yapistir(zemin, buyut(px.bubble(30), 6), x, 560)
        yapistir(zemin, buyut(yemek, 6), x, 490)
    ucan = buyut(px.d_pizza(), 6)
    zemin.alpha_composite(ucan, (1010, 600))
    for i, (x, y) in enumerate(((930, 700), (970, 670), (1000, 650))):
        ImageDraw.Draw(zemin).rectangle([x, y, x + 15 - i * 3, y + 15 - i * 3], fill=(255, 255, 255, 220))

    baslik(ImageDraw.Draw(zemin), W / 2, 250, "Penguen Şef", 210)

    CIKTI.parent.mkdir(parents=True, exist_ok=True)
    zemin.convert("RGB").save(CIKTI, quality=92)
    print("kapak:", CIKTI)


if __name__ == "__main__":
    main()
