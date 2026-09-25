"""Write the whole analysis into one HTML file you can send to anyone.

    python3 report.py work/<id> [--out report.html]

Self contained on purpose: thumbnails are inlined, there is no stylesheet to fetch and no
script to load from anywhere. Open it, or email it, and it works.
"""
import argparse
import base64
import html
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import read_json, tc  # noqa: E402

CSS = """
:root { color-scheme: light dark;
  --bg:#ffffff; --panel:#f6f7f9; --line:#e2e5ea; --ink:#16181d; --dim:#5f6672;
  --accent:#1f6feb; --warn:#b45309; }
@media (prefers-color-scheme: dark) { :root {
  --bg:#12141a; --panel:#1a1d25; --line:#2a2f3a; --ink:#e8eaee; --dim:#9aa2b1;
  --accent:#6ea8fe; --warn:#e0a458; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); line-height:1.55;
  font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.wrap { max-width: 940px; margin: 0 auto; padding: 48px 24px 96px; }
h1 { font-size: 30px; line-height:1.2; margin:0 0 6px; letter-spacing:-.01em; }
h2 { font-size: 20px; margin: 56px 0 14px; letter-spacing:-.01em; }
h3 { font-size: 16px; margin: 0 0 6px; }
a { color: var(--accent); }
.sub { color: var(--dim); margin: 0 0 4px; }
.meta { color: var(--dim); font-size: 14px; }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px 20px; }
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
@media (max-width:720px){ .grid2 { grid-template-columns:1fr; } }
.frame { position:relative; width:100%; aspect-ratio:16/9; background:var(--bg);
  border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.frame span { position:absolute; font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;
  padding:4px 6px; border-radius:4px; }
.speaker { background:rgba(180,83,9,.16); border:1px solid var(--warn); color:var(--warn); }
.clear { background:rgba(31,111,235,.12); border:1px dashed var(--accent); color:var(--accent); }
.moment { border:1px solid var(--line); border-radius:12px; padding:0; margin:0 0 18px;
  overflow:hidden; background:var(--panel); }
.moment .head { display:flex; gap:14px; align-items:baseline; flex-wrap:wrap;
  padding:16px 20px 0; }
.rank { font:600 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--dim);
  border:1px solid var(--line); border-radius:5px; padding:5px 7px; background:var(--bg); }
.time { font:600 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
.body { display:grid; grid-template-columns: 300px 1fr; gap:20px; padding:14px 20px 20px; }
@media (max-width:720px){ .body { grid-template-columns:1fr; } }
.body img { width:100%; border-radius:8px; border:1px solid var(--line); display:block; }
.shot { color:var(--dim); font-size:12px; margin:6px 0 0; }
blockquote { margin:0 0 12px; padding:0 0 0 14px; border-left:3px solid var(--line);
  color:var(--ink); }
.tags { display:flex; gap:6px; flex-wrap:wrap; margin:0 0 10px; }
.tag { font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; padding:5px 8px;
  border-radius:20px; background:var(--bg); border:1px solid var(--line); color:var(--dim); }
.sugg { margin:0; }
.sugg b { font-weight:600; }
table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); }
th { color:var(--dim); font-weight:600; font-size:13px; }
td.n { font:13px/1 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:nowrap; }
#find { width:100%; padding:11px 13px; border:1px solid var(--line); border-radius:9px;
  background:var(--panel); color:var(--ink); font-size:15px; margin:0 0 14px; }
.line { display:flex; gap:14px; padding:3px 0; }
.line a { font:13px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace; text-decoration:none;
  color:var(--dim); flex:0 0 62px; }
.line a:hover { color:var(--accent); }
.line p { margin:0; }
.line.hide { display:none; }
.hit { background:rgba(110,168,254,.28); border-radius:3px; }
footer { margin-top:64px; padding-top:20px; border-top:1px solid var(--line);
  color:var(--dim); font-size:13px; }
"""

