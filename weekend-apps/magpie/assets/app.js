/*
 * Magpie — clip, read & resurface
 *
 * A local, offline portfolio demo. No network, no accounts, no sync.
 * State lives in memory and (best effort) in this browser profile's
 * localStorage. Nothing leaves the page.
 *
 * Four views, one hash route each:
 *   #/library            the clips you saved
 *   #/read/<docId>       the reading copy, with highlights in place
 *   #/highlights         every highlight, with its note, tags and state
 *   #/today              up to five highlights, the same five all day
 */
(function () {
  'use strict';

  var CORE = window.MAGPIE_CORE;
  var COLLECTIONS = window.MAGPIE_DATA.collections;

  var SAVE_LATENCY = 420;   // pretend a save takes a moment
  var UNDO_WINDOW = 9000;

  /* ---------------------------------------------------------------
     Tiny helpers
     --------------------------------------------------------------- */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch (err) {
      return String(url).replace(/^https?:\/\//, '').split('/')[0];
    }
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  function dayLabel(iso) {
    var then = new Date(iso);
    if (isNaN(then.getTime())) return '';
    return then.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function keyLabel(key) {
    var parts = String(key).split('-');
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return key;
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function savedLabel(iso) {
    var then = new Date(iso);
    if (isNaN(then.getTime())) return 'Saved at an unknown time';
    var days = Math.round((Date.now() - then.getTime()) / 86400000);
    if (days <= 0) return 'Saved today';
    if (days === 1) return 'Saved yesterday';
    if (days < 30) return 'Saved ' + days + ' days ago';
    return 'Saved ' + dayLabel(iso);
  }

  function restLabel(key) {
    var today = CORE.dateKey();
    var days = CORE.daysBetween(today, key);
    if (days <= 0) return 'ready now';
    if (days === 1) return 'back tomorrow';
    return 'resting for ' + days + ' days';
  }

  /* Split text on a literal query so matches can be wrapped. */
  function markQuery(text, query, tag, className) {
    var raw = String(text == null ? '' : text);
    if (!query) return escapeHtml(raw);
    var name = tag || 'mark';
    var open = '<' + name + (className ? ' class="' + className + '"' : '') + '>';
    var close = '</' + name + '>';
    var needle = query.toLowerCase();
    var hay = raw.toLowerCase();
    var out = '';
    var from = 0;
    var at = hay.indexOf(needle);
    while (at !== -1) {
      out += escapeHtml(raw.slice(from, at));
      out += open + escapeHtml(raw.slice(at, at + needle.length)) + close;
      from = at + needle.length;
      at = hay.indexOf(needle, from);
    }
    return out + escapeHtml(raw.slice(from));
  }

  function highlightHtml(text, query) { return markQuery(text, query, 'mark'); }

  /* Show a window of the text around the search match, else the opening. */
  function excerpt(text, query, max) {
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    var start = 0;
    if (query) {
      var at = clean.toLowerCase().indexOf(query.toLowerCase());
      if (at > max - 40) start = Math.max(0, at - 40);
    }
    var slice = clean.slice(start, start + max);
    var lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > max - 24) slice = slice.slice(0, lastSpace);
    return (start > 0 ? '…' : '') + slice.trim() + '…';
  }

  function readingMinutes(doc) {
    var words = 0;
    doc.body.forEach(function (block) { words += block.text.split(/\s+/).length; });
    return Math.max(1, Math.round(words / 220));
  }

  function docText(doc) {
    return doc.body.map(function (block) { return block.text; }).join('\n');
  }

  /* ---------------------------------------------------------------
     State
     --------------------------------------------------------------- */

  var state = {
    docs: [],
    highlights: [],
    prefs: {},
    warnings: [],

    view: 'library',
    readerDocId: null,

    query: '',
    collection: 'all',
    tags: [],
    onlyNotes: false,
    onlyHighlighted: false,
    sort: 'newest',

    hlDoc: 'all',
    hlState: 'all',
    hlSort: 'newest',

    guideHidden: true,
    simulateFailure: false
  };

  var ui = {
    detailId: null,
    editingId: null,
    reopenDetailId: null,
    noteId: null,
    noteReturn: null,
    passage: null,          // { docId, blockIndex, sentences }
    pendingSelection: null, // { docId, blockIndex, start, end, quote }
    confirm: null,
    returnFocus: null,
    backRoute: '#/library',  // where "Back" leaves the reader
    justAddedId: null,
    focusHighlightId: null, // scroll to this highlight on the next reader render
    todayUndo: {},
    searchTimer: null,
    formSession: 0,         // bumped each time the form closes, so a late save can tell
    savePending: false,
    booted: false
  };

  /* ---------------------------------------------------------------
     Load & persist
     --------------------------------------------------------------- */

  function loadAll() {
    var loaded = CORE.load(COLLECTIONS);
    state.docs = loaded.docs;
    state.highlights = loaded.highlights;
    state.warnings = loaded.warnings;
    state.prefs = loaded.prefs || {};

    state.guideHidden = state.prefs.guideHidden !== false;
    if (['newest', 'oldest', 'title', 'highlights'].indexOf(state.prefs.sort) !== -1) state.sort = state.prefs.sort;
    if (['newest', 'oldest', 'document'].indexOf(state.prefs.hlSort) !== -1) state.hlSort = state.prefs.hlSort;
    if (['all', 'active', 'resting', 'hidden', 'detached'].indexOf(state.prefs.hlState) !== -1) {
      state.hlState = state.prefs.hlState;
    }
  }

  function persistAll() { CORE.save(state.docs, state.highlights); }

  function persistPrefs() {
    CORE.savePrefs({
      guideHidden: state.guideHidden,
      sort: state.sort,
      hlSort: state.hlSort,
      hlState: state.hlState,
      today: state.prefs.today || null
    });
  }

  /* ---------------------------------------------------------------
     Derived data
     --------------------------------------------------------------- */

  function docById(id) {
    for (var i = 0; i < state.docs.length; i++) {
      if (state.docs[i].id === id) return state.docs[i];
    }
    return null;
  }

  function highlightById(id) {
    for (var i = 0; i < state.highlights.length; i++) {
      if (state.highlights[i].id === id) return state.highlights[i];
    }
    return null;
  }

  function highlightsFor(docId) {
    return state.highlights.filter(function (hl) { return hl.docId === docId; });
  }

  /* Resolved anchor cache, rebuilt per render pass. */
  var resolvedCache = {};
  function resolved(hl) {
    if (!resolvedCache[hl.id]) {
      var doc = docById(hl.docId);
      resolvedCache[hl.id] = doc ? CORE.resolveAnchor(doc, hl) : { status: 'detached' };
    }
    return resolvedCache[hl.id];
  }
  function clearResolved() { resolvedCache = {}; }

  function reviewLabel(hl) {
    if (hl.review.state === 'hidden') return 'Hidden from Today';
    if (hl.review.snoozeUntil && hl.review.snoozeUntil > CORE.dateKey()) {
      return 'Resting — ' + restLabel(hl.review.snoozeUntil);
    }
    return 'Active in Today';
  }

  /* Where in a document a query hits — used for the honest "found in" line. */
  function docMatch(doc, query) {
    if (!query) return { hit: true, where: [] };
    var needle = query.toLowerCase();
    var where = [];
    if (doc.title.toLowerCase().indexOf(needle) !== -1) where.push('title');
    if (doc.note.toLowerCase().indexOf(needle) !== -1) where.push('note');
    if (doc.tags.join(' ').toLowerCase().indexOf(needle) !== -1) where.push('tag');
    if (doc.collection.toLowerCase().indexOf(needle) !== -1) where.push('collection');
    if (hostOf(doc.url).toLowerCase().indexOf(needle) !== -1) where.push('source');
    if (docText(doc).toLowerCase().indexOf(needle) !== -1) where.push('body');
    var inHighlights = highlightsFor(doc.id).some(function (hl) {
      return (hl.quote + ' ' + hl.note + ' ' + hl.tags.join(' ')).toLowerCase().indexOf(needle) !== -1;
    });
    if (inHighlights) where.push('highlight');
    return { hit: where.length > 0, where: where };
  }

  function highlightMatches(hl, query) {
    if (!query) return true;
    var doc = docById(hl.docId);
    var haystack = [hl.quote, hl.note, hl.tags.join(' '), doc ? doc.title : '', doc ? doc.author : '']
      .join(' ').toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  function visibleDocs() {
    var query = state.query.trim();
    var list = state.docs.filter(function (doc) {
      if (state.collection !== 'all' && doc.collection !== state.collection) return false;
      if (state.onlyNotes && !doc.note.trim()) return false;
      if (state.onlyHighlighted && !highlightsFor(doc.id).length) return false;
      if (state.tags.length) {
        var hit = doc.tags.some(function (tag) { return state.tags.indexOf(tag) !== -1; });
        if (!hit) return false;
      }
      return docMatch(doc, query).hit;
    });

    list.sort(function (a, b) {
      if (state.sort === 'title') return a.title.localeCompare(b.title);
      if (state.sort === 'highlights') {
        var diff = highlightsFor(b.id).length - highlightsFor(a.id).length;
        if (diff) return diff;
        return new Date(b.savedAt) - new Date(a.savedAt);
      }
      var gap = new Date(a.savedAt) - new Date(b.savedAt);
      return state.sort === 'oldest' ? gap : -gap;
    });
    return list;
  }

  function visibleHighlights() {
    var query = state.query.trim();
    var today = CORE.dateKey();

    var list = state.highlights.filter(function (hl) {
      if (state.hlDoc !== 'all' && hl.docId !== state.hlDoc) return false;
      if (state.hlState === 'active') {
        if (hl.review.state !== 'active') return false;
        if (hl.review.snoozeUntil && hl.review.snoozeUntil > today) return false;
      }
      if (state.hlState === 'resting') {
        if (hl.review.state !== 'active') return false;
        if (!hl.review.snoozeUntil || hl.review.snoozeUntil <= today) return false;
      }
      if (state.hlState === 'hidden' && hl.review.state !== 'hidden') return false;
      if (state.hlState === 'detached' && resolved(hl).status !== 'detached') return false;
      return highlightMatches(hl, query);
    });

    list.sort(function (a, b) {
      if (state.hlSort === 'document') {
        var docA = docById(a.docId);
        var docB = docById(b.docId);
        var byTitle = (docA ? docA.title : '').localeCompare(docB ? docB.title : '');
        if (byTitle) return byTitle;
        var placeA = resolved(a);
        var placeB = resolved(b);
        return (placeA.blockIndex || 0) - (placeB.blockIndex || 0) || (placeA.start || 0) - (placeB.start || 0);
      }
      var gap = new Date(a.createdAt) - new Date(b.createdAt);
      return state.hlSort === 'oldest' ? gap : -gap;
    });
    return list;
  }

  function tagIndex() {
    var counts = {};
    state.docs.forEach(function (doc) {
      doc.tags.forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    }).map(function (tag) { return { tag: tag, count: counts[tag] }; });
  }

  function filterCount() {
    return (state.collection !== 'all' ? 1 : 0) + state.tags.length +
      (state.onlyNotes ? 1 : 0) + (state.onlyHighlighted ? 1 : 0);
  }

  function hasAnyNarrowing() {
    return filterCount() > 0 || state.query.trim() !== '';
  }

  /* ---------------------------------------------------------------
     Routing
     --------------------------------------------------------------- */

  function routeFor(view, docId, highlightId) {
    if (view === 'reader') {
      return '#/read/' + encodeURIComponent(docId) +
        (highlightId ? '/h/' + encodeURIComponent(highlightId) : '');
    }
    return '#/' + view;
  }

  /*
   * The hash is the source of truth, but `hashchange` is asynchronous and
   * callers want to move focus straight after navigating. location.hash is
   * updated synchronously, so route now and let the later event be a no-op.
   */
  function go(hash) {
    if (window.location.hash !== hash) window.location.hash = hash;
    applyRoute();
  }

  function applyRoute() {
    var hash = window.location.hash || '';
    var parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

    var previous = state.view;
    if (previous !== 'reader') ui.backRoute = routeFor(previous);

    if (parts[0] === 'read' && parts[1]) {
      state.view = 'reader';
      state.readerDocId = parts[1];
      ui.focusHighlightId = parts[2] === 'h' && parts[3] ? parts[3] : null;
    } else if (parts[0] === 'today') {
      state.view = 'today';
    } else if (parts[0] === 'highlights') {
      state.view = 'highlights';
    } else {
      state.view = 'library';
    }

    render();
    if (ui.booted && previous !== state.view) focusViewHeading();
  }

  function focusViewHeading() {
    var headings = {
      library: '#clips-title',
      reader: '#reader-title',
      highlights: '#highlights-title',
      today: '#today-title'
    };
    var heading = $(headings[state.view]);
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }

  /* ---------------------------------------------------------------
     Rendering — chrome
     --------------------------------------------------------------- */

  function renderBanners() {
    var host = $('#banners');
    var parts = [];

    if (!CORE.storage.ok) {
      parts.push('<div class="banner"><span><strong>Memory only.</strong> ' + escapeHtml(CORE.storage.reason) +
        ' You can still try everything here; it just resets when you reload.</span></div>');
    }
    state.warnings.forEach(function (warning) {
      parts.push('<div class="banner"><span><strong>Heads up.</strong> ' + escapeHtml(warning) + '</span></div>');
    });
    host.innerHTML = parts.join('');

    $('#storage-note').textContent = CORE.storage.ok
      ? 'Documents, highlights and review states are kept in this browser profile only (localStorage). Clearing site data removes them.'
      : 'Local storage is unavailable, so this session is memory-only.';
  }

  function renderNav() {
    var dueToday = todayIds().filter(function (id) { return !todayActions()[id]; }).length;
    $('#count-library').textContent = state.docs.length;
    $('#count-highlights').textContent = state.highlights.length;
    $('#count-today').textContent = dueToday;

    $$('.viewnav__tab').forEach(function (tab) {
      var active = tab.getAttribute('data-view') === state.view ||
        (state.view === 'reader' && tab.getAttribute('data-view') === 'library');
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  function renderGuide() {
    $('#guide-details').hidden = state.guideHidden;
    $('#show-guide').hidden = !state.guideHidden;
    $('#dismiss-guide').hidden = state.guideHidden;
    $('#show-guide').setAttribute('aria-expanded', String(!state.guideHidden));
    $('#dismiss-guide').setAttribute('aria-expanded', String(!state.guideHidden));
  }

  function renderViews() {
    $('#view-library').hidden = state.view !== 'library';
    $('#view-reader').hidden = state.view !== 'reader';
    $('#view-highlights').hidden = state.view !== 'highlights';
    $('#view-today').hidden = state.view !== 'today';
  }

  function render() {
    clearResolved();
    renderBanners();
    renderGuide();
    renderViews();

    if (state.view === 'library') renderLibrary();
    if (state.view === 'reader') renderReader();
    if (state.view === 'highlights') renderHighlights();
    if (state.view === 'today') renderToday();

    renderNav();
  }

  /* ---------------------------------------------------------------
     Rendering — library
     --------------------------------------------------------------- */

  function renderCollectionFilter() {
    var counts = { all: state.docs.length };
    state.docs.forEach(function (doc) {
      counts[doc.collection] = (counts[doc.collection] || 0) + 1;
    });

    var rows = [{ value: 'all', label: 'All collections' }];
    COLLECTIONS.forEach(function (name) {
      if (counts[name] || state.collection === name) rows.push({ value: name, label: name });
    });

    $('#collection-filter').innerHTML = rows.map(function (row) {
      var checked = state.collection === row.value ? ' checked' : '';
      return '<label class="radio">' +
        '<input type="radio" name="collection" value="' + escapeHtml(row.value) + '"' + checked + ' />' +
        '<span>' + escapeHtml(row.label) + '</span>' +
        '<span class="radio__count" aria-hidden="true">' + (counts[row.value] || 0) + '</span>' +
        '<span class="sr-only">' + (counts[row.value] || 0) + ' clips</span>' +
        '</label>';
    }).join('');
  }

  function renderTagFilter() {
    var tags = tagIndex();
    var host = $('#tag-filter');

    var live = tags.map(function (t) { return t.tag; });
    state.tags = state.tags.filter(function (tag) { return live.indexOf(tag) !== -1; });

    if (!tags.length) {
      host.innerHTML = '<p class="hint">No tags yet. Add tags when you save a clip and they will appear here.</p>';
      return;
    }
    host.innerHTML = tags.map(function (entry) {
      var pressed = state.tags.indexOf(entry.tag) !== -1;
      return '<button type="button" class="chip" data-tag="' + escapeHtml(entry.tag) + '" aria-pressed="' + pressed + '">' +
        escapeHtml(entry.tag) +
        '<span class="chip__count" aria-hidden="true">' + entry.count + '</span>' +
        '</button>';
    }).join('');
  }

  function renderActiveFilters() {
    var pills = [];
    if (state.query.trim()) pills.push({ kind: 'query', label: 'Search: “' + state.query.trim() + '”' });
    if (state.collection !== 'all') pills.push({ kind: 'collection', label: 'In: ' + state.collection });
    state.tags.forEach(function (tag) { pills.push({ kind: 'tag', value: tag, label: 'Tag: ' + tag }); });
    if (state.onlyNotes) pills.push({ kind: 'notes', label: 'Has a note' });
    if (state.onlyHighlighted) pills.push({ kind: 'highlighted', label: 'Has highlights' });

    $('#active-filters').innerHTML = pills.map(function (pill) {
      return '<button type="button" class="pill" data-kind="' + pill.kind + '"' +
        (pill.value ? ' data-value="' + escapeHtml(pill.value) + '"' : '') + '>' +
        escapeHtml(pill.label) +
        '<span class="pill__x" aria-hidden="true">×</span>' +
        '<span class="sr-only">— remove this filter</span>' +
        '</button>';
    }).join('');

    var count = filterCount();
    var badge = $('#filters-active-count');
    badge.hidden = count === 0;
    badge.textContent = count + ' on';
    $('#clear-filters').hidden = !hasAnyNarrowing();
    $('#clear-search').hidden = state.query === '';
    $('#hl-clear-search').hidden = state.query === '';
  }

  function renderLibrarySummary(list) {
    var total = state.docs.length;
    var query = state.query.trim();
    var text;

    if (!total) {
      text = 'No clips in the library yet.';
    } else if (!hasAnyNarrowing()) {
      text = 'Showing all ' + total + ' ' + plural(total, 'clip', 'clips') + '.';
    } else {
      text = list.length + ' of ' + total + ' ' + plural(total, 'clip', 'clips') +
        (query ? ' match “' + query + '”' : ' match your filters');
      if (query && filterCount()) {
        text += ' with ' + filterCount() + ' ' + plural(filterCount(), 'filter', 'filters') + ' on';
      }
      text += '.';
    }
    $('#result-summary').textContent = text;

    var crosslink = $('#library-crosslink');
    var hits = query ? state.highlights.filter(function (hl) { return highlightMatches(hl, query); }).length : 0;
    if (hits) {
      crosslink.hidden = false;
      crosslink.innerHTML = '<span aria-hidden="true">✦</span> “' + escapeHtml(query) + '” also appears in ' +
        hits + ' ' + plural(hits, 'highlight', 'highlights') + '. ' +
        '<button type="button" class="link-btn" data-action="see-highlights">See them</button>';
    } else {
      crosslink.hidden = true;
      crosslink.innerHTML = '';
    }
  }

  var WHERE_LABEL = {
    body: 'the text', note: 'your note', highlight: 'a highlight',
    tag: 'a tag', source: 'the source', collection: 'the collection', title: 'the title'
  };

  function matchLine(doc, query) {
    if (!query) return '';
    var where = docMatch(doc, query).where;
    var deep = where.filter(function (w) { return w === 'body' || w === 'highlight'; });
    if (!deep.length) return '';

    var snippet = '';
    if (where.indexOf('highlight') !== -1) {
      var hit = highlightsFor(doc.id).filter(function (hl) { return highlightMatches(hl, query); })[0];
      if (hit) {
        // Show whichever part of the highlight actually carries the word.
        var needle = query.toLowerCase();
        snippet = hit.quote.toLowerCase().indexOf(needle) === -1 &&
          hit.note.toLowerCase().indexOf(needle) !== -1 ? hit.note : hit.quote;
      }
    }
    if (!snippet && where.indexOf('body') !== -1) snippet = docText(doc).replace(/\n/g, ' ');

    return '<p class="clip__match"><span class="clip__match-label">Found in ' +
      escapeHtml(deep.map(function (w) { return WHERE_LABEL[w]; }).join(' and ')) + ':</span> ' +
      highlightHtml(excerpt(snippet, query, 150), query) + '</p>';
  }

  function renderClips() {
    var list = visibleDocs();
    var query = state.query.trim();

    $('#clips').innerHTML = list.map(function (doc) {
      var count = highlightsFor(doc.id).length;
      var note = doc.note.trim();
      var noteHtml = note
        ? '<p class="clip__note">' + highlightHtml(excerpt(note, query, 170), query) + '</p>'
        : '<p class="clip__note clip__note--empty">No note yet — open the clip to add one.</p>';

      var tagsHtml = doc.tags.length
        ? '<div class="clip__tags">' + doc.tags.map(function (tag) {
            return '<span class="clip__tag">' + highlightHtml(tag, query) + '</span>';
          }).join('') + '</div>'
        : '';

      return '<li class="clip' + (ui.justAddedId === doc.id && !reducedMotion() ? ' clip--entering' : '') +
        '" data-id="' + escapeHtml(doc.id) + '">' +
        '<p class="clip__eyebrow">' +
          '<span class="clip__collection">' + highlightHtml(doc.collection, query) + '</span>' +
          '<span class="dot" aria-hidden="true"></span>' +
          '<span>' + escapeHtml(savedLabel(doc.savedAt)) + '</span>' +
          '<span class="dot" aria-hidden="true"></span>' +
          '<span>' + readingMinutes(doc) + ' min read</span>' +
          (count ? '<span class="dot" aria-hidden="true"></span><span class="clip__hlcount">' + count + ' ' +
            plural(count, 'highlight', 'highlights') + '</span>' : '') +
        '</p>' +
        '<h3><button type="button" class="clip__open" data-action="open" data-id="' + escapeHtml(doc.id) +
          '" data-focus-id="' + escapeHtml(doc.id) + '">' +
          highlightHtml(doc.title, query) +
        '</button></h3>' +
        noteHtml +
        matchLine(doc, query) +
        '<div class="clip__foot">' +
          '<span class="clip__source">' + highlightHtml(hostOf(doc.url), query) + '</span>' +
          tagsHtml +
          '<span class="clip__actions">' +
            '<button type="button" class="icon-btn icon-btn--read" data-action="read" data-id="' + escapeHtml(doc.id) + '">' +
              'Read<span class="sr-only"> ' + escapeHtml(doc.title) + '</span></button>' +
            '<button type="button" class="icon-btn" data-action="edit" data-id="' + escapeHtml(doc.id) + '">' +
              'Edit<span class="sr-only"> ' + escapeHtml(doc.title) + '</span></button>' +
            '<button type="button" class="icon-btn icon-btn--danger" data-action="remove" data-id="' + escapeHtml(doc.id) + '">' +
              'Remove<span class="sr-only"> ' + escapeHtml(doc.title) + '</span></button>' +
          '</span>' +
        '</div>' +
        '</li>';
    }).join('');

    ui.justAddedId = null;
    renderLibraryEmpty(list);
    renderLibrarySummary(list);
  }

  function renderLibraryEmpty(list) {
    var host = $('#empty');
    if (list.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;

    if (!state.docs.length) {
      host.innerHTML =
        '<h3 class="empty__title">Nothing clipped yet</h3>' +
        '<p class="empty__body">A clip is a link, the note you would want to read months later, and something to read. ' +
        'Add your first one, or put the fictional demo library back.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="add">Add a clip</button>' +
          '<button type="button" class="btn btn--ghost" data-action="restore">Restore the demo library</button>' +
        '</div>';
    } else {
      var bits = [];
      if (state.query.trim()) bits.push('the search “' + state.query.trim() + '”');
      if (state.collection !== 'all') bits.push('the collection “' + state.collection + '”');
      if (state.tags.length) bits.push(plural(state.tags.length, 'the tag ', 'the tags ') + state.tags.join(', '));
      if (state.onlyNotes) bits.push('“only clips with a note”');
      if (state.onlyHighlighted) bits.push('“only clips I’ve highlighted”');

      host.innerHTML =
        '<h3 class="empty__title">No clips match that</h3>' +
        '<p class="empty__body">Nothing in your ' + state.docs.length + ' ' + plural(state.docs.length, 'clip', 'clips') +
        ' matches ' + escapeHtml(bits.join(' and ')) + '. Try a shorter word, or loosen the filters.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="clear">Clear search &amp; filters</button>' +
          '<button type="button" class="btn btn--ghost" data-action="add">Add a clip instead</button>' +
        '</div>';
    }
  }

  function renderLibrary() {
    renderCollectionFilter();
    renderTagFilter();
    renderActiveFilters();
    renderClips();
  }

  /* ---------------------------------------------------------------
     Rendering — reader
     --------------------------------------------------------------- */

  /* Clip overlapping highlights so each character belongs to at most one. */
  function rangesForBlock(doc, blockIndex) {
    var ranges = [];
    highlightsFor(doc.id).forEach(function (hl) {
      var place = resolved(hl);
      if (place.status === 'detached' || place.blockIndex !== blockIndex) return;
      ranges.push({ id: hl.id, start: place.start, end: place.end, hl: hl });
    });
    ranges.sort(function (a, b) { return a.start - b.start || b.end - a.end; });

    var cursor = 0;
    var out = [];
    ranges.forEach(function (range) {
      var start = Math.max(range.start, cursor);
      if (start >= range.end) return;
      out.push({ id: range.id, start: start, end: range.end, hl: range.hl });
      cursor = range.end;
    });
    return out;
  }

  function blockInnerHtml(doc, blockIndex, query) {
    var text = doc.body[blockIndex].text;
    var ranges = rangesForBlock(doc, blockIndex);
    var html = '';
    var cursor = 0;

    ranges.forEach(function (range) {
      html += markQuery(text.slice(cursor, range.start), query, 'span', 'qmark');
      var hl = range.hl;
      var tone = hl.review.state === 'hidden' ? ' hl--hidden' : '';
      html += '<mark class="hl' + tone + '" data-hl="' + escapeHtml(hl.id) + '" data-focus-id="' +
        escapeHtml(hl.id) + '" id="hl-' + escapeHtml(hl.id) +
        '" tabindex="0" role="button" aria-label="Highlight' + (hl.note ? ', annotated' : '') +
        ': ' + escapeHtml(excerpt(hl.quote, '', 80)) + '. Open its note.">' +
        markQuery(text.slice(range.start, range.end), query, 'span', 'qmark') +
        '</mark>';
      cursor = range.end;
    });
    html += markQuery(text.slice(cursor), query, 'span', 'qmark');
    return html;
  }

  function renderReaderBody(doc, query) {
    var host = $('#reader-body');
    if (!doc.body.length) {
      host.innerHTML = '<p class="reader__missing">This clip has no reading text. ' +
        'Use <strong>Clip details → Edit clip</strong> to paste some, or clear the reading text field and save to ' +
        'generate a placeholder passage.</p>';
      return;
    }

    host.innerHTML = doc.body.map(function (block, index) {
      var inner = blockInnerHtml(doc, index, query);
      var tag = block.type === 'h' ? 'h3' : (block.type === 'q' ? 'blockquote' : 'p');
      var cls = 'rblock rblock--' + block.type;
      // No whitespace inside the text element: offsets are measured from it.
      return '<div class="rblock-wrap">' +
        '<' + tag + ' class="' + cls + '" data-block="' + index + '">' + inner + '</' + tag + '>' +
        '<button type="button" class="rblock__mark" data-mark-block="' + index + '">' +
          'Mark a passage<span class="sr-only"> in ' +
          (block.type === 'h' ? 'the heading' : 'paragraph ' + (index + 1)) + '</span>' +
        '</button>' +
        '</div>';
    }).join('');
  }

  function renderReaderSide(doc, query) {
    var list = highlightsFor(doc.id).slice().sort(function (a, b) {
      var placeA = resolved(a);
      var placeB = resolved(b);
      if (placeA.status === 'detached') return 1;
      if (placeB.status === 'detached') return -1;
      return placeA.blockIndex - placeB.blockIndex || placeA.start - placeB.start;
    });

    var host = $('#reader-side-list');
    if (!list.length) {
      host.innerHTML = '<p class="hint">Nothing marked here yet. Select a sentence in the text and choose ' +
        '<strong>Highlight selection</strong>, or use <strong>Mark a passage</strong> on any paragraph.</p>';
      return;
    }

    host.innerHTML = '<ol class="sidelist">' + list.map(function (hl) {
      var place = resolved(hl);
      return '<li class="sidelist__item' + (place.status === 'detached' ? ' sidelist__item--detached' : '') + '">' +
        '<button type="button" class="sidelist__quote" data-jump="' + escapeHtml(hl.id) + '">' +
          highlightHtml(excerpt(hl.quote, query, 110), query) +
        '</button>' +
        (hl.note ? '<p class="sidelist__note">' + highlightHtml(excerpt(hl.note, query, 110), query) + '</p>' : '') +
        '<p class="sidelist__meta">' + escapeHtml(reviewLabel(hl)) +
          (place.status === 'detached' ? ' · detached from the text' : '') + '</p>' +
        '</li>';
    }).join('') + '</ol>';
  }

  var BACK_LABEL = {
    '#/library': 'Back to library',
    '#/highlights': 'Back to highlights',
    '#/today': 'Back to Today'
  };

  function renderReader() {
    var doc = docById(state.readerDocId);
    var query = state.query.trim();

    $('#reader-back').innerHTML = '<span aria-hidden="true">←</span> ' +
      (BACK_LABEL[ui.backRoute] || 'Back to library');

    if (!doc) {
      $('#reader-eyebrow').textContent = '';
      $('#reader-title').textContent = 'That clip is not in the library';
      $('#reader-meta').textContent = '';
      $('#reader-note').hidden = true;
      $('#reader-generated').hidden = true;
      $('#reader-source').textContent = '';
      $('#reader-body').innerHTML = '<p class="reader__missing">It may have been removed, or the link you followed ' +
        'points at a clip this browser profile never had. <button type="button" class="link-btn" ' +
        'data-action="back-to-library">Back to the library</button></p>';
      $('#reader-side-list').innerHTML = '';
      $('#reader-highlight').disabled = true;
      $('#reader-details').disabled = true;
      $('#reader-hint').textContent = '';
      return;
    }

    $('#reader-details').disabled = false;
    $('#reader-eyebrow').textContent = doc.collection;
    $('#reader-title').innerHTML = highlightHtml(doc.title, query);

    var meta = [];
    if (doc.author) meta.push(doc.author);
    meta.push(hostOf(doc.url));
    if (doc.publishedAt) meta.push(dayLabel(doc.publishedAt));
    meta.push(readingMinutes(doc) + ' min read');
    $('#reader-meta').textContent = meta.join(' · ');

    var generated = $('#reader-generated');
    generated.hidden = doc.bodySource !== 'generated';
    if (doc.bodySource === 'generated') {
      generated.textContent = 'Placeholder reading text. This demo never fetches a page, so these paragraphs were ' +
        'generated on this device from the clip’s own link and title. They are invented, repeatable, and highlight ' +
        'exactly like the rest.';
    }

    var noteBox = $('#reader-note');
    if (doc.note.trim()) {
      noteBox.hidden = false;
      $('#reader-note-text').innerHTML = highlightHtml(doc.note.trim(), query);
    } else {
      noteBox.hidden = true;
    }

    $('#reader-source').textContent = doc.url + ' — fictional link, it does not resolve.';

    renderReaderBody(doc, query);
    renderReaderSide(doc, query);
    updateSelectionState();

    if (ui.focusHighlightId) {
      var target = ui.focusHighlightId;
      ui.focusHighlightId = null;
      window.requestAnimationFrame(function () {
        var el = document.getElementById('hl-' + target);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
          el.classList.add('hl--pulse');
          window.setTimeout(function () { el.classList.remove('hl--pulse'); }, 1600);
          el.focus();
        } else if (highlightById(target)) {
          toast('That highlight no longer matches this text, so there is nothing to scroll to.', { tone: 'error' });
        }
      });
    }
  }

  /* ---------------------------------------------------------------
     Reader — selection → highlight
     --------------------------------------------------------------- */

  function closestBlock(node) {
    var el = node && node.nodeType === 1 ? node : (node ? node.parentNode : null);
    return el && el.closest ? el.closest('[data-block]') : null;
  }

  /* Character offset of (node, offset) within a block's text. */
  function offsetWithin(blockEl, node, offset) {
    var range = document.createRange();
    range.selectNodeContents(blockEl);
    try {
      range.setEnd(node, offset);
    } catch (err) {
      return 0;
    }
    return range.toString().length;
  }

  function readSelection() {
    if (state.view !== 'reader') return null;
    var doc = docById(state.readerDocId);
    if (!doc) return null;

    var selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

    var range = selection.getRangeAt(0);
    var startBlock = closestBlock(range.startContainer);
    var endBlock = closestBlock(range.endContainer);
    if (!startBlock || startBlock !== endBlock) return null;
    if (!$('#reader-body').contains(startBlock)) return null;

    var blockIndex = Number(startBlock.getAttribute('data-block'));
    var start = offsetWithin(startBlock, range.startContainer, range.startOffset);
    var end = offsetWithin(startBlock, range.endContainer, range.endOffset);
    if (end < start) { var swap = start; start = end; end = swap; }

    var built = CORE.buildAnchor(doc, blockIndex, start, end);
    if (!built || built.quote.length < 3) return null;

    return {
      docId: doc.id,
      blockIndex: built.anchor.blockIndex,
      start: built.anchor.start,
      end: built.anchor.end,
      quote: built.quote,
      anchor: built.anchor
    };
  }

  function updateSelectionState() {
    if (state.view !== 'reader') return;
    var found = readSelection();
    var button = $('#reader-highlight');
    var hint = $('#reader-hint');

    if (found) {
      ui.pendingSelection = found;
      button.disabled = false;
      hint.innerHTML = 'Ready to highlight: <q>' + escapeHtml(excerpt(found.quote, '', 90)) + '</q>';
      hint.classList.add('readerbar__hint--ready');
    } else {
      ui.pendingSelection = null;
      button.disabled = true;
      hint.textContent = 'Select a sentence in the text to highlight it, or use Mark a passage on any paragraph.';
      hint.classList.remove('readerbar__hint--ready');
    }
  }

  function createHighlight(docId, anchor, quote) {
    var doc = docById(docId);
    if (!doc) return null;

    var duplicate = highlightsFor(docId).filter(function (hl) {
      return hl.quote === quote && hl.anchor.blockIndex === anchor.blockIndex && hl.anchor.start === anchor.start;
    })[0];
    if (duplicate) {
      toast('You already highlighted exactly that passage.', {
        actionLabel: 'Open its note',
        onAction: function () { openNote(duplicate.id, { returnFocus: duplicate.id }); }
      });
      return null;
    }

    var highlight = CORE.normaliseHighlight({
      id: CORE.nextId('hl', state.highlights),
      docId: docId,
      quote: quote,
      note: '',
      tags: [],
      createdAt: new Date().toISOString(),
      anchor: anchor,
      review: {}
    });
    state.highlights.push(highlight);
    persistAll();
    ensureToday();
    clearResolved();
    return highlight;
  }

  function highlightFromSelection() {
    var pending = ui.pendingSelection || readSelection();
    if (!pending) {
      toast('Nothing is selected in the text right now.', { tone: 'error' });
      return;
    }
    var made = createHighlight(pending.docId, pending.anchor, pending.quote);
    var selection = window.getSelection();
    if (selection && selection.removeAllRanges) selection.removeAllRanges();
    ui.pendingSelection = null;
    render();
    if (made) {
      toast('Passage highlighted.');
      openNote(made.id, { fresh: true, returnFocus: made.id });
    }
  }

  /* ---------------------------------------------------------------
     Mark a passage (no dragging required)
     --------------------------------------------------------------- */

  function splitSentences(text) {
    var out = [];
    var pattern = /[^.!?…]+(?:[.!?…]+["”’»)]*)?/g;
    var match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
      var raw = match[0];
      var leading = raw.length - raw.replace(/^\s+/, '').length;
      var trimmed = raw.trim();
      if (!trimmed) continue;
      out.push({ start: match.index + leading, end: match.index + leading + trimmed.length, text: trimmed });
    }
    if (!out.length && text.trim()) out.push({ start: 0, end: text.length, text: text });
    return out;
  }

  function openPassage(blockIndex, returnFocusTo) {
    var doc = docById(state.readerDocId);
    if (!doc || !doc.body[blockIndex]) return;

    var sentences = splitSentences(doc.body[blockIndex].text);
    ui.passage = { docId: doc.id, blockIndex: blockIndex, sentences: sentences };
    if (returnFocusTo !== undefined) ui.returnFocus = returnFocusTo;

    $('#passage-error').hidden = true;
    $('#passage-list').innerHTML = sentences.map(function (sentence, index) {
      return '<label class="check passage-list__item">' +
        '<input type="checkbox" value="' + index + '"' + (sentences.length === 1 ? ' checked' : '') + ' />' +
        '<span>' + escapeHtml(sentence.text) + '</span>' +
        '</label>';
    }).join('');

    updatePassagePreview();
    openDialog($('#passage-dialog'), $('#passage-list input'));
  }

  function passageRange() {
    if (!ui.passage) return null;
    var checked = $$('#passage-list input:checked').map(function (input) { return Number(input.value); });
    if (!checked.length) return null;
    var first = ui.passage.sentences[Math.min.apply(null, checked)];
    var last = ui.passage.sentences[Math.max.apply(null, checked)];
    return { start: first.start, end: last.end, span: Math.max.apply(null, checked) - Math.min.apply(null, checked) + 1 };
  }

  function updatePassagePreview() {
    var preview = $('#passage-preview');
    var range = passageRange();
    if (!range) {
      preview.textContent = 'Nothing ticked yet.';
      preview.classList.add('quote--empty');
      return;
    }
    var doc = docById(ui.passage.docId);
    preview.textContent = doc ? doc.body[ui.passage.blockIndex].text.slice(range.start, range.end) : '';
    preview.classList.remove('quote--empty');
  }

  function submitPassage(event) {
    event.preventDefault();
    var range = passageRange();
    if (!range || !ui.passage) {
      var error = $('#passage-error');
      error.innerHTML = '<h3>Tick at least one sentence</h3><p>The highlight runs from the first ticked sentence to the last.</p>';
      error.hidden = false;
      error.setAttribute('tabindex', '-1');
      error.focus();
      return;
    }
    var doc = docById(ui.passage.docId);
    var built = doc ? CORE.buildAnchor(doc, ui.passage.blockIndex, range.start, range.end) : null;
    $('#passage-dialog').close();
    if (!built) {
      toast('That passage could not be anchored to the text.', { tone: 'error' });
      return;
    }
    var made = createHighlight(doc.id, built.anchor, built.quote);
    render();
    if (made) {
      toast('Passage highlighted.');
      openNote(made.id, { fresh: true, returnFocus: made.id });
    }
  }

  /* ---------------------------------------------------------------
     Rendering — highlights
     --------------------------------------------------------------- */

  function renderHighlightFilters() {
    var select = $('#hl-doc');
    var withHighlights = state.docs.filter(function (doc) { return highlightsFor(doc.id).length; });
    var options = ['<option value="all">All documents (' + state.highlights.length + ')</option>'];
    withHighlights.forEach(function (doc) {
      options.push('<option value="' + escapeHtml(doc.id) + '">' + escapeHtml(doc.title) +
        ' (' + highlightsFor(doc.id).length + ')</option>');
    });
    select.innerHTML = options.join('');
    var stillListed = withHighlights.some(function (doc) { return doc.id === state.hlDoc; });
    if (state.hlDoc !== 'all' && !stillListed) state.hlDoc = 'all';
    select.value = state.hlDoc;
    $('#hl-state').value = state.hlState;
    $('#hl-sort').value = state.hlSort;
  }

  function renderHighlights() {
    renderHighlightFilters();
    renderActiveFilters();

    var list = visibleHighlights();
    var query = state.query.trim();
    var total = state.highlights.length;

    $('#highlight-list').innerHTML = list.map(function (hl) {
      var doc = docById(hl.docId);
      var place = resolved(hl);
      var detached = place.status === 'detached';

      return '<li class="hcard' + (detached ? ' hcard--detached' : '') + '" data-id="' + escapeHtml(hl.id) + '">' +
        '<blockquote class="hcard__quote">' +
          '<button type="button" class="hcard__open" data-action="open-note" data-id="' + escapeHtml(hl.id) +
            '" data-focus-id="' + escapeHtml(hl.id) + '">' +
            highlightHtml(hl.quote, query) +
          '</button>' +
        '</blockquote>' +
        (hl.note
          ? '<p class="hcard__note">' + highlightHtml(hl.note, query) + '</p>'
          : '<p class="hcard__note hcard__note--empty">No note on this one yet.</p>') +
        (hl.tags.length
          ? '<div class="clip__tags">' + hl.tags.map(function (tag) {
              return '<span class="clip__tag">' + highlightHtml(tag, query) + '</span>';
            }).join('') + '</div>'
          : '') +
        '<p class="hcard__meta">' +
          '<span class="hcard__doc">' + highlightHtml(doc ? doc.title : 'Unknown document', query) + '</span>' +
          '<span class="dot" aria-hidden="true"></span>' +
          '<span>' + escapeHtml(reviewLabel(hl)) + '</span>' +
          (hl.review.shownCount
            ? '<span class="dot" aria-hidden="true"></span><span>shown ' + hl.review.shownCount + '×</span>'
            : '') +
          (detached ? '<span class="dot" aria-hidden="true"></span><span class="hcard__warn">detached from the text</span>' : '') +
        '</p>' +
        '<div class="hcard__actions">' +
          '<button type="button" class="icon-btn icon-btn--read" data-action="jump" data-id="' + escapeHtml(hl.id) + '">' +
            'Read in context</button>' +
          '<button type="button" class="icon-btn" data-action="open-note" data-id="' + escapeHtml(hl.id) + '">' +
            'Note &amp; tags</button>' +
          '<button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="' + escapeHtml(hl.id) + '">' +
            'Delete</button>' +
        '</div>' +
        '</li>';
    }).join('');

    var summary;
    var narrowed = query || state.hlDoc !== 'all' || state.hlState !== 'all';
    if (!total) summary = 'No highlights yet.';
    else if (!narrowed) summary = 'Showing all ' + total + ' ' + plural(total, 'highlight', 'highlights') + '.';
    else {
      summary = list.length + ' of ' + total + ' ' + plural(total, 'highlight', 'highlights') +
        (query ? ' match “' + query + '”' : ' match your filters') + '.';
    }
    $('#hl-summary').textContent = summary;

    var crosslink = $('#highlights-crosslink');
    var docHits = query ? state.docs.filter(function (doc) { return docMatch(doc, query).hit; }).length : 0;
    if (docHits) {
      crosslink.hidden = false;
      crosslink.innerHTML = '<span aria-hidden="true">✦</span> “' + escapeHtml(query) + '” also appears in ' +
        docHits + ' ' + plural(docHits, 'clip', 'clips') + '. ' +
        '<button type="button" class="link-btn" data-action="see-library">See them</button>';
    } else {
      crosslink.hidden = true;
      crosslink.innerHTML = '';
    }

    var host = $('#highlights-empty');
    if (list.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    if (!total) {
      host.innerHTML =
        '<h3 class="empty__title">No highlights yet</h3>' +
        '<p class="empty__body">Open any clip with <strong>Read</strong>, select a sentence, and choose ' +
        '<strong>Highlight selection</strong>. Highlights you annotate here are what Today draws on.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="go-library">Go to the library</button>' +
        '</div>';
    } else {
      host.innerHTML =
        '<h3 class="empty__title">No highlights match that</h3>' +
        '<p class="empty__body">None of your ' + total + ' ' + plural(total, 'highlight', 'highlights') +
        ' match the current search and filters.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="clear-hl">Clear search &amp; filters</button>' +
        '</div>';
    }
  }

  /* ---------------------------------------------------------------
     Today
     --------------------------------------------------------------- */

  function todayRecord() {
    var record = state.prefs.today;
    if (!record || typeof record !== 'object' || record.date !== CORE.dateKey()) return null;
    return record;
  }

  function todayIds() {
    var record = todayRecord();
    return record && Array.isArray(record.ids) ? record.ids : [];
  }

  function todayActions() {
    var record = todayRecord();
    return record && record.actions && typeof record.actions === 'object' ? record.actions : {};
  }

  /*
   * Build (or top up) today's set. The same five stay put for the rest of the
   * day: once an id is in the record it is never dropped, only acted on.
   */
  function ensureToday() {
    var key = CORE.dateKey();
    var record = todayRecord();

    if (!record) record = { date: key, ids: [], actions: {}, meta: {} };
    if (!Array.isArray(record.ids)) record.ids = [];
    if (!record.actions || typeof record.actions !== 'object') record.actions = {};
    if (!record.meta || typeof record.meta !== 'object') record.meta = {};

    // A document (and its highlights) may have been deleted since this morning.
    record.ids = record.ids.filter(function (id) { return !!highlightById(id); });

    if (record.ids.length < CORE.DAILY_LIMIT) {
      // Top up only: ids already in today's set are never re-drawn or dropped,
      // so the five you saw this morning are the five you see tonight.
      var need = CORE.DAILY_LIMIT - record.ids.length;
      var usedDocs = {};
      record.ids.forEach(function (id) {
        var seen = highlightById(id);
        if (seen) usedDocs[seen.docId] = true;
      });

      var untouched = state.highlights.filter(function (hl) { return record.ids.indexOf(hl.id) === -1; });
      var newSources = untouched.filter(function (hl) { return !usedDocs[hl.docId]; });

      var picked = CORE.pickToday(newSources, key, need);
      if (picked.ids.length < need) {
        // Not enough separate sources; fall back to the rest and say so.
        var leftovers = untouched.filter(function (hl) { return picked.ids.indexOf(hl.id) === -1; });
        var extra = CORE.pickToday(leftovers, key, need - picked.ids.length);
        if (extra.ids.length) {
          picked.ids = picked.ids.concat(extra.ids);
          picked.repeatedSource = true;
          picked.repeatedSoon = picked.repeatedSoon || extra.repeatedSoon;
        }
      }

      picked.ids.forEach(function (id) {
        if (highlightById(id)) record.ids.push(id);
      });
      record.meta = {
        repeatedSource: picked.repeatedSource || !!record.meta.repeatedSource,
        repeatedSoon: picked.repeatedSoon || !!record.meta.repeatedSoon
      };
    }

    state.prefs.today = record;
    persistPrefs();
  }

  /*
   * "Shown" means shown to a person, so it is recorded when the Today view
   * renders — not when the set is drawn. A set nobody opened does not use up
   * its highlights' rest period.
   */
  function markTodayShown() {
    var key = CORE.dateKey();
    var changed = false;
    todayIds().forEach(function (id) {
      var hl = highlightById(id);
      if (!hl || hl.review.lastShownOn === key) return;
      hl.review.lastShownOn = key;
      hl.review.shownCount += 1;
      changed = true;
    });
    if (changed) persistAll();
  }

  function todayWhy() {
    var record = todayRecord();
    var meta = (record && record.meta) || {};
    var ids = todayIds();
    var eligible = state.highlights.filter(function (hl) { return hl.review.state !== 'hidden'; }).length;

    if (!state.highlights.length) return '';
    if (!ids.length) {
      return 'Nothing is due today. Every highlight is either hidden or resting after a recent review.';
    }

    var bits = ['Picked for ' + keyLabel(CORE.dateKey()) + ' from ' + eligible + ' ' +
      plural(eligible, 'highlight', 'highlights') + ' that aren’t hidden'];
    bits.push(meta.repeatedSource
      ? 'taking more than one from a source only because there weren’t enough sources'
      : 'at most one per source');
    bits.push(meta.repeatedSoon
      ? 'including some seen in the last ' + CORE.REST_DAYS + ' days, because nothing fresher was ready'
      : 'skipping anything seen in the last ' + CORE.REST_DAYS + ' days');
    return bits.join(', ') + '. The same ' + ids.length + ' stay here until tomorrow.';
  }

  function renderToday() {
    ensureToday();
    markTodayShown();
    renderActiveFilters();

    var ids = todayIds();
    var actions = todayActions();
    var query = state.query.trim();

    $('#today-date').textContent = keyLabel(CORE.dateKey());
    $('#today-why').textContent = todayWhy();

    var done = ids.filter(function (id) { return actions[id]; }).length;
    $('#today-progress').textContent = ids.length
      ? done + ' of ' + ids.length + ' reviewed' + (done === ids.length ? ' — that is today’s set.' : '.')
      : '';

    var ACTION_WORD = { keep: 'Kept', later: 'Back tomorrow', hide: 'Hidden' };

    $('#today-list').innerHTML = ids.map(function (id, index) {
      var hl = highlightById(id);
      if (!hl) return '';
      var doc = docById(hl.docId);
      var place = resolved(hl);
      var action = actions[id];

      return '<li class="tcard' + (action ? ' tcard--done' : '') + '" data-id="' + escapeHtml(id) + '">' +
        '<p class="tcard__index" aria-hidden="true">' + (index + 1) + ' / ' + ids.length + '</p>' +
        '<blockquote class="tcard__quote">' + highlightHtml(hl.quote, query) + '</blockquote>' +
        (hl.note ? '<p class="tcard__note">' + highlightHtml(hl.note, query) + '</p>' : '') +
        '<p class="tcard__meta">' +
          '<span>' + escapeHtml(doc ? doc.title : 'Unknown document') + '</span>' +
          (doc && doc.author ? '<span class="dot" aria-hidden="true"></span><span>' + escapeHtml(doc.author) + '</span>' : '') +
          (place.status === 'detached'
            ? '<span class="dot" aria-hidden="true"></span><span class="hcard__warn">detached from the text</span>' : '') +
        '</p>' +
        (action
          ? '<div class="tcard__done">' +
              '<span class="tcard__stamp">' + (ACTION_WORD[action] || 'Reviewed') +
                (action === 'keep' && hl.review.snoozeUntil ? ' — ' + escapeHtml(restLabel(hl.review.snoozeUntil)) : '') +
              '</span>' +
              '<button type="button" class="icon-btn" data-action="undo-review" data-id="' + escapeHtml(id) + '">Undo</button>' +
              '<button type="button" class="icon-btn icon-btn--read" data-action="jump" data-id="' + escapeHtml(id) + '">' +
                'Read in context</button>' +
            '</div>'
          : '<div class="tcard__actions">' +
              '<button type="button" class="btn btn--primary btn--small" data-action="keep" data-id="' + escapeHtml(id) + '">' +
                'Keep</button>' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="later" data-id="' + escapeHtml(id) + '">' +
                'Later</button>' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="hide" data-id="' + escapeHtml(id) + '">' +
                'Hide</button>' +
              '<button type="button" class="icon-btn icon-btn--read" data-action="jump" data-id="' + escapeHtml(id) + '">' +
                'Read in context</button>' +
              '<button type="button" class="icon-btn" data-action="open-note" data-id="' + escapeHtml(id) +
                '" data-focus-id="' + escapeHtml(id) + '">' +
                'Edit note</button>' +
            '</div>') +
        '</li>';
    }).join('');

    var foot = $('#today-foot');
    if (ids.length && done === ids.length) {
      foot.hidden = false;
      foot.textContent = 'That is the set for today. Kept highlights rest for ' + CORE.KEEP_DAYS +
        ' days, “Later” ones come back tomorrow, and a new set is drawn after midnight.';
    } else {
      foot.hidden = true;
    }

    var host = $('#today-empty');
    if (ids.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    if (!state.highlights.length) {
      host.innerHTML =
        '<h3 class="empty__title">Nothing to resurface yet</h3>' +
        '<p class="empty__body">Today draws on your highlights. Read a clip, mark a passage worth meeting again, ' +
        'and it will appear here on a later day.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="go-library">Go to the library</button>' +
        '</div>';
    } else {
      host.innerHTML =
        '<h3 class="empty__title">Nothing due today</h3>' +
        '<p class="empty__body">All ' + state.highlights.length + ' of your highlights are hidden or resting after a ' +
        'recent review. They come back on their own; nothing is lost.</p>' +
        '<div class="empty__actions">' +
          '<button type="button" class="btn btn--primary" data-action="go-highlights">Review the full list</button>' +
        '</div>';
    }
  }

  function reviewToday(id, action) {
    var hl = highlightById(id);
    if (!hl) return;
    var key = CORE.dateKey();

    ui.todayUndo[id] = JSON.parse(JSON.stringify(hl.review));

    if (action === 'keep') {
      hl.review.state = 'active';
      hl.review.snoozeUntil = CORE.shiftKey(key, CORE.KEEP_DAYS);
      hl.review.keptCount += 1;
    } else if (action === 'later') {
      hl.review.state = 'active';
      hl.review.snoozeUntil = CORE.shiftKey(key, CORE.LATER_DAYS);
      hl.review.laterCount += 1;
    } else if (action === 'hide') {
      hl.review.state = 'hidden';
    }
    hl.review.lastActionAt = new Date().toISOString();

    if (!todayRecord()) ensureToday();
    var record = state.prefs.today;
    record.actions = record.actions || {};
    record.actions[id] = action;

    persistAll();
    persistPrefs();
    render();

    var card = document.querySelector('.tcard[data-id="' + id + '"] [data-action="undo-review"]');
    if (card) card.focus();
  }

  function undoReview(id) {
    var hl = highlightById(id);
    if (!hl) return;

    if (ui.todayUndo[id]) {
      hl.review = ui.todayUndo[id];
      delete ui.todayUndo[id];
    } else {
      // The page was reloaded since the review, so reverse the known effect.
      var was = todayActions()[id];
      hl.review.state = 'active';
      hl.review.snoozeUntil = '';
      if (was === 'keep' && hl.review.keptCount) hl.review.keptCount -= 1;
      if (was === 'later' && hl.review.laterCount) hl.review.laterCount -= 1;
    }

    var record = state.prefs.today;
    if (record && record.actions) delete record.actions[id];

    persistAll();
    persistPrefs();
    render();
    var card = document.querySelector('.tcard[data-id="' + id + '"] [data-action="keep"]');
    if (card) card.focus();
  }

  /* ---------------------------------------------------------------
     Toasts
     --------------------------------------------------------------- */

  function toast(message, options) {
    options = options || {};
    var host = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (options.tone === 'error' ? ' toast--error' : '');

    var text = document.createElement('span');
    text.className = 'toast__text';
    text.textContent = message;
    el.appendChild(text);

    if (options.actionLabel) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'toast__action';
      action.textContent = options.actionLabel;
      action.addEventListener('click', function () {
        dismiss();
        options.onAction();
      });
      el.appendChild(action);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast__action';
    close.innerHTML = '<span aria-hidden="true">×</span><span class="sr-only">Dismiss message</span>';
    close.addEventListener('click', dismiss);
    el.appendChild(close);

    host.appendChild(el);
    while (host.children.length > 3) host.removeChild(host.firstElementChild);
    var timer = window.setTimeout(dismiss, options.duration || 5000);

    function dismiss() {
      window.clearTimeout(timer);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    return dismiss;
  }

  /* ---------------------------------------------------------------
     Dialog plumbing (native <dialog>: Esc + focus trap for free)
     --------------------------------------------------------------- */

  function openDialog(dialog, focusTarget) {
    if (!dialog.open) dialog.showModal();
    if (focusTarget) {
      window.requestAnimationFrame(function () { focusTarget.focus(); });
    }
  }

  function restoreFocus() {
    // A dialog's close event is queued, so when one dialog hands over to another
    // (passage → note, form → detail) this runs after the next one stored its own
    // return target. Leave that target for the dialog that is now open.
    if (document.querySelector('dialog[open]')) return;
    var target = ui.returnFocus;
    ui.returnFocus = null;
    if (!target) return;
    if (typeof target === 'string') {
      // Both the reader and the highlights list can hold a card for the same
      // id, so only ever aim at the view that is actually on screen.
      var found = document.querySelector('.view:not([hidden]) [data-focus-id="' + target + '"]');
      if (found) { found.focus(); return; }
      focusViewHeading();
      return;
    }
    if (document.contains(target) && target.offsetParent !== null) target.focus();
    else focusViewHeading();
  }

  function askConfirm(options) {
    ui.confirm = options;
    $('#confirm-title').textContent = options.title;
    $('#confirm-body').textContent = options.body;
    $('#confirm-ok').textContent = options.okLabel || 'Remove';
    $('#confirm-cancel').textContent = options.cancelLabel || 'Keep it';
    if (options.returnFocus !== undefined) ui.returnFocus = options.returnFocus;
    openDialog($('#confirm-dialog'), $('#confirm-cancel'));
  }

  /* ---------------------------------------------------------------
     Clip detail
     --------------------------------------------------------------- */

  function openDetail(id, returnFocusTo) {
    var doc = docById(id);
    if (!doc) {
      toast('That clip is no longer in the library.', { tone: 'error' });
      return;
    }
    ui.detailId = id;
    if (returnFocusTo !== undefined) ui.returnFocus = returnFocusTo;

    var query = state.query.trim();
    $('#detail-collection').textContent = doc.collection;
    $('#detail-title').innerHTML = highlightHtml(doc.title, query);

    var meta = [savedLabel(doc.savedAt), hostOf(doc.url), readingMinutes(doc) + ' min read'];
    if (doc.author) meta.splice(1, 0, doc.author);
    $('#detail-meta').textContent = meta.join(' · ');

    var note = $('#detail-note');
    if (doc.note.trim()) {
      note.innerHTML = highlightHtml(doc.note.trim(), query);
      note.classList.remove('detail__note--empty');
    } else {
      note.textContent = 'No note on this clip yet. Use Edit to add the reason you kept it.';
      note.classList.add('detail__note--empty');
    }

    var mine = highlightsFor(doc.id);
    var annotated = mine.filter(function (hl) { return hl.note.trim(); }).length;
    $('#detail-highlights').textContent = mine.length
      ? mine.length + ' ' + plural(mine.length, 'highlight', 'highlights') + ' in this piece, ' +
        annotated + ' with a note.'
      : 'Nothing highlighted here yet — open it in the reader and mark a passage.';

    $('#detail-url').textContent = doc.url;

    $('#detail-tags').innerHTML = doc.tags.length
      ? doc.tags.map(function (tag) { return '<span class="chip-static">' + escapeHtml(tag) + '</span>'; }).join('')
      : '<p class="hint">No tags on this clip.</p>';

    openDialog($('#detail-dialog'), $('#detail-title'));
  }

  /* ---------------------------------------------------------------
     Highlight note dialog
     --------------------------------------------------------------- */

  function openNote(id, options) {
    options = options || {};
    var hl = highlightById(id);
    if (!hl) {
      toast('That highlight is no longer here.', { tone: 'error' });
      return;
    }
    var doc = docById(hl.docId);
    ui.noteId = id;
    if (options.returnFocus !== undefined) ui.returnFocus = options.returnFocus;

    $('#note-error').hidden = true;
    $('#note-dialog-title').textContent = options.fresh ? 'Annotate this highlight' : 'Highlight';
    $('#note-dialog-sub').textContent = (doc ? 'In “' + doc.title + '”' : 'Document missing') +
      ' · highlighted ' + dayLabel(hl.createdAt);
    $('#note-quote').textContent = hl.quote;

    var place = doc ? CORE.resolveAnchor(doc, hl) : { status: 'detached' };
    var status = $('#note-anchor-status');
    if (place.status === 'detached') {
      status.textContent = 'This quote is no longer in the document text, so it cannot be shown in place. ' +
        'The highlight, its note and its review state are all kept.';
      status.classList.add('hint--warn');
    } else {
      status.textContent = 'Anchored to paragraph ' + (place.blockIndex + 1) +
        (place.status === 'moved' ? ', re-found by its surrounding text after an edit.' : '.');
      status.classList.remove('hint--warn');
    }

    $('#field-hl-note').value = hl.note;
    $('#field-hl-tags').value = hl.tags.join(', ');
    $('#error-hl-tags').hidden = true;
    updateNoteCount();

    var today = CORE.dateKey();
    var current = hl.review.state === 'hidden'
      ? 'hidden'
      : (hl.review.snoozeUntil && hl.review.snoozeUntil > today ? 'resting' : 'active');
    $$('input[name="hl-state"]').forEach(function (input) { input.checked = input.value === current; });
    updateStateHint();

    $('#note-goto').hidden = state.view === 'reader' && state.readerDocId === hl.docId;

    openDialog($('#note-dialog'), $('#field-hl-note'));
  }

  function updateNoteCount() {
    $('#hl-note-count').textContent = $('#field-hl-note').value.length + ' / 600';
  }

  function updateStateHint() {
    var checked = $('input[name="hl-state"]:checked');
    var value = checked ? checked.value : 'active';
    var hl = ui.noteId ? highlightById(ui.noteId) : null;
    var hint = $('#hl-state-hint');
    if (value === 'hidden') {
      hint.textContent = 'Hidden highlights never appear in Today. They stay searchable here.';
    } else if (value === 'resting') {
      hint.textContent = 'Rests until ' + keyLabel(CORE.shiftKey(CORE.dateKey(), CORE.KEEP_DAYS)) +
        ', then becomes eligible again.';
    } else if (hl && hl.review.snoozeUntil && hl.review.snoozeUntil > CORE.dateKey()) {
      hint.textContent = 'Choosing Active clears the current rest (' + restLabel(hl.review.snoozeUntil) + ').';
    } else {
      hint.textContent = 'Eligible for Today, at most one highlight per source per day.';
    }
  }

  function submitNote(event) {
    event.preventDefault();
    var hl = ui.noteId ? highlightById(ui.noteId) : null;
    if (!hl) {
      $('#note-dialog').close();
      toast('That highlight is no longer here.', { tone: 'error' });
      return;
    }

    var parsedTags = parseTags($('#field-hl-tags').value);
    if (parsedTags.error) {
      var error = $('#error-hl-tags');
      error.textContent = parsedTags.error;
      error.hidden = false;
      $('#field-hl-tags').setAttribute('aria-invalid', 'true');
      $('#field-hl-tags').focus();
      return;
    }
    $('#field-hl-tags').removeAttribute('aria-invalid');

    hl.note = $('#field-hl-note').value.trim().slice(0, 600);
    hl.tags = parsedTags.tags;

    var checked = $('input[name="hl-state"]:checked');
    var value = checked ? checked.value : 'active';
    if (value === 'hidden') {
      hl.review.state = 'hidden';
    } else if (value === 'resting') {
      hl.review.state = 'active';
      hl.review.snoozeUntil = CORE.shiftKey(CORE.dateKey(), CORE.KEEP_DAYS);
    } else {
      hl.review.state = 'active';
      hl.review.snoozeUntil = '';
    }

    persistAll();
    ensureToday();
    render();
    $('#note-dialog').close();
    toast('Highlight saved.');
  }

  function deleteHighlight(id, returnFocusTo) {
    var hl = highlightById(id);
    if (!hl) return;
    var index = state.highlights.indexOf(hl);

    askConfirm({
      title: 'Delete this highlight?',
      body: '“' + excerpt(hl.quote, '', 120) + '” and its note will be removed. You will get a short window to undo.',
      okLabel: 'Delete highlight',
      cancelLabel: 'Keep it',
      returnFocus: returnFocusTo,
      onConfirm: function () {
        state.highlights.splice(index, 1);
        persistAll();
        render();
        // The focused card or mark went with it; land where clip removal does.
        if (!document.activeElement || document.activeElement === document.body) {
          if (state.view === 'highlights') $('#hl-search').focus();
          else focusViewHeading();
        }
        toast('Highlight deleted.', {
          actionLabel: 'Undo',
          duration: UNDO_WINDOW,
          onAction: function () {
            state.highlights.splice(Math.min(index, state.highlights.length), 0, hl);
            persistAll();
            render();
            toast('Highlight restored.');
            ui.returnFocus = hl.id;
            restoreFocus();
          }
        });
      }
    });
  }

  /* ---------------------------------------------------------------
     Add / edit form
     --------------------------------------------------------------- */

  function renderCollectionOptions() {
    $('#field-collection').innerHTML = COLLECTIONS.map(function (name) {
      return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
    }).join('');
  }

  var FORM_FIELDS = ['url', 'title', 'note', 'body', 'tags'];

  function clearFormErrors() {
    FORM_FIELDS.forEach(function (name) {
      var error = $('#error-' + name);
      if (error) {
        error.hidden = true;
        error.textContent = '';
      }
      var input = $('#field-' + name);
      if (input) {
        input.removeAttribute('aria-invalid');
        input.setAttribute('aria-describedby', 'hint-' + name);
      }
    });
    var summary = $('#form-error-summary');
    summary.hidden = true;
    summary.innerHTML = '';
  }

  function showFieldError(name, message) {
    var error = $('#error-' + name);
    error.textContent = message;
    error.hidden = false;
    var input = $('#field-' + name);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'hint-' + name + ' error-' + name);
  }

  function showErrorSummary(title, errors, extraHtml) {
    var summary = $('#form-error-summary');
    var html = '<h3>' + escapeHtml(title) + '</h3>';
    if (errors && errors.length) {
      html += '<ul>' + errors.map(function (item) {
        return '<li><button type="button" class="link-btn" data-focus="field-' + item.field + '">' +
          escapeHtml(item.message) + '</button></li>';
      }).join('') + '</ul>';
    }
    if (extraHtml) html += extraHtml;
    summary.innerHTML = html;
    summary.hidden = false;
    summary.setAttribute('tabindex', '-1');
    summary.focus();
  }

  /*
   * The body field is plain text. `## ` marks a subhead and `> ` a pull quote,
   * so round-tripping a seeded piece through the editor keeps its shape.
   */
  function blocksToText(blocks) {
    return blocks.map(function (block) {
      if (block.type === 'h') return '## ' + block.text;
      if (block.type === 'q') return '> ' + block.text;
      return block.text;
    }).join('\n\n');
  }

  function bodyToText(doc) { return blocksToText(doc.body); }

  function parseBody(value) {
    return String(value || '')
      .split(/\n\s*\n/)
      .map(function (chunk) { return chunk.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean)
      .slice(0, 80)
      .map(function (text) {
        if (/^##\s+/.test(text)) return { type: 'h', text: text.replace(/^##\s+/, '').slice(0, 1200) };
        if (/^>\s+/.test(text)) return { type: 'q', text: text.replace(/^>\s+/, '').slice(0, 1200) };
        return { type: 'p', text: text.slice(0, 1200) };
      });
  }

  function openForm(mode, id) {
    var form = $('#clip-form');
    clearFormErrors();
    ui.editingId = mode === 'edit' ? id : null;

    if (mode === 'edit') {
      var doc = docById(id);
      if (!doc) {
        ui.editingId = null;
        ui.reopenDetailId = null;
        toast('That clip is no longer in the library.', { tone: 'error' });
        return;
      }
      $('#form-title').textContent = 'Edit clip';
      $('#form-sub').textContent = 'Changes stay in this browser. Nothing is published or synced.';
      $('#form-submit').textContent = 'Save changes';
      $('#field-url').value = doc.url;
      $('#field-title').value = doc.title;
      $('#field-note').value = doc.note;
      $('#field-body').value = bodyToText(doc);
      $('#field-tags').value = doc.tags.join(', ');
      $('#field-collection').value = doc.collection;

      var count = highlightsFor(id).length;
      $('#hint-body').innerHTML = (count
        ? 'Editing this text re-anchors the ' + count + ' ' + plural(count, 'highlight', 'highlights') +
          ' in this piece by quote and surrounding words; anything whose quote disappears is kept and marked ' +
          'detached rather than deleted. '
        : '') +
        'Blank lines separate paragraphs, <code>##</code> starts a subhead and <code>&gt;</code> a pull quote. ' +
        'Clearing the field replaces the text with a generated placeholder. ' +
        '<span id="body-count">0 / 6000</span>';
    } else {
      $('#form-title').textContent = 'Add a clip';
      $('#form-sub').textContent = 'Fictional links only. Nothing is fetched, uploaded or shared.';
      $('#form-submit').textContent = 'Save clip';
      form.reset();
      $('#field-collection').value = 'Reading queue';
      $('#hint-body').innerHTML = 'Optional. Nothing is ever fetched from the link, so leaving this empty makes the ' +
        'demo generate placeholder reading text on this device instead. Blank lines separate paragraphs, ' +
        '<code>##</code> starts a subhead and <code>&gt;</code> a pull quote. ' +
        '<span id="body-count">0 / 6000</span>';
    }
    updateNoteFieldCount();
    updateBodyCount();
    openDialog($('#form-dialog'), $('#field-url'));
  }

  function updateNoteFieldCount() {
    $('#note-count').textContent = $('#field-note').value.length + ' / 600';
  }

  function updateBodyCount() {
    var counter = $('#body-count');
    if (counter) counter.textContent = $('#field-body').value.length + ' / 6000';
  }

  /* Accepts "paper-kettle.example/x", "//x", or a full https URL. */
  function parseDemoUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return { error: 'Add a link — it is the one required part of a clip.' };

    var candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw.replace(/^\/+/, '');
    var url;
    try {
      url = new URL(candidate);
    } catch (err) {
      return { error: 'That does not look like a link. Try something like paper-kettle.example/the-long-middle.' };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { error: 'Only http and https links work here.' };
    }
    if (!url.hostname || url.hostname.indexOf('.') === -1) {
      return { error: 'Include a domain, for example paper-kettle.example/the-long-middle.' };
    }
    if (!/\.example$/i.test(url.hostname)) {
      return {
        error: 'This demo only accepts fictional links ending in .example — try ' +
          url.hostname.replace(/\.[a-z.]+$/i, '') + '.example' + (url.pathname === '/' ? '' : url.pathname) + '.'
      };
    }
    return { url: url.href };
  }

  function parseTags(value) {
    var tags = String(value || '').split(',').map(function (tag) {
      return tag.trim().replace(/\s+/g, ' ').toLowerCase();
    }).filter(Boolean);

    var unique = [];
    tags.forEach(function (tag) { if (unique.indexOf(tag) === -1) unique.push(tag); });

    if (unique.length > 5) return { error: 'Five tags is the limit here — you have ' + unique.length + '.' };
    var tooLong = unique.filter(function (tag) { return tag.length > 24; });
    if (tooLong.length) return { error: 'Keep each tag under 24 characters (“' + tooLong[0] + '” is longer).' };
    return { tags: unique };
  }

  function validateForm() {
    var errors = [];
    var parsedUrl = parseDemoUrl($('#field-url').value);
    if (parsedUrl.error) errors.push({ field: 'url', message: parsedUrl.error });

    var title = $('#field-title').value.trim().replace(/\s+/g, ' ');
    if (!title) errors.push({ field: 'title', message: 'Give the clip a title you would recognise in a list.' });

    var parsedTags = parseTags($('#field-tags').value);
    if (parsedTags.error) errors.push({ field: 'tags', message: parsedTags.error });

    var duplicate = null;
    if (!parsedUrl.error) {
      duplicate = state.docs.filter(function (doc) {
        return doc.url.toLowerCase() === parsedUrl.url.toLowerCase() && doc.id !== ui.editingId;
      })[0] || null;
    }

    return {
      errors: errors,
      duplicate: duplicate,
      values: {
        url: parsedUrl.url,
        title: title,
        note: $('#field-note').value.trim(),
        body: parseBody($('#field-body').value),
        tags: parsedTags.tags || [],
        collection: $('#field-collection').value
      }
    };
  }

  /* A deliberately fake save so the pending and error states are real. */
  function fakeSave() {
    return new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        if (state.simulateFailure) {
          reject(new Error('Simulated failure: the demo could not write this clip.'));
        } else {
          resolve();
        }
      }, SAVE_LATENCY);
    });
  }

  function submitForm(event) {
    event.preventDefault();
    clearFormErrors();

    var result = validateForm();

    if (result.errors.length) {
      result.errors.forEach(function (item) { showFieldError(item.field, item.message); });
      showErrorSummary(
        result.errors.length === 1 ? 'One thing needs a fix' : result.errors.length + ' things need a fix',
        result.errors
      );
      return;
    }

    if (result.duplicate) {
      showFieldError('url', 'You already saved this link.');
      showErrorSummary('This link is already in your library', null,
        '<p><button type="button" class="link-btn" data-open-duplicate="' + escapeHtml(result.duplicate.id) + '">' +
        'Open “' + escapeHtml(result.duplicate.title) + '” instead</button></p>');
      return;
    }

    var submit = $('#form-submit');
    var label = submit.textContent;
    // The form can close while this is in flight; that cancels the save.
    var session = ui.formSession;
    var editingId = ui.editingId;
    ui.savePending = true;
    submit.disabled = true;
    submit.textContent = 'Saving…';

    fakeSave().then(function () {
      if (session !== ui.formSession || !$('#form-dialog').open) return;
      ui.savePending = false;
      submit.disabled = false;
      submit.textContent = label;

      if (editingId) {
        saveEdit(editingId, result.values);
      } else {
        saveNew(result.values);
      }
    }).catch(function (err) {
      if (session !== ui.formSession || !$('#form-dialog').open) return;
      ui.savePending = false;
      submit.disabled = false;
      submit.textContent = label;
      showErrorSummary('That save did not go through', null,
        '<p>' + escapeHtml(err.message) + ' Your text is still here — choose <strong>' + escapeHtml(label) +
        '</strong> to try again, or turn off “Simulate a save failure” in Demo controls.</p>');
    });
  }

  function saveEdit(id, values) {
    var doc = docById(id);
    if (!doc) {
      showErrorSummary('That clip is no longer in your library', null,
        '<p>It was removed while this form was open, so there is nothing to update. ' +
        'Close the form and add it again if you still want it.</p>');
      return;
    }

    var bodyChanged = bodyToText(doc) !== blocksToText(values.body);

    doc.url = values.url;
    doc.title = values.title;
    doc.note = values.note;
    doc.tags = values.tags;
    doc.collection = values.collection;

    var regenerated = false;
    if (bodyChanged) {
      if (values.body.length) {
        doc.body = values.body;
        doc.bodySource = 'typed';
      } else {
        // Cleared on purpose: every document keeps something readable.
        doc.body = CORE.generateBody(doc.title, doc.url);
        doc.bodySource = 'generated';
        regenerated = true;
      }
    } else if (!doc.body.length) {
      doc.body = CORE.generateBody(doc.title, doc.url);
      doc.bodySource = 'generated';
      regenerated = true;
    }

    var detached = 0;
    if (bodyChanged || regenerated) {
      highlightsFor(doc.id).forEach(function (hl) {
        if (CORE.reanchor(doc, hl).status === 'detached') detached++;
      });
    }

    persistAll();
    clearResolved();
    render();
    $('#form-dialog').close();

    var message = 'Changes saved.';
    if (regenerated) message += ' The reading text was empty, so a placeholder passage was generated.';
    if (detached) {
      message += ' ' + detached + ' ' + plural(detached, 'highlight', 'highlights') +
        ' no longer match the text and are marked detached — nothing was deleted.';
    }
    toast(message, { duration: detached || regenerated ? 9000 : 5000 });
  }

  function saveNew(values) {
    var generated = !values.body.length;
    var fresh = CORE.normaliseDoc({
      id: CORE.nextId('doc', state.docs),
      title: values.title,
      url: values.url,
      author: '',
      publishedAt: '',
      note: values.note,
      tags: values.tags,
      collection: values.collection,
      savedAt: new Date().toISOString(),
      body: generated ? CORE.generateBody(values.title, values.url) : values.body,
      bodySource: generated ? 'generated' : 'typed'
    }, COLLECTIONS);

    state.docs.push(fresh);
    persistAll();
    ui.justAddedId = fresh.id;
    render();
    ui.returnFocus = null;   // afterAdd moves focus to the new card, not back to Add a clip
    $('#form-dialog').close();
    afterAdd(fresh, generated);
  }

  function afterAdd(doc, generated) {
    var message = 'Clip saved: “' + doc.title + '”.' +
      (generated ? ' Placeholder reading text was generated so you can highlight it.' : '');
    var isVisible = visibleDocs().some(function (item) { return item.id === doc.id; });

    if (isVisible) {
      toast(message, {
        duration: 7000,
        actionLabel: 'Read it',
        onAction: function () { go(routeFor('reader', doc.id)); }
      });
      var card = document.querySelector('[data-focus-id="' + doc.id + '"]');
      if (card) {
        card.focus();
        card.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    } else {
      toast('Clip saved, but your current search or filters hide it.', {
        actionLabel: 'Show it',
        duration: 9000,
        onAction: function () {
          clearAll();
          ui.justAddedId = doc.id;
          render();
          var fresh = document.querySelector('[data-focus-id="' + doc.id + '"]');
          if (fresh) fresh.focus();
        }
      });
      $('#search').focus();
    }
  }

  /* ---------------------------------------------------------------
     Removal with undo
     --------------------------------------------------------------- */

  function askRemoveDoc(id, returnFocusTo) {
    var doc = docById(id);
    if (!doc) return;
    var count = highlightsFor(id).length;

    askConfirm({
      title: 'Remove this clip?',
      body: '“' + doc.title + '” will leave the library' +
        (count ? ', along with its ' + count + ' ' + plural(count, 'highlight', 'highlights') : '') +
        '. You will get a short window to undo.',
      okLabel: 'Remove clip',
      cancelLabel: 'Keep it',
      returnFocus: returnFocusTo,
      onConfirm: function () { removeDoc(id); }
    });
  }

  function removeDoc(id) {
    var index = -1;
    state.docs.forEach(function (doc, i) { if (doc.id === id) index = i; });
    if (index === -1) return;

    var removedDoc = state.docs.splice(index, 1)[0];
    var removedHighlights = [];
    state.highlights = state.highlights.filter(function (hl) {
      if (hl.docId === id) { removedHighlights.push(hl); return false; }
      return true;
    });

    persistAll();
    if (state.view === 'reader' && state.readerDocId === id) {
      go(routeFor('library'));
    } else {
      render();
    }

    if (!document.activeElement || document.activeElement === document.body) {
      var search = $('#search');
      if (search && !$('#view-library').hidden) search.focus();
    }

    toast('Removed “' + removedDoc.title + '”' +
      (removedHighlights.length ? ' and its ' + removedHighlights.length + ' ' +
        plural(removedHighlights.length, 'highlight', 'highlights') : '') + '.', {
      actionLabel: 'Undo',
      duration: UNDO_WINDOW,
      onAction: function () {
        state.docs.splice(Math.min(index, state.docs.length), 0, removedDoc);
        removedHighlights.forEach(function (hl) { state.highlights.push(hl); });
        persistAll();
        ui.justAddedId = removedDoc.id;
        render();
        toast('Restored “' + removedDoc.title + '”.');
        var card = document.querySelector('[data-focus-id="' + removedDoc.id + '"]');
        if (card) card.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     Export / import
     --------------------------------------------------------------- */

  function downloadFile(filename, text, type) {
    try {
      var blob = new Blob([text], { type: type });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (err) {
      return false;
    }
  }

  function stamp() {
    return CORE.dateKey();
  }

  function exportJson() {
    var text = CORE.toJSON(state.docs, state.highlights);
    if (downloadFile('magpie-demo-' + stamp() + '.json', text, 'application/json')) {
      toast('JSON export downloaded. Import it back to check the round trip.');
    } else {
      toast('This browser blocked the download. Use Copy JSON instead.', { tone: 'error' });
    }
  }

  function exportMarkdown() {
    var text = CORE.toMarkdown(state.docs, state.highlights, function (doc, hl) {
      return CORE.resolveAnchor(doc, hl).status;
    });
    if (downloadFile('magpie-demo-' + stamp() + '.md', text, 'text/markdown')) {
      toast('Markdown export downloaded.');
    } else {
      toast('This browser blocked the download.', { tone: 'error' });
    }
  }

  function copyJson() {
    var text = CORE.toJSON(state.docs, state.highlights);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('JSON copied to your clipboard.');
      }).catch(function () {
        $('#import-text').value = text;
        toast('Could not reach the clipboard, so the JSON was put in the paste box instead.', { tone: 'error' });
      });
    } else {
      $('#import-text').value = text;
      toast('No clipboard access here, so the JSON was put in the paste box instead.', { tone: 'error' });
    }
  }

  function runImport() {
    var error = $('#import-error');
    error.hidden = true;
    var text = $('#import-text').value.trim();
    if (!text) {
      error.innerHTML = '<h3>Nothing to import</h3><p>Choose a JSON file or paste an export into the box.</p>';
      error.hidden = false;
      error.setAttribute('tabindex', '-1');
      error.focus();
      return;
    }

    var parsed = CORE.fromJSON(text, COLLECTIONS);
    if (parsed.error) {
      error.innerHTML = '<h3>That import did not go through</h3><p>' + escapeHtml(parsed.error) + '</p>';
      error.hidden = false;
      error.setAttribute('tabindex', '-1');
      error.focus();
      return;
    }

    var backup = {
      docs: state.docs,
      highlights: state.highlights,
      today: state.prefs.today || null
    };

    state.docs = parsed.docs;
    state.highlights = parsed.highlights;
    state.warnings = parsed.warnings;
    state.prefs.today = null;   // the day's set is rebuilt from the imported highlights
    clearAll();
    persistAll();
    persistPrefs();
    $('#data-dialog').close();
    go(routeFor('library'));
    render();

    toast('Imported ' + parsed.docs.length + ' ' + plural(parsed.docs.length, 'document', 'documents') +
      ' and ' + parsed.highlights.length + ' ' + plural(parsed.highlights.length, 'highlight', 'highlights') + '.', {
      actionLabel: 'Undo',
      duration: UNDO_WINDOW,
      onAction: function () {
        state.docs = backup.docs;
        state.highlights = backup.highlights;
        state.prefs.today = backup.today;
        state.warnings = [];
        persistAll();
        persistPrefs();
        render();
        toast('Import undone — your previous demo data is back.');
      }
    });
  }

  /* ---------------------------------------------------------------
     Filter actions
     --------------------------------------------------------------- */

  function clearAll() {
    state.query = '';
    state.collection = 'all';
    state.tags = [];
    state.onlyNotes = false;
    state.onlyHighlighted = false;
    $('#search').value = '';
    $('#hl-search').value = '';
    $('#only-notes').checked = false;
    $('#only-highlighted').checked = false;
  }

  function setQuery(value, origin) {
    state.query = value;
    if (origin !== 'library') $('#search').value = value;
    if (origin !== 'highlights') $('#hl-search').value = value;
    clearResolved();
    if (state.view === 'library') renderLibrary();
    else if (state.view === 'highlights') renderHighlights();
    else render();
  }

  function restoreDemo() {
    var seeded = CORE.seededLibrary(COLLECTIONS);
    state.docs = seeded.docs;
    state.highlights = seeded.highlights;
    state.warnings = [];
    state.prefs.today = null;
    ui.todayUndo = {};
    persistAll();
    clearAll();
    persistPrefs();

    if (state.view === 'reader' && !docById(state.readerDocId)) {
      go(routeFor('library'));   // the piece being read is not part of the demo set
    } else {
      render();
    }
    toast('The eight fictional demo pieces and their ' + seeded.highlights.length + ' highlights are back.');
    if (state.view === 'library') $('#search').focus();
  }

  /* ---------------------------------------------------------------
     Wiring
     --------------------------------------------------------------- */

  function wire() {
    /* Header, nav and guide */
    $('#add-clip').addEventListener('click', function () {
      ui.returnFocus = $('#add-clip');
      openForm('add');
    });

    $('.viewnav__inner').addEventListener('click', function (event) {
      var tab = event.target.closest('[data-view]');
      if (!tab) return;
      go(routeFor(tab.getAttribute('data-view')));
    });

    $('#dismiss-guide').addEventListener('click', function () {
      state.guideHidden = true;
      persistPrefs();
      renderGuide();
      $('#show-guide').focus();
    });
    $('#show-guide').addEventListener('click', function () {
      state.guideHidden = false;
      persistPrefs();
      if (state.view !== 'library') go(routeFor('library'));
      renderGuide();
      $('#dismiss-guide').focus();
    });

    /* Search (two inputs, one query) */
    function wireSearch(input, clearButton, origin) {
      input.addEventListener('input', function (event) {
        var value = event.target.value;
        if (ui.searchTimer) window.clearTimeout(ui.searchTimer);
        ui.searchTimer = window.setTimeout(function () { setQuery(value, origin); }, 180);
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && event.target.value) {
          event.preventDefault();
          event.target.value = '';
          setQuery('', origin);
        }
      });
      clearButton.addEventListener('click', function () {
        input.value = '';
        setQuery('', origin);
        input.focus();
      });
    }
    wireSearch($('#search'), $('#clear-search'), 'library');
    wireSearch($('#hl-search'), $('#hl-clear-search'), 'highlights');

    /* Library filters */
    $('#collection-filter').addEventListener('change', function (event) {
      if (event.target.name !== 'collection') return;
      state.collection = event.target.value;
      renderActiveFilters();
      renderClips();
    });

    $('#tag-filter').addEventListener('click', function (event) {
      var chip = event.target.closest('[data-tag]');
      if (!chip) return;
      var tag = chip.getAttribute('data-tag');
      var at = state.tags.indexOf(tag);
      if (at === -1) state.tags.push(tag); else state.tags.splice(at, 1);
      chip.setAttribute('aria-pressed', String(at === -1));
      renderActiveFilters();
      renderClips();
    });

    $('#only-notes').addEventListener('change', function (event) {
      state.onlyNotes = event.target.checked;
      renderActiveFilters();
      renderClips();
    });

    $('#only-highlighted').addEventListener('change', function (event) {
      state.onlyHighlighted = event.target.checked;
      renderActiveFilters();
      renderClips();
    });

    $('#sort').addEventListener('change', function (event) {
      state.sort = event.target.value;
      persistPrefs();
      renderClips();
    });

    $('#clear-filters').addEventListener('click', function () {
      clearAll();
      render();
      $('#search').focus();
    });

    $('#active-filters').addEventListener('click', function (event) {
      var pill = event.target.closest('[data-kind]');
      if (!pill) return;
      var kind = pill.getAttribute('data-kind');
      if (kind === 'query') { state.query = ''; $('#search').value = ''; $('#hl-search').value = ''; }
      if (kind === 'collection') state.collection = 'all';
      if (kind === 'notes') { state.onlyNotes = false; $('#only-notes').checked = false; }
      if (kind === 'highlighted') { state.onlyHighlighted = false; $('#only-highlighted').checked = false; }
      if (kind === 'tag') {
        var at = state.tags.indexOf(pill.getAttribute('data-value'));
        if (at !== -1) state.tags.splice(at, 1);
      }
      render();
      $('#search').focus();
    });

    /* Clip list */
    $('#clips').addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      if (action === 'open') openDetail(id, id);
      if (action === 'read') go(routeFor('reader', id));
      if (action === 'edit') { ui.returnFocus = id; openForm('edit', id); }
      if (action === 'remove') askRemoveDoc(id, id);
    });

    $('#library-crosslink').addEventListener('click', function (event) {
      if (event.target.closest('[data-action="see-highlights"]')) go(routeFor('highlights'));
    });
    $('#highlights-crosslink').addEventListener('click', function (event) {
      if (event.target.closest('[data-action="see-library"]')) go(routeFor('library'));
    });

    /* Arrow keys walk a list of cards. */
    function wireArrowKeys(container, selector) {
      container.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        var items = $$(selector);
        var active = document.activeElement;
        var at = items.indexOf(active.closest ? (active.closest(selector) || active) : active);
        if (at === -1) return;
        event.preventDefault();
        var next = items[at + (event.key === 'ArrowDown' ? 1 : -1)];
        if (next) next.focus();
      });
    }
    wireArrowKeys($('#clips'), '#clips [data-action="open"]');
    wireArrowKeys($('#highlight-list'), '#highlight-list [data-action="open-note"].hcard__open');

    /* Empty-state buttons, wherever they appear */
    document.addEventListener('click', function (event) {
      var button = event.target.closest('.empty [data-action], .reader__missing [data-action]');
      if (!button) return;
      var action = button.getAttribute('data-action');
      if (action === 'add') { ui.returnFocus = $('#add-clip'); openForm('add'); }
      if (action === 'clear') { clearAll(); render(); $('#search').focus(); }
      if (action === 'clear-hl') {
        clearAll();
        state.hlDoc = 'all';
        state.hlState = 'all';
        persistPrefs();
        render();
        $('#hl-search').focus();
      }
      if (action === 'restore') restoreDemo();
      if (action === 'go-library' || action === 'back-to-library') go(routeFor('library'));
      if (action === 'go-highlights') go(routeFor('highlights'));
    });

    /* Reader */
    $('#reader-back').addEventListener('click', function () {
      go(ui.backRoute || routeFor('library'));
    });

    $('#reader-details').addEventListener('click', function () {
      openDetail(state.readerDocId, $('#reader-details'));
    });

    // Keep the text selection alive when the button takes focus.
    $('#reader-highlight').addEventListener('mousedown', function (event) { event.preventDefault(); });
    $('#reader-highlight').addEventListener('click', highlightFromSelection);

    document.addEventListener('selectionchange', function () {
      if (state.view !== 'reader') return;
      updateSelectionState();
    });

    $('#reader-body').addEventListener('click', function (event) {
      var mark = event.target.closest('[data-hl]');
      if (mark) {
        var markId = mark.getAttribute('data-hl');
        openNote(markId, { returnFocus: markId });
        return;
      }
      var markButton = event.target.closest('[data-mark-block]');
      if (markButton) openPassage(Number(markButton.getAttribute('data-mark-block')), markButton);
    });

    $('#reader-body').addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var mark = event.target.closest('[data-hl]');
      if (!mark) return;
      event.preventDefault();
      openNote(mark.getAttribute('data-hl'), { returnFocus: mark.getAttribute('data-hl') });
    });

    $('#reader-side-list').addEventListener('click', function (event) {
      var jump = event.target.closest('[data-jump]');
      if (!jump) return;
      var id = jump.getAttribute('data-jump');
      var el = document.getElementById('hl-' + id);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        el.focus();
      } else {
        openNote(id, { returnFocus: jump });
      }
    });

    /* Highlights view */
    $('#hl-doc').addEventListener('change', function (event) {
      state.hlDoc = event.target.value;
      renderHighlights();
    });
    $('#hl-state').addEventListener('change', function (event) {
      state.hlState = event.target.value;
      persistPrefs();
      renderHighlights();
    });
    $('#hl-sort').addEventListener('change', function (event) {
      state.hlSort = event.target.value;
      persistPrefs();
      renderHighlights();
    });

    $('#highlight-list').addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      if (action === 'open-note') openNote(id, { returnFocus: id });
      if (action === 'delete') deleteHighlight(id, id);
      if (action === 'jump') jumpToHighlight(id);
    });

    /* Today */
    $('#today-list').addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      if (action === 'keep' || action === 'later' || action === 'hide') reviewToday(id, action);
      if (action === 'undo-review') undoReview(id);
      if (action === 'jump') jumpToHighlight(id);
      if (action === 'open-note') openNote(id, { returnFocus: id });
    });

    /* Detail dialog */
    $('#detail-close').addEventListener('click', function () { $('#detail-dialog').close(); });

    $('#detail-dialog').addEventListener('click', function (event) {
      if (event.target === $('#detail-dialog')) $('#detail-dialog').close();
    });

    $('#detail-dialog').addEventListener('close', function () {
      if (ui.reopenDetailId) return;  // an edit is taking over
      restoreFocus();
    });

    $('#copy-url').addEventListener('click', function () {
      var url = $('#detail-url').textContent;
      var done = function () { toast('Link copied to your clipboard.'); };
      var failed = function () {
        toast('Could not reach the clipboard — select the link text to copy it.', { tone: 'error' });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(failed);
      } else {
        failed();
      }
    });

    $('#read-clip').addEventListener('click', function () {
      var id = ui.detailId;
      ui.returnFocus = null;
      $('#detail-dialog').close();
      go(routeFor('reader', id));
    });

    $('#edit-clip').addEventListener('click', function () {
      ui.reopenDetailId = ui.detailId;
      var back = ui.returnFocus;
      $('#detail-dialog').close();
      ui.returnFocus = back;
      openForm('edit', ui.detailId);
    });

    $('#remove-clip').addEventListener('click', function () {
      askRemoveDoc(ui.detailId);
    });

    /* Form dialog */
    $('#clip-form').addEventListener('submit', submitForm);
    $('#field-note').addEventListener('input', updateNoteFieldCount);
    $('#field-body').addEventListener('input', updateBodyCount);

    $('#form-close').addEventListener('click', function () { $('#form-dialog').close(); });
    $('#form-cancel').addEventListener('click', function () { $('#form-dialog').close(); });

    $('#form-dialog').addEventListener('close', function () {
      ui.formSession += 1;
      if (ui.savePending) {
        ui.savePending = false;
        $('#form-submit').disabled = false;
        toast('Save cancelled. Nothing was changed.');
      }
      var reopen = ui.reopenDetailId;
      ui.reopenDetailId = null;
      ui.editingId = null;
      if (reopen && docById(reopen)) {
        openDetail(reopen);
      } else {
        restoreFocus();
      }
    });

    $('#form-error-summary').addEventListener('click', function (event) {
      var focusTarget = event.target.closest('[data-focus]');
      if (focusTarget) {
        var field = document.getElementById(focusTarget.getAttribute('data-focus'));
        if (field) field.focus();
        return;
      }
      var dup = event.target.closest('[data-open-duplicate]');
      if (dup) {
        var id = dup.getAttribute('data-open-duplicate');
        ui.reopenDetailId = null;
        $('#form-dialog').close();
        openDetail(id, id);
      }
    });

    /* Highlight note dialog */
    $('#note-form').addEventListener('submit', submitNote);
    $('#field-hl-note').addEventListener('input', updateNoteCount);
    $$('input[name="hl-state"]').forEach(function (input) {
      input.addEventListener('change', updateStateHint);
    });
    $('#note-close').addEventListener('click', function () { $('#note-dialog').close(); });
    $('#note-dialog').addEventListener('close', function () {
      ui.noteId = null;
      restoreFocus();
    });
    $('#note-delete').addEventListener('click', function () {
      var id = ui.noteId;
      $('#note-dialog').close();
      deleteHighlight(id, id);
    });
    $('#note-goto').addEventListener('click', function () {
      var id = ui.noteId;
      ui.returnFocus = null;
      $('#note-dialog').close();
      jumpToHighlight(id);
    });

    /* Passage dialog */
    $('#passage-form').addEventListener('submit', submitPassage);
    $('#passage-list').addEventListener('change', updatePassagePreview);
    $('#passage-close').addEventListener('click', function () { $('#passage-dialog').close(); });
    $('#passage-cancel').addEventListener('click', function () { $('#passage-dialog').close(); });
    $('#passage-dialog').addEventListener('close', function () {
      ui.passage = null;
      restoreFocus();
    });

    /* Export & import */
    $('#open-data').addEventListener('click', function () {
      ui.returnFocus = $('#open-data');
      $('#import-error').hidden = true;
      openDialog($('#data-dialog'), $('#export-json'));
    });
    $('#data-close').addEventListener('click', function () { $('#data-dialog').close(); });
    $('#data-dialog').addEventListener('close', restoreFocus);
    $('#export-json').addEventListener('click', exportJson);
    $('#export-markdown').addEventListener('click', exportMarkdown);
    $('#copy-json').addEventListener('click', copyJson);
    $('#import-run').addEventListener('click', runImport);
    $('#import-file').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        $('#import-text').value = String(reader.result || '');
        toast('File read into the paste box. Choose Replace demo data to apply it.');
      };
      reader.onerror = function () {
        toast('That file could not be read in this browser.', { tone: 'error' });
      };
      reader.readAsText(file);
    });

    /* Confirm dialog */
    $('#confirm-cancel').addEventListener('click', function () { $('#confirm-dialog').close(); });
    $('#confirm-ok').addEventListener('click', function () {
      var action = ui.confirm;
      $('#confirm-dialog').close('confirmed');
      if ($('#detail-dialog').open) {
        ui.reopenDetailId = null;
        ui.returnFocus = null;
        $('#detail-dialog').close();
      }
      if (action && typeof action.onConfirm === 'function') action.onConfirm();
    });
    $('#confirm-dialog').addEventListener('close', function () {
      var confirmed = $('#confirm-dialog').returnValue === 'confirmed';
      ui.confirm = null;
      $('#confirm-dialog').returnValue = '';
      if (!confirmed && !$('#detail-dialog').open) restoreFocus();
    });

    /* Demo controls */
    $('#simulate-failure').addEventListener('change', function (event) {
      state.simulateFailure = event.target.checked;
      toast(state.simulateFailure
        ? 'Saving will now fail on purpose, so you can see the error state.'
        : 'Saving works normally again.');
    });

    $('#restore-demo').addEventListener('click', restoreDemo);

    $('#remove-all').addEventListener('click', function () {
      if (!state.docs.length && !state.highlights.length) {
        toast('There is nothing to remove — the demo is already empty.');
        return;
      }
      var backup = { docs: state.docs.slice(), highlights: state.highlights.slice(), today: state.prefs.today };
      state.docs = [];
      state.highlights = [];
      state.prefs.today = null;
      persistAll();
      persistPrefs();
      clearAll();
      render();
      toast('Removed every document and highlight.', {
        actionLabel: 'Undo',
        duration: UNDO_WINDOW,
        onAction: function () {
          state.docs = backup.docs;
          state.highlights = backup.highlights;
          state.prefs.today = backup.today;
          persistAll();
          persistPrefs();
          render();
          toast('Everything is back.');
        }
      });
    });

    /* Global shortcuts */
    document.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      var target = event.target;
      var typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable);
      if (typing) return;

      var key = String(event.key || '').toLowerCase();
      if (event.key === '/') {
        event.preventDefault();
        var input = state.view === 'highlights' ? $('#hl-search') : $('#search');
        if (state.view !== 'highlights' && state.view !== 'library') {
          go(routeFor('library'));
          input = $('#search');
        }
        input.focus();
        input.select();
      } else if (key === 'n') {
        event.preventDefault();
        ui.returnFocus = (document.activeElement && document.activeElement !== document.body)
          ? document.activeElement
          : $('#add-clip');
        openForm('add');
      } else if (key === 'l') {
        event.preventDefault();
        go(routeFor('library'));
      } else if (key === 't') {
        event.preventDefault();
        go(routeFor('today'));
      } else if (key === 'h') {
        event.preventDefault();
        go(routeFor('highlights'));
      }
    });

    window.addEventListener('hashchange', applyRoute);

    /* Phones start with filters collapsed so the list is reachable. */
    if (window.matchMedia('(max-width: 719px)').matches) {
      $('#filters-panel').open = false;
    }
  }

  function jumpToHighlight(id) {
    var hl = highlightById(id);
    if (!hl) return;
    if (!docById(hl.docId)) {
      toast('The document for that highlight is no longer here.', { tone: 'error' });
      return;
    }
    go(routeFor('reader', hl.docId, id));
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */

  function boot() {
    CORE.storage.onFailure = function () { renderBanners(); };
    loadAll();
    renderCollectionOptions();
    $('#sort').value = state.sort;
    $('#only-notes').checked = state.onlyNotes;
    $('#only-highlighted').checked = state.onlyHighlighted;
    wire();

    // Draw (or top up) today's set once, so the Today count is right everywhere.
    ensureToday();

    if (!window.location.hash) {
      try {
        window.history.replaceState(null, '', '#/library');
      } catch (err) {
        // Some browsers refuse replaceState on a file:// page; a hash works fine.
        window.location.hash = '#/library';
      }
    }
    applyRoute();
    ui.booted = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
