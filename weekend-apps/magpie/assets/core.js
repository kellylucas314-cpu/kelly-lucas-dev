/*
 * Magpie — core
 *
 * The non-visual half of the demo: storage, the document/highlight model,
 * quote anchoring, the daily resurfacing picker, and import/export.
 *
 * Two rules hold throughout this file:
 *   1. Nothing here touches the network. Everything is computed on device.
 *   2. Anything that could drift between reloads is derived from a seed —
 *      the date, an id, the text itself — never from Math.random() or a
 *      wall-clock value that is not written down.
 */
window.MAGPIE_CORE = (function () {
  'use strict';

  var KEYS = {
    docs: 'magpie-demo.docs.v2',
    highlights: 'magpie-demo.highlights.v2',
    prefs: 'magpie-demo.prefs.v2',
    legacyClips: 'magpie-demo.clips.v1',
    legacyPrefs: 'magpie-demo.prefs.v1'
  };

  var CONTEXT = 48;       // characters of prefix/suffix kept with every anchor
  var DAILY_LIMIT = 5;    // "up to five" highlights in Today
  var REST_DAYS = 7;      // a highlight shown in the last week goes to the back
  var KEEP_DAYS = 14;     // Keep rests a highlight for a fortnight
  var LATER_DAYS = 1;     // Later brings it back tomorrow

  /* ===============================================================
     Deterministic primitives
     =============================================================== */

  /* FNV-1a. Same string in, same number out, in every browser. */
  function hash32(input) {
    var str = String(input);
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
    }
    return hash >>> 0;
  }

  /* mulberry32 — a tiny seeded PRNG, used only where a *stable* shuffle is wanted. */
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Next id of a kind, derived from the ids already in use — no randomness. */
  function nextId(prefix, records) {
    var max = 0;
    (records || []).forEach(function (record) {
      var match = /-(\d+)$/.exec(record && record.id ? String(record.id) : '');
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return prefix + '-' + String(max + 1);
  }

  /* ===============================================================
     Dates — plain local YYYY-MM-DD keys, compared as strings
     =============================================================== */

  function dateKey(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + '-' + (month.length < 2 ? '0' + month : month) +
      '-' + (day.length < 2 ? '0' + day : day);
  }

  function shiftKey(key, days) {
    var parts = String(key).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) d = new Date();
    d.setDate(d.getDate() + days);
    return dateKey(d);
  }

  function daysBetween(fromKey, toKey) {
    var a = String(fromKey).split('-');
    var b = String(toKey).split('-');
    var from = Date.UTC(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
    var to = Date.UTC(Number(b[0]), Number(b[1]) - 1, Number(b[2]));
    if (isNaN(from) || isNaN(to)) return Infinity;
    return Math.round((to - from) / 86400000);
  }

  /* ===============================================================
     Storage — best effort, and honest when it fails
     =============================================================== */

  var storage = {
    ok: true,
    reason: '',
    onFailure: null,
    read: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        this.fail('This browser blocked local storage for the page.');
        return null;
      }
    },
    write: function (key, value) {
      if (!this.ok) return false;
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (err) {
        this.fail(err && err.name === 'QuotaExceededError'
          ? 'Local storage is full, so changes stopped persisting.'
          : 'This browser blocked local storage for the page.');
        return false;
      }
    },
    fail: function (reason) {
      this.ok = false;
      this.reason = reason;
      if (typeof this.onFailure === 'function') this.onFailure();
    }
  };

  /* ===============================================================
     Model
     =============================================================== */

  var BLOCK_TYPES = ['p', 'h', 'q'];
  var REVIEW_STATES = ['active', 'hidden'];

  function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function normaliseBlock(raw) {
    if (typeof raw === 'string') return { type: 'p', text: cleanText(raw, 1200) };
    if (!raw || typeof raw !== 'object') return null;
    var type = BLOCK_TYPES.indexOf(raw.type) !== -1 ? raw.type : 'p';
    var text = cleanText(raw.text, 1200);
    return text ? { type: type, text: text } : null;
  }

  function normaliseDoc(raw, collections) {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.url !== 'string') return null;

    var body = (Array.isArray(raw.body) ? raw.body : [])
      .map(normaliseBlock)
      .filter(Boolean)
      .slice(0, 80);

    return {
      id: raw.id,
      title: cleanText(raw.title, 120),
      url: String(raw.url).slice(0, 400),
      author: cleanText(raw.author, 80),
      publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt.slice(0, 10) : '',
      note: typeof raw.note === 'string' ? raw.note.slice(0, 600) : '',
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter(function (t) { return typeof t === 'string' && t.trim(); })
            .map(function (t) { return cleanText(t, 24).toLowerCase(); }).slice(0, 5)
        : [],
      collection: collections.indexOf(raw.collection) !== -1 ? raw.collection : 'Unfiled',
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
      body: body,
      bodySource: ['seed', 'typed', 'generated'].indexOf(raw.bodySource) !== -1 ? raw.bodySource : 'typed'
    };
  }

  function normaliseReview(raw) {
    var review = raw && typeof raw === 'object' ? raw : {};
    return {
      state: REVIEW_STATES.indexOf(review.state) !== -1 ? review.state : 'active',
      snoozeUntil: typeof review.snoozeUntil === 'string' ? review.snoozeUntil.slice(0, 10) : '',
      lastShownOn: typeof review.lastShownOn === 'string' ? review.lastShownOn.slice(0, 10) : '',
      lastActionAt: typeof review.lastActionAt === 'string' ? review.lastActionAt : '',
      shownCount: typeof review.shownCount === 'number' && review.shownCount >= 0 ? Math.floor(review.shownCount) : 0,
      keptCount: typeof review.keptCount === 'number' && review.keptCount >= 0 ? Math.floor(review.keptCount) : 0,
      laterCount: typeof review.laterCount === 'number' && review.laterCount >= 0 ? Math.floor(review.laterCount) : 0
    };
  }

  function normaliseAnchor(raw) {
    var anchor = raw && typeof raw === 'object' ? raw : {};
    return {
      blockIndex: typeof anchor.blockIndex === 'number' && anchor.blockIndex >= 0 ? Math.floor(anchor.blockIndex) : 0,
      start: typeof anchor.start === 'number' && anchor.start >= 0 ? Math.floor(anchor.start) : 0,
      end: typeof anchor.end === 'number' && anchor.end >= 0 ? Math.floor(anchor.end) : 0,
      prefix: typeof anchor.prefix === 'string' ? anchor.prefix.slice(-CONTEXT) : '',
      suffix: typeof anchor.suffix === 'string' ? anchor.suffix.slice(0, CONTEXT) : ''
    };
  }

  function normaliseHighlight(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.id !== 'string' || typeof raw.docId !== 'string') return null;
    var quote = cleanText(raw.quote, 1000);
    if (!quote) return null;
    return {
      id: raw.id,
      docId: raw.docId,
      quote: quote,
      note: typeof raw.note === 'string' ? raw.note.slice(0, 600) : '',
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter(function (t) { return typeof t === 'string' && t.trim(); })
            .map(function (t) { return cleanText(t, 24).toLowerCase(); }).slice(0, 5)
        : [],
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      anchor: normaliseAnchor(raw.anchor),
      review: normaliseReview(raw.review)
    };
  }

  /* ===============================================================
     Anchors — a quote, where it was, and what sat either side
     =============================================================== */

  function buildAnchor(doc, blockIndex, start, end) {
    var block = doc.body[blockIndex];
    if (!block) return null;
    var text = block.text;
    start = Math.max(0, Math.min(start, text.length));
    end = Math.max(start, Math.min(end, text.length));
    var quote = text.slice(start, end).trim();
    if (!quote) return null;

    // Re-find the trimmed quote so the offsets match the stored text exactly.
    var at = text.indexOf(quote, Math.max(0, start - 2));
    if (at === -1) at = start;

    return {
      anchor: {
        blockIndex: blockIndex,
        start: at,
        end: at + quote.length,
        prefix: text.slice(Math.max(0, at - CONTEXT), at),
        suffix: text.slice(at + quote.length, at + quote.length + CONTEXT)
      },
      quote: quote
    };
  }

  function commonTailLength(a, b) {
    var n = 0;
    while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
    return n;
  }

  function commonHeadLength(a, b) {
    var n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  }

  /* Of every occurrence of the quote in `text`, pick the one whose neighbours
     look most like the context we stored. Returns -1 when the quote is absent. */
  function bestOccurrence(text, quote, anchor) {
    var best = -1;
    var bestScore = -1;
    var at = text.indexOf(quote);
    while (at !== -1) {
      var before = text.slice(Math.max(0, at - CONTEXT), at);
      var after = text.slice(at + quote.length, at + quote.length + CONTEXT);
      var score = commonTailLength(before, anchor.prefix) + commonHeadLength(after, anchor.suffix);
      // Nudge towards the remembered offset when context cannot decide.
      var drift = Math.abs(at - anchor.start);
      if (score > bestScore || (score === bestScore && best !== -1 && drift < Math.abs(best - anchor.start))) {
        best = at;
        bestScore = score;
      }
      at = text.indexOf(quote, at + 1);
    }
    return best;
  }

  /*
   * Resolve a stored anchor against the current document text.
   *   exact    — still exactly where it was
   *   moved    — found again by quote + context, offsets updated
   *   detached — the quote is no longer in the document
   */
  function resolveAnchor(doc, highlight) {
    var blocks = (doc && doc.body) || [];
    var anchor = highlight.anchor;
    var quote = highlight.quote;
    if (!quote || !blocks.length) return { status: 'detached' };

    var here = blocks[anchor.blockIndex];
    if (here && here.text.slice(anchor.start, anchor.end) === quote) {
      return { status: 'exact', blockIndex: anchor.blockIndex, start: anchor.start, end: anchor.end };
    }
    if (here) {
      var sameBlock = bestOccurrence(here.text, quote, anchor);
      if (sameBlock !== -1) {
        return { status: 'moved', blockIndex: anchor.blockIndex, start: sameBlock, end: sameBlock + quote.length };
      }
    }
    for (var i = 0; i < blocks.length; i++) {
      if (i === anchor.blockIndex) continue;
      var at = bestOccurrence(blocks[i].text, quote, anchor);
      if (at !== -1) {
        return { status: 'moved', blockIndex: i, start: at, end: at + quote.length };
      }
    }
    return { status: 'detached' };
  }

  /* Write a re-found anchor back so the next resolve is an exact hit. */
  function reanchor(doc, highlight) {
    var found = resolveAnchor(doc, highlight);
    if (found.status === 'moved') {
      var built = buildAnchor(doc, found.blockIndex, found.start, found.end);
      if (built) highlight.anchor = built.anchor;
    }
    return found;
  }

  /* Build a highlight from a quote alone — used for seeds and for imports
     that arrive without usable offsets. */
  function anchorByQuote(doc, quote) {
    var blocks = (doc && doc.body) || [];
    var needle = cleanText(quote, 1000);
    for (var i = 0; i < blocks.length; i++) {
      var at = blocks[i].text.indexOf(needle);
      if (at !== -1) return buildAnchor(doc, i, at, at + needle.length);
    }
    return null;
  }

  /* ===============================================================
     Placeholder body text for clips the user types in
     =============================================================== */

  var OPENERS = [
    'Every collection starts as a pile, and the pile is not really the problem.',
    'The argument here fits on a postcard, which is probably why it took three years to write down.',
    'There is a tidy version of this idea and a useful one, and they are not the same version.',
    'I have changed my mind about this twice and fully expect to change it again.',
    'The first question is not what to keep. It is what you intend to do with the keeping.',
    'Most advice on this subject assumes a kind of discipline that nobody has on a Tuesday.'
  ];

  var MIDDLES = [
    'The useful part was never the system; it was the sentence written while the thing was still in your hands.',
    'What survives a year is rarely what felt urgent on the day it arrived.',
    'None of this needs new software. It needs a decision about what you are willing to lose.',
    'The failure is always quiet — not a lost file, but a file you never thought to look for.',
    'Most of the value shows up on the second pass, and the second pass is the one nobody schedules.',
    'A note written for a stranger is easier to read later than a note written for yourself.',
    'Retrieval is the whole job. Collecting is the part that merely feels like the job.',
    'Anything you cannot describe in one line, you did not understand well enough to keep.',
    'The archive that works is the one you are slightly embarrassed by, because it is still in use.',
    'Context decays faster than text. Save a little of the surrounding paragraph while you still have it.'
  ];

  var CLOSERS = [
    'Try it for a fortnight before deciding it is too simple to bother with.',
    'The real test is whether you can find it again in six months without remembering that you saved it.',
    'Anything more elaborate than this tends to survive exactly one busy week.',
    'Keep the version you will still do in a bad month.'
  ];

  var PULLS = [
    'Keep less, and write one line about why you kept it.',
    'A note in your own words is a note you can actually find.',
    'The point of saving something is the moment you come back to it.'
  ];

  var SUBHEADS = ['What this costs', 'A smaller version', 'Where it breaks', 'The part worth keeping'];

  /*
   * A deterministic stand-in body, derived from the clip's own link and title:
   * the same clip always produces the same reading copy, on any device, with
   * no network call and no model. The reader labels it as generated.
   */
  function generateBody(title, url) {
    var rand = seededRandom(hash32(String(url) + '::' + String(title)));
    var pick = function (bank, used) {
      for (var guard = 0; guard < 40; guard++) {
        var choice = bank[Math.floor(rand() * bank.length)];
        if (used.indexOf(choice) === -1) { used.push(choice); return choice; }
      }
      return bank[0];
    };

    var usedMid = [];
    var body = [];
    body.push({ type: 'p', text: pick(OPENERS, []) + ' ' + pick(MIDDLES, usedMid) + ' ' + pick(MIDDLES, usedMid) });
    body.push({ type: 'h', text: pick(SUBHEADS, []) });
    body.push({ type: 'p', text: pick(MIDDLES, usedMid) + ' ' + pick(MIDDLES, usedMid) + ' ' + pick(MIDDLES, usedMid) });
    body.push({ type: 'q', text: pick(PULLS, []) });
    body.push({ type: 'p', text: pick(MIDDLES, usedMid) + ' ' + pick(MIDDLES, usedMid) + ' ' + pick(CLOSERS, []) });
    return body;
  }

  /* ===============================================================
     Load & save
     =============================================================== */

  function seededLibrary(collections) {
    var docs = window.MAGPIE_DATA.seedDocs().map(function (doc) {
      doc.bodySource = 'seed';
      return normaliseDoc(doc, collections);
    });
    var byId = {};
    docs.forEach(function (doc) { byId[doc.id] = doc; });

    var highlights = [];
    var skipped = 0;
    window.MAGPIE_DATA.seedHighlights().forEach(function (seed) {
      var doc = byId[seed.docId];
      var built = doc ? anchorByQuote(doc, seed.quote) : null;
      if (!built) { skipped++; return; }
      highlights.push(normaliseHighlight({
        id: seed.id,
        docId: seed.docId,
        quote: built.quote,
        note: seed.note,
        tags: seed.tags,
        createdAt: seed.createdAt,
        anchor: built.anchor,
        review: {}
      }));
    });

    return { docs: docs, highlights: highlights, skipped: skipped };
  }

  /*
   * Migration from the clip-only v1 store.
   *
   * v1 clips had no body text, so each one is rebuilt as a v2 document: the
   * seeded pieces get their real reading copy back by id, and anything the
   * reviewer typed gets a generated reading copy. The v1 keys are left in
   * place, untouched, so an older build of this demo still opens.
   */
  function migrateLegacy(collections) {
    var raw = storage.read(KEYS.legacyClips);
    if (raw === null) return null;
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return null;
    }
    if (!Array.isArray(parsed)) return null;

    var seedBodies = {};
    window.MAGPIE_DATA.seedDocs().forEach(function (doc) { seedBodies[doc.id] = doc; });

    var docs = parsed.map(function (clip) {
      if (!clip || typeof clip !== 'object') return null;
      var seed = seedBodies[clip.id];
      var merged = Object.assign({}, clip, {
        author: seed ? seed.author : '',
        publishedAt: seed ? seed.publishedAt : '',
        body: seed ? seed.body : generateBody(clip.title, clip.url),
        bodySource: seed ? 'seed' : 'generated'
      });
      return normaliseDoc(merged, collections);
    }).filter(Boolean);

    return { docs: docs, highlights: [], count: docs.length };
  }

  function load(collections) {
    var result = {
      docs: [],
      highlights: [],
      prefs: {},
      warnings: [],
      migratedFrom: ''
    };

    var rawDocs = storage.read(KEYS.docs);

    if (rawDocs === null) {
      var legacy = migrateLegacy(collections);
      if (legacy && legacy.docs.length) {
        result.docs = legacy.docs;
        result.highlights = [];
        result.migratedFrom = 'v1';
        result.warnings.push('Found ' + legacy.count + ' clip' + (legacy.count === 1 ? '' : 's') +
          ' saved by the earlier version of this demo and brought them across. Clips you had typed in got generated reading text; the demo pieces got theirs back. Nothing was deleted from the old store.');
        save(result.docs, result.highlights);
      } else {
        var seeded = seededLibrary(collections);
        result.docs = seeded.docs;
        result.highlights = seeded.highlights;
        if (seeded.skipped) {
          result.warnings.push(seeded.skipped + ' seeded highlight' + (seeded.skipped === 1 ? '' : 's') +
            ' could not be matched to the text and were left out.');
        }
        save(result.docs, result.highlights);
      }
    } else {
      try {
        var parsedDocs = JSON.parse(rawDocs);
        if (!Array.isArray(parsedDocs)) throw new Error('documents were not a list');
        result.docs = parsedDocs.map(function (doc) { return normaliseDoc(doc, collections); }).filter(Boolean);
        if (result.docs.length !== parsedDocs.length) {
          result.warnings.push('Some saved documents could not be read and were skipped.');
        }
      } catch (err) {
        var fresh = seededLibrary(collections);
        result.docs = fresh.docs;
        result.highlights = fresh.highlights;
        result.warnings.push('The saved documents were unreadable, so the library was reset to the eight demo pieces.');
        save(result.docs, result.highlights);
        result.prefs = loadPrefs();
        return result;
      }

      var rawHighlights = storage.read(KEYS.highlights);
      if (rawHighlights !== null) {
        try {
          var parsedHighlights = JSON.parse(rawHighlights);
          if (!Array.isArray(parsedHighlights)) throw new Error('highlights were not a list');
          result.highlights = parsedHighlights.map(normaliseHighlight).filter(Boolean);
          if (result.highlights.length !== parsedHighlights.length) {
            result.warnings.push('Some saved highlights could not be read and were skipped.');
          }
        } catch (err2) {
          result.warnings.push('The saved highlights were unreadable, so this session starts with none.');
        }
      }
    }

    // A stored document should never be unreadable; if one is, give it
    // placeholder text (which the reader labels as generated).
    result.docs.forEach(function (doc) {
      if (doc.body.length) return;
      doc.body = generateBody(doc.title, doc.url);
      doc.bodySource = 'generated';
    });

    // Drop highlights whose document has gone, then re-anchor the rest.
    var docIds = {};
    result.docs.forEach(function (doc) { docIds[doc.id] = doc; });
    var orphaned = 0;
    result.highlights = result.highlights.filter(function (hl) {
      if (!docIds[hl.docId]) { orphaned++; return false; }
      reanchor(docIds[hl.docId], hl);
      return true;
    });
    if (orphaned) {
      result.warnings.push(orphaned + ' highlight' + (orphaned === 1 ? '' : 's') +
        ' pointed at a document that is no longer here and were removed.');
    }

    result.prefs = loadPrefs();
    return result;
  }

  function save(docs, highlights) {
    var okDocs = storage.write(KEYS.docs, JSON.stringify(docs));
    var okHighlights = storage.write(KEYS.highlights, JSON.stringify(highlights));
    return okDocs && okHighlights;
  }

  function loadPrefs() {
    try {
      var prefs = JSON.parse(storage.read(KEYS.prefs) || '{}');
      return prefs && typeof prefs === 'object' ? prefs : {};
    } catch (err) {
      return {};
    }
  }

  function savePrefs(prefs) {
    return storage.write(KEYS.prefs, JSON.stringify(prefs));
  }

  /* ===============================================================
     Today — up to five highlights, stable for the whole day
     =============================================================== */

  function isReady(hl, key) {
    if (hl.review.state === 'hidden') return false;
    if (hl.review.snoozeUntil && hl.review.snoozeUntil > key) return false;
    return true;
  }

  /*
   * Deterministic pick:
   *   · hidden and snoozed highlights are out
   *   · anything shown in the last REST_DAYS goes into a second tier, so it
   *     only comes back when there is nothing fresher
   *   · within a tier, order is a stable shuffle seeded by the date and the
   *     highlight id — same day in, same order out, no matter how often the
   *     page is reloaded
   *   · the first pass takes at most one highlight per document; a second
   *     pass fills any remaining slots, and says so
   */
  function pickToday(highlights, key, limit) {
    limit = limit || DAILY_LIMIT;
    var ready = highlights.filter(function (hl) { return isReady(hl, key); });

    var ranked = ready.map(function (hl) {
      var rested = !hl.review.lastShownOn || daysBetween(hl.review.lastShownOn, key) >= REST_DAYS;
      return {
        hl: hl,
        tier: rested ? 0 : 1,
        // seededRandom(hash) gives a stable 0..1 per (day, highlight) pair
        order: seededRandom(hash32(key + '|' + hl.id))()
      };
    }).sort(function (a, b) {
      return a.tier - b.tier || a.order - b.order || (a.hl.id < b.hl.id ? -1 : 1);
    });

    var chosen = [];
    var seenDocs = {};
    var repeatedSource = false;
    var repeatedSoon = false;

    ranked.forEach(function (entry) {
      if (chosen.length >= limit) return;
      if (seenDocs[entry.hl.docId]) return;
      seenDocs[entry.hl.docId] = true;
      if (entry.tier === 1) repeatedSoon = true;
      chosen.push(entry.hl);
    });

    if (chosen.length < limit) {
      ranked.forEach(function (entry) {
        if (chosen.length >= limit) return;
        if (chosen.indexOf(entry.hl) !== -1) return;
        repeatedSource = true;
        if (entry.tier === 1) repeatedSoon = true;
        chosen.push(entry.hl);
      });
    }

    return {
      ids: chosen.map(function (hl) { return hl.id; }),
      readyCount: ready.length,
      poolCount: highlights.length,
      repeatedSource: repeatedSource,
      repeatedSoon: repeatedSoon
    };
  }

  /* ===============================================================
     Import / export
     =============================================================== */

  var FORMAT = 'magpie-clip-and-find-demo';
  var FORMAT_VERSION = 2;

  function toJSON(docs, highlights) {
    return JSON.stringify({
      format: FORMAT,
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      note: 'Fictional demo data. All links end in .example and resolve to nothing.',
      documents: docs,
      highlights: highlights
    }, null, 2);
  }

  function fromJSON(text, collections) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return { error: 'That is not valid JSON. Check that the whole file was copied, braces included.' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'That JSON is not a Magpie export — the top level should be an object with a “documents” list.' };
    }
    if (parsed.format && parsed.format !== FORMAT) {
      return { error: 'That file says it came from “' + String(parsed.format).slice(0, 60) + '”, not from this demo.' };
    }
    if (!Array.isArray(parsed.documents)) {
      return { error: 'That export has no “documents” list, so there is nothing to bring in.' };
    }

    var warnings = [];
    var seenDocIds = {};
    var docs = parsed.documents
      .map(function (doc) { return normaliseDoc(doc, collections); })
      .filter(function (doc) {
        if (!doc || seenDocIds[doc.id]) return false;
        seenDocIds[doc.id] = true;
        return true;
      });
    var droppedDocs = parsed.documents.length - docs.length;
    if (droppedDocs > 0) {
      warnings.push(droppedDocs + ' document' + (droppedDocs === 1 ? '' : 's') +
        ' in the file were unreadable or repeated an id, and were skipped.');
    }
    if (!docs.length) {
      return { error: 'None of the documents in that file could be read, so nothing was changed.' };
    }

    // Every document in the demo has something to read, on every path in.
    var bodyless = 0;
    docs.forEach(function (doc) {
      if (doc.body.length) return;
      doc.body = generateBody(doc.title, doc.url);
      doc.bodySource = 'generated';
      bodyless++;
    });
    if (bodyless) {
      warnings.push(bodyless + ' imported document' + (bodyless === 1 ? '' : 's') +
        ' arrived without reading text, so placeholder text was generated for ' +
        (bodyless === 1 ? 'it' : 'them') + '.');
    }

    var byId = {};
    docs.forEach(function (doc) { byId[doc.id] = doc; });

    var rawHighlights = Array.isArray(parsed.highlights) ? parsed.highlights : [];
    var highlights = [];
    var seenHighlightIds = {};
    var droppedHighlights = 0;
    var detached = 0;

    rawHighlights.forEach(function (raw) {
      var hl = normaliseHighlight(raw);
      if (!hl || seenHighlightIds[hl.id] || !byId[hl.docId]) { droppedHighlights++; return; }
      seenHighlightIds[hl.id] = true;
      // resolveAnchor already searches every block, so one pass settles it.
      if (reanchor(byId[hl.docId], hl).status === 'detached') detached++;
      highlights.push(hl);
    });

    if (droppedHighlights) {
      warnings.push(droppedHighlights + ' highlight' + (droppedHighlights === 1 ? '' : 's') +
        ' were skipped — unreadable, repeating an id, or pointing at a document that was not in the file.');
    }
    if (detached) {
      warnings.push(detached + ' highlight' + (detached === 1 ? '' : 's') +
        ' no longer match their document text and will show as detached.');
    }

    return { docs: docs, highlights: highlights, warnings: warnings };
  }

  function toMarkdown(docs, highlights, resolveStatus) {
    var lines = ['# Magpie — clip & find', '',
      '_Exported ' + new Date().toLocaleString() + ' from a local fictional demo. ' +
      'Every link, person and passage below is invented; `.example` links resolve to nothing._', ''];

    var byDoc = {};
    highlights.forEach(function (hl) {
      (byDoc[hl.docId] = byDoc[hl.docId] || []).push(hl);
    });

    docs.forEach(function (doc) {
      lines.push('## ' + doc.title);
      var meta = [];
      if (doc.author) meta.push(doc.author);
      meta.push(doc.url);
      meta.push(doc.collection);
      meta.push('saved ' + String(doc.savedAt).slice(0, 10));
      lines.push('', '_' + meta.join(' · ') + '_');
      if (doc.tags.length) lines.push('', 'Tags: ' + doc.tags.map(function (t) { return '`' + t + '`'; }).join(', '));
      if (doc.note) lines.push('', '**Note.** ' + doc.note);
      if (doc.bodySource === 'generated') {
        lines.push('', '_Reading text for this piece was generated on device as a placeholder._');
      }

      var mine = byDoc[doc.id] || [];
      if (mine.length) {
        lines.push('', '### Highlights (' + mine.length + ')');
        mine.slice().sort(function (a, b) {
          return a.anchor.blockIndex - b.anchor.blockIndex || a.anchor.start - b.anchor.start;
        }).forEach(function (hl) {
          lines.push('', '> ' + hl.quote);
          if (hl.note) lines.push('', hl.note);
          var bits = [];
          if (hl.tags.length) bits.push(hl.tags.map(function (t) { return '`' + t + '`'; }).join(', '));
          bits.push('highlighted ' + String(hl.createdAt).slice(0, 10));
          if (hl.review.state === 'hidden') bits.push('hidden from Today');
          else if (hl.review.snoozeUntil) bits.push('resting until ' + hl.review.snoozeUntil);
          if (typeof resolveStatus === 'function' && resolveStatus(doc, hl) === 'detached') bits.push('detached from the text');
          lines.push('', '<sub>' + bits.join(' · ') + '</sub>');
        });
      } else {
        lines.push('', '_No highlights in this piece yet._');
      }
      lines.push('', '---', '');
    });

    return lines.join('\n');
  }

  /* ===============================================================
     Public surface
     =============================================================== */

  return {
    KEYS: KEYS,
    DAILY_LIMIT: DAILY_LIMIT,
    REST_DAYS: REST_DAYS,
    KEEP_DAYS: KEEP_DAYS,
    LATER_DAYS: LATER_DAYS,
    CONTEXT: CONTEXT,

    storage: storage,
    hash32: hash32,
    seededRandom: seededRandom,
    nextId: nextId,

    dateKey: dateKey,
    shiftKey: shiftKey,
    daysBetween: daysBetween,

    normaliseDoc: normaliseDoc,
    normaliseHighlight: normaliseHighlight,
    generateBody: generateBody,

    buildAnchor: buildAnchor,
    resolveAnchor: resolveAnchor,
    reanchor: reanchor,
    anchorByQuote: anchorByQuote,

    load: load,
    save: save,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    seededLibrary: seededLibrary,

    pickToday: pickToday,
    toJSON: toJSON,
    fromJSON: fromJSON,
    toMarkdown: toMarkdown
  };
})();
