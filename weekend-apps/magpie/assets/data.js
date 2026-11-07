/*
 * Seed content for the Magpie reader demo.
 *
 * Everything in this file is invented for the prototype: the titles, the body
 * text, the publications and the people. All links use the reserved `.example`
 * suffix so nothing can resolve to a real site, and nothing here comes from a
 * private collection or a real publication.
 *
 * Shapes
 *   document  { id, title, url, author, publishedAt, note, tags[], collection,
 *               savedAt, body: [{ type: 'p' | 'h' | 'q', text }] }
 *   highlight { id, docId, quote, note, tags[], createdAt, state }
 *
 * Seed highlights carry only a quote. The app resolves each one against the
 * document text at load time and stores the resulting anchor (block, offsets,
 * prefix, suffix), so a mistyped seed quote shows up as a detached highlight
 * rather than silently pointing at the wrong words.
 */
window.MAGPIE_DATA = (function () {
  'use strict';

  var COLLECTIONS = ['Reading queue', 'Craft & process', 'Field notes', 'Work', 'Unfiled'];

  function p(text) { return { type: 'p', text: text }; }
  function h(text) { return { type: 'h', text: text }; }
  function q(text) { return { type: 'q', text: text }; }

  var DOCS = [
    {
      id: 'seed-quiet-interfaces',
      title: 'A short field guide to quiet interfaces',
      url: 'https://slowcraft.example/quiet-interfaces',
      author: 'Ines Hollowell',
      publishedAt: '2026-09-30',
      note: 'Argues that an interface earns attention by spending less of it. The section on "one loud thing per screen" is the bit I keep coming back to — useful whenever a layout starts shouting.',
      tags: ['design', 'calm tech'],
      collection: 'Craft & process',
      savedAt: '2026-10-14T09:20:00.000Z',
      body: [
        p('A quiet interface is not a minimal one. Minimalism is a look; quiet is a budget. Every element on a screen spends some of the reader’s attention, and the question a quiet interface keeps asking is whether the spend was worth it. A dense table can be quiet. A page with four words and an animation can be deafening.'),
        h('One loud thing per screen'),
        p('The rule I use with teams is blunt: one loud thing per screen. Decide what the screen is for, make that element unmistakable, and then insist that everything else stays a step behind it. Loudness is relative, which is why the rule works at all. You do not have to make the primary action enormous. You only have to stop the other nine elements from competing with it.'),
        p('The failure mode is additive. Each new feature arrives with a reasonable claim on attention, each claim is granted by a different person in a different week, and a year later the screen shouts in nine directions at once. Nobody decided this. It is simply what happens when attention has no budget and no owner.'),
        h('Spend the loud register carefully'),
        p('Quiet is not free and it is not uniformly good. An interface that hides a destructive action in soft grey is not calm, it is evasive. Reserve your loudest register for the irreversible: deleting, publishing, paying, sending. Anything that can be undone can afford to be whispered.'),
        p('Here is an audit that costs nothing. Screenshot the page, blur it until the words disappear, and look at what still pulls your eye. If the thing that survives the blur is not the thing the screen is for, you have found your rewrite, and you found it in under a minute.'),
        q('The measure of a calm interface is not how little it contains, but how little it asks of someone who is tired.'),
        p('None of this requires a redesign. Most of the quiet I have won on real projects came from removing one border, demoting one button, and deleting a sentence that explained a feature nobody had asked about.')
      ]
    },
    {
      id: 'seed-commonplace',
      title: 'Notes on keeping a commonplace book',
      url: 'https://margin-ink.example/commonplace-book',
      author: 'Marta Veiga',
      publishedAt: '2026-09-18',
      note: 'A very practical case for writing the note in your own words rather than quoting. Claims that a quote you did not rephrase is a quote you will never find again.',
      tags: ['writing', 'memory'],
      collection: 'Reading queue',
      savedAt: '2026-10-11T18:05:00.000Z',
      body: [
        p('A commonplace book is not a diary and not an archive. It is a workbench. You copy in the sentences you want to keep, and then — this is the part everyone skips — you write down what you think they mean. The copying is the cheap half of the work and it is the half that feels productive, which is the trap.'),
        p('A quote you did not rephrase is a quote you will never find again. You will remember that somebody said something clever about attention, and you will search for “attention” across six years of notes, and you will find four hundred entries, every one of them in someone else’s vocabulary.'),
        h('Write the sentence you will search for'),
        p('The habit that fixed this for me is small. Under every quotation I write one line beginning “This matters because…”. The line is usually clumsy. Clumsy is fine, and clumsy is in fact the point: it is written in my own words, which means it is written in the words I will go looking with in three years.'),
        p('Dates help more than categories. A category is a guess about your future self’s filing habits. A date is a fact, and it lets you reconstruct what else you were reading that month, which is much closer to how remembering actually works.'),
        h('On rereading your own book'),
        p('Twice a year I read the whole book from the start. It takes an afternoon and it is reliably the most useful afternoon in my calendar. Perhaps a tenth of the entries still look true. A few have quietly become opinions I hold, and I had entirely forgotten where I got them.'),
        q('Keep the book badly rather than not at all. A shelf of imperfect notebooks beats a perfect system you abandoned in March.')
      ]
    },
    {
      id: 'seed-filing',
      title: 'Why your filing system keeps collapsing',
      url: 'https://lumen-letters.example/filing-systems',
      author: 'Dov Perrin',
      publishedAt: '2026-09-05',
      note: 'Folders fail because they ask you to guess your future self\'s category. Search plus a handful of loose tags survives longer. Good counter-argument to building deep hierarchies.',
      tags: ['organising', 'research'],
      collection: 'Craft & process',
      savedAt: '2026-10-08T07:40:00.000Z',
      body: [
        p('Every few years I rebuild my filing system, and every few years it collapses in the same way. The folders are fine for a month. Then an item arrives that plainly belongs in two of them, I make a judgement call in four seconds, and that judgement call is the first crack in the wall.'),
        p('Folders ask you to guess your future self’s category. The guess is made at the worst possible moment: when you are busy, mid-task, and thinking about the thing in front of you rather than about retrieval. You are predicting a question you will ask in three years while answering an email you resent.'),
        h('Search plus a few loose tags'),
        p('Search plus a handful of loose tags survives longer than a hierarchy, for an unglamorous reason: it fails softly. A bad tag costs you nothing. A bad folder hides a document completely, and hides the fact that it is hidden.'),
        p('Hierarchies are not useless. They are excellent for things with genuinely stable structure — accounts, tax years, projects with an end date written on them. They are terrible for ideas, because ideas keep acquiring new neighbours and refuse to stay where you filed them.'),
        p('The test I now apply before building any structure: can I name the top level without hesitating, and will those names still be right in two years? If the answer is no, I keep a flat pile and spend the effort on better notes instead.'),
        q('A filing system is a bet about the future. Keep the stakes low.')
      ]
    },
    {
      id: 'seed-archivist',
      title: 'Interview: the archivist of a very small museum',
      url: 'https://tidepool-review.example/interviews/archivist',
      author: 'Rosa Linde',
      publishedAt: '2026-08-22',
      note: 'Lovely detail: she writes a single sentence on every object describing why it was accepted. That sentence is the finding aid. Steal this for notes.',
      tags: ['interview', 'archives'],
      collection: 'Field notes',
      savedAt: '2026-10-03T12:15:00.000Z',
      body: [
        p('The museum occupies two rooms above a chandler’s shop and holds a little over four thousand objects. Hanne Oyelaran has been its only archivist for nineteen years. We talked in the second room, between a case of fishing weights and a tern that someone’s grandfather stuffed badly in 1951.'),
        h('The one-sentence rule'),
        p('On accessioning she is strict. Every object gets one sentence describing why we accepted it, she says — not what it is, because the catalogue does that, but why it came in at all. That sentence is the finding aid. If she cannot write the sentence, the museum does not take the object.'),
        p('I asked what happens when the sentence turns out to be wrong. It is often wrong, she said. Someone in 1974 wrote that a brass button was kept because it had belonged to a harbourmaster. It had not. But the wrong sentence tells you exactly what they believed in 1974, and that has turned out to be the more interesting record.'),
        h('What leaves, and how it is recorded'),
        p('She deaccessions about forty items a year, and says the hard part is never the decision but the record. We keep a line for everything that leaves. A collection without a record of its gaps is a collection that lies to you.'),
        p('Her desk holds no computer. The catalogue is a card index, duplicated onto a second set of cards kept in the other room in case of fire. People ask when we will digitise, she said. I ask them who will be reading it in sixty years. Then they go quiet, and we have a much better conversation.'),
        q('A catalogue is a promise to a stranger. You will never meet them. Write clearly anyway.')
      ]
    },
    {
      id: 'seed-glaze',
      title: 'Terracotta glaze tests, batch nine',
      url: 'https://kiln-diary.example/batch-nine',
      author: 'Ondine Marsh',
      publishedAt: '2026-09-12',
      note: 'Photographs of eleven glaze tests with the recipe under each one. Batch nine is the muted terracotta I keep describing badly to people.',
      tags: ['ceramics', 'colour'],
      collection: 'Craft & process',
      savedAt: '2026-09-28T16:50:00.000Z',
      body: [
        p('Eleven tests this round, all on the same buff stoneware, all fired to cone six in oxidation. The variable is iron oxide, stepped from two to seven percent, with a second axis of tin at zero and at two percent. Everything else is held exactly where it was last time.'),
        p('Batch nine is the one. At four percent iron with no tin it comes out a muted terracotta — warm, slightly chalky, with no trace of orange in it. In raking light you can see the clay body through the glaze on the rims, which is the entire point. I have been describing this colour badly to people for two years and can now simply hand them the tile.'),
        h('What went wrong above five percent'),
        p('The high-iron tests went metallic and sullen. At seven percent the surface breaks to a dark bronze wherever it pools, which some people want very much and I do not. It reads as a mistake in daylight and as a deliberate effect under gallery lighting, and I have never trusted a finish that depends on the room it is standing in.'),
        p('Tin did less than I expected. At two percent it lifted the lighter tests towards pink and then did almost nothing at all above four percent iron. I am dropping it from the next round and spending the spare variable on a slower cool instead.'),
        p('Notes for batch ten: hold at 1100°C for twenty minutes on the way down, test on both the buff and a white body, and photograph everything in the same north window at the same hour. Half the disagreements about glaze are disagreements about light.'),
        q('Write the recipe on the back of the tile in the moment. You will not remember, and a tile without a recipe is only a nice object.')
      ]
    },
    {
      id: 'seed-weekly-review',
      title: 'The seven-minute weekly review',
      url: 'https://plainwork.example/seven-minute-review',
      author: 'Orla Brennan',
      publishedAt: '2026-09-01',
      note: 'Three questions, a timer, no app required. Worth trying for a month before deciding whether any of this needs software at all.',
      tags: ['habits', 'organising'],
      collection: 'Work',
      savedAt: '2026-09-22T08:30:00.000Z',
      body: [
        p('Most weekly review systems fail because they take an hour and begin with tidying. Mine takes seven minutes, runs on a kitchen timer, and begins by refusing to tidy anything at all.'),
        h('The three questions'),
        p('Three questions, two minutes each, written by hand. What actually happened this week? What did I say I would do and then not do? What is the one thing that would make next week easier? The last minute is for carrying exactly one item forward.'),
        p('The hard rule is the one item. A review that produces nine commitments is not a review; it is a new backlog wearing a hat. If three things genuinely matter they will keep turning up week after week, and that repetition will tell you more than any list you could write today.'),
        p('Do it on paper first, for at least a month. Paper has one useful property that no tool has managed to copy: it cannot be reorganised. You cannot spend the seven minutes building a better template, because there is no template, only the next blank page.'),
        p('After a month, go back and read only the answers to the second question. The gap between what you said you would do and what you did is the only honest estimate of your capacity you will ever get for free.'),
        q('Try it for a month before deciding whether any of this needs software at all.')
      ]
    },
    {
      id: 'seed-birdsong',
      title: 'Birdsong as a map of the morning',
      url: 'https://fieldwork-notes.example/birdsong-map',
      author: 'Jun Aldabra',
      publishedAt: '2026-07-14',
      note: 'The author charts which birds start singing at which light level across one spring. Mostly here for the hand-drawn charts.',
      tags: ['nature', 'field notes'],
      collection: 'Field notes',
      savedAt: '2026-09-15T05:10:00.000Z',
      body: [
        p('From the second week of March to the end of May I sat in the same chair in the same small garden, forty minutes before sunrise, and wrote down who was singing and at what light level. A hand-held meter, a notebook, no recording equipment. I now think the missing equipment was both a mistake and the reason the notes are any good.'),
        h('The order is remarkably stable'),
        p('The order barely changes. Robin first, well before any light my meter would admit to. Then blackbird, then song thrush, then wren, with the finches and tits arriving in a loose crowd once the meter reads anything at all. Across sixty-one mornings the first three swapped places only four times, and three of those four mornings were raining.'),
        p('What does change is the spacing. In March the sequence takes over an hour to unfold and you can hear each arrival separately. By the middle of May the same cast turns up inside twenty minutes, piling in on top of one another, and the map stops being a map and becomes a wall.'),
        p('I drew each morning as a horizontal line with one mark per species. Stacked by date, the sixty-one lines make a shape like a fan closing. No instrument told me that. It came out of drawing the same bad chart sixty-one times in a row.'),
        q('An observation you make once is an anecdote. The same observation, made badly, every day for three months, is a method.'),
        p('Plan for next spring: same chair, same meter, plus a second site three streets away with far more traffic noise, and a new column for whether or not I had slept.')
      ]
    },
    {
      id: 'seed-rereading',
      title: 'On rereading instead of reading more',
      url: 'https://second-pass.example/on-rereading',
      author: 'Peregrine Shaw',
      publishedAt: '2026-06-29',
      note: '',
      tags: ['reading'],
      collection: 'Reading queue',
      savedAt: '2026-09-09T20:45:00.000Z',
      body: [
        p('I read ninety-one books in one year and could not, that December, tell you what was in most of them. The following year I read nineteen, eleven of which I had read before, and I can still argue with all nineteen. I am not proud of the first year. I am mostly suspicious of how good it looked written down.'),
        p('A second reading is a different book, because the reader is different and the first reading has become part of the equipment. The sentences you underlined the first time are frequently embarrassing. That embarrassment is the measurable part of learning, and almost nothing else in my life reports it so plainly.'),
        h('A rule for the shelf'),
        p('The rule I settled on: before starting anything new, reread something I have claimed to love. If I cannot get through thirty pages of a book I called formative, then I was describing a mood rather than a book, and I would like to know that about myself before I recommend it again.'),
        p('Rereading also fixes the citation problem. The things you half-remember are precisely the things you most confidently misattribute. Going back is cheaper than being wrong in public, which is the budget most of us are actually working with.'),
        q('Finishing is not the unit of value. Returning is.')
      ]
    }
  ];

  /* Seed highlights — quote only; the app resolves each to a real anchor. */
  var HIGHLIGHTS = [
    {
      id: 'seed-hl-loud-thing',
      docId: 'seed-quiet-interfaces',
      quote: 'one loud thing per screen',
      note: 'The line I keep quoting in design reviews. It works because loudness is relative — you quiet the neighbours instead of enlarging the button.',
      tags: ['design', 'calm tech'],
      createdAt: '2026-10-14T09:34:00.000Z'
    },
    {
      id: 'seed-hl-blur-test',
      docId: 'seed-quiet-interfaces',
      quote: 'Screenshot the page, blur it until the words disappear, and look at what still pulls your eye.',
      note: 'Cheapest test in the file. Do this before the next review instead of arguing about hierarchy.',
      tags: ['method'],
      createdAt: '2026-10-14T09:41:00.000Z'
    },
    {
      id: 'seed-hl-rephrase',
      docId: 'seed-commonplace',
      quote: 'A quote you did not rephrase is a quote you will never find again.',
      note: 'The whole argument in one sentence. Reason enough to make the note the primary field and the clipping secondary.',
      tags: ['writing', 'product'],
      createdAt: '2026-10-11T18:22:00.000Z'
    },
    {
      id: 'seed-hl-this-matters',
      docId: 'seed-commonplace',
      quote: 'Under every quotation I write one line beginning “This matters because…”.',
      note: 'Steal the prompt verbatim. It is a better placeholder than “Add a note”.',
      tags: ['writing'],
      createdAt: '2026-10-11T18:25:00.000Z'
    },
    {
      id: 'seed-hl-bad-tag',
      docId: 'seed-filing',
      quote: 'A bad tag costs you nothing. A bad folder hides a document completely, and hides the fact that it is hidden.',
      note: 'Best defence of tags I have read, because it argues from failure modes rather than taste.',
      tags: ['organising'],
      createdAt: '2026-10-08T08:02:00.000Z'
    },
    {
      id: 'seed-hl-low-stakes',
      docId: 'seed-filing',
      quote: 'A filing system is a bet about the future. Keep the stakes low.',
      note: '',
      tags: [],
      createdAt: '2026-10-08T08:05:00.000Z'
    },
    {
      id: 'seed-hl-one-sentence',
      docId: 'seed-archivist',
      quote: 'Every object gets one sentence describing why we accepted it',
      note: 'One sentence on why it was kept, written at the moment of keeping. That is exactly what the note field is for.',
      tags: ['archives', 'product'],
      createdAt: '2026-10-03T12:40:00.000Z'
    },
    {
      id: 'seed-hl-gaps',
      docId: 'seed-archivist',
      quote: 'A collection without a record of its gaps is a collection that lies to you.',
      note: 'Argument for keeping a deletion log rather than a silent undo.',
      tags: ['archives'],
      createdAt: '2026-10-03T12:46:00.000Z'
    },
    {
      id: 'seed-hl-batch-nine',
      docId: 'seed-glaze',
      quote: 'a muted terracotta — warm, slightly chalky, with no trace of orange in it',
      note: 'This is the colour I keep failing to describe. Four percent iron, no tin, cone six.',
      tags: ['colour', 'ceramics'],
      createdAt: '2026-09-28T17:10:00.000Z'
    },
    {
      id: 'seed-hl-backlog-hat',
      docId: 'seed-weekly-review',
      quote: 'A review that produces nine commitments is not a review; it is a new backlog wearing a hat.',
      note: 'Funny, and the reason my last three review templates died. One item forward.',
      tags: ['habits'],
      createdAt: '2026-09-22T08:52:00.000Z'
    },
    {
      id: 'seed-hl-capacity',
      docId: 'seed-weekly-review',
      quote: 'The gap between what you said you would do and what you did is the only honest estimate of your capacity',
      note: '',
      tags: ['habits'],
      createdAt: '2026-09-22T08:55:00.000Z'
    },
    {
      id: 'seed-hl-swapped-places',
      docId: 'seed-birdsong',
      quote: 'Across sixty-one mornings the first three swapped places only four times',
      note: 'The finding is about stability rather than novelty, which is why it is worth anything.',
      tags: ['nature'],
      createdAt: '2026-09-15T06:02:00.000Z'
    },
    {
      id: 'seed-hl-anecdote',
      docId: 'seed-birdsong',
      quote: 'An observation you make once is an anecdote.',
      note: '',
      tags: ['method'],
      createdAt: '2026-09-15T06:05:00.000Z'
    },
    {
      id: 'seed-hl-underlined',
      docId: 'seed-rereading',
      quote: 'The sentences you underlined the first time are frequently embarrassing.',
      note: 'The case for resurfacing old highlights instead of collecting new ones.',
      tags: ['reading', 'product'],
      createdAt: '2026-09-09T21:03:00.000Z'
    },
    {
      id: 'seed-hl-returning',
      docId: 'seed-rereading',
      quote: 'Finishing is not the unit of value. Returning is.',
      note: 'Title card for the whole resurfacing idea.',
      tags: ['reading'],
      createdAt: '2026-09-09T21:06:00.000Z'
    }
  ];

  function copyDoc(doc) {
    return Object.assign({}, doc, {
      tags: doc.tags.slice(),
      body: doc.body.map(function (block) { return { type: block.type, text: block.text }; })
    });
  }

  return {
    collections: COLLECTIONS,
    // Hand back copies so the running app can never mutate the seed.
    seedDocs: function () { return DOCS.map(copyDoc); },
    seedHighlights: function () {
      return HIGHLIGHTS.map(function (hl) {
        return Object.assign({}, hl, { tags: hl.tags.slice() });
      });
    }
  };
})();
