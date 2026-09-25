"""Shared helpers: locating tools, timecodes, small file utilities.

No third party packages anywhere in this skill — standard library only, so it runs on a
clean machine with nothing but python3, yt-dlp and ffmpeg installed.
"""
import json
import pathlib
import shutil
import subprocess
import sys

# Places tools commonly live when they were not installed system wide.
EXTRA_BINS = [
    pathlib.Path.home() / '.local/bin',
    pathlib.Path('/opt/homebrew/bin'),
    pathlib.Path('/usr/local/bin'),
]


def tool(name, required=True):
    """Find an executable on PATH, then in the usual out of the way install dirs."""
    found = shutil.which(name)
    if found:
        return found
    for d in EXTRA_BINS:
        p = d / name
        if p.exists():
            return str(p)
    if required:
        sys.exit(f'{name} not found. Install it and try again '
                 f'(brew install {name}, or pip install {name}).')
    return None


def run(cmd, **kw):
    """Run a command, raise with the real stderr if it fails."""
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f'{cmd[0]} failed:\n{r.stderr.strip()[:2000]}')
    return r.stdout


def tc(seconds, ms=False):
    """Seconds to H:MM:SS (or M:SS under an hour). ms=True adds milliseconds."""
    seconds = max(0.0, float(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if ms:
        base = f'{int(m):02d}:{s:06.3f}'
        return f'{int(h)}:{base}' if h else base
    base = f'{int(m):02d}:{int(s):02d}'
    return f'{int(h)}:{base}' if h else f'{int(m)}:{int(s):02d}'


def slug(text, limit=60):
    keep = [c.lower() if c.isalnum() else '-' for c in text]
    out = ''.join(keep)
    while '--' in out:
        out = out.replace('--', '-')
    return out.strip('-')[:limit] or 'video'


def read_json(path):
    return json.loads(pathlib.Path(path).read_text())


def write_json(path, data):
    pathlib.Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False))


def percentile(values, pct):
    """Plain percentile — no numpy in this skill."""
    if not values:
        return 0.0
    xs = sorted(values)
    k = (len(xs) - 1) * (pct / 100.0)
    lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
