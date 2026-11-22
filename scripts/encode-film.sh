#!/bin/sh
# Makes the homepage copies of the Lakeside Grand Prix film from the master MP4.
#   sh scripts/encode-film.sh /path/to/lakeside-grand-prix.mp4
# Writes three derived files into assets/art/film/: a 1280px MP4, a 720px MP4
# for phones, and the still shown before the film plays. Needs ffmpeg.
set -e
SRC="$1"
[ -f "$SRC" ] || { echo "usage: sh scripts/encode-film.sh <master.mp4>" >&2; exit 1; }
OUT="$(dirname "$0")/../assets/art/film"
mkdir -p "$OUT"
ffmpeg -y -loglevel error -i "$SRC" -vf "scale=1280:-2,fps=30" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart \
  -c:a aac -b:a 96k -ac 2 "$OUT/lakeside-grand-prix.mp4"
ffmpeg -y -loglevel error -i "$SRC" -vf "scale=720:-2,fps=30" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart \
  -c:a aac -b:a 80k -ac 2 "$OUT/lakeside-grand-prix-sm.mp4"
# the still: five red lights, three cars on the grid
ffmpeg -y -loglevel error -ss 3.8 -i "$SRC" -frames:v 1 -vf "scale=1280:-2" \
  -c:v libwebp -quality 80 "$OUT/lakeside-grand-prix.webp"
ls -la "$OUT"