JS = """
const box = document.getElementById('find');
const lines = Array.from(document.querySelectorAll('.line'));
box.addEventListener('input', () => {
  const q = box.value.trim().toLowerCase();
  lines.forEach(l => {
    const p = l.querySelector('p');
    p.innerHTML = p.textContent;
    if (!q) { l.classList.remove('hide'); return; }
    const i = p.textContent.toLowerCase().indexOf(q);
    l.classList.toggle('hide', i < 0);
    if (i >= 0) {
      const t = p.textContent;
      p.innerHTML = t.slice(0, i) + '<mark class="hit">' + t.slice(i, i + q.length)
                  + '</mark>' + t.slice(i + q.length);
    }
  });
});
"""


def e(s):
    return html.escape(str(s or ''))


def img_tag(path):
    data = base64.b64encode(pathlib.Path(path).read_bytes()).decode()
    return f'<img alt="frame from the video at this moment" src="data:image/jpeg;base64,{data}">'


def frame_diagram(picture):
    """A little 16:9 box showing where the speaker sits and where the screen stays still."""
    if not picture:
        return ''
    parts = []
    sp = picture['hotspot']
    if sp.get('found'):
        b = sp['box_pct']
        label = 'speaker' if sp['looks_like'] == 'a camera inset' else 'busiest'
        parts.append(
            f'<span class="speaker" style="left:{b["x"]}%;top:{b["y"]}%;'
            f'width:{b["w"]}%;height:{b["h"]}%">{label}</span>')
    cz = picture['clear_zone']['box_pct']
    if cz['w'] and cz['h']:
        parts.append(
            f'<span class="clear" style="left:{cz["x"]}%;top:{cz["y"]}%;'
            f'width:{cz["w"]}%;height:{cz["h"]}%">clear</span>')
    return '<div class="frame">' + ''.join(parts) + '</div>'


