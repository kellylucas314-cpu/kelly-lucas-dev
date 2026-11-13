/* The design systems room's data (/brain/systems.html), written by hand.
   systems: one per site, with palette, type and rules. libraries: my own art
   and font libraries. docs: pages, boards and strips of drawings, with files
   under /assets/design/<site>/. Sections: lab (this site), heliopolis,
   pretzel. HelioFlux work is not kept here: this page is public. */
window.DESIGN_SYSTEMS = {
  "updatedAt": "2026-11-13",
  "systems": [
    {
      "name": "kellylucas.dev",
      "site": "kellylucas.dev",
      "status": "live",
      "palette": [
        {
          "name": "paper",
          "hex": "#f8f6f1"
        },
        {
          "name": "navy",
          "hex": "#1f355e"
        },
        {
          "name": "teal",
          "hex": "#5a9e9a"
        },
        {
          "name": "coral",
          "hex": "#d6605b"
        },
        {
          "name": "honey",
          "hex": "#f0bf4c"
        },
        {
          "name": "sage",
          "hex": "#9fb78f"
        },
        {
          "name": "pale teal",
          "hex": "#d4e7e5"
        },
        {
          "name": "pale coral",
          "hex": "#f6dcd8"
        }
      ],
      "type": "Instrument Sans for everything, at a regular weight and big where it matters. DM Mono for dates and numbers.",
      "rules": [
        "A poster, not a hero: every page opens with one of my drawings on a big round shape, never boxed in or cropped.",
        "Round, never square: suns, blobs and arches do the decorating, buttons are pills, bands end in waves and scallops.",
        "Paper and navy carry every word. Teal, coral, honey and sage carry the shapes. The pale tints are the bands.",
        "Real over cute. The toys live in the playground, which keeps the old lab look.",
        "No em dashes. Mobile first, tested at 390px."
      ],
      "live": "https://kellylucas.dev",
      "doc": "https://github.com/kellylucas314-cpu/kelly-lucas-dev/blob/main/DESIGN.md",
      "docLabel": "DESIGN.md",
      "section": "lab"
    },
    {
      "name": "Pretzel Protocol",
      "site": "pretzel.thetravelprotocol.com",
      "status": "live",
      "palette": [
        {
          "name": "paper",
          "hex": "#faf9f5"
        },
        {
          "name": "rail",
          "hex": "#f3eee4"
        },
        {
          "name": "band",
          "hex": "#e4d7b8"
        },
        {
          "name": "ink",
          "hex": "#103044"
        },
        {
          "name": "signal",
          "hex": "#1a5c4a"
        },
        {
          "name": "cranberry",
          "hex": "#b84a45"
        }
      ],
      "type": "Literata for headings, Hanken Grotesk for everything else.",
      "rules": [
        "Cranberry is the one attention color, and only ever a chip.",
        "Delight budget of five. To add a sixth, remove one.",
        "Nothing under 12px, inputs at 16px, touch targets 44px.",
        "Anything a drawing sits on is the art’s own cream."
      ],
      "live": "https://pretzel.thetravelprotocol.com",
      "doc": "https://github.com/kellylucas314-cpu/pretzel-protocol/blob/main/DESIGN-SYSTEM.md",
      "docLabel": "DESIGN-SYSTEM.md",
      "section": "pretzel"
    },
    {
      "name": "Heliopolis",
      "site": "myheliopolis.com",
      "status": "live, private",
      "palette": [
        {
          "name": "cream",
          "hex": "#FAF9F5"
        },
        {
          "name": "navy",
          "hex": "#103044"
        },
        {
          "name": "lime",
          "hex": "#DAEAAA"
        },
        {
          "name": "muted",
          "hex": "#526879"
        },
        {
          "name": "rule",
          "hex": "#DEDFD9"
        }
      ],
      "type": "Lato from the site’s own files. Page titles at weight 400 with no tight tracking; 10px uppercase labels.",
      "rules": [
        "One drawing per page, large, uncropped, with clear space around it. Kelly’s drawings are never redrawn or recoloured.",
        "Fine navy outlines, flat fills, little shading. No cyan, pink, bright yellow, or any decorative palette.",
        "Lime means one thing: someone is needed. At zero it turns pale.",
        "Boxes are flat and drawn with the same pen as the pictures. No shadows anywhere.",
        "Four destinations. Home fits one laptop screen; if something new wants in, something leaves."
      ],
      "live": "https://myheliopolis.com/",
      "doc": "/heliopolis/index.html",
      "docLabel": "The art library",
      "section": "heliopolis",
      "liveLabel": "The site (sign-in)"
    }
  ],
  "libraries": [
    {
      "name": "Heliopolis art library",
      "url": "/heliopolis/index.html",
      "what": "The original five, the 33 redraws, the style catalog, and art by subject. Cream, navy, lime, one idea per image.",
      "count": "served from the heliopolis-art-library repo",
      "section": "heliopolis"
    },
    {
      "name": "Pretzel illustrations",
      "url": "https://github.com/kellylucas314-cpu/pretzel-protocol/tree/main/assets",
      "what": "My drawings for the family trip atlas: city chapters, each day, each stop, the welcome. Built onto cream by a script that refuses black backgrounds.",
      "count": "source art in assets/, web copies built to public/art/",
      "private": true,
      "section": "pretzel"
    },
    {
      "name": "The audition room",
      "url": "/all-fonts.html",
      "what": "Every font that walked into the lab, with the same test sentence. Heliora won.",
      "count": "97 fonts auditioned",
      "section": "lab"
    }
  ],
  "docs": [
    {
      "section": "heliopolis",
      "kind": "page",
      "title": "The art library",
      "href": "/heliopolis/index.html",
      "thumb": "/assets/design/heliopolis/courtyard.jpg",
      "meta": "kellylucas.dev/heliopolis",
      "what": "The original five, the 33 redraws, the style catalog, and art by subject. Cream, navy, lime, one idea per image."
    },
    {
      "section": "heliopolis",
      "kind": "page",
      "title": "Art by subject",
      "href": "/heliopolis/art-by-subject.html",
      "thumb": "/assets/design/heliopolis/library.jpg",
      "meta": "catalog",
      "what": "Every drawing filed by what it shows, so a page can borrow the nearest fit."
    },
    {
      "section": "heliopolis",
      "kind": "images",
      "meta": "the references",
      "title": "The look, in nine drawings",
      "tall": true,
      "what": "The style references every Heliopolis drawing is checked against: fine navy outlines, flat fills, one idea per image, cream all around.",
      "href": "/heliopolis/index.html",
      "cta": "Open the library",
      "images": [
        {
          "src": "/assets/design/heliopolis/courtyard.jpg",
          "full": "/heliopolis/heliopolis-courtyard-v1.png",
          "caption": "Courtyard"
        },
        {
          "src": "/assets/design/heliopolis/library.jpg",
          "full": "/heliopolis/heliopolis-library-v1.png",
          "caption": "Library"
        },
        {
          "src": "/assets/design/heliopolis/library-entrance.jpg",
          "full": "/heliopolis/heliopolis-library-entrance-v1.png",
          "caption": "Library entrance"
        },
        {
          "src": "/assets/design/heliopolis/garden-courtyard.jpg",
          "full": "/heliopolis/heliopolis-garden-courtyard-v1.png",
          "caption": "Garden courtyard"
        },
        {
          "src": "/assets/design/heliopolis/civic-square.jpg",
          "full": "/heliopolis/heliopolis-civic-square-v1.png",
          "caption": "Civic square"
        },
        {
          "src": "/assets/design/heliopolis/arcade-walk.jpg",
          "full": "/heliopolis/heliopolis-arcade-walk-v1.png",
          "caption": "Arcade walk"
        },
        {
          "src": "/assets/design/heliopolis/plant-books.jpg",
          "full": "/heliopolis/heliopolis-plant-books-v1.png",
          "caption": "Plant and books"
        },
        {
          "src": "/assets/design/heliopolis/icon.jpg",
          "full": "/heliopolis/heliopolis-icon-v1.png",
          "caption": "Icon"
        },
        {
          "src": "/assets/design/heliopolis/wordmark.jpg",
          "full": "/heliopolis/heliopolis-wordmark-v1.png",
          "caption": "Wordmark"
        }
      ]
    },
    {
      "section": "pretzel",
      "kind": "page",
      "title": "The atlas, live",
      "href": "https://pretzel.thetravelprotocol.com/",
      "thumb": "/assets/design/pretzel/welcome.jpg",
      "meta": "live",
      "what": "Berlin, Munich, Prague, for four people on their phones. Correctness and thumbs come first."
    },
    {
      "section": "pretzel",
      "kind": "page",
      "title": "The art library",
      "href": "https://pretzel-protocol-art-library.kellylucas314.workers.dev/",
      "thumb": "/assets/design/pretzel/city-prague.jpg",
      "meta": "gallery",
      "what": "Every candidate drawing for the trip, thumbnails on cream, with a downloadable file list."
    },
    {
      "section": "pretzel",
      "kind": "page",
      "title": "DESIGN-SYSTEM.md",
      "href": "https://github.com/kellylucas314-cpu/pretzel-protocol/blob/main/DESIGN-SYSTEM.md",
      "meta": "the rules",
      "private": true,
      "what": "Identity, house rules, components and the illustration pipeline. Made the usual way: screenshot, name the five biggest weaknesses, fix them, repeat."
    },
    {
      "section": "pretzel",
      "kind": "images",
      "meta": "seven drawings",
      "title": "Four cities and a few days",
      "tall": true,
      "what": "Kelly’s own drawings for the atlas, built onto cream by a script that refuses black backgrounds.",
      "href": "https://pretzel-protocol-art-library.kellylucas314.workers.dev/",
      "cta": "Open the art library",
      "images": [
        {
          "src": "/assets/design/pretzel/city-berlin.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/city-berlin.webp",
          "caption": "Berlin"
        },
        {
          "src": "/assets/design/pretzel/city-munich.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/city-munich.webp",
          "caption": "Munich"
        },
        {
          "src": "/assets/design/pretzel/city-prague.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/city-prague.webp",
          "caption": "Prague"
        },
        {
          "src": "/assets/design/pretzel/city-amsterdam.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/city-amsterdam.webp",
          "caption": "Amsterdam"
        },
        {
          "src": "/assets/design/pretzel/welcome.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/welcome.webp",
          "caption": "Welcome"
        },
        {
          "src": "/assets/design/pretzel/day-1.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/day-1.webp",
          "caption": "Day 1"
        },
        {
          "src": "/assets/design/pretzel/day-3.jpg",
          "full": "https://pretzel.thetravelprotocol.com/art/day-3.webp",
          "caption": "Day 3"
        }
      ]
    }
  ]
};
