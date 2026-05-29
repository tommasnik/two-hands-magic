#!/usr/bin/env python3
"""Generate green hit-zone masks from sprite frames.

All visible pixels (alpha > 0) become green (0, 220, 0, 255).
Transparent pixels stay transparent.

Usage:
  # Single character:
  python3 scripts/generate_masks.py src/assets/characters/plague-rat

  # All characters missing masks:
  python3 scripts/generate_masks.py --all

  # Specific alpha threshold (default 10):
  python3 scripts/generate_masks.py src/assets/characters/plague-rat --threshold 20
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

GREEN = (0, 220, 0, 255)
TRANSPARENT = (0, 0, 0, 0)


def generate_mask(frame_path: Path, mask_path: Path, threshold: int) -> bool:
    img = Image.open(frame_path).convert("RGBA")
    mask = Image.new("RGBA", img.size, TRANSPARENT)
    pixels = img.load()
    mask_pixels = mask.load()

    for y in range(img.height):
        for x in range(img.width):
            if pixels[x, y][3] > threshold:
                mask_pixels[x, y] = GREEN

    mask_path.parent.mkdir(parents=True, exist_ok=True)
    mask.save(mask_path)
    return True


def process_character(char_dir: Path, threshold: int, force: bool) -> int:
    frames_dir = char_dir / "frames"
    masks_dir = char_dir / "masks"

    if not frames_dir.exists():
        print(f"  SKIP {char_dir.name}: no frames/ directory")
        return 0

    if masks_dir.exists() and any(masks_dir.glob("*.png")) and not force:
        print(f"  SKIP {char_dir.name}: masks/ already has files (use --force to overwrite)")
        return 0

    frames = sorted(frames_dir.glob("*.png"))
    # Skip non-animation files like rotation.png
    frames = [f for f in frames if "_" in f.stem]

    count = 0
    for frame in frames:
        mask_path = masks_dir / frame.name
        generate_mask(frame, mask_path, threshold)
        count += 1

    print(f"  {char_dir.name}: {count} masks generated")
    return count


def main():
    parser = argparse.ArgumentParser(description="Generate green masks from sprite frames")
    parser.add_argument("path", nargs="?", help="Path to character directory")
    parser.add_argument("--all", action="store_true", help="Process all characters missing masks")
    parser.add_argument("--threshold", type=int, default=10, help="Alpha threshold (default: 10)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing masks")
    args = parser.parse_args()

    if not args.path and not args.all:
        parser.print_help()
        sys.exit(1)

    assets = Path(__file__).resolve().parent.parent / "src" / "assets"

    if args.all:
        total = 0
        for char_dir in sorted((assets / "characters").iterdir()):
            if not char_dir.is_dir():
                continue
            total += process_character(char_dir, args.threshold, args.force)
        for obj_dir in sorted((assets / "objects").iterdir()):
            if not obj_dir.is_dir():
                continue
            total += process_character(obj_dir, args.threshold, args.force)
        print(f"\nTotal: {total} masks")
    else:
        path = Path(args.path)
        if not path.is_absolute():
            path = Path.cwd() / path
        process_character(path, args.threshold, args.force)


if __name__ == "__main__":
    main()
