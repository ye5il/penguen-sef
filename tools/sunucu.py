"""Lisem önizlemesinin (npm run dev) Node gerektirmeyen Python karşılığı.

İki sunucu açar, scripts/dev.mjs ile aynı düzende:
  http://localhost:4401   ÖNİZLEME — lisem.com.tr oynatıcısının taklidi (scripts/onizleme/)
  http://127.0.0.1:4400   OYUN SUNUCUSU — dosyaları üretim yollarıyla ve
                          sunucu-basliklari.json'daki başlıklarla (CSP sandbox dahil) sunar

Kullanım:  python tools/sunucu.py        (--ac: tarayıcıda Penguen Şef'i aç)
           --oyun-host oyun.localhost  (127.0.0.1 yerine; ikisi de önizlemeden ayrı köken)
           --sandbox-yok               (yalnızca otomatik test: CSP'den sandbox'ı çıkarır)
"""
import json
import sys
import threading
import webbrowser
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

KOK = Path(__file__).resolve().parent.parent
OYUN_PORT = 4400
ONIZLEME_PORT = 4401
OYUN_HOST = sys.argv[sys.argv.index("--oyun-host") + 1] if "--oyun-host" in sys.argv else "127.0.0.1"
OYUN_KOKENI = f"http://{OYUN_HOST}:{OYUN_PORT}"
ONIZLEME_KOKENI = f"http://localhost:{ONIZLEME_PORT}"

TURLER = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8",
    ".md": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
    ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
    ".m4a": "audio/mp4", ".wasm": "application/wasm",
}


def alt_klasorler(d):
    return sorted(p.name for p in d.iterdir() if p.is_dir() and not p.name.startswith(".")) if d.exists() else []


def yayin_klasorleri():
    """Sunucudaki yol öneki → depodaki klasör (scripts/ortak.mjs › yayinKlasorleri)."""
    cikti = []
    for tur in ("sdk", "marka"):
        for n in alt_klasorler(KOK / "paylasilan" / tur):
            cikti.append((f"/{tur}/{n}/", KOK / "paylasilan" / tur / n))
    for oyun in alt_klasorler(KOK / "oyunlar"):
        for s in alt_klasorler(KOK / "oyunlar" / oyun):
            if s != "kaynak":
                cikti.append((f"/{oyun}/{s}/", KOK / "oyunlar" / oyun / s))
    for s in alt_klasorler(KOK / "sablon"):
        cikti.append((f"/sablon/{s}/", KOK / "sablon" / s))
    return cikti


def basliklar():
    veri = json.loads((KOK / "sunucu-basliklari.json").read_text(encoding="utf-8"))
    b = {}
    for h in veri["basliklar"]:
        deger = h["value"]
        if h["key"].lower() == "content-security-policy":
            deger = deger.replace("frame-ancestors ", f"frame-ancestors {ONIZLEME_KOKENI} ", 1)
            if "--sandbox-yok" in sys.argv:
                deger = deger.replace("sandbox allow-scripts; ", "")
        b[h["key"]] = deger
    return b


def oyun_listesi():
    liste = []
    for oyun in alt_klasorler(KOK / "oyunlar"):
        try:
            bilgi = json.loads((KOK / "oyunlar" / oyun / "oyun.json").read_text(encoding="utf-8"))
        except Exception:
            bilgi = {}
        for s in alt_klasorler(KOK / "oyunlar" / oyun):
            if s == "kaynak":
                continue
            liste.append({
                "ad": oyun, "surum": s, "baslik": bilgi.get("baslik", oyun),
                "yon": "dikey" if bilgi.get("yon") == "dikey" else "yatay",
                "adres": f"{OYUN_KOKENI}/{oyun}/{s}/index.html",
            })
    liste.append({"ad": "sablon", "surum": "1", "baslik": "Şablon", "yon": "yatay",
                  "adres": f"{OYUN_KOKENI}/sablon/1/index.html"})
    return liste


class Isleyici(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def gonder(self, kod, govde, tur, ek=None):
        self.send_response(kod)
        self.send_header("Content-Type", tur)
        self.send_header("Cache-Control", "no-store")
        for k, v in (ek or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(govde)

    def dosya(self, yol, ek):
        if yol and yol.is_file():
            self.gonder(200, yol.read_bytes(), TURLER.get(yol.suffix.lower(), "application/octet-stream"), ek)
        else:
            self.gonder(404, "Bulunamadı".encode("utf-8"), "text/plain; charset=utf-8", ek)


class OyunIsleyici(Isleyici):
    def do_GET(self):
        yol = unquote(urlparse(self.path).path)
        ek = basliklar()
        if yol == "/":
            self.send_response(302)
            self.send_header("Location", f"{ONIZLEME_KOKENI}/")
            self.end_headers()
            return
        for on, klasor in yayin_klasorleri():
            if yol.startswith(on):
                geri = yol[len(on):]
                if geri == "" or geri.endswith("/"):
                    geri += "index.html"
                tam = (klasor / geri).resolve()
                if klasor.resolve() not in tam.parents:
                    break
                return self.dosya(tam, ek)
        self.dosya(None, ek)


class OnizlemeIsleyici(Isleyici):
    def do_GET(self):
        yol = urlparse(self.path).path
        csp = {"Content-Security-Policy": f"default-src 'self'; frame-src {OYUN_KOKENI}; img-src 'self' data:; frame-ancestors 'none'"}
        if yol == "/oyunlar.json":
            return self.gonder(200, json.dumps(oyun_listesi()).encode("utf-8"), TURLER[".json"])
        klasor = (KOK / "scripts" / "onizleme").resolve()
        tam = (klasor / ("index.html" if yol == "/" else yol.lstrip("/"))).resolve()
        if klasor not in tam.parents:
            return self.dosya(None, csp)
        self.dosya(tam, csp)


def baslat(port, isleyici, host):
    sunucu = ThreadingHTTPServer((host, port), isleyici)
    threading.Thread(target=sunucu.serve_forever, daemon=True).start()
    return sunucu


def main():
    # Windows konsolu (cp1254) bazı karakterleri yazamaz; çökmesin
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    baslat(OYUN_PORT, OyunIsleyici, "127.0.0.1")
    baslat(ONIZLEME_PORT, OnizlemeIsleyici, "localhost")
    print(f"* önizleme      {ONIZLEME_KOKENI}/")
    print(f"* oyun sunucusu {OYUN_KOKENI}/  (Lisem başlıklarıyla)", flush=True)
    print("Bu pencere açık kaldığı sürece çalışır. Kapatmak için Ctrl+C.")
    if "--ac" in sys.argv:
        webbrowser.open(f"{ONIZLEME_KOKENI}/#penguen-sef/1")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
