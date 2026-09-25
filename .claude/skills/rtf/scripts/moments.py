"""Find the moments in the video where a graphic would actually earn its place.

    python3 moments.py work/<id> [--top 8]

Two questions decide it.

  Is he saying something a picture explains better than words?  A number, a list, a
  comparison, a mechanism, a definition. Those are the things an audience cannot hold in
  their head from audio alone.

  Is the screen free?  A graphic dropped over a moment that already shows the thing is
  wasted, and a graphic dropped over a busy demo fights it. The picture pass measured how
  still each second is, so stillness is scored, not guessed.

There is also a negative signal, and it matters as much as the positive ones: when someone
says "as you can see here" or "look at this", the screen is already doing the job. Those
windows lose points however good the sentence sounds.
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import picture as pic  # noqa: E402
from common import read_json, tc, write_json  # noqa: E402

MIN_DUR, MAX_DUR = 6.0, 20.0
MIN_SCORE = 2.5   # below this it is padding, so fewer moments come back rather than weak ones

SIGNALS = [
    {'key': 'stat', 'weight': 3.0,
     'label': 'states a figure',
     'visual': 'One number, held. The figure large, its unit next to it, and one line saying '
               'what it counts.',
     'patterns': [r'\d+(?:\.\d+)?\s?(?:%|percent)', r'[$£€]\s?\d',
                  r'\b\d+(?:\.\d+)?\s?(?:x|times)\b',
                  r'\b\d[\d,.]*\s?(?:k|m|bn|billion|million|thousand|trillion)\b']},
    {'key': 'list', 'weight': 3.0,
     'label': 'runs through a list',
     'visual': 'A list that builds one line at a time, in step with the words.',
     # Bare ordinals are not enough. "First" opens plenty of sentences that are not lists,
     # and "second" is usually a unit of time. Only count an ordinal when it is a discourse
     # marker or is attached to a countable noun.
     'patterns': [r'\b(?:firstly|secondly|thirdly|lastly)\b',
                  r'\b(?:the|my|our)\s+(?:first|second|third|fourth|next|last)\s+'
                  r'(?:thing|one|reason|point|step|way|option|part|rule|level)\b',
                  r'\b(?:step|number|point|reason|level)\s+(?:one|two|three|four|\d)\b',
                  r'\b(?:two|three|four|five|six|\d+)\s+(?:things|reasons|ways|steps|parts|'
                  r'options|types|kinds|rules|levels|stages)\b',
                  r'\bthere are\s+(?:two|three|four|five|\d+)\b']},
    {'key': 'comparison', 'weight': 3.0,
     'label': 'compares two things',
     'visual': 'Two panels side by side, the second landing when he names it.',
     'patterns': [r'\b(?:versus|vs\.?)\b', r'\bcompared (?:to|with)\b',
                  r'\b(?:better|worse|faster|slower|cheaper|bigger|smaller) than\b',
                  r'\b(?:instead of|rather than|whereas|on the other hand)\b',
                  r'\bthe difference between\b', r'\bused to\b.{0,40}\bnow\b']},
    {'key': 'process', 'weight': 2.5,
     'label': 'explains how something works',
     'visual': 'A flow of stages, each one arriving as he reaches it.',
     'patterns': [r'\b(?:how (?:it|this|that) works|the way (?:it|this) works)\b',
                  r'\bwhat (?:happens|it does) is\b', r'\bunder the hood\b',
                  r'\bbehind the scenes\b', r'\b(?:pipeline|workflow|process)\b',
                  r'\bstep by step\b', r'\bgoes (?:through|into)\b',
                  r'\b(?:and )?then it\b']},
    {'key': 'definition', 'weight': 2.5,
     'label': 'defines a term',
     'visual': 'The term on screen with its plain meaning under it, or a labelled diagram.',
     'patterns': [r'\b(?:basically|essentially|literally) means\b', r'\bwhich means\b',
                  r'\bin other words\b', r'\bthink of it (?:as|like)\b',
                  r'\bwhat (?:this|that) means is\b', r'\bis (?:basically|essentially)\b',
                  r'\brefers to\b', r'\bstands for\b']},
    {'key': 'structure', 'weight': 2.0,
     'label': 'describes how parts fit together',
     'visual': 'A stacked or exploded diagram, parts labelled as he names them.',
     'patterns': [r'\b(?:made up of|consists of|is built on)\b', r'\bon top of\b',
                  r'\b(?:connects|feeds|plugs) (?:to|into)\b', r'\bsits (?:on|between|above)\b',
                  r'\b(?:layer|layers|architecture|structure|foundation)\b']},
    {'key': 'claim', 'weight': 1.5,
     'label': 'makes the point of the section',
     'visual': 'One line of text, held long enough to read twice.',
     'patterns': [r'\bthe (?:reason|key|point|problem|truth|trick|secret)\b',
                  r'\bmost (?:people|of us)\b', r'\bmost important\b',
                  r"\b(?:here'?s|this is) the thing\b", r'\bwhat (?:nobody|no one) tells you\b']},
    {'key': 'timeline', 'weight': 1.5,
     'label': 'places things in time',
     'visual': 'A timeline, marks landing in the order he says them.',
     'patterns': [r'\bin (?:19|20)\d\d\b', r'\b\d+ (?:years|months|weeks) ago\b',
                  r'\b(?:back (?:then|in)|these days|nowadays)\b',
                  r'\bused to be\b']},
    {'key': 'number', 'weight': 0.75,
     'label': 'mentions a quantity',
     'visual': 'Show the quantity rather than saying it.',
     'patterns': [r'\b\d{2,}\b']},
]

# The screen is already doing the explaining, so a graphic here would cover up the thing
# the viewer came to see. Two flavours: pointing at the screen, and narrating an action
# while performing it. The second one is the sneaky one — it reads as a perfectly good
# sentence in a transcript, and on screen it is someone typing into a box.
SCREEN_BUSY = [r'\bas you can see\b', r'\b(?:look|have a look) at (?:this|that|it|here)\b',
               r'\b(?:here|there) you (?:can )?(?:see|go)\b', r"\b(?:i'?ll|let me) show you\b",
               r'\bon (?:the|my) screen\b', r'\bwatch (?:this|what happens)\b',
               r'\bright (?:here|there)\b', r'\bthis (?:page|file|window|tab)\b',
               r"\b(?:i'?m|we'?re) (?:going to|gonna|just) (?:do|put|click|type|open|come|go|"
               r"head|drop|paste|hit|select|add)\b",
               r"\b(?:let'?s|let me) (?:just )?(?:do|put|click|type|open|go|say|try|run|head|"
               r"jump|come)\b",
               r"\b(?:i'?ll|we'?ll) (?:just )?(?:put|do|click|type|open|say|run|drop|paste)\b",
               r'\b(?:come|head|jump|go) (?:over|back|down|up) (?:to|here|there)\b',
               r'\b(?:if|when) (?:you|we|i) (?:click|scroll|open|press|hit|type)\b']

COMPILED = [(s, [re.compile(p, re.I) for p in s['patterns']]) for s in SIGNALS]
COMPILED_NEG = [re.compile(p, re.I) for p in SCREEN_BUSY]


def score_text(text):
    hits, total = [], 0.0
    for sig, pats in COMPILED:
        n = sum(len(p.findall(text)) for p in pats)
        if n:
            # First hit is worth full weight, extras taper — a sentence with six numbers
            # is not six times better than one with two.
            gain = sig['weight'] * (1 + min(n - 1, 3) * 0.25)
            total += gain
            hits.append({'key': sig['key'], 'label': sig['label'],
                         'visual': sig['visual'], 'hits': n, 'gain': round(gain, 2)})
    on_screen = sum(len(p.findall(text)) for p in COMPILED_NEG)
    penalty = min(on_screen, 3) * 3.0
    hits.sort(key=lambda h: -h['gain'])
    return total, penalty, on_screen, hits


def stillness(motion, threshold, start, end):
    """Share of the window where the screen is holding still."""
    inside = [m[1] for m in motion if start <= m[0] <= end]
    if not inside:
        return None
    return round(sum(1 for v in inside if v <= threshold) / len(inside), 3)


def windows(sentences):
    """Candidate spans, aligned to sentence boundaries so no clip cuts a word in half."""
    out = []
    for i in range(len(sentences)):
        for j in range(i, len(sentences)):
            start, end = sentences[i]['start'], sentences[j]['end']
            dur = end - start
            if dur < MIN_DUR:
                continue
            if dur > MAX_DUR:
                break
            out.append((i, j, start, end))
    return out


def find(workdir, top=8, thumbs=True, min_gap=None):
    workdir = pathlib.Path(workdir)
    meta = read_json(workdir / 'meta.json')
    rtf = read_json(workdir / 'rtf.json')
    picture_path = workdir / 'picture.json'
    picture = read_json(picture_path) if picture_path.exists() else None
    motion = picture['motion'] if picture else []
    threshold = picture['quiet_threshold'] if picture else 0

    sents = rtf['sentences']
    scored = []
    for i, j, start, end in windows(sents):
        text = ' '.join(s['text'] for s in sents[i:j + 1])
        words = sum(s['words'] for s in sents[i:j + 1])
        if words < 12:
            continue
        base, penalty, on_screen, hits = score_text(text)
        if base <= 0:
            continue
        still = stillness(motion, threshold, start, end) if motion else None
        # A free screen is worth as much as a strong sentence; a busy one cancels it out.
        screen_points = 0.0 if still is None else (still * 5.0 - 1.5)
        total = base - penalty + screen_points
        scored.append({'start': round(start, 2), 'end': round(end, 2),
                       'dur': round(end - start, 2), 'text': text, 'words': words,
                       'signal_score': round(base, 2), 'on_screen_penalty': round(penalty, 2),
                       'on_screen_hits': on_screen, 'stillness': still,
                       'score': round(total, 2), 'signals': hits})

    scored.sort(key=lambda m: -m['score'])

    # Keep the best, then refuse anything that lands on or near one already kept. The gap
    # matters as much as the overlap: eight graphics inside the first ninety seconds is a
    # worse answer than eight spread across the video, even when the scores say otherwise.
    if min_gap is None:
        duration = meta.get('duration') or (sents[-1]['end'] if sents else 0)
        min_gap = max(15.0, duration / (top * 2.5)) if duration else 15.0
    kept = []
    for m in scored:
        if m['score'] < MIN_SCORE:
            break
        clash = any(m['start'] - k['end'] < min_gap and k['start'] - m['end'] < min_gap
                    for k in kept)
        if not clash:
            kept.append(m)
        if len(kept) >= top:
            break

    kept.sort(key=lambda m: m['start'])
    thumbdir = workdir / 'thumbs'
    for n, m in enumerate(kept, 1):
        m['rank'] = n
        m['tc_in'] = tc(m['start'], ms=True)
        m['tc_out'] = tc(m['end'], ms=True)
        m['link'] = f"{meta['url']}&t={int(m['start'])}s" if 'watch?v=' in meta['url'] \
            else f"{meta['url']}?t={int(m['start'])}"
        m['suggestion'] = m['signals'][0]['visual'] if m['signals'] else ''
        m['thumb'] = ''
        if thumbs and meta.get('video'):
            thumbdir.mkdir(exist_ok=True)
            dest = thumbdir / f'moment-{n:02d}.jpg'
            if pic.grab(workdir / meta['video'], m['start'] + m['dur'] / 2, dest):
                m['thumb'] = str(dest.relative_to(workdir))

    write_json(workdir / 'moments.json',
               {'count': len(kept), 'min_gap': round(min_gap, 1), 'moments': kept})
    return kept


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('workdir')
    ap.add_argument('--top', type=int, default=8)
    ap.add_argument('--min-gap', type=float, default=None,
                    help='seconds to leave between moments (default: scaled to the video)')
    a = ap.parse_args()
    for m in find(a.workdir, a.top, min_gap=a.min_gap):
        print(f"{m['tc_in']}  {m['dur']:5.1f}s  score {m['score']:5.1f}  "
              f"{', '.join(s['key'] for s in m['signals'][:3])}")
