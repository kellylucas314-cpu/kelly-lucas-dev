"""What the picture is doing: where the speaker sits, and when the screen is parked.

    python3 picture.py work/<id>

The transcript says what is being said. It never says what is already on screen, and a
graphic dropped over a moment that is already showing the thing is wasted. So the video is
sampled twice a second, shrunk to a 32x18 grid of cells (each cell is a 60x60 block of a
1080p frame), and every cell is watched over time.

A cell showing a person moves a little almost every single sample, so its typical frame to
frame change is high. A cell showing a parked slide or a still editor barely changes at
all, with occasional spikes when something is clicked. Taking the median change per cell
separates the two cleanly without needing any fixed brightness threshold.

Writes picture.json:
    speaker      the persistent moving region, in percentages and in 1080p pixels
    clear_zone   the largest rectangle that stays still — where a graphic can live
    motion       [time, score] twice a second, with the speaker region excluded
"""
import argparse
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import percentile, read_json, tool, write_json  # noqa: E402

COLS, ROWS = 32, 18
SAMPLE_FPS = 2


def sample(video):
    """Return a list of frames, each a bytes object of COLS*ROWS grey values."""
    cmd = [tool('ffmpeg'), '-v', 'error', '-i', str(video), '-an',
           '-vf', f'fps={SAMPLE_FPS},scale={COLS}:{ROWS}:flags=area,format=gray',
           '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    proc = subprocess.run(cmd, capture_output=True)
    raw, size = proc.stdout, COLS * ROWS
    if len(raw) < size * 2:
        raise RuntimeError('could not sample the video: ' + proc.stderr.decode()[:400])
    return [raw[i:i + size] for i in range(0, len(raw) - size + 1, size)]


def cell_series(frames):
    """Per cell, the absolute change between each pair of samples."""
    n = COLS * ROWS
    series = [[] for _ in range(n)]
    for a, b in zip(frames, frames[1:]):
        for c in range(n):
            series[c].append(abs(a[c] - b[c]))
    return series


def largest_cluster(hot, seeds=None):
    """Biggest 4-connected group of hot cells, as a set of indices.

    With seeds, only groups containing a seed count. That is how the speaker is found: the
    seeds are the few cells that move hardest (a face), and the group grows out from there
    across every neighbouring cell that still moves at all, which picks up shoulders, hair
    and the quieter edges of a camera inset without leaking into the parked screen next to it.
    """
    seen, best = set(), set()
    for start in hot:
        if start in seen:
            continue
        stack, group = [start], set()
        while stack:
            i = stack.pop()
            if i in seen or i not in hot:
                continue
            seen.add(i)
            group.add(i)
            r, c = divmod(i, COLS)
            for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= rr < ROWS and 0 <= cc < COLS:
                    stack.append(rr * COLS + cc)
        if seeds is not None and not (group & seeds):
            continue
        if len(group) > len(best):
            best = group
    return best


def bbox(cells):
    rs = [i // COLS for i in cells]
    cs = [i % COLS for i in cells]
    return min(cs), min(rs), max(cs) - min(cs) + 1, max(rs) - min(rs) + 1


def largest_quiet_rect(quiet):
    """Classic maximal rectangle over the binary grid of still cells."""
    heights = [0] * COLS
    best = (0, 0, 0, 0, 0)  # area, x, y, w, h
    for r in range(ROWS):
        for c in range(COLS):
            heights[c] = heights[c] + 1 if (r * COLS + c) in quiet else 0
        stack = []
        for c in range(COLS + 1):
            h = heights[c] if c < COLS else 0
            start = c
            while stack and stack[-1][1] >= h:
                sc, sh = stack.pop()
                area = sh * (c - sc)
                if area > best[0]:
                    best = (area, sc, r - sh + 1, c - sc, sh)
                start = sc
            stack.append((start, h))
    _, x, y, w, h = best
    return x, y, w, h


def to_boxes(x, y, w, h):
    """Grid cells to percentages and to 1920x1080 pixels."""
    pct = {'x': round(x / COLS * 100), 'y': round(y / ROWS * 100),
           'w': round(w / COLS * 100), 'h': round(h / ROWS * 100)}
    px = {'x': round(x / COLS * 1920), 'y': round(y / ROWS * 1080),
          'w': round(w / COLS * 1920), 'h': round(h / ROWS * 1080)}
    return pct, px


def corner_name(x, y, w, h):
    cx, cy = x + w / 2, y + h / 2
    vert = 'top' if cy < ROWS * 0.4 else 'bottom' if cy > ROWS * 0.6 else 'middle'
    horiz = 'left' if cx < COLS * 0.4 else 'right' if cx > COLS * 0.6 else 'centre'
    return f'{vert} {horiz}'.replace('middle centre', 'centre')


def analyse(workdir):
    workdir = pathlib.Path(workdir)
    meta = read_json(workdir / 'meta.json')
    if not meta.get('video'):
        return None

    frames = sample(workdir / meta['video'])
    series = cell_series(frames)
    medians = [percentile(s, 50) for s in series]
    peak = max(medians) if medians else 0.0

    # Cells that move nearly all the time are a person, not a slide. Seed on the hardest
    # moving cells, then grow outward over anything that still moves, so the whole inset is
    # captured rather than just the face in the middle of it.
    seeds = {i for i, m in enumerate(medians) if m >= max(1.0, peak * 0.40)}
    grow = {i for i, m in enumerate(medians) if m >= max(0.5, peak * 0.06)}
    cluster = largest_cluster(grow, seeds) if seeds else set()

    hotspot = {'found': False, 'looks_like': 'nothing',
               'note': 'Nothing on screen moves often enough to be a person, so this is '
                       'probably a still or slide based video'}
    if cluster:
        x, y, w, h = bbox(cluster)
        coverage = round(len(cluster) / (COLS * ROWS) * 100)
        pct, px = to_boxes(x, y, w, h)
        # A small always moving box pinned to an edge is a camera. The same box floating in
        # the middle of the frame is far more likely to be whatever the video is animating,
        # so it gets named honestly rather than called a person.
        on_edge = x == 0 or y == 0 or x + w >= COLS or y + h >= ROWS
        if coverage > 60:
            kind = 'most of the frame'
            note = ('The whole frame is live. Most likely a full frame talking head, so there '
                    'is no dedicated safe corner')
        elif coverage > 30:
            kind = 'a large live area'
            note = ('A large region moves constantly. It may be the speaker or it may be the '
                    'demo, so look at a frame before trusting it')
        elif on_edge:
            kind = 'a camera inset'
            note = ('A small region against the edge of the frame moves in almost every '
                    'sample, which is what a webcam inset looks like')
        else:
            kind = 'the focus of the picture'
            note = ('A small region in the middle of the frame carries most of the motion. '
                    'That is usually the subject of the video rather than a person')
        hotspot = {'found': True, 'looks_like': kind, 'note': note,
                   'position': corner_name(x, y, w, h), 'coverage_pct': coverage,
                   'box_pct': pct, 'box_1080': px}

    # Everything outside the hotspot drives the stillness read.
    outside = [i for i in range(COLS * ROWS) if i not in cluster] or list(range(COLS * ROWS))
    motion = []
    for k in range(len(frames) - 1):
        score = sum(series[i][k] for i in outside) / len(outside)
        motion.append([round((k + 0.5) / SAMPLE_FPS, 2), round(score, 3)])

    # A parked screen scores near zero at this block size, so the floor is absolute and only
    # rises for a grainy source. Judging stillness purely against the video's own median
    # would call every video still 50% of the time, which says nothing.
    scores = [m[1] for m in motion]
    quiet_threshold = round(max(0.6, percentile(scores, 50) * 1.2), 3)

    quiet_cells = {i for i in outside if medians[i] <= max(0.5, peak * 0.12)}
    qx, qy, qw, qh = largest_quiet_rect(quiet_cells) if quiet_cells else (0, 0, 0, 0)
    qpct, qpx = to_boxes(qx, qy, qw, qh)

    out = {
        'grid': {'cols': COLS, 'rows': ROWS, 'sample_fps': SAMPLE_FPS},
        'samples': len(frames),
        'hotspot': hotspot,
        'clear_zone': {'position': corner_name(qx, qy, qw, qh) if qw else 'none',
                       'box_pct': qpct, 'box_1080': qpx,
                       'note': 'largest rectangle of the frame that stays still for most of '
                               'the video — the safest place to put a graphic'},
        'quiet_threshold': quiet_threshold,
        'still_share': round(sum(1 for s in scores if s <= quiet_threshold) / len(scores), 3),
        'motion': motion,
    }
    write_json(workdir / 'picture.json', out)
    return out


def grab(video, t, dest, width=480):
    """One JPEG at time t, for looking at what is already on screen."""
    subprocess.run([tool('ffmpeg'), '-v', 'error', '-y', '-ss', str(t), '-i', str(video),
                    '-frames:v', '1', '-vf', f'scale={width}:-2', '-q:v', '6', str(dest)],
                   capture_output=True)
    return pathlib.Path(dest).exists()


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('workdir')
    a = ap.parse_args()
    res = analyse(a.workdir)
    if not res:
        print('no picture downloaded — skipped')
    else:
        s = res['hotspot']
        print(f"{s['looks_like']}: {s.get('position', 'not found')} "
              f"({s.get('coverage_pct', 0)}% of frame)")
        print(f"clear zone: {res['clear_zone']['position']} {res['clear_zone']['box_1080']}")
        print(f"still {int(res['still_share'] * 100)}% of the time")
