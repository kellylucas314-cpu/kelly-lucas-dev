# RTF — timestamp every word of a YouTube video, and find the moments worth a graphic

Point it at a YouTube URL. It gives you back a transcript where **every word is mapped to
the second it is spoken**, and a ranked list of the moments where putting something on
screen would actually help.

It also looks at the picture, so it can tell you where the speaker sits and which part of
the frame stays free the whole way through.

Everything lands in one self contained HTML file you can send to anyone.

## Install

Standard library Python only. Nothing to pip install.

    brew install yt-dlp ffmpeg     # macOS. Or: pip install yt-dlp

**As a Claude Code skill:** drop the `rtf` folder into `~/.claude/skills/`, then type
`/rtf` followed by a URL.

**As a plain script:** clone it anywhere and run it.

## Use

    python3 scripts/run.py "https://youtu.be/VIDEO_ID"

    python3 scripts/run.py "<url>" --out ~/Desktop/analysis --top 10
    python3 scripts/run.py "<url>" --no-video       # transcript only, faster

Roughly ten seconds for a ten minute video, most of which is the download.

## What you get

    report.html    the whole thing in one file — open it or email it
    rtf.json       every word with its timestamp, plus sentences
    words.tsv      seconds<TAB>word, one row per word
    moments.json   the ranked moments with scores and reasons
    picture.json   the speaker box, the clear zone, and motion twice a second

Example console output:

```
[1/5] fetching captions and a small copy of the video
[2/5] mapping every word to its timestamp
      1,495 words, 75 sentences
[3/5] reading the picture: where the speaker sits, when the screen is parked
      a camera inset bottom left, screen still 61% of the time
[4/5] scoring the moments
[5/5] writing the report

 #         in    len  why
 1  00:26.880  12.0s  states a figure, mentions a quantity
 2  01:26.400  14.4s  states a figure, places things in time
 3  03:07.320  12.4s  places things in time, mentions a quantity
 ...
```

There is a finished `example/report.html` in this folder if you want to see the output
before running anything.

## How moments are chosen

A window scores well when the words need a picture — a figure, a list, a comparison, a
mechanism, a definition, a point in time — **and** the screen is free at that moment.

It scores badly when the speaker is pointing at the screen. "As you can see here" and
"I'm going to click this" both mean the screen is already doing the explaining, and a
graphic there covers up the thing people came to watch.

Windows sit on sentence boundaries, run 6 to 20 seconds, and are spaced out across the
video so you do not get eight suggestions inside the first ninety seconds. Weak moments are
dropped rather than padded, so a thin video honestly returns fewer.

## How the picture read works

The video is shrunk to a 32x18 grid of cells and every cell is watched over time. A cell
showing a person changes a little in nearly every sample; a cell showing a parked slide
barely changes at all. The median change per cell separates the two without any threshold
to tune.

That gives two boxes: the region that never stops moving, and the largest rectangle that
stays still. The second one is where a graphic can live.

## Limits worth knowing

- It reads the transcript, not the screen. Look at the thumbnail on each moment before
  committing — if the screen already shows the thing, the moment is dead.
- Timings come from YouTube's caption track, so they follow the published cut.
- Some channels get captions with no punctuation. Sentences fall back to pauses.
- No captions means no analysis.
