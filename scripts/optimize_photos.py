"""
Shrink oversized survey photos so the whole site fits GitHub Pages (1 GB limit).

Only photos larger than MAX_BYTES are touched. Each one is first copied to
BACKUP_DIR (git-ignored), then resized in place to at most MAX_SIDE pixels on its
long side. File names stay the same, so data/*.js links keep working.

Run:  python scripts/optimize_photos.py
"""
import os
import shutil
import sys

from PIL import Image, ImageOps

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PHOTOS_DIR = os.path.join(BASE_DIR, "Shahapur photos", "Shahapur photos")
BACKUP_DIR = os.path.join(BASE_DIR, "Shahapur photos originals")
MAX_BYTES = 500 * 1024   # photos above this are resized
MAX_SIDE = 1600          # px, long side
QUALITY = 82             # JPEG quality

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    before = after = count = 0
    for name in sorted(os.listdir(PHOTOS_DIR)):
        path = os.path.join(PHOTOS_DIR, name)
        size = os.path.getsize(path)
        if not name.lower().endswith(".jpg") or size <= MAX_BYTES:
            continue
        backup = os.path.join(BACKUP_DIR, name)
        if not os.path.exists(backup):
            shutil.copy2(path, backup)  # keep the untouched original
        with Image.open(backup) as img:
            img = ImageOps.exif_transpose(img)  # keep phone orientation after dropping EXIF
            img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            img.convert("RGB").save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        before += size
        after += os.path.getsize(path)
        count += 1
    print(f"Resized {count} photos: {before / 1048576:.1f} MB -> {after / 1048576:.1f} MB "
          f"(originals in '{os.path.relpath(BACKUP_DIR, BASE_DIR)}')")


if __name__ == "__main__":
    main()
