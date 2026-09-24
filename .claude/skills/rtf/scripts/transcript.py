"""The RTF itself: every word mapped to the second it is spoken.

    python3 transcript.py work/<id>

Reads the json3 caption file and writes:
    words.tsv    one row per word — seconds<TAB>word
    rtf.json     the same words, plus sentences with a start and an end

json3 auto captions carry a per word tOffsetMs inside each event, which is the only place
YouTube exposes word level timing. Rolling caption repeats arrive as events whose only
segment is a newline, so they drop out naturally.
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import percentile, read_json, write_json  # noqa: E402

# A sentence ends on punctuation, or on a long enough pause that it may as well have.
# Plenty of channels get auto captions with no punctuation at all, so the pause is what
# actually does the work, and it adapts to how fast the speaker talks.
END_PUNCT = ('.', '?', '!')
MAX_SENTENCE = 26     # words, so a run on sentence still gets cut somewhere sensible
NON_SPEECH = re.compile(r'^\[.*\]$')   # [Music], [Applause], [Laughter]


def parse(captions_path):
    """json3 -> [(seconds, word)], in order, de-duplicated."""
    data = read_json(captions_path)
    words, seen = [], set()
    for ev in data.get('events', []):
        segs = ev.get('segs')
        if not segs:
            continue
        base = ev.get('tStartMs', 0)
        for seg in segs:
            text = seg.get('utf8', '')
            if not text.strip() or NON_SPEECH.match(text.strip()):
                continue
            t = round((base + seg.get('tOffsetMs', 0)) / 1000.0, 2)
            key = (t, text.strip())
            if key in seen:
                continue
            seen.add(key)
            words.append((t, text.strip()))
    words.sort(key=lambda w: w[0])
    return words


def pause_threshold(words):
    """How long a gap has to be, for this speaker, to count as the end of a thought."""
    gaps = sorted(b[0] - a[0] for a, b in zip(words, words[1:]))
    if not gaps:
        return 0.75
    return min(0.9, max(0.45, percentile(gaps, 92)))


def sentences(words):
    """Group words into sentences, keeping the real start and end of each."""
    pause = pause_threshold(words)
    out, cur = [], []
    for i, (t, w) in enumerate(words):
        cur.append((t, w))
        nxt = words[i + 1][0] if i + 1 < len(words) else None
        gap = (nxt - t) if nxt is not None else 99
        done = ((w.endswith(END_PUNCT) and len(cur) >= 3)
                or gap >= pause or len(cur) >= MAX_SENTENCE)
        if done and cur:
            out.append({
                'start': cur[0][0],
                'end': round(cur[-1][0] + 0.4, 2),
                'text': ' '.join(x[1] for x in cur),
                'words': len(cur),
            })
            cur = []
    if cur:
        out.append({'start': cur[0][0], 'end': round(cur[-1][0] + 0.4, 2),
                    'text': ' '.join(x[1] for x in cur), 'words': len(cur)})
    # Stitch fragments that a mid sentence pause split apart.
    merged = []
    for s in out:
        if (merged and not re.search(r'[.?!]$', merged[-1]['text'])
                and merged[-1]['words'] + s['words'] <= MAX_SENTENCE
                and s['start'] - merged[-1]['end'] < 1.2):
            merged[-1]['text'] += ' ' + s['text']
            merged[-1]['end'] = s['end']
            merged[-1]['words'] += s['words']
        else:
            merged.append(dict(s))
    return merged


def build(workdir):
    workdir = pathlib.Path(workdir)
    meta = read_json(workdir / 'meta.json')
    words = parse(workdir / meta['captions'])
    if not words:
        sys.exit('The caption file parsed to zero words — nothing to analyse.')

    sents = sentences(words)
    (workdir / 'words.tsv').write_text(
        ''.join(f'{t}\t{w}\n' for t, w in words))
    rtf = {
        'source': {k: meta.get(k) for k in ('id', 'url', 'title', 'channel', 'duration')},
        'word_level': any(w[0] % 1 for w in words[:200]),
        'word_count': len(words),
        'words': [{'t': t, 'w': w} for t, w in words],
        'sentences': sents,
    }
    write_json(workdir / 'rtf.json', rtf)
    return rtf


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('workdir')
    a = ap.parse_args()
    r = build(a.workdir)
    print(f"{r['word_count']} words, {len(r['sentences'])} sentences")
