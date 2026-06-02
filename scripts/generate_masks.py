#!/usr/bin/env python3
"""Generate baseline hit-zone masks from sprite frames, in the compact ".msk" format.

All visible pixels (alpha > threshold) get zone code 3 (leftLeg / GRAZE — the
auto-generated baseline). Transparent pixels get code 0 (none). Refine zones
(head=1 crit, torso=2 hit) afterwards in the sprite-masks editor.

Output is the binary ".msk" format the game loads at runtime
(see src/game/systems/maskBinary.ts):
    magic 'MSK1' | u16 width | u16 height | RLE runs of [u16 len][u8 code]

Assets live under public/assets/ (Vite serves public/ at the site root).

Usage:
  # Single character:
  python3 scripts/generate_masks.py public/assets/characters/plague-rat

  # All characters missing masks:
  python3 scripts/generate_masks.py --all

  # Specific alpha threshold (default 10):
  python3 scripts/generate_masks.py public/assets/characters/plague-rat --threshold 20
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

MAX_RUN = 0xFFFF

# Zone codes — keep in sync with src/game/systems/maskBinary.ts.
ZONE_NONE = 0
ZONE_GRAZE = 3


def encode_msk(codes: bytearray, width: int, height: int) -> bytes:
    out = bytearray(b"MSK1")
    out += width.to_bytes(2, "little")
    out += height.to_bytes(2, "little")
    n = width * height
    i = 0
    while i < n:
        code = codes[i]
        length = 1
        while i + length < n and codes[i + length] == code and length < MAX_RUN:
            length += 1
        out += length.to_bytes(2, "little")
        out.append(code)
        i += length
    return bytes(out)


def generate_mask(frame_path: Path, mask_path: Path, threshold: int) -> bool:
    img = Image.open(frame_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    codes = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] > threshold:
                codes[y * width + x] = ZONE_GRAZE
            else:
                codes[y * width + x] = ZONE_NONE

    mask_path.parent.mkdir(parents=True, exist_ok=True)
    with open(mask_path, "wb") as f:
        f.write(encode_msk(codes, width, height))
    return True


def process_character(char_dir: Path, threshold: int, force: bool) -> int:
    frames_dir = char_dir / "frames"
    masks_dir = char_dir / "masks"

    if not frames_dir.exists():
        print(f"  SKIP {char_dir.name}: no frames/ directory")
        return 0

    if masks_dir.exists() and any(masks_dir.glob("*.msk")) and not force:
        print(f"  SKIP {char_dir.name}: masks/ already has files (use --force to overwrite)")
        return 0

    frames = sorted(frames_dir.glob("*.png"))
    # Skip non-animation files like rotation.png
    frames = [f for f in frames if "_" in f.stem]

    count = 0
    for frame in frames:
        mask_path = masks_dir / f"{frame.stem}.msk"
        generate_mask(frame, mask_path, threshold)
        count += 1

    print(f"  {char_dir.name}: {count} masks generated")
    return count


def main():
    parser = argparse.ArgumentParser(description="Generate baseline .msk masks from sprite frames")
    parser.add_argument("path", nargs="?", help="Path to character directory")
    parser.add_argument("--all", action="store_true", help="Process all characters missing masks")
    parser.add_argument("--threshold", type=int, default=10, help="Alpha threshold (default: 10)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing masks")
    args = parser.parse_args()

    if not args.path and not args.all:
        parser.print_help()
        sys.exit(1)

    assets = Path(__file__).resolve().parent.parent / "public" / "assets"

    if args.all:
        total = 0
        for group in ("characters", "objects"):
            group_dir = assets / group
            if not group_dir.exists():
                continue
            for char_dir in sorted(group_dir.iterdir()):
                if not char_dir.is_dir():
                    continue
                total += process_character(char_dir, args.threshold, args.force)
        print(f"\nTotal: {total} masks")
    else:
        path = Path(args.path)
        if not path.is_absolute():
            path = Path.cwd() / path
        process_character(path, args.threshold, args.force)


if __name__ == "__main__":
    main()