def build(workdir, out=None):
    workdir = pathlib.Path(workdir)
    meta = read_json(workdir / 'meta.json')
    rtf = read_json(workdir / 'rtf.json')
    moments = read_json(workdir / 'moments.json')['moments']
    ppath = workdir / 'picture.json'
    picture = read_json(ppath) if ppath.exists() else None
    out = pathlib.Path(out or workdir / 'report.html')

    h = ['<!doctype html><html lang="en"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width,initial-scale=1">',
         f'<title>{e(meta["title"] or "Video analysis")} — transcript and moments</title>',
         f'<style>{CSS}</style></head><body><div class="wrap">']

    h.append(f'<h1>{e(meta["title"] or "Video analysis")}</h1>')
    bits = [e(meta['channel'])] if meta.get('channel') else []
    if meta.get('duration'):
        bits.append(tc(meta['duration']) + ' long')
    bits.append(f'{rtf["word_count"]:,} words')
    h.append(f'<p class="sub">{" · ".join(b for b in bits if b)}</p>')
    h.append(f'<p class="meta"><a href="{e(meta["url"])}">{e(meta["url"])}</a></p>')

    # ---- what came back
    h.append('<h2>What came back</h2><div class="panel">')
    h.append(f'<p style="margin:0 0 10px">Every word is timestamped below, and '
             f'<b>{len(moments)}</b> moments came out as worth a graphic.</p>')
    if picture:
        sp = picture['hotspot']
        if sp.get('found'):
            h.append(f'<p style="margin:0 0 6px">The part of the frame that never stops '
                     f'moving is <b>{e(sp["position"])}</b>, about {sp["coverage_pct"]}% of '
                     f'the picture, and it looks like <b>{e(sp["looks_like"])}</b>. '
                     f'{e(sp["note"])}.</p>')
        else:
            h.append(f'<p style="margin:0 0 6px">{e(sp["note"])}.</p>')
        cz = picture['clear_zone']
        b = cz['box_1080']
        h.append(f'<p style="margin:0">The screen holds still '
                 f'{int(picture["still_share"] * 100)}% of the time. The largest area that '
                 f'stays still throughout is <b>{e(cz["position"])}</b> — '
                 f'{b["w"]}x{b["h"]} at ({b["x"]}, {b["y"]}) in a 1920x1080 frame.</p>')
    else:
        h.append('<p style="margin:0">The picture was not analysed, so these moments are '
                 'scored on what is said alone. Check each one against the video before '
                 'using it — the screen may already be showing the thing.</p>')
    h.append('</div>')

    if picture:
        h.append('<div class="grid2" style="margin-top:16px">')
        h.append(frame_diagram(picture))
        h.append('<div class="panel" style="font-size:14px"><b>Reading this</b><br>'
                 'The solid box is the part of the frame that moves in almost every sample. '
                 'On a screen recording with a webcam that is the person; on an animated '
                 'video it is whatever the video is animating. The dashed box is the largest '
                 'rectangle that stays still for most of the video. Put a graphic in the '
                 'dashed box and it will not cover anything that matters.</div></div>')

    # ---- moments table
    h.append('<h2>The moments</h2>')
    h.append('<table><thead><tr><th>#</th><th>In</th><th>Out</th><th>Length</th>'
             '<th>Why</th></tr></thead><tbody>')
    for m in moments:
        why = ', '.join(s['label'] for s in m['signals'][:2]) or 'strong line'
        h.append(f'<tr><td class="n">{m["rank"]}</td><td class="n">{m["tc_in"]}</td>'
                 f'<td class="n">{m["tc_out"]}</td><td class="n">{m["dur"]:.1f}s</td>'
                 f'<td>{e(why)}</td></tr>')
    h.append('</tbody></table>')

    for m in moments:
        h.append('<div class="moment"><div class="head">')
        h.append(f'<span class="rank">{m["rank"]:02d}</span>')
        h.append(f'<span class="time"><a href="{e(m["link"])}">{m["tc_in"]}</a> '
                 f'&rarr; {m["tc_out"]}</span>')
        h.append(f'<span class="meta">{m["dur"]:.1f}s</span>')
        if m.get('stillness') is not None:
            h.append(f'<span class="meta">screen still {int(m["stillness"] * 100)}% '
                     f'of this window</span>')
        h.append('</div><div class="body">')
        h.append('<div>')
        if m.get('thumb') and (workdir / m['thumb']).exists():
            h.append(img_tag(workdir / m['thumb']))
            h.append('<p class="shot">what is on screen here</p>')
        h.append('</div><div>')
        h.append(f'<blockquote>{e(m["text"])}</blockquote>')
        h.append('<div class="tags">' + ''.join(
            f'<span class="tag">{e(s["label"])}</span>' for s in m['signals'][:4]) + '</div>')
        h.append(f'<p class="sugg"><b>Suggested visual.</b> {e(m["suggestion"])}</p>')
        if m.get('on_screen_hits'):
            h.append('<p class="meta" style="margin:8px 0 0">Heads up: he points at the '
                     'screen here, so check the frame before covering it.</p>')
        h.append('</div></div></div>')

    # ---- the RTF
    h.append('<h2>Full transcript, timestamped</h2>')
    h.append('<p class="meta">Every word carries its own time — hover any word to see it. '
             'Click a timestamp to open the video there.</p>')
    h.append('<input id="find" type="search" placeholder="Search the transcript">')
    words = rtf['words']
    wi = 0
    for s in rtf['sentences']:
        spans = []
        while wi < len(words) and words[wi]['t'] <= s['end']:
            w = words[wi]
            spans.append(f'<span title="{w["t"]:.2f}s">{e(w["w"])}</span>')
            wi += 1
        link = f'{meta["url"]}&t={int(s["start"])}s' if 'watch?v=' in meta['url'] \
            else f'{meta["url"]}?t={int(s["start"])}'
        h.append(f'<div class="line"><a href="{e(link)}">{tc(s["start"])}</a>'
                 f'<p>{" ".join(spans)}</p></div>')

    h.append('<footer>Generated from the video\'s own captions. '
             'Timestamps come from the caption track, so they follow the published cut.'
             '</footer>')
    h.append(f'</div><script>{JS}</script></body></html>')

    out.write_text('\n'.join(h), encoding='utf-8')
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('workdir')
    ap.add_argument('--out')
    a = ap.parse_args()
    print(build(a.workdir, a.out))
