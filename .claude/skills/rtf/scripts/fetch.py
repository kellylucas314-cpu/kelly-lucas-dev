"""Pull what the analysis needs from a YouTube URL: captions, metadata, and a small
copy of the picture.

    python3 fetch.py <url> --out work/<id> [--no-video]

The picture is downloaded at the worst available quality on purpose. Nothing here needs
detail, only where and when things move, and a 360p copy of a twenty minute video is a
few tens of megabytes instead of a gigabyte.
"""
import argparse
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import tool, run  # noqa: E402


def video_id(url):
    out = run([tool('yt-dlp'), '--skip-download', '--print', '%(id)s', '--no-warnings', url])
    return out.strip().splitlines()[-1]


def fetch(url, outdir, want_video=True):
    outdir = pathlib.Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    ytdlp = tool('yt-dlp')

    # Captions, in two separate passes so the two kinds never overwrite each other.
    # Automatic captions are the ones that carry per word offsets, so they are tried first;
    # uploaded subtitles usually only time a whole line and are the fallback.
    #
    # The language list is spelled out rather than given as en.* on purpose. That pattern
    # also matches YouTube's machine translations (en-sq, en-fr and forty more), and asking
    # for all of them in one go earns an HTTP 429.
    common = [ytdlp, '--skip-download', '--sub-format', 'json3', '--no-warnings',
              '--retries', '5', '--sleep-requests', '0.5',
              '--sub-langs', 'en-orig,en,en-US,en-GB']

    try:
        run(common + ['--write-auto-sub', '--write-info-json',
                      '-o', str(outdir / 'auto.%(ext)s'), url])
    except RuntimeError as err:
        print(f'  automatic captions unavailable: {err}', file=sys.stderr)
    captions = next(iter(sorted(outdir.glob('auto*.json3'))), None)

    if captions is None:
        try:
            run(common + ['--write-sub', '--write-info-json',
                          '-o', str(outdir / 'manual.%(ext)s'), url])
        except RuntimeError as err:
            print(f'  uploaded subtitles unavailable: {err}', file=sys.stderr)
        captions = next(iter(sorted(outdir.glob('manual*.json3'))), None)

    if captions is None:
        sys.exit('No English captions available for this video. The transcript is the whole '
                 'basis of this analysis, so there is nothing to work from.\n'
                 'If you own the video, turn automatic captions on and try again.')

    info_path = next(iter(sorted(outdir.glob('*.info.json'))), None)
    info = json.loads(info_path.read_text()) if info_path else {}
    meta = {
        'id': info.get('id', ''),
        'url': info.get('webpage_url', url),
        'title': info.get('title', ''),
        'channel': info.get('channel') or info.get('uploader', ''),
        'duration': info.get('duration', 0),
        'fps': round(info.get('fps') or 30),
        'width': info.get('width', 0),
        'height': info.get('height', 0),
        'captions': captions.name,
        'video': '',
    }

    if want_video:
        target = outdir / 'picture.mp4'
        if not target.exists():
            try:
                run([ytdlp, '-f', 'worst[height>=240]/worst', '--no-warnings',
                     '-o', str(target), url])
            except RuntimeError as e:
                print(f'  picture download failed, continuing on the transcript alone\n  {e}',
                      file=sys.stderr)
        if target.exists():
            meta['video'] = target.name

    (outdir / 'meta.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return meta


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('url')
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-video', action='store_true')
    a = ap.parse_args()
    m = fetch(a.url, a.out, want_video=not a.no_video)
    print(json.dumps(m, indent=2, ensure_ascii=False))
