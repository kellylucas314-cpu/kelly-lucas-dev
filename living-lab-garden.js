(() => {
  "use strict";

  const canvas = document.getElementById("livingGarden");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const terrarium = document.getElementById("terrarium");
  const seedForm = document.getElementById("seedForm");
  const seedInput = document.getElementById("seedInput");
  const surpriseBtn = document.getElementById("surpriseBtn");
  const lightBtn = document.getElementById("lightBtn");
  const rainBtn = document.getElementById("rainBtn");
  const saveBtn = document.getElementById("saveBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copySeedBtn = document.getElementById("copySeedBtn");
  const plantCountEl = document.getElementById("plantCount");
  const speciesCountEl = document.getElementById("speciesCount");
  const lightReadingEl = document.getElementById("lightReading");
  const heroLightEl = document.getElementById("heroLight");
  const gardenStatus = document.getElementById("gardenStatus");
  const weatherLabel = document.getElementById("weatherLabel");
  const specimenTooltip = document.getElementById("specimenTooltip");
  const tooltipId = document.getElementById("tooltipId");
  const tooltipName = document.getElementById("tooltipName");
  const tooltipTrait = document.getElementById("tooltipTrait");
  const specimenEmpty = document.getElementById("specimenEmpty");
  const specimenReading = document.getElementById("specimenReading");
  const specimenSwatch = document.getElementById("specimenSwatch");
  const specimenId = document.getElementById("specimenId");
  const specimenName = document.getElementById("specimenName");
  const specimenFamily = document.getElementById("specimenFamily");
  const specimenSeed = document.getElementById("specimenSeed");
  const specimenTrait = document.getElementById("specimenTrait");
  const specimenDNA = document.getElementById("specimenDNA");
  const specimenAge = document.getElementById("specimenAge");
  const specimenLink = document.getElementById("specimenLink");
  const toastEl = document.getElementById("gardenToast");

  const STORAGE_KEY = "kelly-living-lab-garden-v1";
  const STARTERS_VISIBLE_KEY = "kelly-living-lab-starters-visible-v1";
  const LAB_RAIN_GROWTH_KEY = "kelly-living-lab-rain-growth-v1";
  const MAX_VISITORS_WITH_LAB = 3;
  const MAX_VISITORS_WITHOUT_LAB = 8;
  const UNKNOWN_FORM_ID = "mystery-seedling";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LIGHTS = [
    {
      id: "dawn",
      label: "dawn",
      hero: "dawn spectrum",
      skyTop: "#253c3b",
      skyBottom: "#bd8c7b",
      haze: "#e4b79b",
      orb: "#f2d59c",
      soilTop: "#2a3a30",
      soilBottom: "#111c17",
      horizon: "#92a17f",
      starAlpha: 0.18,
    },
    {
      id: "day",
      label: "day",
      hero: "daylight spectrum",
      skyTop: "#3f655f",
      skyBottom: "#a9c8b6",
      haze: "#d9e4c9",
      orb: "#f4dda0",
      soilTop: "#2b4033",
      soilBottom: "#101b16",
      horizon: "#7e9c78",
      starAlpha: 0,
    },
    {
      id: "dusk",
      label: "dusk",
      hero: "dusk spectrum",
      skyTop: "#26343e",
      skyBottom: "#956b6a",
      haze: "#d69d84",
      orb: "#f3cf9a",
      soilTop: "#27392f",
      soilBottom: "#101a16",
      horizon: "#657b68",
      starAlpha: 0.38,
    },
    {
      id: "night",
      label: "night",
      hero: "nocturnal spectrum",
      skyTop: "#0a1518",
      skyBottom: "#20332f",
      haze: "#5f7a70",
      orb: "#d7e4d7",
      soilTop: "#1b2d25",
      soilBottom: "#09120e",
      horizon: "#3d5648",
      starAlpha: 0.82,
    },
  ];

  const SPECIES = {
    spark: {
      id: "spark",
      family: "Spark collection",
      commonName: "Lantern bloom",
      noun: "Lantern",
      link: "quotes.html",
      roomLabel: "Open Spark",
      stem: "#769579",
      leaf: "#b1d8b3",
      bloom: "#f4dd9f",
      accent: "#fff2c9",
      root: "#b4a778",
      traits: ["stores small bright thoughts", "warms after sunset", "late-opening lanterns"],
    },
    noise: {
      id: "noise",
      family: "Noise room",
      commonName: "Signal reed",
      noun: "Signal Reed",
      link: "noise.html",
      roomLabel: "Open Noise",
      stem: "#6f9c88",
      leaf: "#91c6ad",
      bloom: "#bfe9ee",
      accent: "#e3f8f6",
      root: "#8fae9c",
      traits: ["trembles near hidden rhythms", "high signal sensitivity", "grows in syncopation"],
    },
    quantum: {
      id: "quantum",
      family: "Quantum wing",
      commonName: "Twin-state orchid",
      noun: "Orchid",
      link: "quantum.html",
      roomLabel: "Open Quantum",
      stem: "#718576",
      leaf: "#a8c4a8",
      bloom: "#cdcde0",
      accent: "#f0eff9",
      root: "#9a93aa",
      traits: ["blooms in two states", "observer-sensitive petals", "entangled root pair"],
    },
    pet: {
      id: "pet",
      family: "Companion lab",
      commonName: "Companion succulent",
      noun: "Companion",
      link: "pet.html",
      roomLabel: "Open Pet",
      stem: "#68836d",
      leaf: "#9cc99f",
      bloom: "#e99d84",
      accent: "#ffd0b9",
      root: "#aa8e76",
      traits: ["learns the keeper's rhythm", "social leaf formation", "developing a tiny habit"],
    },
    fonts: {
      id: "fonts",
      family: "Font archive",
      commonName: "Glyph vine",
      noun: "Glyph Vine",
      link: "all-fonts.html",
      roomLabel: "Open Fonts",
      stem: "#718b82",
      leaf: "#b4d7c5",
      bloom: "#b9d8ef",
      accent: "#eef7ff",
      root: "#8ca4b8",
      traits: ["changes posture with each voice", "variable-weight stem", "high typographic contrast"],
    },
    wild: {
      id: "wild",
      family: "Visitor-grown variant",
      commonName: "Wild lab specimen",
      noun: "Wildflower",
      link: "",
      roomLabel: "",
      stem: "#66836b",
      leaf: "#a9d0a9",
      bloom: "#e5c5d8",
      accent: "#f6e5ef",
      root: "#9e9879",
      traits: ["unclassified garden logic", "self-authored branching", "a very private mutation"],
    },
  };

  const SPECIES_KEYWORDS = [
    {
      species: "spark",
      keywords: ["spark", "light", "bright", "sun", "fire", "hope", "joy", "idea", "glow", "energy", "photon", "laser", "luminous"],
    },
    {
      species: "noise",
      keywords: ["music", "sound", "noise", "signal", "listen", "echo", "rhythm", "song", "quiet"],
    },
    {
      species: "quantum",
      keywords: ["quantum", "both", "maybe", "mystery", "chance", "parallel", "uncertain", "strange", "loop", "question"],
    },
    {
      species: "pet",
      keywords: ["pet", "friend", "love", "home", "care", "kind", "family", "soft", "tender", "companion", "dog", "puppy", "canine", "hound"],
    },
    {
      species: "fonts",
      keywords: ["font", "type", "letter", "word", "write", "read", "story", "book", "language"],
    },
    {
      species: "wild",
      keywords: ["wild", "grow", "garden", "forest", "root", "green", "nature", "earth"],
    },
  ];

  const WORD_PALETTES = [
    {
      id: "sunlit",
      label: "sunlit",
      keywords: ["sun", "fire", "bright", "gold", "joy", "hope", "glow", "light", "energy"],
      stem: "#7f9972",
      leaf: "#b8d9a8",
      bloom: "#f1c96f",
      accent: "#fff0bd",
      root: "#b89d6c",
    },
    {
      id: "moonlit",
      label: "moonlit",
      keywords: ["moon", "night", "dream", "quiet", "mystery", "shadow", "sleep"],
      stem: "#758a8d",
      leaf: "#a9c5c0",
      bloom: "#cbc8e8",
      accent: "#f3f2ff",
      root: "#8e8ba8",
    },
    {
      id: "tide",
      label: "tidal",
      keywords: ["water", "ocean", "sea", "rain", "river", "blue", "calm"],
      stem: "#5f8d83",
      leaf: "#91c9b9",
      bloom: "#a9dfe6",
      accent: "#e8ffff",
      root: "#7ca29e",
    },
    {
      id: "berry",
      label: "berry",
      keywords: ["love", "heart", "warm", "blush", "rose", "friend", "tender"],
      stem: "#788771",
      leaf: "#aec79e",
      bloom: "#e69b9f",
      accent: "#ffd4cc",
      root: "#aa887a",
    },
    {
      id: "moss",
      label: "moss",
      keywords: ["garden", "forest", "green", "earth", "root", "grow", "wild", "nature"],
      stem: "#647e62",
      leaf: "#9bc58f",
      bloom: "#d9df9b",
      accent: "#f3f1c2",
      root: "#958c64",
    },
    {
      id: "ink",
      label: "ink",
      keywords: ["word", "book", "write", "idea", "thought", "story", "signal", "language"],
      stem: "#667f8d",
      leaf: "#9dbec3",
      bloom: "#acc9e7",
      accent: "#edf5ff",
      root: "#8597ac",
    },
    {
      id: "ember",
      label: "ember",
      keywords: ["heat", "ember", "brave", "desire", "courage", "fierce"],
      stem: "#8b6f62",
      leaf: "#b99b79",
      bloom: "#ec805f",
      accent: "#ffd19b",
      root: "#9e725f",
    },
    {
      id: "violet",
      label: "violet",
      keywords: ["magic", "violet", "purple", "wonder", "imagine", "poem"],
      stem: "#726f8c",
      leaf: "#a8a2c2",
      bloom: "#c2a1df",
      accent: "#f0dcff",
      root: "#8e7d9c",
    },
    {
      id: "frost",
      label: "frost",
      keywords: ["snow", "winter", "cold", "ice", "still", "crystal"],
      stem: "#6e8990",
      leaf: "#a7c5c8",
      bloom: "#d4edf0",
      accent: "#ffffff",
      root: "#89a3aa",
    },
    {
      id: "citrus",
      label: "citrus",
      keywords: ["lemon", "lime", "fresh", "morning", "zest", "awake"],
      stem: "#718757",
      leaf: "#afd27d",
      bloom: "#e4df69",
      accent: "#fff5a6",
      root: "#9c9760",
    },
    {
      id: "coral",
      label: "coral",
      keywords: ["coral", "beach", "summer", "tropical", "peach", "sunset"],
      stem: "#7b826f",
      leaf: "#a7bc91",
      bloom: "#ee9d83",
      accent: "#ffd0b7",
      root: "#9c826f",
    },
    {
      id: "plum",
      label: "plum",
      keywords: ["plum", "deep", "velvet", "intimate", "secret", "private"],
      stem: "#6d6778",
      leaf: "#9c91a4",
      bloom: "#b982a6",
      accent: "#efd1e3",
      root: "#846f7d",
    },
    {
      id: "aurora",
      label: "aurora",
      keywords: ["aurora", "future", "space", "star", "cosmic", "explore"],
      stem: "#668b83",
      leaf: "#9bc8b5",
      bloom: "#a8cce0",
      accent: "#d9f5d8",
      root: "#7f9b96",
    },
    {
      id: "clay",
      label: "clay",
      keywords: ["clay", "home", "ground", "handmade", "craft", "old"],
      stem: "#7c7662",
      leaf: "#a9a079",
      bloom: "#c98d70",
      accent: "#edc3a0",
      root: "#946e58",
    },
    {
      id: "electric",
      label: "electric",
      keywords: ["code", "tech", "digital", "electric", "machine", "robot"],
      stem: "#5d8580",
      leaf: "#83c4a8",
      bloom: "#85d5d1",
      accent: "#d9f58f",
      root: "#6e9990",
    },
    {
      id: "twilight",
      label: "twilight",
      keywords: ["twilight", "dusk", "maybe", "between", "uncertain", "parallel"],
      stem: "#686f83",
      leaf: "#969fb3",
      bloom: "#a994c2",
      accent: "#e3b9c9",
      root: "#7c778c",
    },
    {
      id: "cream",
      label: "cream",
      keywords: ["cream", "gentle", "kind", "simple", "peace", "easy"],
      stem: "#7d8b71",
      leaf: "#b7c5a0",
      bloom: "#e8ddb1",
      accent: "#fff8dc",
      root: "#9a916f",
    },
    {
      id: "storm",
      label: "storm",
      keywords: ["storm", "thunder", "anger", "power", "strong", "steel"],
      stem: "#66747a",
      leaf: "#8da2a5",
      bloom: "#9daab8",
      accent: "#d9e1e8",
      root: "#747c86",
    },
    {
      id: "alarm",
      label: "alarmed",
      keywords: ["fear", "scared", "afraid", "frightened", "panic", "anxiety", "danger", "startle"],
      stem: "#687a77",
      leaf: "#bdcbbb",
      bloom: "#b8c6cc",
      accent: "#eef2e8",
      root: "#7e747b",
    },
    {
      id: "noir",
      label: "noir",
      keywords: ["crime", "criminal", "illegal", "theft", "steal", "fraud", "guilty", "evidence", "prison"],
      stem: "#545d5c",
      leaf: "#7a8580",
      bloom: "#8e6f76",
      accent: "#d2a39a",
      root: "#625a59",
    },
    {
      id: "prismatic",
      label: "prismatic",
      keywords: ["rainbow", "color", "art", "paint", "create", "prism"],
      stem: "#627f7d",
      leaf: "#92bda8",
      bloom: "#d28fbd",
      accent: "#f2d576",
      root: "#817f91",
    },
    {
      id: "blossom",
      label: "blossom",
      keywords: ["spring", "bloom", "flower", "new", "begin", "renew"],
      stem: "#738570",
      leaf: "#a9c798",
      bloom: "#e7a7b5",
      accent: "#ffe0d4",
      root: "#9b846f",
    },
  ];

  const BOTANICAL_FORMS = [
    {
      id: "solar-crown",
      label: "solar crown",
      noun: "Sun Crown",
      profile: "crown",
      petals: 9,
      width: 0.2,
      keywords: ["sun", "bright", "joy", "hope", "light", "morning", "gold"],
      trait: "turns toward optimistic language",
    },
    {
      id: "lunar-cup",
      label: "lunar cup",
      noun: "Moon Cup",
      profile: "cup",
      petals: 6,
      width: 0.38,
      keywords: ["moon", "night", "dream", "sleep", "shadow", "lunar"],
      trait: "holds a small measure of night",
    },
    {
      id: "tide-bell",
      label: "tide bell",
      noun: "Tide Bell",
      profile: "bell",
      petals: 5,
      width: 0.34,
      keywords: ["water", "ocean", "sea", "rain", "river", "calm", "tide"],
      trait: "rings only when the weather changes",
    },
    {
      id: "heart-clover",
      label: "heart clover",
      noun: "Heart Clover",
      profile: "heart",
      petals: 4,
      width: 0.42,
      keywords: ["love", "heart", "friend", "care", "family", "tender", "kind"],
      trait: "grows in affectionate clusters",
    },
    {
      id: "moss-rosette",
      label: "moss rosette",
      noun: "Moss Rosette",
      profile: "rosette",
      petals: 8,
      width: 0.34,
      keywords: ["forest", "garden", "earth", "root", "green", "nature", "moss"],
      trait: "keeps its oldest leaves close",
    },
    {
      id: "ink-glyph",
      label: "ink glyph",
      noun: "Ink Glyph",
      profile: "glyph",
      petals: 5,
      width: 0.24,
      keywords: ["word", "book", "write", "read", "language", "story", "letter"],
      trait: "changes posture with each sentence",
    },
    {
      id: "signal-comb",
      label: "signal comb",
      noun: "Signal Comb",
      profile: "signal",
      petals: 7,
      width: 0.18,
      keywords: ["music", "sound", "signal", "noise", "rhythm", "song", "listen"],
      trait: "tunes itself to nearby rhythms",
    },
    {
      id: "quantum-twin",
      label: "quantum twin",
      noun: "Twin Bloom",
      profile: "twin",
      petals: 6,
      width: 0.27,
      keywords: ["quantum", "both", "maybe", "parallel", "mystery", "chance"],
      trait: "finishes blooming in two places",
    },
    {
      id: "ember-wheel",
      label: "ember wheel",
      noun: "Ember Wheel",
      profile: "wheel",
      petals: 10,
      width: 0.15,
      keywords: ["ember", "heat", "brave", "desire", "spark", "fierce"],
      trait: "stores heat between its spokes",
    },
    {
      id: "frost-aster",
      label: "frost aster",
      noun: "Frost Aster",
      profile: "needle",
      petals: 12,
      width: 0.1,
      keywords: ["snow", "winter", "cold", "ice", "still", "crystal"],
      trait: "forms precise crystalline rays",
    },
    {
      id: "cloud-puff",
      label: "cloud puff",
      noun: "Cloud Puff",
      profile: "puff",
      petals: 7,
      width: 0.3,
      keywords: ["soft", "gentle", "cloud", "peace", "easy", "float"],
      trait: "softens hard edges in its vicinity",
    },
    {
      id: "thorn-star",
      label: "thorn star",
      noun: "Thorn Star",
      profile: "star",
      petals: 7,
      width: 0.14,
      keywords: ["sharp", "anger", "strong", "courage", "thorn", "steel"],
      trait: "protects a surprisingly tender center",
    },
    {
      id: "ribbon-iris",
      label: "ribbon iris",
      noun: "Ribbon Iris",
      profile: "ribbon",
      petals: 6,
      width: 0.17,
      keywords: ["dance", "flow", "motion", "grace", "move", "ribbon"],
      trait: "draws slow gestures in moving air",
    },
    {
      id: "honey-orbit",
      label: "honey orbit",
      noun: "Honey Orbit",
      profile: "honey",
      petals: 6,
      width: 0.3,
      keywords: ["work", "build", "make", "team", "craft", "honey"],
      trait: "organizes its bloom into useful cells",
    },
    {
      id: "comet-orchid",
      label: "comet orchid",
      noun: "Comet Orchid",
      profile: "comet",
      petals: 5,
      width: 0.2,
      keywords: ["space", "star", "future", "launch", "explore", "cosmic"],
      trait: "leaves a luminous trace after opening",
    },
    {
      id: "echo-chime",
      label: "echo chime",
      noun: "Echo Chime",
      profile: "chime",
      petals: 5,
      width: 0.22,
      keywords: ["memory", "echo", "past", "remember", "nostalgia", "again"],
      trait: "repeats the last breeze it heard",
    },
    {
      id: "coral-fan",
      label: "coral fan",
      noun: "Coral Fan",
      profile: "fan",
      petals: 9,
      width: 0.14,
      keywords: ["coral", "beach", "tropical", "summer", "warm", "reef"],
      trait: "opens in a warm tidal fan",
    },
    {
      id: "feather-fern",
      label: "feather fern",
      noun: "Feather Fern",
      profile: "feather",
      petals: 8,
      width: 0.14,
      keywords: ["bird", "free", "air", "wind", "fly", "feather"],
      trait: "tests the direction of every breeze",
    },
    {
      id: "prism-poppy",
      label: "prism poppy",
      noun: "Prism Poppy",
      profile: "prism",
      petals: 7,
      width: 0.23,
      keywords: ["color", "rainbow", "art", "paint", "create", "prism"],
      trait: "splits one color into several ideas",
    },
    {
      id: "spiral-anemone",
      label: "DNA spiral",
      noun: "DNA Helix",
      profile: "spiral",
      petals: 8,
      width: 0.18,
      keywords: ["curious", "question", "wonder", "loop", "think", "spiral", "dna", "genome", "genetic", "helix", "biology"],
      trait: "braids genetic questions into a living double helix",
    },
    {
      id: "bubble-clover",
      label: "bubble clover",
      noun: "Bubble Clover",
      profile: "bubble",
      petals: 6,
      width: 0.26,
      keywords: ["play", "laugh", "happy", "silly", "child", "bubble"],
      trait: "produces brief pockets of delight",
    },
    {
      id: "secret-pod",
      label: "secret pod",
      noun: "Secret Pod",
      profile: "pod",
      petals: 5,
      width: 0.3,
      keywords: ["secret", "hidden", "private", "quiet", "hush", "inside"],
      trait: "keeps one unopened thought",
    },
    {
      id: "clock-dandelion",
      label: "clock dandelion",
      noun: "Clock Dandelion",
      profile: "clock",
      petals: 12,
      width: 0.08,
      keywords: ["time", "wait", "patient", "slow", "later", "clock"],
      trait: "measures time in drifting seeds",
    },
    {
      id: "electric-lace",
      label: "electric lace",
      noun: "Electric Lace",
      profile: "lace",
      petals: 8,
      width: 0.12,
      keywords: ["code", "tech", "electric", "machine", "digital", "robot"],
      trait: "routes tiny currents around its rim",
    },
    {
      id: "rose-window",
      label: "rose window",
      noun: "Rose Window",
      profile: "rose",
      petals: 11,
      width: 0.24,
      keywords: ["rose", "devotion", "kiss", "wedding", "anniversary"],
      trait: "folds devotion into concentric petals",
    },
    {
      id: "lotus-mirror",
      label: "lotus mirror",
      noun: "Lotus Mirror",
      profile: "lotus",
      petals: 8,
      width: 0.28,
      keywords: ["lotus", "meditate", "meditation", "balance", "zen", "spiritual"],
      trait: "holds its center perfectly still",
    },
    {
      id: "mushroom-lantern",
      label: "mushroom lantern",
      noun: "Mushroom Lantern",
      profile: "mushroom",
      petals: 6,
      width: 0.32,
      keywords: ["mushroom", "fungi", "weird", "strange", "odd", "whimsical"],
      trait: "glows softly beneath an eccentric cap",
    },
    {
      id: "desert-cactus",
      label: "desert cactus",
      noun: "Desert Cactus",
      profile: "cactus",
      petals: 5,
      width: 0.22,
      keywords: ["desert", "dry", "resilience", "survive", "tough", "endurance"],
      trait: "stores difficult seasons without complaint",
    },
    {
      id: "willow-tear",
      label: "willow tear",
      noun: "Willow Tear",
      profile: "willow",
      petals: 7,
      width: 0.16,
      keywords: ["willow", "sorrow", "farewell", "goodbye", "ache", "mourn"],
      trait: "lets every heavy thought hang gently",
    },
    {
      id: "phoenix-plume",
      label: "phoenix plume",
      noun: "Phoenix Plume",
      profile: "phoenix",
      petals: 9,
      width: 0.14,
      keywords: ["phoenix", "rebirth", "rise", "return", "revival", "comeback"],
      trait: "opens again after every ending",
    },
    {
      id: "constellation-vine",
      label: "constellation vine",
      noun: "Constellation Vine",
      profile: "constellation",
      petals: 8,
      width: 0.12,
      keywords: ["community", "connection", "network", "together", "collective", "social"],
      trait: "connects separate lights into one pattern",
    },
    {
      id: "labyrinth-bloom",
      label: "labyrinth bloom",
      noun: "Labyrinth Bloom",
      profile: "labyrinth",
      petals: 8,
      width: 0.12,
      keywords: ["complex", "complexity", "puzzle", "problem", "maze", "tangled", "confusion"],
      trait: "grows by taking the interesting route",
    },
    {
      id: "sunrise-trumpet",
      label: "sunrise trumpet",
      noun: "Sunrise Trumpet",
      profile: "trumpet",
      petals: 6,
      width: 0.3,
      keywords: ["begin", "beginning", "start", "dawn", "awakening", "fresh", "opportunity"],
      trait: "announces the first possible moment",
    },
    {
      id: "midnight-dahlia",
      label: "midnight dahlia",
      noun: "Midnight Dahlia",
      profile: "dahlia",
      petals: 14,
      width: 0.18,
      keywords: ["luxury", "elegant", "elegance", "drama", "regal", "opulent"],
      trait: "keeps adding detail after dark",
    },
    {
      id: "paper-crane",
      label: "paper crane",
      noun: "Paper Crane",
      profile: "crane",
      petals: 6,
      width: 0.16,
      keywords: ["wish", "wishful", "paper", "delicate", "promise", "origami"],
      trait: "carries one carefully folded wish",
    },
    {
      id: "kaleidoscope-bloom",
      label: "kaleidoscope bloom",
      noun: "Kaleidoscope Bloom",
      profile: "kaleidoscope",
      petals: 10,
      width: 0.15,
      keywords: ["perspective", "kaleidoscope", "viewpoint", "refract", "facet", "angle"],
      trait: "changes meaning when viewed from another side",
    },
    {
      id: "startle-bramble",
      label: "startle bramble",
      noun: "Startle Bramble",
      profile: "startle",
      petals: 5,
      width: 0.1,
      keywords: ["fear", "scared", "scare", "afraid", "frightened", "terrified", "panic", "anxious", "nervous", "danger", "alarm", "startle"],
      trait: "pulls every thorn inward when it senses danger",
    },
    {
      id: "evidence-briar",
      label: "evidence briar",
      noun: "Evidence Briar",
      profile: "evidence",
      petals: 5,
      width: 0.12,
      keywords: ["crime", "criminal", "illegal", "theft", "steal", "stolen", "robbery", "fraud", "guilty", "evidence", "prison", "suspect"],
      trait: "grows a barred thicket around every missing piece",
    },
    {
      id: "mystery-seedling",
      label: "mystery seedling",
      noun: "Mystery Seedling",
      profile: "mystery",
      petals: 5,
      width: 0.24,
      keywords: [],
      trait: "waits quietly for the garden to learn what its word means",
    },
  ];

  const MORPHOLOGY_BY_PROFILE = {
    crown: { architecture: "candelabra", root: "tap", leaf: "arrow", arrangement: "whorled", posture: "upright", growth: "branch", night: "track", organ: "flower", leafEvery: 5 },
    cup: { architecture: "rosette", root: "bulb", leaf: "crescent", arrangement: "basal", posture: "crouched", growth: "unfurl", night: "close", organ: "flower", leafEvery: 3 },
    bell: { architecture: "fountain", root: "fibrous", leaf: "ribbon", arrangement: "alternate", posture: "arching", growth: "wave", night: "pulse", organ: "flower", leafEvery: 5 },
    heart: { architecture: "twin", root: "paired", leaf: "heart", arrangement: "paired", posture: "embracing", growth: "mirror", night: "glow", organ: "flower", leafEvery: 4 },
    rosette: { architecture: "rosette", root: "bulb", leaf: "round", arrangement: "whorled", posture: "crouched", growth: "unfurl", night: "sleep", organ: "foliage", leafEvery: 2 },
    glyph: { architecture: "ladder", root: "tap", leaf: "diamond", arrangement: "alternate", posture: "upright", growth: "rise", night: "silhouette", organ: "foliage", leafEvery: 5 },
    signal: { architecture: "reed", root: "fibrous", leaf: "needle", arrangement: "paired", posture: "upright", growth: "pulse", night: "spark", organ: "foliage", leafEvery: 6 },
    twin: { architecture: "twin", root: "paired", leaf: "crescent", arrangement: "paired", posture: "splayed", growth: "mirror", night: "constellate", organ: "flower", leafEvery: 5 },
    wheel: { architecture: "whorl", root: "radial", leaf: "lobed", arrangement: "whorled", posture: "upright", growth: "pulse", night: "glow", organ: "flower", leafEvery: 4 },
    needle: { architecture: "spire", root: "tap", leaf: "needle", arrangement: "alternate", posture: "upright", growth: "rise", night: "frost", organ: "flower", leafEvery: 6 },
    puff: { architecture: "cluster", root: "fibrous", leaf: "round", arrangement: "whorled", posture: "floating", growth: "pop", night: "glow", organ: "flower", leafEvery: 4 },
    star: { architecture: "candelabra", root: "tap", leaf: "arrow", arrangement: "alternate", posture: "splayed", growth: "branch", night: "silhouette", organ: "flower", leafEvery: 6 },
    ribbon: { architecture: "fountain", root: "fibrous", leaf: "ribbon", arrangement: "alternate", posture: "arching", growth: "wave", night: "track", organ: "foliage", leafEvery: 3 },
    honey: { architecture: "lattice", root: "mycelial", leaf: "scale", arrangement: "paired", posture: "upright", growth: "branch", night: "constellate", organ: "flower", leafEvery: 5 },
    comet: { architecture: "spire", root: "tap", leaf: "needle", arrangement: "alternate", posture: "leaning", growth: "rise", night: "spark", organ: "flower", leafEvery: 7 },
    chime: { architecture: "reed", root: "fibrous", leaf: "ribbon", arrangement: "paired", posture: "weeping", growth: "wave", night: "pulse", organ: "flower", leafEvery: 6 },
    fan: { architecture: "fan", root: "radial", leaf: "fan", arrangement: "whorled", posture: "splayed", growth: "unfurl", night: "open", organ: "foliage", leafEvery: 3 },
    feather: { architecture: "fountain", root: "fibrous", leaf: "fern", arrangement: "paired", posture: "arching", growth: "unfurl", night: "sleep", organ: "foliage", leafEvery: 3 },
    prism: { architecture: "lattice", root: "radial", leaf: "diamond", arrangement: "whorled", posture: "upright", growth: "pulse", night: "constellate", organ: "flower", leafEvery: 5 },
    spiral: { architecture: "helix", root: "spiral", leaf: "scale", arrangement: "paired", posture: "twining", growth: "spiral", night: "pulse", organ: "foliage", leafEvery: 4 },
    bubble: { architecture: "cluster", root: "bulb", leaf: "round", arrangement: "alternate", posture: "floating", growth: "pop", night: "glow", organ: "foliage", leafEvery: 3 },
    pod: { architecture: "runner", root: "rhizome", leaf: "oval", arrangement: "alternate", posture: "arching", growth: "branch", night: "open", organ: "pod", leafEvery: 4 },
    clock: { architecture: "whorl", root: "radial", leaf: "needle", arrangement: "whorled", posture: "upright", growth: "pulse", night: "track", organ: "flower", leafEvery: 5 },
    lace: { architecture: "lattice", root: "mycelial", leaf: "fern", arrangement: "paired", posture: "splayed", growth: "branch", night: "constellate", organ: "foliage", leafEvery: 3 },
    rose: { architecture: "candelabra", root: "tap", leaf: "lobed", arrangement: "alternate", posture: "upright", growth: "unfurl", night: "close", organ: "flower", leafEvery: 4 },
    lotus: { architecture: "rosette", root: "bulb", leaf: "fan", arrangement: "whorled", posture: "floating", growth: "unfurl", night: "open", organ: "flower", leafEvery: 2 },
    mushroom: { architecture: "cluster", root: "mycelial", leaf: "round", arrangement: "basal", posture: "crouched", growth: "pop", night: "glow", organ: "spore", leafEvery: 4 },
    cactus: { architecture: "column", root: "tap", leaf: "scale", arrangement: "alternate", posture: "upright", growth: "pulse", night: "open", organ: "foliage", leafEvery: 7 },
    willow: { architecture: "cascade", root: "rhizome", leaf: "ribbon", arrangement: "alternate", posture: "weeping", growth: "wave", night: "sleep", organ: "foliage", leafEvery: 3 },
    phoenix: { architecture: "fan", root: "tap", leaf: "feather", arrangement: "whorled", posture: "splayed", growth: "rise", night: "spark", organ: "foliage", leafEvery: 3 },
    constellation: { architecture: "lattice", root: "mycelial", leaf: "diamond", arrangement: "sparse", posture: "floating", growth: "branch", night: "constellate", organ: "foliage", leafEvery: 7 },
    labyrinth: { architecture: "maze", root: "radial", leaf: "lobed", arrangement: "paired", posture: "upright", growth: "branch", night: "silhouette", organ: "foliage", leafEvery: 4 },
    trumpet: { architecture: "fountain", root: "fibrous", leaf: "arrow", arrangement: "alternate", posture: "arching", growth: "rise", night: "track", organ: "flower", leafEvery: 5 },
    dahlia: { architecture: "cluster", root: "bulb", leaf: "lobed", arrangement: "whorled", posture: "upright", growth: "pop", night: "close", organ: "flower", leafEvery: 3 },
    crane: { architecture: "twin", root: "stilt", leaf: "blade", arrangement: "paired", posture: "splayed", growth: "mirror", night: "track", organ: "foliage", leafEvery: 5 },
    kaleidoscope: { architecture: "whorl", root: "spiral", leaf: "diamond", arrangement: "whorled", posture: "twining", growth: "pulse", night: "constellate", organ: "foliage", leafEvery: 3 },
    startle: { architecture: "bramble", root: "clenched", leaf: "thorn", arrangement: "paired", posture: "recoiling", growth: "tremble", night: "hide", organ: "foliage", leafEvery: 3 },
    evidence: { architecture: "cage", root: "buried", leaf: "hook", arrangement: "sparse", posture: "guarded", growth: "conceal", night: "reveal", organ: "foliage", leafEvery: 5 },
    mystery: { architecture: "rosette", root: "fibrous", leaf: "round", arrangement: "whorled", posture: "crouched", growth: "unfurl", night: "pulse", organ: "foliage", leafEvery: 3 },
  };

  const MYSTERY_BLUEPRINTS = [
    {
      architecture: "rosette",
      root: "fibrous",
      leaves: ["round", "heart", "lobed", "fan"],
      arrangement: "whorled",
      postures: ["crouched", "splayed"],
      growth: "unfurl",
      nights: ["pulse", "sleep", "open", "glow"],
      leafEvery: 3,
    },
    {
      architecture: "runner",
      root: "rhizome",
      leaves: ["oval", "ribbon", "crescent", "fern"],
      arrangement: "alternate",
      postures: ["arching", "weeping"],
      growth: "wave",
      nights: ["open", "sleep", "track", "pulse"],
      leafEvery: 4,
    },
    {
      architecture: "reed",
      root: "fibrous",
      leaves: ["needle", "blade", "ribbon", "arrow"],
      arrangement: "paired",
      postures: ["upright", "leaning"],
      growth: "pulse",
      nights: ["sleep", "frost", "spark", "silhouette"],
      leafEvery: 6,
    },
    {
      architecture: "fan",
      root: "radial",
      leaves: ["fan", "feather", "arrow", "diamond"],
      arrangement: "whorled",
      postures: ["splayed", "floating"],
      growth: "unfurl",
      nights: ["open", "glow", "constellate", "track"],
      leafEvery: 3,
    },
    {
      architecture: "lattice",
      root: "mycelial",
      leaves: ["fern", "diamond", "scale", "hook"],
      arrangement: "paired",
      postures: ["splayed", "guarded"],
      growth: "branch",
      nights: ["constellate", "reveal", "silhouette", "glow"],
      leafEvery: 3,
    },
    {
      architecture: "twin",
      root: "paired",
      leaves: ["crescent", "heart", "oval", "feather"],
      arrangement: "paired",
      postures: ["embracing", "splayed"],
      growth: "mirror",
      nights: ["close", "glow", "constellate", "pulse"],
      leafEvery: 5,
    },
    {
      architecture: "helix",
      root: "spiral",
      leaves: ["scale", "needle", "diamond", "thorn"],
      arrangement: "paired",
      postures: ["twining", "upright"],
      growth: "spiral",
      nights: ["glow", "pulse", "spark", "frost"],
      leafEvery: 4,
    },
    {
      architecture: "ladder",
      root: "tap",
      leaves: ["diamond", "arrow", "blade", "lobed"],
      arrangement: "alternate",
      postures: ["leaning", "upright"],
      growth: "rise",
      nights: ["silhouette", "track", "reveal", "open"],
      leafEvery: 5,
    },
  ];

  const MYSTERY_PALETTES = [
    "moss",
    "clay",
    "frost",
    "cream",
    "ink",
    "twilight",
    "violet",
    "aurora",
  ];

  const MYSTERY_FLOURISHES = [
    "tuft",
    "crown",
    "pennant",
    "whisker",
    "droplet",
    "fork",
    "halo",
    "antenna",
  ];

  const MYSTERY_TIP_OFFSETS = {
    tuft: [[-2, 0], [2, 0], [-1, -2], [1, -2], [0, -3]],
    crown: [[-3, 0], [-2, -2], [0, -4], [2, -2], [3, 0]],
    pennant: [[0, -1], [2, -2], [4, -1], [3, 0]],
    whisker: [[-4, 0], [-2, -1], [2, -1], [4, 0]],
    droplet: [[0, -4], [-1, -3], [1, -3], [0, -2], [0, 0]],
    fork: [[-3, -3], [-2, -2], [0, 0], [2, -2], [3, -3]],
    halo: [[-2, -2], [0, -3], [2, -2], [-2, 0], [2, 0], [0, 1]],
    antenna: [[0, -5], [-1, -3], [1, -3], [0, -1]],
  };

  const MORPHOLOGY_LABELS = {
    architecture: {
      candelabra: "candelabra branching",
      rosette: "ground rosette",
      fountain: "fountain branching",
      twin: "mirrored twin stems",
      ladder: "laddered stem",
      reed: "reed colony",
      whorl: "radial whorl",
      spire: "single spire",
      cluster: "clustered colony",
      lattice: "cross-linked lattice",
      fan: "fan-shaped fronds",
      helix: "double-helix stem",
      runner: "creeping runner",
      column: "water-storing column",
      cascade: "weeping cascade",
      maze: "turning maze stem",
      bramble: "recoiled bramble",
      cage: "broken cage branching",
    },
    root: {
      tap: "deep taproot",
      bulb: "bulb roots",
      fibrous: "fine fibrous roots",
      paired: "mirrored roots",
      radial: "radial roots",
      mycelial: "mycelial web",
      spiral: "spiral roots",
      rhizome: "running rhizomes",
      stilt: "stilt roots",
      clenched: "clenched roots",
      buried: "deeply buried roots",
    },
    leaf: {
      arrow: "arrow leaves",
      crescent: "crescent leaves",
      ribbon: "ribbon leaves",
      heart: "heart leaves",
      round: "round leaves",
      diamond: "diamond leaves",
      needle: "needle leaves",
      lobed: "lobed leaves",
      scale: "scale leaves",
      fan: "fan leaves",
      fern: "fern leaves",
      feather: "feather leaves",
      oval: "oval leaves",
      blade: "blade leaves",
      thorn: "inward thorns",
      hook: "hooked leaves",
    },
    growth: {
      branch: "branches outward",
      unfurl: "unfurls from the center",
      wave: "rises in a wave",
      mirror: "grows in mirrored pairs",
      rise: "rises tip-first",
      pulse: "grows in pulses",
      pop: "emerges in clustered bursts",
      spiral: "spirals into a double helix",
      tremble: "emerges in nervous starts",
      conceal: "reveals itself reluctantly",
    },
    night: {
      track: "tracks the moon",
      close: "folds closed",
      pulse: "breathes with light",
      glow: "glows at the leaf tips",
      sleep: "settles its leaves",
      silhouette: "darkens into a silhouette",
      spark: "releases tiny sparks",
      constellate: "connects into constellations",
      frost: "grows a frost halo",
      open: "opens wider",
      hide: "draws inward and hides",
      reveal: "reveals evidence points",
    },
    posture: {
      upright: "upright posture",
      crouched: "low crouched posture",
      arching: "arching posture",
      embracing: "inward embracing posture",
      splayed: "open splayed posture",
      floating: "light floating posture",
      leaning: "forward-leaning posture",
      weeping: "downward weeping posture",
      twining: "twining posture",
      recoiling: "recoiled posture",
      guarded: "closed guarded posture",
    },
    organ: {
      flower: "flowering",
      foliage: "foliage-only",
      pod: "pod-bearing",
      spore: "spore-bearing",
    },
  };

  const SEMANTIC_THEMES = [
    {
      cue: "photons + light energy",
      formId: "prism-poppy",
      paletteId: "electric",
      keywords: ["photon", "photons", "light particle", "quantum of light", "laser", "electromagnetic", "luminous"],
    },
    {
      cue: "dogs + loyal companionship",
      formId: "heart-clover",
      paletteId: "clay",
      keywords: ["dog", "dogs", "puppy", "puppies", "pup", "canine", "canines", "hound"],
    },
    {
      cue: "joy + optimism",
      formId: "solar-crown",
      paletteId: "sunlit",
      keywords: ["sun", "light", "bright", "joy", "hope", "happy", "happiness", "optimism", "excited", "smile", "celebrate", "success", "confidence"],
    },
    {
      cue: "dream + solitude",
      formId: "lunar-cup",
      paletteId: "moonlit",
      keywords: ["moon", "night", "dream", "sleep", "rest", "shadow", "dark", "sad", "sadness", "lonely", "loneliness", "melancholy"],
    },
    {
      cue: "water + healing",
      formId: "tide-bell",
      paletteId: "tide",
      keywords: ["water", "ocean", "sea", "rain", "river", "tide", "tears", "cry", "crying", "grief", "heal", "healing", "recover"],
    },
    {
      cue: "love + belonging",
      formId: "heart-clover",
      paletteId: "berry",
      keywords: ["love", "heart", "friend", "friendship", "care", "family", "tender", "kind", "romance", "home", "belong", "trust"],
    },
    {
      cue: "nature + growth",
      formId: "moss-rosette",
      paletteId: "moss",
      keywords: ["forest", "garden", "earth", "root", "green", "nature", "moss", "grow", "growth", "health", "life", "plant", "renew"],
    },
    {
      cue: "language + learning",
      formId: "ink-glyph",
      paletteId: "ink",
      keywords: ["word", "book", "write", "writing", "read", "language", "story", "letter", "poem", "poetry", "voice", "knowledge", "learn"],
    },
    {
      cue: "music + rhythm",
      formId: "signal-comb",
      paletteId: "ink",
      keywords: ["music", "sound", "signal", "noise", "rhythm", "song", "listen", "beat", "audio", "melody", "harmony"],
    },
    {
      cue: "possibility + uncertainty",
      formId: "quantum-twin",
      paletteId: "twilight",
      keywords: ["quantum", "both", "maybe", "parallel", "mystery", "chance", "uncertain", "uncertainty", "choice", "possibility", "paradox"],
    },
    {
      cue: "courage + ambition",
      formId: "ember-wheel",
      paletteId: "ember",
      keywords: ["ember", "heat", "brave", "desire", "spark", "fierce", "courage", "passion", "ambition", "motivation", "drive"],
    },
    {
      cue: "cold + precision",
      formId: "frost-aster",
      paletteId: "frost",
      keywords: ["snow", "winter", "cold", "ice", "still", "crystal", "freeze", "frozen", "precision", "exact"],
    },
    {
      cue: "peace + softness",
      formId: "cloud-puff",
      paletteId: "cream",
      keywords: ["soft", "gentle", "cloud", "peace", "easy", "float", "comfort", "safe", "serene", "relax", "calm"],
    },
    {
      cue: "fear + alertness",
      formId: "startle-bramble",
      paletteId: "alarm",
      keywords: ["fear", "scared", "scare", "afraid", "frightened", "frightening", "terrified", "terror", "panic", "panicked", "anxious", "anxiety", "nervous", "worried", "worry", "unsafe", "danger", "alarm", "alarmed", "startle", "startled", "tense", "stress"],
    },
    {
      cue: "protection + intensity",
      formId: "thorn-star",
      paletteId: "storm",
      keywords: ["sharp", "anger", "angry", "strong", "thorn", "steel", "power", "rage", "furious", "defend", "protect", "boundary"],
    },
    {
      cue: "motion + change",
      formId: "ribbon-iris",
      paletteId: "violet",
      keywords: ["dance", "flow", "motion", "grace", "move", "ribbon", "body", "change", "flexible", "transition", "journey"],
    },
    {
      cue: "work + structure",
      formId: "honey-orbit",
      paletteId: "clay",
      keywords: ["work", "build", "make", "team", "craft", "honey", "job", "business", "money", "wealth", "plan", "organize", "structure"],
    },
    {
      cue: "future + discovery",
      formId: "comet-orchid",
      paletteId: "aurora",
      keywords: ["space", "star", "future", "launch", "explore", "cosmic", "galaxy", "universe", "adventure", "discover", "invent"],
    },
    {
      cue: "memory + history",
      formId: "echo-chime",
      paletteId: "plum",
      keywords: ["memory", "echo", "past", "remember", "nostalgia", "again", "history", "miss", "lost", "loss", "death", "mourning", "ancestor"],
    },
    {
      cue: "warmth + summer",
      formId: "coral-fan",
      paletteId: "coral",
      keywords: ["coral", "beach", "tropical", "summer", "warm", "reef", "sunshine", "vacation", "coast"],
    },
    {
      cue: "freedom + air",
      formId: "feather-fern",
      paletteId: "aurora",
      keywords: ["bird", "free", "freedom", "air", "wind", "fly", "feather", "open", "escape", "travel", "breathe"],
    },
    {
      cue: "inspiration + possibility",
      formId: "phoenix-plume",
      paletteId: "sunlit",
      keywords: ["inspire", "inspired", "inspiring", "inspiration", "muse", "epiphany", "breakthrough", "vision", "visionary", "uplifted", "sparked"],
    },
    {
      cue: "creativity + color",
      formId: "prism-poppy",
      paletteId: "prismatic",
      keywords: ["color", "rainbow", "art", "paint", "create", "prism", "design", "imagine", "creative", "creativity", "beauty"],
    },
    {
      cue: "curiosity + inquiry",
      formId: "spiral-anemone",
      paletteId: "violet",
      keywords: ["curious", "curiosity", "question", "wonder", "loop", "think", "spiral", "why", "idea", "mind", "research", "dna", "genome", "genetic", "helix", "biology"],
    },
    {
      cue: "play + delight",
      formId: "bubble-clover",
      paletteId: "citrus",
      keywords: ["play", "laugh", "laughter", "silly", "child", "bubble", "fun", "game", "delight", "humor"],
    },
    {
      cue: "secrecy + inwardness",
      formId: "secret-pod",
      paletteId: "plum",
      keywords: ["secret", "hidden", "private", "quiet", "hush", "inside", "intimate", "unknown", "conceal"],
    },
    {
      cue: "crime + consequence",
      formId: "evidence-briar",
      paletteId: "noir",
      keywords: ["crime", "criminal", "criminality", "illegal", "theft", "steal", "stolen", "robbery", "burglary", "fraud", "scam", "murder", "violence", "guilty", "guilt", "evidence", "suspect", "prison", "arrest", "corruption", "vice", "lawless"],
    },
    {
      cue: "time + patience",
      formId: "clock-dandelion",
      paletteId: "cream",
      keywords: ["time", "wait", "patient", "patience", "slow", "later", "clock", "age", "process", "day", "year"],
    },
    {
      cue: "technology + systems",
      formId: "electric-lace",
      paletteId: "electric",
      keywords: ["code", "tech", "technology", "electric", "machine", "digital", "robot", "ai", "data", "system", "computer", "internet", "science"],
    },
    {
      cue: "devotion + ritual",
      formId: "rose-window",
      paletteId: "blossom",
      keywords: ["rose", "devotion", "kiss", "wedding", "anniversary", "ceremony"],
    },
    {
      cue: "balance + stillness",
      formId: "lotus-mirror",
      paletteId: "tide",
      keywords: ["lotus", "meditate", "meditation", "balance", "zen", "spiritual", "centered"],
    },
    {
      cue: "strangeness + wonder",
      formId: "mushroom-lantern",
      paletteId: "plum",
      keywords: ["mushroom", "fungi", "weird", "strange", "odd", "whimsical", "surreal"],
    },
    {
      cue: "resilience + endurance",
      formId: "desert-cactus",
      paletteId: "clay",
      keywords: ["desert", "dry", "resilience", "survive", "tough", "endurance", "persist"],
    },
    {
      cue: "sorrow + release",
      formId: "willow-tear",
      paletteId: "twilight",
      keywords: ["willow", "sorrow", "farewell", "goodbye", "ache", "mourn", "release"],
    },
    {
      cue: "rebirth + return",
      formId: "phoenix-plume",
      paletteId: "ember",
      keywords: ["phoenix", "rebirth", "rise", "return", "revival", "comeback", "restart"],
    },
    {
      cue: "community + connection",
      formId: "constellation-vine",
      paletteId: "aurora",
      keywords: ["community", "connection", "network", "together", "collective", "social", "people"],
    },
    {
      cue: "complexity + problem solving",
      formId: "labyrinth-bloom",
      paletteId: "violet",
      keywords: ["complex", "complexity", "puzzle", "problem", "maze", "tangled", "confusion", "solve"],
    },
    {
      cue: "beginnings + awakening",
      formId: "sunrise-trumpet",
      paletteId: "blossom",
      keywords: ["begin", "beginning", "start", "dawn", "awakening", "fresh", "opportunity"],
    },
    {
      cue: "elegance + drama",
      formId: "midnight-dahlia",
      paletteId: "plum",
      keywords: ["luxury", "elegant", "elegance", "drama", "regal", "opulent", "glamour"],
    },
    {
      cue: "wishes + promises",
      formId: "paper-crane",
      paletteId: "cream",
      keywords: ["wish", "wishful", "paper", "delicate", "promise", "origami", "vow"],
    },
    {
      cue: "perspective + refraction",
      formId: "kaleidoscope-bloom",
      paletteId: "prismatic",
      keywords: ["perspective", "kaleidoscope", "viewpoint", "refract", "facet", "angle", "lens"],
    },
  ];

  const STARTER_SPECS = [
    { id: "lab-01", seed: "small bright thoughts", species: "spark", xNorm: 0.12, ageDays: 41 },
    { id: "lab-02", seed: "listen closely", species: "noise", xNorm: 0.31, ageDays: 29 },
    { id: "lab-03", seed: "both things are true", species: "quantum", xNorm: 0.5, ageDays: 19 },
    { id: "lab-04", seed: "tiny companion", species: "pet", xNorm: 0.7, ageDays: 13 },
    { id: "lab-05", seed: "find the right voice", species: "fonts", xNorm: 0.88, ageDays: 7 },
  ];

  const RANDOM_SEEDS = [
    "curiosity",
    "moon dream",
    "tidal calm",
    "heart friend",
    "moss garden",
    "ink story",
    "hidden rhythm",
    "parallel maybe",
    "ember courage",
    "winter crystal",
    "soft cloud",
    "thorn strength",
    "ribbon dance",
    "patient craft",
    "comet future",
    "echo memory",
    "coral summer",
    "feather wind",
    "prism color",
    "spiral question",
    "bubble laughter",
    "secret hush",
    "clock patience",
    "electric code",
  ];

  const PREFIXES = ["Quiet", "Lucid", "Tender", "Electric", "Patient", "Wild", "Little", "Secret"];
  const RARE_TRAITS = [
    "rare luminous mutation",
    "midnight superbloom",
    "double-root anomaly",
    "unusually good listener",
    "impossible petal geometry",
  ];

  const SEMANTIC_ALIASES = {
    inspired: "inspire",
    inspiring: "inspire",
    inspiration: "inspire",
    visionary: "vision",
    criminal: "crime",
    criminals: "crime",
    criminality: "crime",
    scared: "scare",
    frightened: "frighten",
    terrified: "terror",
    panicked: "panic",
    anxious: "anxiety",
    worried: "worry",
    angry: "anger",
    furious: "rage",
    happiness: "happy",
    sadness: "sad",
    loneliness: "lonely",
    creativity: "create",
    creative: "create",
    technological: "technology",
    musical: "music",
    peaceful: "peace",
    hopeful: "hope",
    loving: "love",
    healing: "heal",
    grieving: "grief",
    remembered: "remember",
    forgotten: "forget",
    freedom: "free",
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cellSize = 6;
  let columns = 0;
  let rows = 0;
  let groundRow = 0;
  let geometryCache = new Map();
  const wordDNACache = new Map();
  let scenery = null;
  let startersVisible = loadStartersVisible();
  let visitorPlants = loadVisitorPlants(
    startersVisible ? MAX_VISITORS_WITH_LAB : MAX_VISITORS_WITHOUT_LAB
  );
  let plants = [];
  let hoveredPlant = null;
  let selectedPlant = null;
  let currentLightIndex = getLocalLightIndex();
  let rainActive = false;
  let lastFrame = performance.now();
  let lastRainGrowthSave = 0;
  let lastRainLabel = "";
  let toastTimer = null;
  let animationFrame = null;

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value).toLowerCase();
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mixHash(value) {
    let mixed = value >>> 0;
    mixed ^= mixed >>> 16;
    mixed = Math.imul(mixed, 0x7feb352d);
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x846ca68b);
    mixed ^= mixed >>> 16;
    return mixed >>> 0;
  }

  function buildMysteryVariant(hash) {
    const mixed = mixHash(hash);
    const blueprint =
      MYSTERY_BLUEPRINTS[mixed % MYSTERY_BLUEPRINTS.length];
    const leaf = blueprint.leaves[(mixed >>> 4) % blueprint.leaves.length];
    const posture =
      blueprint.postures[(mixed >>> 8) % blueprint.postures.length];
    const night = blueprint.nights[(mixed >>> 11) % blueprint.nights.length];
    const paletteId =
      MYSTERY_PALETTES[(mixed >>> 15) % MYSTERY_PALETTES.length];
    const flourish =
      MYSTERY_FLOURISHES[(mixed >>> 19) % MYSTERY_FLOURISHES.length];
    const variantCode = (mixed & 0xfff)
      .toString(16)
      .toUpperCase()
      .padStart(3, "0");

    return {
      id: `M-${variantCode}`,
      paletteId,
      flourish,
      morphology: {
        architecture: blueprint.architecture,
        root: blueprint.root,
        leaf,
        arrangement: blueprint.arrangement,
        posture,
        growth: blueprint.growth,
        night,
        organ: "foliage",
        leafEvery: blueprint.leafEvery,
      },
    };
  }

  function seededRandom(seed) {
    let state = hashString(seed) || 1;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function colorWithAlpha(color, alpha) {
    const value = String(color).replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(255, 255, 255, ${alpha})`;
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function pick(list, random) {
    return list[Math.floor(random() * list.length)];
  }

  function randomBetween(min, max, random) {
    return min + random() * (max - min);
  }

  function randomInt(min, max, random) {
    return Math.floor(randomBetween(min, max + 1, random));
  }

  function sanitizeSeed(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 32);
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  function seedCode(seed) {
    return hashString(seed).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
  }

  function getSemanticWordVariants(value) {
    const word = String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const variants = new Set();
    if (!word) return variants;
    variants.add(word);

    const alias = SEMANTIC_ALIASES[word];
    if (alias) variants.add(alias);

    if (word.length >= 5) {
      if (word.endsWith("ies")) variants.add(`${word.slice(0, -3)}y`);
      if (word.endsWith("ness")) variants.add(word.slice(0, -4));
      if (word.endsWith("ful")) variants.add(word.slice(0, -3));
      if (word.endsWith("less")) variants.add(word.slice(0, -4));
      if (word.endsWith("ment")) variants.add(word.slice(0, -4));
      if (word.endsWith("ly")) variants.add(word.slice(0, -2));
      if (word.endsWith("ing")) {
        const stem = word.slice(0, -3);
        variants.add(stem);
        variants.add(`${stem}e`);
        if (stem.length > 2 && stem.at(-1) === stem.at(-2)) {
          variants.add(stem.slice(0, -1));
        }
      }
      if (word.endsWith("ed")) {
        const stem = word.slice(0, -2);
        variants.add(stem);
        variants.add(`${stem}e`);
        if (stem.length > 2 && stem.at(-1) === stem.at(-2)) {
          variants.add(stem.slice(0, -1));
        }
      }
      if (word.endsWith("es")) variants.add(word.slice(0, -2));
      if (word.endsWith("s")) variants.add(word.slice(0, -1));
    }

    [...variants].forEach((variant) => {
      const variantAlias = SEMANTIC_ALIASES[variant];
      if (variantAlias) variants.add(variantAlias);
    });
    return variants;
  }

  function scoreSemanticKeywords(text, words, keywords) {
    let score = 0;
    const matches = [];
    const wordVariants = new Set();
    words.forEach((word) => {
      getSemanticWordVariants(word).forEach((variant) => wordVariants.add(variant));
    });

    keywords.forEach((keywordValue) => {
      const keyword = keywordValue.toLowerCase();
      if (keyword.includes(" ") && text.includes(keyword)) {
        score += 9;
        matches.push(keyword);
        return;
      }
      const keywordVariants = getSemanticWordVariants(keyword);
      if ([...keywordVariants].some((variant) => wordVariants.has(variant))) {
        score += 6;
        matches.push(keyword);
        return;
      }

      if (
        keyword.length >= 6 &&
        [...wordVariants].some(
          (variant) =>
            variant.length >= 6 &&
            (variant.startsWith(keyword) || keyword.startsWith(variant))
        )
      ) {
        score += 2;
        matches.push(keyword);
      }
    });

    return { score, matches };
  }

  function findBestSemanticMatch(catalog, text, words) {
    let bestMatch = null;
    catalog.forEach((entry, index) => {
      const result = scoreSemanticKeywords(text, words, entry.keywords);
      if (!result.score) return;
      if (!bestMatch || result.score > bestMatch.score) {
        bestMatch = {
          entry,
          index,
          score: result.score,
          matches: result.matches,
        };
      }
    });
    return bestMatch;
  }

  function analyzeWord(seedValue) {
    const seed = sanitizeSeed(seedValue).toLowerCase() || "seed";
    if (wordDNACache.has(seed)) return wordDNACache.get(seed);

    const letters = seed.replace(/[^a-z]/g, "") || "seed";
    const words = seed
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);
    const length = letters.length;
    const vowels = (letters.match(/[aeiouy]/g) || []).length;
    const consonants = Math.max(0, length - vowels);
    const vowelRatio = vowels / Math.max(1, length);
    const uniqueRatio = new Set(letters).size / Math.max(1, length);
    const uniqueVowels = new Set(letters.match(/[aeiouy]/g) || []).size;
    const roundLetters = (letters.match(/[ocqgsdbp]/g) || []).length;
    const sharpLetters = (letters.match(/[avwxyzkt]/g) || []).length;
    const repeatedLetters = letters
      .split("")
      .filter((letter, index) => index > 0 && letter === letters[index - 1]).length;
    const hash = hashString(seed);

    const meaningMatch = findBestSemanticMatch(SEMANTIC_THEMES, seed, words);
    const semanticSpecies = findBestSemanticMatch(SPECIES_KEYWORDS, seed, words);
    let species;
    if (semanticSpecies) {
      species = semanticSpecies.entry.species;
    } else if (sharpLetters / Math.max(1, length) > 0.32) {
      species = "quantum";
    } else if (vowelRatio > 0.58) {
      species = "spark";
    } else if (repeatedLetters > 0) {
      species = "pet";
    } else {
      species = ["wild", "spark", "noise", "quantum", "pet", "fonts"][hash % 6];
    }

    const semanticPalette = findBestSemanticMatch(WORD_PALETTES, seed, words);
    const semanticForm = findBestSemanticMatch(BOTANICAL_FORMS, seed, words);
    const themedPalette = meaningMatch
      ? WORD_PALETTES.find((palette) => palette.id === meaningMatch.entry.paletteId)
      : null;
    const themedForm = meaningMatch
      ? BOTANICAL_FORMS.find((form) => form.id === meaningMatch.entry.formId)
      : null;
    const mysteryForm = BOTANICAL_FORMS.find((form) => form.id === UNKNOWN_FORM_ID);
    const neutralPalette = WORD_PALETTES.find((palette) => palette.id === "moss");
    const form =
      themedForm ||
      (semanticForm && semanticForm.entry) ||
      mysteryForm;
    const mysteryVariant =
      form.id === UNKNOWN_FORM_ID
        ? buildMysteryVariant(hash)
        : null;
    const mysteryPalette = mysteryVariant
      ? WORD_PALETTES.find((palette) => palette.id === mysteryVariant.paletteId)
      : null;
    const palette =
      themedPalette ||
      (semanticPalette && semanticPalette.entry) ||
      mysteryPalette ||
      neutralPalette;
    const morphology =
      (mysteryVariant && mysteryVariant.morphology) ||
      MORPHOLOGY_BY_PROFILE[form.profile] ||
      MORPHOLOGY_BY_PROFILE.crown;
    const semanticCue = meaningMatch
      ? meaningMatch.entry.cue
      : semanticForm
        ? semanticForm.matches[0]
        : semanticPalette
          ? `${semanticPalette.matches[0]} color cue only`
          : "unclassified concept";
    const semanticSource = meaningMatch || semanticForm
      ? "meaning"
      : semanticPalette
        ? "partial-meaning"
        : "unclassified";

    const heightScale = clamp(
      0.8 + Math.min(length, 18) * 0.026 + ((hash >>> 8) % 7) * 0.008,
      0.84,
      1.22
    );
    const spreadScale = clamp(
      0.72 + uniqueRatio * 0.62 + ((hash >>> 11) % 5) * 0.025,
      0.82,
      1.42
    );
    const rootSpread = clamp(
      0.8 + consonants / Math.max(1, length) * 0.48,
      0.88,
      1.26
    );
    const rootDepth = clamp(0.82 + Math.min(length, 16) * 0.022, 0.86, 1.18);
    const leafScale = clamp(
      0.82 + roundLetters / Math.max(1, length) * 0.78 + uniqueRatio * 0.16,
      0.86,
      1.42
    );
    const bloomScale = clamp(
      0.82 + vowelRatio * 0.62 + uniqueVowels * 0.055,
      0.9,
      1.42
    );
    const petalCount = clamp(form.petals + ((hash >>> 25) % 3) - 1, 4, 14);
    const petalWidth = clamp(
      form.width +
        roundLetters / Math.max(1, length) * 0.08 -
        sharpLetters / Math.max(1, length) * 0.04,
      0.08,
      0.5
    );
    const swayScale = clamp(0.72 + vowelRatio * 0.72, 0.76, 1.38);
    const pollenCount = clamp(2 + uniqueVowels, 2, 6);
    const stemWeight = clamp(0.88 + repeatedLetters * 0.11 + length / 80, 0.9, 1.24);
    const depthScale = 0.76 + ((hash >>> 17) % 15) / 100;

    const heightLabel = heightScale > 1.14 ? "tall" : heightScale < 0.96 ? "compact" : "mid-height";
    const spreadLabel = spreadScale > 1.22 ? "wide" : spreadScale < 0.98 ? "upright" : "branching";
    const label = `${form.label}, ${heightLabel}, ${spreadLabel}`;

    const dna = {
      seed,
      species,
      palette,
      form,
      morphology,
      mysteryVariant,
      semanticCue,
      semanticSource,
      heightScale,
      spreadScale,
      rootSpread,
      rootDepth,
      leafScale,
      bloomScale,
      petalCount,
      petalWidth,
      swayScale,
      pollenCount,
      stemWeight,
      depthScale,
      label,
    };
    wordDNACache.set(seed, dna);
    return dna;
  }

  function getPlantStyle(plant) {
    const species = SPECIES[plant.species];
    const dna = analyzeWord(plant.seed);
    return {
      ...species,
      stem: dna.palette.stem,
      leaf: dna.palette.leaf,
      bloom: dna.palette.bloom,
      accent: dna.palette.accent,
      root: dna.palette.root,
    };
  }

  function getLocalLightIndex() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 0;
    if (hour >= 9 && hour < 17) return 1;
    if (hour >= 17 && hour < 20) return 2;
    return 3;
  }

  function loadVisitorPlants(visitorLimit) {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      return value
        .filter((plant) => plant && typeof plant.seed === "string")
        .slice(0, visitorLimit)
        .map((plant, index) => {
          const seed = sanitizeSeed(plant.seed) || "unknown seed";
          return {
            id: typeof plant.id === "string" ? plant.id : `visitor-${index + 1}`,
            seed,
            species: chooseSpecies(seed),
            xNorm: clamp(Number(plant.xNorm) || 0.5, 0.04, 0.96),
            createdAt: Number(plant.createdAt) || Date.now(),
            variant: plant.variant === "surprise" ? "surprise" : "word",
            visitor: true,
            growth: 1,
            rainGrowth: clamp(Number(plant.rainGrowth) || 0, 0, 1),
          };
        });
    } catch (error) {
      return [];
    }
  }

  function loadStartersVisible() {
    try {
      return localStorage.getItem(STARTERS_VISIBLE_KEY) !== "hidden";
    } catch (error) {
      return true;
    }
  }

  function saveStarterVisibility() {
    try {
      localStorage.setItem(STARTERS_VISIBLE_KEY, startersVisible ? "visible" : "hidden");
    } catch (error) {
      setStatus("The garden changed, but this browser declined to remember the reset.");
    }
  }

  function saveVisitorPlants() {
    try {
      const payload = visitorPlants.map(
        ({ id, seed, species, xNorm, createdAt, variant, rainGrowth }) => ({
          id,
          seed,
          species,
          xNorm,
          createdAt,
          variant,
          rainGrowth: clamp(Number(rainGrowth) || 0, 0, 1),
        })
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      const labPlants = plants.filter((plant) => !plant.visitor);
      if (labPlants.length) {
        const labRainGrowth =
          labPlants.reduce(
            (sum, plant) => sum + clamp(Number(plant.rainGrowth) || 0, 0, 1),
            0
          ) / labPlants.length;
        localStorage.setItem(LAB_RAIN_GROWTH_KEY, String(labRainGrowth));
      }
    } catch (error) {
      setStatus("The garden is growing, but this browser declined to remember it.");
    }
  }

  function loadLabRainGrowth() {
    try {
      return clamp(Number(localStorage.getItem(LAB_RAIN_GROWTH_KEY)) || 0, 0, 1);
    } catch (error) {
      return 0;
    }
  }

  function makeStarterPlants() {
    const now = Date.now();
    const rainGrowth = loadLabRainGrowth();
    return STARTER_SPECS.map((plant) => ({
      ...plant,
      visitor: false,
      createdAt: now - plant.ageDays * 86400000,
      growth: 1,
      rainGrowth,
    }));
  }

  function rebuildPlantList() {
    plants = [...(startersVisible ? makeStarterPlants() : []), ...visitorPlants];
    if (selectedPlant && !plants.some((plant) => plant.id === selectedPlant.id)) {
      resetSpecimenReader();
    }
    geometryCache.clear();
    updateReadings();
    updateWeatherLabel();
  }

  function chooseSpecies(seed) {
    return analyzeWord(seed).species;
  }

  function makePlantName(plant) {
    const species = SPECIES[plant.species];
    if (!plant.visitor) return species.commonName;
    const cleanWord = plant.seed.split(" ")[0].replace(/[^a-z0-9]/gi, "");
    if (plant.variant === "surprise") {
      return `${capitalize(cleanWord || "Wild")} Surprise Bloom`;
    }
    const form = analyzeWord(plant.seed).form;
    if (cleanWord.length >= 3 && cleanWord.length <= 14) {
      return `${capitalize(cleanWord)} ${form.noun}`;
    }
    const random = seededRandom(`${plant.seed}:name`);
    return `${pick(PREFIXES, random)} ${form.noun}`;
  }

  function getTrait(plant) {
    const species = SPECIES[plant.species];
    const hash = hashString(`${plant.seed}:trait`);
    if (plant.variant === "surprise") return "garden-generated starburst mutation";
    if (isRarePlant(plant)) return RARE_TRAITS[hash % RARE_TRAITS.length];
    if (plant.visitor) return analyzeWord(plant.seed).form.trait;
    return species.traits[hash % species.traits.length];
  }

  function getMorphologyDescription(dna) {
    const morphology = dna.morphology;
    return [
      MORPHOLOGY_LABELS.organ[morphology.organ],
      MORPHOLOGY_LABELS.architecture[morphology.architecture],
      MORPHOLOGY_LABELS.posture[morphology.posture],
      MORPHOLOGY_LABELS.leaf[morphology.leaf],
      MORPHOLOGY_LABELS.root[morphology.root],
      MORPHOLOGY_LABELS.growth[morphology.growth],
      `${MORPHOLOGY_LABELS.night[morphology.night]} after dark`,
    ].join(" · ");
  }

  function isRarePlant(plant) {
    return hashString(`${plant.seed}:trait`) % 29 === 0;
  }

  function getSpecimenLabel(plant) {
    if (!plant.visitor) return `LAB ${plant.id.slice(-2)}`;
    const visitorIndex = visitorPlants.findIndex((item) => item.id === plant.id);
    return `WILD ${String(visitorIndex + 6).padStart(2, "0")}`;
  }

  function getPlantTypeId(plant) {
    if (!plant.visitor) return `lab:${plant.species}`;
    if (plant.variant === "surprise") return "visitor:surprise-starburst";
    const dna = analyzeWord(plant.seed);
    if (dna.mysteryVariant) {
      return `visitor:${dna.form.id}:${dna.mysteryVariant.id}`;
    }
    return `visitor:${dna.form.id}`;
  }

  function getVisitorCapacity() {
    return startersVisible ? MAX_VISITORS_WITH_LAB : MAX_VISITORS_WITHOUT_LAB;
  }

  function addCell(list, seen, x, y, color, role = "body") {
    if (x < 0 || x >= columns || y < 0 || y >= rows) return;
    const key = `${x}:${y}:${role}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ x, y, color, role });
  }

  function addDiamond(list, seen, cx, cy, radius, outer, inner, role = "bloom") {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) {
          const color = dx === 0 && dy === 0 ? inner : outer;
          addCell(list, seen, cx + dx, cy + dy, color, role);
        }
      }
    }
  }

  function buildSegments(cells, allowedRoles) {
    const segments = [];
    const positionMap = new Map();
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ];

    cells.forEach((cell, index) => {
      if (!allowedRoles.includes(cell.role)) return;
      const key = `${cell.x}:${cell.y}`;
      if (!positionMap.has(key)) positionMap.set(key, []);
      positionMap.get(key).push(index);
    });

    cells.forEach((cell, index) => {
      if (!allowedRoles.includes(cell.role)) return;
      directions.forEach(([dx, dy]) => {
        const matches = positionMap.get(`${cell.x + dx}:${cell.y + dy}`) || [];
        matches.forEach((matchIndex) => {
          if (allowedRoles.includes(cells[matchIndex].role)) {
            segments.push({ a: index, b: matchIndex });
          }
        });
      });
    });

    return segments;
  }

  function buildTreeSegments(cells, allowedRoles) {
    const segments = [];
    cells.forEach((cell, index) => {
      if (index === 0 || !allowedRoles.includes(cell.role)) return;
      let parent = -1;
      let parentDistance = Infinity;

      for (let candidateIndex = index - 1; candidateIndex >= 0; candidateIndex -= 1) {
        const candidate = cells[candidateIndex];
        if (!allowedRoles.includes(candidate.role)) continue;
        const distance = Math.hypot(cell.x - candidate.x, cell.y - candidate.y);
        if (distance <= 1.5 && distance < parentDistance) {
          parent = candidateIndex;
          parentDistance = distance;
          if (distance === 1) break;
        }
      }

      if (parent >= 0) segments.push({ a: parent, b: index });
    });
    return segments;
  }

  function buildLeafAnchors(cells) {
    const bodyIndices = [];
    const anchors = [];
    cells.forEach((cell, index) => {
      if (cell.role === "body") bodyIndices.push(index);
    });

    cells.forEach((leaf, leafIndex) => {
      if (leaf.role !== "leaf") return;
      let nearest = -1;
      let nearestDistance = Infinity;
      bodyIndices.forEach((bodyIndex) => {
        const body = cells[bodyIndex];
        const distance = Math.hypot(leaf.x - body.x, leaf.y - body.y);
        if (distance < nearestDistance) {
          nearest = bodyIndex;
          nearestDistance = distance;
        }
      });
      if (nearest >= 0 && nearestDistance <= 3.2) {
        anchors.push({ leaf: leafIndex, body: nearest });
      }
    });
    return anchors;
  }

  function buildBloomClusters(cells) {
    const bloomIndices = cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.role === "bloom" || cell.role === "glow");
    const remaining = new Set(bloomIndices.map(({ index }) => index));
    const clusters = [];

    while (remaining.size) {
      const first = remaining.values().next().value;
      remaining.delete(first);
      const queue = [first];
      const indices = [];

      while (queue.length) {
        const currentIndex = queue.shift();
        const current = cells[currentIndex];
        indices.push(currentIndex);
        [...remaining].forEach((candidateIndex) => {
          const candidate = cells[candidateIndex];
          if (
            Math.abs(candidate.x - current.x) <= 1 &&
            Math.abs(candidate.y - current.y) <= 1
          ) {
            remaining.delete(candidateIndex);
            queue.push(candidateIndex);
          }
        });
      }

      const members = indices.map((index) => cells[index]);
      clusters.push({
        indices,
        firstIndex: Math.min(...indices),
        centerX: members.reduce((sum, cell) => sum + cell.x, 0) / members.length,
        centerY: members.reduce((sum, cell) => sum + cell.y, 0) / members.length,
        minX: Math.min(...members.map((cell) => cell.x)),
        maxX: Math.max(...members.map((cell) => cell.x)),
        minY: Math.min(...members.map((cell) => cell.y)),
        maxY: Math.max(...members.map((cell) => cell.y)),
        size: members.length,
        glows: members.some((cell) => cell.role === "glow"),
      });
    }

    return clusters;
  }

  function buildRoots(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const rootCount = randomInt(3, 5, random);

    addCell(cells, seen, baseX, groundRow + 1, species.root, "root");

    for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
      let x = baseX;
      let y = groundRow + 1;
      const direction = rootIndex % 2 === 0 ? -1 : 1;
      const length = randomInt(9, 18, random);

      for (let step = 0; step < length; step += 1) {
        y += random() < 0.72 ? 1 : 0;
        if (random() < 0.78) x += direction;
        if (random() < 0.2) x -= direction;
        x = clamp(x, 1, columns - 2);
        addCell(cells, seen, x, y, species.root, "root");

        if (step > 3 && step % 4 === 0) {
          const twigDirection = random() < 0.5 ? -1 : 1;
          addCell(cells, seen, x + twigDirection, y + 1, species.root, "root");
          if (random() < 0.55) {
            addCell(cells, seen, x + twigDirection * 2, y + 1, species.root, "root");
          }
        }
      }
    }

    return cells;
  }

  function addCellLine(list, seen, fromX, fromY, toX, toY, color, role) {
    const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY), 1);
    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      addCell(
        list,
        seen,
        Math.round(fromX + (toX - fromX) * progress),
        Math.round(fromY + (toY - fromY) * progress),
        color,
        role
      );
    }
  }

  function buildMorphologyRoots(baseX, random, species, morphology) {
    const cells = [];
    const seen = new Set();
    const baseY = groundRow + 1;
    const rootStyle = morphology.root;
    const line = (fromX, fromY, toX, toY) =>
      addCellLine(cells, seen, fromX, fromY, toX, toY, species.root, "root");

    addCell(cells, seen, baseX, baseY, species.root, "root");

    if (rootStyle === "tap") {
      const depth = randomInt(16, 22, random);
      line(baseX, baseY, baseX + (random() < 0.5 ? -1 : 1), baseY + depth);
      [5, 9, 13].forEach((drop, index) => {
        const reach = 4 + index * 2;
        line(baseX, baseY + drop, baseX - reach, baseY + drop + 3);
        line(baseX, baseY + drop + 1, baseX + reach, baseY + drop + 4);
      });
    } else if (rootStyle === "fibrous") {
      for (let root = -3; root <= 3; root += 1) {
        const reach = root * randomBetween(2.1, 3.1, random);
        const depth = randomInt(10, 17, random);
        line(baseX, baseY, baseX + reach, baseY + depth);
      }
    } else if (rootStyle === "paired") {
      [-1, 1].forEach((side) => {
        line(baseX, baseY, baseX + side * 11, baseY + 15);
        line(baseX + side * 5, baseY + 7, baseX + side * 13, baseY + 11);
        line(baseX + side * 7, baseY + 10, baseX + side * 9, baseY + 18);
      });
    } else if (rootStyle === "radial") {
      for (let ray = 0; ray < 7; ray += 1) {
        const side = ray - 3;
        const reach = side * 3.2;
        const depth = 8 + Math.abs(side % 2) * 5;
        line(baseX, baseY, baseX + reach, baseY + depth);
      }
    } else if (rootStyle === "spiral") {
      [-1, 1].forEach((side) => {
        let lastX = baseX;
        let lastY = baseY;
        for (let step = 1; step <= 18; step += 1) {
          const spread = 1.4 + step * 0.28;
          const nextX = baseX + Math.sin(step * 0.72) * spread * side;
          const nextY = baseY + step;
          line(lastX, lastY, nextX, nextY);
          lastX = nextX;
          lastY = nextY;
        }
      });
    } else if (rootStyle === "rhizome") {
      [-1, 1].forEach((side) => {
        line(baseX, baseY + 3, baseX + side * 16, baseY + 5);
        for (let node = 4; node <= 15; node += 4) {
          const nodeX = baseX + side * node;
          line(nodeX, baseY + 4, nodeX + side, baseY + 11 + (node % 3));
        }
      });
    } else if (rootStyle === "mycelial") {
      [-1, 1].forEach((side) => {
        for (let lane = 0; lane < 3; lane += 1) {
          const endX = baseX + side * (9 + lane * 4);
          const endY = baseY + 5 + lane * 4;
          line(baseX, baseY + lane, endX, endY);
          line(
            baseX + side * (4 + lane * 2),
            baseY + 3 + lane * 2,
            baseX + side * (8 + lane * 3),
            baseY + 10 + lane * 3
          );
        }
      });
    } else if (rootStyle === "stilt") {
      [-1, 1].forEach((side) => {
        line(baseX + side * 3, groundRow - 2, baseX + side * 9, baseY + 10);
        line(baseX, baseY, baseX + side * 4, baseY + 17);
      });
      line(baseX, baseY, baseX, baseY + 18);
    } else if (rootStyle === "clenched") {
      [-1, 1].forEach((side) => {
        line(baseX, baseY, baseX + side * 5, baseY + 4);
        line(baseX + side * 5, baseY + 4, baseX + side * 2, baseY + 9);
        line(baseX + side * 2, baseY + 9, baseX + side * 5, baseY + 13);
        line(baseX + side * 5, baseY + 13, baseX + side, baseY + 17);
      });
      line(baseX, baseY + 2, baseX, baseY + 19);
    } else if (rootStyle === "buried") {
      line(baseX, baseY, baseX, baseY + 12);
      [-1, 1].forEach((side) => {
        line(baseX, baseY + 10, baseX + side * 13, baseY + 12);
        [4, 8, 12].forEach((distance, index) => {
          const nodeX = baseX + side * distance;
          line(nodeX, baseY + 11, nodeX - side, baseY + 16 + index);
        });
      });
    } else {
      for (let ring = 0; ring < 4; ring += 1) {
        const ringY = baseY + ring;
        line(baseX - (4 - ring), ringY, baseX + (4 - ring), ringY);
      }
      [-1, 0, 1].forEach((offset) => {
        line(baseX + offset * 2, baseY + 4, baseX + offset * 5, baseY + 14);
      });
    }

    return cells;
  }

  function buildMorphologyPlant(baseX, random, species, plant) {
    const cells = [];
    const seen = new Set();
    const dna = analyzeWord(plant.seed);
    const morphology = dna.morphology;
    const architecture = morphology.architecture;
    const tips = [];
    const height = randomInt(25, 38, random);
    const stem = (fromX, fromY, toX, toY) =>
      addCellLine(cells, seen, fromX, fromY, toX, toY, species.stem, "body");
    const rememberTip = (x, y) => tips.push({ x: Math.round(x), y: Math.round(y) });

    if (architecture === "candelabra") {
      stem(baseX, groundRow, baseX, groundRow - height);
      [-1, 1].forEach((side) => {
        [0.42, 0.66].forEach((level, index) => {
          const branchY = groundRow - Math.round(height * level);
          const reach = 5 + index * 2;
          stem(baseX, branchY, baseX + side * reach, branchY - 2);
          stem(baseX + side * reach, branchY - 2, baseX + side * reach, branchY - 8);
          rememberTip(baseX + side * reach, branchY - 9);
        });
      });
      rememberTip(baseX, groundRow - height - 1);
    } else if (architecture === "rosette") {
      stem(baseX, groundRow, baseX, groundRow - 9);
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = -Math.PI + (Math.PI * ray) / 7;
        const reach = 5 + (ray % 3);
        const tipX = baseX + Math.cos(angle) * reach;
        const tipY = groundRow - 4 - Math.abs(Math.sin(angle)) * 7;
        stem(baseX, groundRow - 2, tipX, tipY);
        rememberTip(tipX, tipY - 1);
      }
    } else if (architecture === "fountain") {
      for (let frond = -2; frond <= 2; frond += 1) {
        let lastX = baseX;
        let lastY = groundRow;
        const frondHeight = height - Math.abs(frond) * 3;
        for (let step = 1; step <= frondHeight; step += 1) {
          const bend = frond * Math.pow(step / frondHeight, 1.65) * 5.2;
          const nextX = baseX + bend;
          const nextY = groundRow - step;
          stem(lastX, lastY, nextX, nextY);
          lastX = nextX;
          lastY = nextY;
        }
        rememberTip(lastX, lastY - 1);
      }
    } else if (architecture === "twin") {
      stem(baseX, groundRow, baseX, groundRow - 5);
      [-1, 1].forEach((side) => {
        let lastX = baseX;
        let lastY = groundRow - 5;
        for (let step = 1; step <= height - 5; step += 1) {
          const nextX = baseX + side * (1 + Math.floor(step / 7));
          const nextY = groundRow - 5 - step;
          stem(lastX, lastY, nextX, nextY);
          lastX = nextX;
          lastY = nextY;
        }
        rememberTip(lastX, lastY - 1);
      });
    } else if (architecture === "ladder") {
      stem(baseX, groundRow, baseX, groundRow - height);
      for (let rung = 8; rung < height - 3; rung += 7) {
        const side = rung % 14 === 0 ? -1 : 1;
        stem(baseX, groundRow - rung, baseX + side * 7, groundRow - rung - 1);
        rememberTip(baseX + side * 7, groundRow - rung - 2);
      }
      rememberTip(baseX, groundRow - height - 1);
    } else if (architecture === "reed") {
      for (let reed = -2; reed <= 2; reed += 1) {
        const reedHeight = height - Math.abs(reed) * 3 + (reed % 2) * 2;
        let lastX = baseX + reed * 2;
        let lastY = groundRow;
        for (let step = 1; step <= reedHeight; step += 1) {
          const nextX =
            baseX + reed * 2 + Math.sin(step * 0.24 + reed) * 0.8;
          const nextY = groundRow - step;
          stem(lastX, lastY, nextX, nextY);
          lastX = nextX;
          lastY = nextY;
        }
        rememberTip(lastX, lastY - 1);
      }
    } else if (architecture === "whorl") {
      stem(baseX, groundRow, baseX, groundRow - height);
      for (let level = 10; level < height; level += 8) {
        [-1, 1].forEach((side) => {
          const reach = 4 + (level % 3);
          stem(baseX, groundRow - level, baseX + side * reach, groundRow - level - 3);
          if (level > height * 0.55) {
            rememberTip(baseX + side * reach, groundRow - level - 4);
          }
        });
      }
      rememberTip(baseX, groundRow - height - 1);
    } else if (architecture === "spire") {
      let lastX = baseX;
      let lastY = groundRow;
      for (let step = 1; step <= height + 4; step += 1) {
        const lean = morphology.posture === "leaning" ? step / 9 : 0;
        const nextX = baseX + lean;
        const nextY = groundRow - step;
        stem(lastX, lastY, nextX, nextY);
        lastX = nextX;
        lastY = nextY;
      }
      rememberTip(lastX, lastY - 1);
    } else if (architecture === "cluster") {
      for (let stalk = -2; stalk <= 2; stalk += 1) {
        const stalkHeight = Math.round(height * 0.62) + (2 - Math.abs(stalk)) * 4;
        const startX = baseX + stalk * 2;
        stem(baseX, groundRow, startX, groundRow - 3);
        stem(startX, groundRow - 3, startX + stalk * 0.8, groundRow - stalkHeight);
        rememberTip(startX + stalk * 0.8, groundRow - stalkHeight - 1);
      }
    } else if (architecture === "lattice") {
      const half = 5;
      stem(baseX - half, groundRow, baseX - half, groundRow - height);
      stem(baseX + half, groundRow, baseX + half, groundRow - height);
      for (let level = 5; level < height; level += 6) {
        if (level % 12 === 0) {
          stem(baseX - half, groundRow - level, baseX + half, groundRow - level - 4);
        } else {
          stem(baseX + half, groundRow - level, baseX - half, groundRow - level - 4);
        }
      }
      rememberTip(baseX - half, groundRow - height - 1);
      rememberTip(baseX + half, groundRow - height - 1);
    } else if (architecture === "fan") {
      for (let ray = -3; ray <= 3; ray += 1) {
        const tipX = baseX + ray * 4;
        const tipY = groundRow - height + Math.abs(ray) * 4;
        stem(baseX, groundRow, tipX, tipY);
        rememberTip(tipX, tipY - 1);
      }
    } else if (architecture === "helix") {
      const helixHeight = height + 2;
      [-1, 1].forEach((side) => {
        let lastX = baseX + side * 2;
        let lastY = groundRow;
        for (let step = 1; step <= helixHeight; step += 1) {
          const nextX = baseX + Math.sin(step * 0.63) * 3.2 * side;
          const nextY = groundRow - step;
          stem(lastX, lastY, nextX, nextY);
          lastX = nextX;
          lastY = nextY;
        }
        rememberTip(lastX, lastY - 1);
      });
      for (let rung = 5; rung < helixHeight; rung += 5) {
        const offset = Math.sin(rung * 0.63) * 3.2;
        stem(baseX - offset, groundRow - rung, baseX + offset, groundRow - rung);
      }
    } else if (architecture === "runner") {
      [-1, 1].forEach((side) => {
        stem(baseX, groundRow - 1, baseX + side * 13, groundRow - 3);
        [5, 10].forEach((distance, index) => {
          const shootX = baseX + side * distance;
          const shootHeight = 12 + index * 6;
          stem(shootX, groundRow - 2, shootX + side * 2, groundRow - shootHeight);
          rememberTip(shootX + side * 2, groundRow - shootHeight - 1);
        });
      });
    } else if (architecture === "column") {
      stem(baseX - 1, groundRow, baseX - 1, groundRow - height);
      stem(baseX + 1, groundRow, baseX + 1, groundRow - height);
      stem(baseX - 1, groundRow - height, baseX + 1, groundRow - height);
      [-1, 1].forEach((side, index) => {
        const branchY = groundRow - 12 - index * 8;
        stem(baseX + side, branchY, baseX + side * 6, branchY);
        stem(baseX + side * 6, branchY, baseX + side * 6, branchY - 9);
        rememberTip(baseX + side * 6, branchY - 10);
      });
      rememberTip(baseX, groundRow - height - 1);
    } else if (architecture === "cascade") {
      const crownY = groundRow - Math.round(height * 0.72);
      stem(baseX, groundRow, baseX, crownY);
      [-1, 1].forEach((side) => {
        for (let branch = 1; branch <= 3; branch += 1) {
          const startY = crownY + branch * 2;
          const endX = baseX + side * (5 + branch * 3);
          const endY = startY + 7 + branch;
          stem(baseX, startY, endX, startY - 2);
          stem(endX, startY - 2, endX + side, endY);
          rememberTip(endX + side, endY + 1);
        }
      });
      rememberTip(baseX, crownY - 2);
    } else if (architecture === "cage") {
      const cageHeight = Math.round(height * 0.82);
      const half = 6;
      stem(baseX - half, groundRow, baseX - half, groundRow - cageHeight);
      stem(baseX + half, groundRow, baseX + half, groundRow - cageHeight);
      for (let bar = 6; bar < cageHeight; bar += 7) {
        const gapSide = bar % 14 === 0 ? -1 : 1;
        if (gapSide < 0) {
          stem(baseX - half, groundRow - bar, baseX + 1, groundRow - bar - 1);
        } else {
          stem(baseX - 1, groundRow - bar, baseX + half, groundRow - bar - 1);
        }
      }
      const crookedEvidence = [
        [0, 0],
        [-2, -7],
        [2, -14],
        [-1, -21],
        [1, -cageHeight],
      ];
      for (let point = 1; point < crookedEvidence.length; point += 1) {
        const previous = crookedEvidence[point - 1];
        const current = crookedEvidence[point];
        stem(
          baseX + previous[0],
          groundRow + previous[1],
          baseX + current[0],
          groundRow + current[1]
        );
      }
      rememberTip(baseX - half, groundRow - cageHeight - 1);
      rememberTip(baseX + half, groundRow - cageHeight - 1);
      rememberTip(baseX + 1, groundRow - cageHeight - 2);
    } else if (architecture === "bramble") {
      const brambleHeight = Math.round(height * 0.72);
      stem(baseX, groundRow, baseX, groundRow - 7);
      [-1, 1].forEach((side) => {
        const shoulderX = baseX + side * 7;
        const shoulderY = groundRow - 12;
        stem(baseX, groundRow - 5, shoulderX, shoulderY);
        stem(shoulderX, shoulderY, baseX + side * 9, groundRow - 19);
        stem(
          baseX + side * 9,
          groundRow - 19,
          baseX + side * 4,
          groundRow - brambleHeight
        );
        stem(
          baseX + side * 4,
          groundRow - brambleHeight,
          baseX + side * 2,
          groundRow - brambleHeight - 5
        );
        rememberTip(baseX + side * 2, groundRow - brambleHeight - 6);
      });
      stem(baseX, groundRow - 7, baseX, groundRow - brambleHeight + 2);
      rememberTip(baseX, groundRow - brambleHeight + 1);
    } else {
      const turns = [
        [0, 0],
        [6, -5],
        [-4, -11],
        [6, -17],
        [-5, -24],
        [3, -31],
        [0, -height],
      ];
      for (let point = 1; point < turns.length; point += 1) {
        const previous = turns[point - 1];
        const current = turns[point];
        stem(
          baseX + previous[0],
          groundRow + previous[1],
          baseX + current[0],
          groundRow + current[1]
        );
      }
      rememberTip(baseX, groundRow - height - 1);
    }

    const bodyCells = cells.filter((cell) => cell.role === "body");
    const eligible =
      morphology.arrangement === "basal"
        ? bodyCells.filter((cell) => cell.y > groundRow - 12)
        : bodyCells.filter((cell) => cell.y < groundRow - 4);
    const leafCount = clamp(
      Math.round(eligible.length / Math.max(7, morphology.leafEvery * 2.2)),
      4,
      morphology.arrangement === "sparse" ? 6 : 15
    );

    for (let leafIndex = 0; leafIndex < leafCount && eligible.length; leafIndex += 1) {
      const sourceIndex = Math.min(
        eligible.length - 1,
        Math.floor(((leafIndex + 0.55) / leafCount) * eligible.length)
      );
      const source = eligible[sourceIndex];
      const side = leafIndex % 2 === 0 ? -1 : 1;
      const reach = morphology.leaf === "needle" || morphology.leaf === "scale" ? 1 : 2;
      addCell(
        cells,
        seen,
        source.x + side * reach,
        source.y - (leafIndex % 3 === 0 ? 1 : 0),
        species.leaf,
        "leaf"
      );
      if (morphology.arrangement === "paired" || morphology.arrangement === "whorled") {
        addCell(
          cells,
          seen,
          source.x - side * reach,
          source.y + (leafIndex % 2),
          species.leaf,
          "leaf"
        );
      }
    }

    const organ = plant.variant === "surprise" ? "flower" : morphology.organ;
    if (organ === "foliage") {
      tips.forEach((tip, tipIndex) => {
        const offsets =
          dna.mysteryVariant
            ? MYSTERY_TIP_OFFSETS[dna.mysteryVariant.flourish]
            : architecture === "helix"
              ? [[-2, 0], [2, 0], [-1, -2], [1, -2]]
              : [[-2, 0], [2, 0], [-1, -2], [1, -2], [0, -3]];
        offsets.forEach(([offsetX, offsetY], offsetIndex) => {
          if (
            dna.mysteryVariant ||
            (tipIndex + offsetIndex) % 2 === 0 ||
            offsets.length < 5
          ) {
            addCell(
              cells,
              seen,
              tip.x + offsetX,
              tip.y + offsetY,
              species.leaf,
              "leaf"
            );
          }
        });
      });
    } else {
      const bloomRadius = tips.length <= 3 ? 2 : 1;
      tips.forEach((tip) => {
        addDiamond(
          cells,
          seen,
          tip.x,
          tip.y,
          bloomRadius,
          species.bloom,
          species.accent,
          organ === "spore" ? "glow" : "bloom"
        );
      });
    }

    return cells;
  }

  function orderMorphologyCellsForGrowth(cells, baseX, morphology) {
    const roleOrder = { body: 0, leaf: 1, bloom: 2, glow: 2 };
    return cells.slice().sort((cellA, cellB) => {
      const roleDifference =
        (roleOrder[cellA.role] ?? 3) - (roleOrder[cellB.role] ?? 3);
      if (roleDifference) return roleDifference;

      const heightA = groundRow - cellA.y;
      const heightB = groundRow - cellB.y;
      if (morphology.growth === "branch") {
        const branchScoreA = heightA + Math.abs(cellA.x - baseX) * 1.8;
        const branchScoreB = heightB + Math.abs(cellB.x - baseX) * 1.8;
        return branchScoreA - branchScoreB;
      }
      if (morphology.growth === "unfurl" || morphology.growth === "pop") {
        const distanceA = Math.hypot(cellA.x - baseX, heightA);
        const distanceB = Math.hypot(cellB.x - baseX, heightB);
        return distanceA - distanceB;
      }
      return heightA - heightB || Math.abs(cellA.x - baseX) - Math.abs(cellB.x - baseX);
    });
  }

  function buildWildPlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const tips = [];
    const heightCells = randomInt(28, 45, random);
    let x = baseX;
    let y = groundRow;

    for (let step = 0; step < heightCells; step += 1) {
      addCell(cells, seen, x, y, species.stem);

      if (step > 5 && step < heightCells - 5 && step % 4 === 0) {
        const side = step % 8 === 0 ? -1 : 1;
        addCell(cells, seen, x + side, y, species.leaf, "leaf");
        addCell(cells, seen, x + side * 2, y - 1, species.leaf, "leaf");
        if (random() < 0.5) addCell(cells, seen, x + side * 2, y, species.leaf, "leaf");
      }

      if (step > heightCells * 0.48 && step % 7 === 0 && tips.length < 3) {
        const side = random() < 0.5 ? -1 : 1;
        let branchX = x;
        let branchY = y;
        const branchLength = randomInt(4, 7, random);
        for (let branchStep = 0; branchStep < branchLength; branchStep += 1) {
          branchX += side;
          if (branchStep % 2 === 0) branchY -= 1;
          addCell(cells, seen, branchX, branchY, species.stem);
        }
        tips.push({ x: branchX, y: branchY - 1 });
      }

      y -= 1;
      if (random() < 0.24) x += random() < 0.5 ? -1 : 1;
      x = clamp(x, 3, columns - 4);
    }

    tips.push({ x, y });
    const superBloom = random() < 0.11;
    tips.forEach((tip) => {
      addDiamond(cells, seen, tip.x, tip.y, superBloom ? 3 : 2, species.bloom, species.accent);
    });
    return cells;
  }

  function buildSparkPlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const heightCells = randomInt(34, 43, random);
    let x = baseX;
    let y = groundRow;

    for (let step = 0; step < heightCells; step += 1) {
      addCell(cells, seen, x, y, species.stem);
      if (step > 6 && step < heightCells - 7 && step % 6 === 0) {
        const side = step % 12 === 0 ? -1 : 1;
        addCell(cells, seen, x + side, y, species.leaf, "leaf");
        addCell(cells, seen, x + side * 2, y - 1, species.leaf, "leaf");
      }
      y -= 1;
      if (step % 9 === 0 && random() < 0.65) x += random() < 0.5 ? -1 : 1;
    }

    const lanternTips = [
      { x, y },
      { x: x - 7, y: y + 8 },
      { x: x + 7, y: y + 12 },
    ];

    lanternTips.slice(1).forEach((tip, index) => {
      const side = index === 0 ? -1 : 1;
      let branchX = x;
      let branchY = y + 11 + index * 3;
      while ((side < 0 && branchX > tip.x) || (side > 0 && branchX < tip.x)) {
        addCell(cells, seen, branchX, branchY, species.stem);
        branchX += side;
        if (Math.abs(branchX - x) % 2 === 0) branchY -= 1;
      }
      addCell(cells, seen, tip.x, tip.y - 1, species.stem);
    });

    lanternTips.forEach((tip) => {
      addCell(cells, seen, tip.x - 1, tip.y, species.bloom, "glow");
      addCell(cells, seen, tip.x, tip.y, species.accent, "glow");
      addCell(cells, seen, tip.x + 1, tip.y, species.bloom, "glow");
      addCell(cells, seen, tip.x - 1, tip.y + 1, species.bloom, "glow");
      addCell(cells, seen, tip.x, tip.y + 1, species.accent, "glow");
      addCell(cells, seen, tip.x + 1, tip.y + 1, species.bloom, "glow");
      addCell(cells, seen, tip.x, tip.y + 2, species.bloom, "glow");
    });

    return cells;
  }

  function buildNoisePlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const stemCount = randomInt(4, 6, random);

    for (let stemIndex = 0; stemIndex < stemCount; stemIndex += 1) {
      const offset = (stemIndex - (stemCount - 1) / 2) * 3;
      const heightCells = randomInt(25, 42, random);
      let x = Math.round(baseX + offset);
      let y = groundRow;

      for (let step = 0; step < heightCells; step += 1) {
        addCell(cells, seen, x, y, species.stem);
        y -= 1;
        if (step > 8 && step % 8 === 0) x += stemIndex % 2 === 0 ? -1 : 1;
      }

      for (let wave = -2; wave <= 2; wave += 1) {
        const waveY = y + Math.abs(wave) % 2;
        addCell(cells, seen, x + wave, waveY, wave === 0 ? species.accent : species.bloom, "bloom");
      }
      addCell(cells, seen, x, y - 2, species.bloom, "bloom");
    }

    return cells;
  }

  function buildQuantumPlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const stemHeight = randomInt(22, 29, random);
    let y = groundRow;

    for (let step = 0; step < stemHeight; step += 1) {
      addCell(cells, seen, baseX, y, species.stem);
      if (step > 7 && step % 7 === 0) {
        const side = step % 14 === 0 ? -1 : 1;
        addCell(cells, seen, baseX + side, y, species.leaf, "leaf");
        addCell(cells, seen, baseX + side * 2, y - 1, species.leaf, "leaf");
      }
      y -= 1;
    }

    const reach = randomInt(10, 14, random);
    [-1, 1].forEach((side) => {
      let branchX = baseX;
      let branchY = y + 1;
      for (let step = 0; step < reach; step += 1) {
        branchX += side;
        if (step % 2 === 0) branchY -= 1;
        addCell(cells, seen, branchX, branchY, species.stem);
      }
      addDiamond(cells, seen, branchX + side, branchY - 1, 3, species.bloom, species.accent);
      addCell(cells, seen, branchX + side * 4, branchY - 1, species.accent, "glow");
    });

    addCell(cells, seen, baseX, y - 2, species.bloom, "bloom");
    return cells;
  }

  function buildPetPlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const heightCells = randomInt(18, 25, random);

    for (let step = 0; step < heightCells; step += 1) {
      addCell(cells, seen, baseX, groundRow - step, species.stem);
    }

    const arms = [
      { side: -1, lift: 5, length: 8 },
      { side: 1, lift: 9, length: 10 },
      { side: -1, lift: 14, length: 6 },
    ];

    arms.forEach((arm) => {
      let x = baseX;
      let y = groundRow - arm.lift;
      for (let step = 0; step < arm.length; step += 1) {
        x += arm.side;
        if (step > 2) y -= 1;
        addCell(cells, seen, x, y, species.leaf, "leaf");
        if (step > 1 && step % 2 === 0) {
          addCell(cells, seen, x, y + 1, species.stem);
        }
      }
      addDiamond(cells, seen, x, y - 2, 2, species.bloom, species.accent);
    });

    addDiamond(cells, seen, baseX, groundRow - heightCells - 1, 2, species.bloom, species.accent);
    return cells;
  }

  function buildFontPlant(baseX, random, species) {
    const cells = [];
    const seen = new Set();
    const heightCells = randomInt(29, 37, random);
    let y = groundRow;

    for (let step = 0; step < heightCells; step += 1) {
      addCell(cells, seen, baseX, y, species.stem);
      if (step > 7 && step % 6 === 0) {
        const side = step % 12 === 0 ? -1 : 1;
        addCell(cells, seen, baseX + side, y, species.leaf, "leaf");
        addCell(cells, seen, baseX + side * 2, y, species.leaf, "leaf");
      }
      y -= 1;
    }

    const glyph = [
      "0011100",
      "0100010",
      "1000001",
      "1000001",
      "1111111",
      "1000001",
      "1000001",
    ];
    const topY = y - glyph.length;
    glyph.forEach((row, rowIndex) => {
      row.split("").forEach((value, columnIndex) => {
        if (value === "1") {
          const color = rowIndex === 4 ? species.accent : species.bloom;
          addCell(cells, seen, baseX - 3 + columnIndex, topY + rowIndex, color, "bloom");
        }
      });
    });
    return cells;
  }

  function buildGeometry(plant) {
    const cacheKey = `${plant.id}:${columns}:${rows}:${cellSize}`;
    if (geometryCache.has(cacheKey)) return geometryCache.get(cacheKey);

    const species = getPlantStyle(plant);
    const dna = analyzeWord(plant.seed);
    const random = seededRandom(`${plant.seed}:${plant.species}:geometry`);
    const baseX = clamp(Math.round(plant.xNorm * columns), 5, columns - 6);
    const rootCells = plant.visitor
      ? buildMorphologyRoots(baseX, random, species, dna.morphology)
      : buildRoots(baseX, random, species);
    let shootCells;

    if (plant.visitor) {
      shootCells = orderMorphologyCellsForGrowth(
        buildMorphologyPlant(baseX, random, species, plant),
        baseX,
        dna.morphology
      );
    }
    else if (plant.species === "spark") shootCells = buildSparkPlant(baseX, random, species);
    else if (plant.species === "noise") shootCells = buildNoisePlant(baseX, random, species);
    else if (plant.species === "quantum") shootCells = buildQuantumPlant(baseX, random, species);
    else if (plant.species === "pet") shootCells = buildPetPlant(baseX, random, species);
    else if (plant.species === "fonts") shootCells = buildFontPlant(baseX, random, species);
    else shootCells = buildWildPlant(baseX, random, species);

    const visibleCells = shootCells.length ? shootCells : [{ x: baseX, y: groundRow }];
    const transformedCells = visibleCells.map((cell) =>
      transformCellCoordinates(cell, plant, false)
    );
    const bounds = {
      left: Math.min(...transformedCells.map((cell) => cell.x)) * cellSize - cellSize * 3,
      right: (Math.max(...transformedCells.map((cell) => cell.x)) + 1) * cellSize + cellSize * 3,
      top: Math.min(...transformedCells.map((cell) => cell.y)) * cellSize - cellSize * 3,
      bottom: (groundRow + 2) * cellSize,
      centerX: baseX * cellSize,
    };

    const geometry = {
      rootCells,
      shootCells,
      rootSegments: buildTreeSegments(rootCells, ["root"]),
      stemSegments: buildSegments(shootCells, ["body"]),
      leafAnchors: buildLeafAnchors(shootCells),
      bloomClusters: buildBloomClusters(shootCells),
      bounds,
      baseX,
    };
    geometryCache.set(cacheKey, geometry);
    return geometry;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, Math.round(rect.width));
    height = Math.max(480, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cellSize = width < 520 ? 5 : width < 850 ? 6 : 7;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    columns = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);
    groundRow = Math.floor(rows * 0.64);
    geometryCache.clear();
    buildScenery();
    drawGarden(performance.now());
  }

  function buildScenery() {
    const random = seededRandom(`kelly-lab-scenery:${columns}:${rows}`);
    scenery = {
      stars: [],
      soil: [],
      clouds: [],
      fireflies: [],
    };

    for (let index = 0; index < Math.min(90, Math.floor(width / 9)); index += 1) {
      scenery.stars.push({
        x: randomInt(2, columns - 3, random),
        y: randomInt(4, Math.max(5, groundRow - 18), random),
        size: random() < 0.12 ? 2 : 1,
        phase: randomBetween(0, Math.PI * 2, random),
      });
    }

    for (let index = 0; index < Math.min(220, Math.floor(width / 3)); index += 1) {
      scenery.soil.push({
        x: randomInt(0, columns - 1, random),
        y: randomInt(groundRow + 2, rows - 2, random),
        tone: randomInt(0, 3, random),
      });
    }

    for (let index = 0; index < 4; index += 1) {
      scenery.clouds.push({
        x: randomBetween(-0.2, 0.9, random),
        y: randomBetween(0.12, 0.38, random),
        width: randomBetween(0.11, 0.22, random),
        speed: randomBetween(0.000002, 0.000006, random),
      });
    }

    for (let index = 0; index < 18; index += 1) {
      scenery.fireflies.push({
        x: randomBetween(0.05, 0.95, random),
        y: randomBetween(0.27, 0.6, random),
        phase: randomBetween(0, Math.PI * 2, random),
        drift: randomBetween(6, 18, random),
      });
    }
  }

  function transformCellCoordinates(cell, plant, root = false) {
    const dna = analyzeWord(plant.seed);
    const baseX = clamp(Math.round(plant.xNorm * columns), 5, columns - 6);
    const gardenScale = root ? 0.76 : 0.78;
    const rainScale = getRainGrowthScale(plant, root);
    const xScale =
      (root ? dna.rootSpread : dna.spreadScale) *
      gardenScale *
      dna.depthScale *
      rainScale;
    const yScale =
      (root ? dna.rootDepth : dna.heightScale) *
      gardenScale *
      dna.depthScale *
      rainScale;
    let morphologyX = cell.x;
    let morphologyY = cell.y;

    if (plant.visitor && !root) {
      const heightRatio = clamp((groundRow - cell.y) / 44, 0, 1);
      const horizontalDistance = cell.x - baseX;
      const direction = hashString(`${plant.seed}:posture`) % 2 === 0 ? -1 : 1;
      const posture = dna.morphology.posture;

      if (posture === "arching") {
        morphologyX += direction * Math.pow(heightRatio, 1.7) * 3.2;
      } else if (posture === "embracing") {
        morphologyX -= Math.sign(horizontalDistance || direction) * heightRatio * 1.8;
      } else if (posture === "splayed") {
        morphologyX = baseX + horizontalDistance * 1.13;
      } else if (posture === "leaning") {
        morphologyX += direction * heightRatio * 4.2;
      } else if (posture === "weeping") {
        morphologyY += Math.abs(horizontalDistance) * 0.42;
      } else if (posture === "floating") {
        morphologyY -= 1.2 + heightRatio * 0.8;
      } else if (posture === "twining") {
        morphologyX +=
          Math.sin((groundRow - cell.y) * 0.52 + (hashString(plant.seed) % 31)) *
          1.35;
      } else if (posture === "crouched") {
        morphologyY = groundRow + (cell.y - groundRow) * 0.82;
        morphologyX = baseX + horizontalDistance * 1.12;
      } else if (posture === "recoiling") {
        morphologyX = baseX + horizontalDistance * 0.82;
        morphologyY += Math.abs(horizontalDistance) * 0.22;
      } else if (posture === "guarded") {
        morphologyX = baseX + horizontalDistance * 0.92;
        morphologyY += Math.max(0, Math.abs(horizontalDistance) - 3) * 0.12;
      }

      if (
        LIGHTS[currentLightIndex].id === "night" &&
        dna.morphology.night === "track"
      ) {
        const moonDirection = plant.xNorm < 0.78 ? 1 : -1;
        morphologyX += moonDirection * heightRatio * 1.7;
      } else if (
        LIGHTS[currentLightIndex].id === "night" &&
        dna.morphology.night === "hide"
      ) {
        morphologyX = baseX + (morphologyX - baseX) * 0.76;
        morphologyY = groundRow + (morphologyY - groundRow) * 0.84;
      }
    }

    return {
      x: baseX + (morphologyX - baseX) * xScale,
      y: groundRow + (morphologyY - groundRow) * yScale,
    };
  }

  function getRainGrowthScale(plant, root = false) {
    const rainGrowth = clamp(Number(plant.rainGrowth) || 0, 0, 1);
    return 1 + rainGrowth * (root ? 0.06 : 0.14);
  }

  function plantSway(cell, plant, time, root = false) {
    if (reducedMotion || root) return 0;
    const dna = analyzeWord(plant.seed);
    const phase = (hashString(plant.seed) % 628) / 100;
    const heightRatio = clamp((groundRow - cell.y) / 48, 0, 1);
    const wind = rainActive ? 1.45 : 0.9;
    const nightFactor =
      plant.visitor &&
      LIGHTS[currentLightIndex].id === "night" &&
      ["sleep", "close", "hide"].includes(dna.morphology.night)
        ? 0.28
        : 1;
    if (plant.visitor && dna.morphology.growth === "tremble") {
      return (
        (Math.sin(time * 0.0085 + phase + cell.y * 0.22) +
          Math.sin(time * 0.013 + phase * 1.7) * 0.38) *
        heightRatio *
        wind *
        0.52 *
        nightFactor
      );
    }
    return (
      Math.sin(time * 0.00105 + phase + cell.y * 0.018) *
      heightRatio *
      wind *
      dna.swayScale *
      nightFactor
    );
  }

  function cellPoint(cell, plant, time, root = false) {
    const transformed = transformCellCoordinates(cell, plant, root);
    return {
      x: (transformed.x + 0.5 + plantSway(cell, plant, time, root)) * cellSize,
      y: (transformed.y + 0.5) * cellSize,
    };
  }

  function drawNetwork(cells, segments, visibleCount, plant, time, color, root = false) {
    if (!visibleCount) return;
    const dna = analyzeWord(plant.seed);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = root ? (width < 520 ? 0.4 : 0.58) : 0.92;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = root
      ? Math.max(0.9, cellSize * 0.2 * dna.stemWeight * dna.depthScale)
      : Math.max(1.45, cellSize * 0.42 * dna.stemWeight * dna.depthScale);
    ctx.beginPath();

    segments.forEach((segment) => {
      if (segment.a >= visibleCount || segment.b >= visibleCount) return;
      const pointA = cellPoint(cells[segment.a], plant, time, root);
      const pointB = cellPoint(cells[segment.b], plant, time, root);
      const bendSeed = hashString(`${plant.seed}:${segment.a}:${segment.b}`) % 9;
      const bend = (bendSeed - 4) * (root ? cellSize * 0.055 : cellSize * 0.018);
      ctx.moveTo(pointA.x, pointA.y);
      ctx.quadraticCurveTo(
        (pointA.x + pointB.x) / 2 + bend,
        (pointA.y + pointB.y) / 2 - Math.abs(bend) * 0.25,
        pointB.x,
        pointB.y
      );
    });
    ctx.stroke();

    if (!root) {
      ctx.strokeStyle = "rgba(236, 255, 236, 0.22)";
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = Math.max(0.5, cellSize * 0.1 * dna.depthScale);
      ctx.translate(-0.55, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRootDetails(geometry, visibleCount, plant, time, species) {
    if (!visibleCount) return;
    const dna = analyzeWord(plant.seed);
    const connected = new Set();
    geometry.rootSegments.forEach((segment) => {
      if (segment.a < visibleCount && segment.b < visibleCount) {
        connected.add(segment.a);
        connected.add(segment.b);
      }
    });

    ctx.save();
    geometry.rootCells.slice(0, visibleCount).forEach((cell, index) => {
      if (index % 5 !== 0 && connected.has(index)) return;
      const point = cellPoint(cell, plant, time, true);
      const mobileFade = width < 520 ? 0.62 : 1;
      ctx.globalAlpha = (index % 3 === 0 ? 0.64 : 0.36) * mobileFade;
      ctx.fillStyle = index % 4 === 0 ? species.accent : species.root;
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        (index % 4 === 0 ? 1.45 : 1) * dna.depthScale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.restore();
  }

  function drawLeaf(cell, anchorCell, plant, time, species, index) {
    const dna = analyzeWord(plant.seed);
    const morphology = plant.visitor
      ? dna.morphology
      : { leaf: "oval", night: "sleep" };
    const rainScale = 1 + clamp(Number(plant.rainGrowth) || 0, 0, 1) * 0.12;
    const point = cellPoint(cell, plant, time);
    const anchor = anchorCell ? cellPoint(anchorCell, plant, time) : {
      x: geometryFallbackX(plant),
      y: point.y + cellSize,
    };
    const direction = cell.x < (anchorCell ? anchorCell.x : plant.xNorm * columns) ? -1 : 1;
    let angle =
      Math.atan2(point.y - anchor.y, point.x - anchor.x) +
      direction * (0.16 + (index % 3) * 0.05);
    let length =
      cellSize *
      (1.35 + (index % 3) * 0.13) *
      dna.leafScale *
      dna.depthScale *
      rainScale;
    let widthValue =
      cellSize *
      (0.5 + (index % 2) * 0.09) *
      (0.82 + dna.petalWidth * 0.38) *
      dna.depthScale *
      rainScale;
    const isNight = LIGHTS[currentLightIndex].id === "night";

    if (isNight && plant.visitor) {
      if (morphology.night === "close") {
        widthValue *= 0.34;
        angle += direction * 0.34;
      } else if (morphology.night === "sleep") {
        widthValue *= 0.62;
        angle += direction * 0.22;
      } else if (morphology.night === "open") {
        length *= 1.1;
        widthValue *= 1.24;
      } else if (morphology.night === "hide") {
        length *= 0.72;
        widthValue *= 0.28;
        angle += direction * 0.48;
      }
    }

    ctx.save();
    ctx.strokeStyle = species.stem;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = Math.max(0.8, cellSize * 0.15);
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.quadraticCurveTo(
      (anchor.x + point.x) / 2,
      Math.min(anchor.y, point.y) - cellSize * 0.28,
      point.x,
      point.y
    );
    ctx.stroke();

    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = species.leaf;
    ctx.strokeStyle = "rgba(236, 255, 236, 0.28)";
    ctx.lineWidth = 0.65;

    if (
      isNight &&
      plant.visitor &&
      ["glow", "pulse", "constellate", "spark", "frost"].includes(morphology.night)
    ) {
      const pulse =
        reducedMotion ? 0.7 : 0.5 + (Math.sin(time * 0.0025 + index) + 1) * 0.18;
      ctx.shadowColor = morphology.night === "frost" ? "#d8f4ef" : species.accent;
      ctx.shadowBlur = cellSize * pulse;
    }

    ctx.beginPath();
    if (morphology.leaf === "heart") {
      ctx.moveTo(-length * 0.46, 0);
      ctx.bezierCurveTo(-length * 0.12, -widthValue, length * 0.18, -widthValue, length * 0.08, 0);
      ctx.bezierCurveTo(length * 0.2, widthValue, -length * 0.12, widthValue, -length * 0.46, 0);
    } else if (morphology.leaf === "crescent") {
      ctx.moveTo(-length * 0.48, 0);
      ctx.quadraticCurveTo(0, -widthValue * 1.1, length * 0.5, -widthValue * 0.08);
      ctx.quadraticCurveTo(0.06 * length, -widthValue * 0.18, -length * 0.48, 0);
    } else if (morphology.leaf === "needle") {
      ctx.moveTo(-length * 0.48, 0);
      ctx.lineTo(length * 0.5, -widthValue * 0.18);
      ctx.lineTo(length * 0.5, widthValue * 0.18);
    } else if (morphology.leaf === "thorn") {
      ctx.moveTo(-length * 0.48, 0);
      ctx.lineTo(-length * 0.08, -widthValue * 0.22);
      ctx.lineTo(length * 0.02, -widthValue);
      ctx.lineTo(length * 0.16, -widthValue * 0.18);
      ctx.lineTo(length * 0.52, 0);
      ctx.lineTo(length * 0.16, widthValue * 0.18);
      ctx.lineTo(length * 0.02, widthValue);
      ctx.lineTo(-length * 0.08, widthValue * 0.22);
    } else if (morphology.leaf === "hook") {
      ctx.moveTo(-length * 0.48, 0);
      ctx.quadraticCurveTo(length * 0.05, -widthValue, length * 0.46, -widthValue * 0.26);
      ctx.quadraticCurveTo(length * 0.62, widthValue * 0.08, length * 0.22, widthValue * 0.82);
      ctx.quadraticCurveTo(length * 0.06, widthValue * 0.34, length * 0.18, 0);
    } else if (morphology.leaf === "ribbon") {
      ctx.moveTo(-length * 0.5, 0);
      ctx.bezierCurveTo(-length * 0.1, -widthValue, length * 0.1, widthValue, length * 0.52, -widthValue * 0.2);
      ctx.bezierCurveTo(length * 0.12, widthValue * 1.35, -length * 0.12, -widthValue * 0.45, -length * 0.5, 0);
    } else if (morphology.leaf === "diamond" || morphology.leaf === "blade") {
      const bladeWidth = morphology.leaf === "blade" ? widthValue * 0.55 : widthValue;
      ctx.moveTo(-length * 0.5, 0);
      ctx.lineTo(length * 0.02, -bladeWidth);
      ctx.lineTo(length * 0.52, 0);
      ctx.lineTo(length * 0.02, bladeWidth);
    } else if (morphology.leaf === "arrow") {
      ctx.moveTo(-length * 0.5, 0);
      ctx.lineTo(-length * 0.02, -widthValue * 0.42);
      ctx.lineTo(length * 0.08, -widthValue);
      ctx.lineTo(length * 0.52, 0);
      ctx.lineTo(length * 0.08, widthValue);
      ctx.lineTo(-length * 0.02, widthValue * 0.42);
    } else if (morphology.leaf === "scale") {
      ctx.moveTo(-length * 0.36, 0);
      ctx.quadraticCurveTo(0, -widthValue * 0.72, length * 0.34, 0);
      ctx.quadraticCurveTo(0, widthValue * 0.72, -length * 0.36, 0);
    } else if (morphology.leaf === "fan") {
      ctx.moveTo(-length * 0.4, 0);
      ctx.lineTo(length * 0.38, -widthValue);
      ctx.quadraticCurveTo(length * 0.65, 0, length * 0.38, widthValue);
      ctx.closePath();
    } else if (morphology.leaf === "lobed") {
      ctx.moveTo(-length * 0.48, 0);
      ctx.bezierCurveTo(-length * 0.25, -widthValue, -length * 0.02, -widthValue * 0.25, length * 0.1, -widthValue * 0.78);
      ctx.bezierCurveTo(length * 0.24, -widthValue * 1.05, length * 0.42, -widthValue * 0.42, length * 0.52, 0);
      ctx.bezierCurveTo(length * 0.42, widthValue * 0.42, length * 0.24, widthValue * 1.05, length * 0.1, widthValue * 0.78);
      ctx.bezierCurveTo(-length * 0.02, widthValue * 0.25, -length * 0.25, widthValue, -length * 0.48, 0);
    } else if (morphology.leaf === "fern" || morphology.leaf === "feather") {
      const featherWidth = morphology.leaf === "feather" ? widthValue * 1.12 : widthValue;
      ctx.moveTo(-length * 0.5, 0);
      ctx.bezierCurveTo(-length * 0.08, -featherWidth * 0.8, length * 0.28, -featherWidth * 0.46, length * 0.52, 0);
      ctx.bezierCurveTo(length * 0.28, featherWidth * 0.46, -length * 0.08, featherWidth * 0.8, -length * 0.5, 0);
    } else {
      ctx.moveTo(-length * 0.48, 0);
      ctx.bezierCurveTo(-length * 0.12, -widthValue, length * 0.3, -widthValue * 0.72, length * 0.52, 0);
      ctx.bezierCurveTo(length * 0.25, widthValue * 0.72, -length * 0.18, widthValue, -length * 0.48, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = species.stem;
    ctx.beginPath();
    ctx.moveTo(-length * 0.38, 0);
    ctx.lineTo(length * 0.36, 0);
    ctx.stroke();

    if (morphology.leaf === "fern" || morphology.leaf === "feather" || morphology.leaf === "fan") {
      const veinCount = morphology.leaf === "fan" ? 4 : 5;
      for (let vein = 1; vein <= veinCount; vein += 1) {
        const veinX = -length * 0.28 + (length * 0.58 * vein) / veinCount;
        ctx.beginPath();
        ctx.moveTo(veinX, 0);
        ctx.lineTo(veinX + length * 0.12, (vein % 2 === 0 ? -1 : 1) * widthValue * 0.62);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function geometryFallbackX(plant) {
    return plant.xNorm * width;
  }

  function drawPetal(length, widthValue, fill, angle, alpha = 0.92) {
    ctx.save();
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      length * 0.24,
      -widthValue,
      length * 0.82,
      -widthValue * 0.68,
      length,
      0
    );
    ctx.bezierCurveTo(
      length * 0.78,
      widthValue * 0.68,
      length * 0.24,
      widthValue,
      0,
      0
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLanternBloom(radius, species, scale, nightGlow) {
    ctx.save();
    ctx.scale(scale, scale);
    if (nightGlow) {
      ctx.shadowColor = species.bloom;
      ctx.shadowBlur = radius * 1.9;
    }
    ctx.fillStyle = species.bloom;
    ctx.globalAlpha = 0.94;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.58, -radius * 0.52);
    ctx.quadraticCurveTo(0, -radius * 0.9, radius * 0.58, -radius * 0.52);
    ctx.bezierCurveTo(
      radius * 0.76,
      radius * 0.02,
      radius * 0.54,
      radius * 0.72,
      0,
      radius * 0.88
    );
    ctx.bezierCurveTo(
      -radius * 0.54,
      radius * 0.72,
      -radius * 0.76,
      radius * 0.02,
      -radius * 0.58,
      -radius * 0.52
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = species.accent;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.62);
    ctx.quadraticCurveTo(radius * 0.16, 0, 0, radius * 0.68);
    ctx.stroke();
    ctx.fillStyle = species.accent;
    ctx.beginPath();
    ctx.arc(0, radius * 0.3, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSignalBloom(radius, species, scale) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.strokeStyle = species.bloom;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.9;
    for (let band = -2; band <= 2; band += 1) {
      const y = band * radius * 0.22;
      const reach = radius * (1 - Math.abs(band) * 0.12);
      ctx.lineWidth = band === 0 ? 1.7 : 1;
      ctx.beginPath();
      ctx.moveTo(-reach, y);
      ctx.bezierCurveTo(-reach * 0.45, y - radius * 0.3, reach * 0.45, y + radius * 0.3, reach, y);
      ctx.stroke();
    }
    ctx.fillStyle = species.accent;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGlyphBloom(radius, species, scale) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.strokeStyle = species.bloom;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.94;
    ctx.lineWidth = Math.max(1.5, radius * 0.11);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.72, radius * 0.74);
    ctx.quadraticCurveTo(-radius * 0.36, -radius * 0.44, 0, -radius);
    ctx.quadraticCurveTo(radius * 0.42, -radius * 0.38, radius * 0.72, radius * 0.74);
    ctx.moveTo(-radius * 0.43, radius * 0.18);
    ctx.quadraticCurveTo(0, radius * 0.02, radius * 0.43, radius * 0.18);
    ctx.stroke();

    ctx.fillStyle = species.accent;
    [
      [0, -radius],
      [-radius * 0.43, radius * 0.18],
      [radius * 0.43, radius * 0.18],
    ].forEach(([x, y], index) => {
      ctx.beginPath();
      ctx.arc(x, y, radius * (index === 0 ? 0.15 : 0.1), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawFlowerBloom(radius, species, plant, scale, time, clusterIndex) {
    const dna = analyzeWord(plant.seed);
    const petalCount = dna.petalCount;
    const seedPhase = (hashString(`${plant.seed}:${clusterIndex}`) % 360) * (Math.PI / 180);
    ctx.save();
    ctx.scale(scale, scale);
    if (LIGHTS[currentLightIndex].id === "night") {
      ctx.shadowColor = species.bloom;
      ctx.shadowBlur = radius * 0.8;
    }
    for (let petal = 0; petal < petalCount; petal += 1) {
      const angle = seedPhase + (Math.PI * 2 * petal) / petalCount;
      const flutter = reducedMotion ? 0 : Math.sin(time * 0.0014 + petal + seedPhase) * 0.035;
      drawPetal(
        radius,
        radius * dna.petalWidth,
        petal % 3 === 0 ? species.accent : species.bloom,
        angle + flutter,
        petal % 2 === 0 ? 0.96 : 0.82
      );
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = species.accent;
    ctx.globalAlpha = 0.98;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = species.stem;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeartPetal(radius, angle, fill, alpha = 0.9) {
    ctx.save();
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      radius * 0.16,
      -radius * 0.22,
      radius * 0.42,
      -radius * 0.46,
      radius * 0.62,
      -radius * 0.14
    );
    ctx.bezierCurveTo(
      radius * 0.82,
      -radius * 0.44,
      radius * 1.08,
      -radius * 0.12,
      radius,
      radius * 0.12
    );
    ctx.bezierCurveTo(
      radius * 0.86,
      radius * 0.4,
      radius * 0.38,
      radius * 0.34,
      0,
      0
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function traceStar(outerRadius, innerRadius, points) {
    ctx.beginPath();
    for (let point = 0; point < points * 2; point += 1) {
      const radius = point % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + point * Math.PI / points;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawHexCell(x, y, radius, fill, alpha = 0.84) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let side = 0; side < 6; side += 1) {
      const angle = Math.PI / 6 + side * Math.PI / 3;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (side === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBotanicalFormBloom(radius, species, plant, scale, time, clusterIndex) {
    const dna = analyzeWord(plant.seed);
    const form = dna.form;
    const nightMode = dna.morphology.night;
    const nightOrganScale =
      LIGHTS[currentLightIndex].id !== "night"
        ? 1
        : nightMode === "close"
          ? 0.56
          : nightMode === "open"
            ? 1.2
            : nightMode === "pulse"
              ? reducedMotion
                ? 0.92
                : 0.86 + (Math.sin(time * 0.0022) + 1) * 0.11
              : 1;
    const biologicalScale = scale * nightOrganScale;
    const hash = hashString(`${plant.seed}:form:${clusterIndex}`);
    const seedPhase = (hash % 360) * (Math.PI / 180);
    const directional = [
      "cup",
      "bell",
      "comet",
      "chime",
      "fan",
      "feather",
      "lotus",
      "mushroom",
      "cactus",
      "willow",
      "phoenix",
      "trumpet",
      "crane",
    ];
    const rotation = directional.includes(form.profile)
      ? ((hash % 21) - 10) * 0.012
      : seedPhase;
    const flutter = reducedMotion ? 0 : Math.sin(time * 0.0012 + seedPhase) * 0.025;

    if (form.profile === "glyph") {
      drawGlyphBloom(radius * 0.94, species, biologicalScale);
      return;
    }
    if (form.profile === "signal") {
      drawSignalBloom(radius * 0.9, species, biologicalScale);
      return;
    }
    if (form.profile === "pod") {
      drawLanternBloom(
        radius * 0.82,
        species,
        biologicalScale,
        LIGHTS[currentLightIndex].id === "night"
      );
      return;
    }

    ctx.save();
    ctx.scale(biologicalScale, biologicalScale);
    ctx.rotate(rotation + flutter);
    if (LIGHTS[currentLightIndex].id === "night") {
      ctx.shadowColor = species.bloom;
      ctx.shadowBlur = radius * 0.62;
    }

    if (form.profile === "crown") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        const angle = Math.PI * 2 * petal / dna.petalCount;
        const reach = radius * (petal % 2 === 0 ? 1 : 0.72);
        drawPetal(
          reach,
          radius * dna.petalWidth,
          petal % 2 === 0 ? species.bloom : species.accent,
          angle,
          0.9
        );
        ctx.fillStyle = species.accent;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * reach,
          Math.sin(angle) * reach,
          radius * 0.07,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (form.profile === "cup") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        const angle =
          -Math.PI * 0.9 + Math.PI * 0.8 * petal / Math.max(1, dna.petalCount - 1);
        drawPetal(
          radius * 0.92,
          radius * dna.petalWidth,
          petal % 2 === 0 ? species.bloom : species.accent,
          angle,
          0.84
        );
      }
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(1, radius * 0.09);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.54, radius * 0.12);
      ctx.quadraticCurveTo(0, radius * 0.82, radius * 0.54, radius * 0.12);
      ctx.stroke();
    } else if (form.profile === "bell") {
      ctx.fillStyle = species.bloom;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.48, -radius * 0.62);
      ctx.quadraticCurveTo(0, -radius, radius * 0.48, -radius * 0.62);
      ctx.bezierCurveTo(
        radius * 0.58,
        -radius * 0.04,
        radius * 0.68,
        radius * 0.46,
        radius * 0.82,
        radius * 0.62
      );
      ctx.quadraticCurveTo(0, radius * 0.4, -radius * 0.82, radius * 0.62);
      ctx.bezierCurveTo(
        -radius * 0.68,
        radius * 0.46,
        -radius * 0.58,
        -radius * 0.04,
        -radius * 0.48,
        -radius * 0.62
      );
      ctx.fill();
      [-0.46, 0, 0.46].forEach((offset) => {
        ctx.fillStyle = species.accent;
        ctx.beginPath();
        ctx.arc(offset * radius, radius * 0.55, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (form.profile === "heart") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        drawHeartPetal(
          radius * 0.92,
          Math.PI * 2 * petal / dna.petalCount,
          petal % 2 === 0 ? species.bloom : species.accent,
          0.88
        );
      }
    } else if (form.profile === "rosette") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        drawPetal(
          radius,
          radius * dna.petalWidth,
          species.bloom,
          Math.PI * 2 * petal / dna.petalCount,
          0.82
        );
      }
      const innerCount = Math.max(4, Math.round(dna.petalCount / 2));
      for (let petal = 0; petal < innerCount; petal += 1) {
        drawPetal(
          radius * 0.58,
          radius * dna.petalWidth * 0.78,
          species.accent,
          Math.PI / innerCount + Math.PI * 2 * petal / innerCount,
          0.94
        );
      }
    } else if (form.profile === "twin") {
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * radius * 0.34, 0);
        for (let petal = 0; petal < 4; petal += 1) {
          drawPetal(
            radius * 0.56,
            radius * 0.16,
            side < 0 ? species.bloom : species.accent,
            Math.PI * 2 * petal / 4,
            0.86
          );
        }
        ctx.restore();
      });
    } else if (form.profile === "wheel") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        drawPetal(
          radius,
          radius * dna.petalWidth,
          petal % 3 === 0 ? species.accent : species.bloom,
          Math.PI * 2 * petal / dna.petalCount,
          petal % 2 === 0 ? 0.94 : 0.7
        );
      }
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(0.8, radius * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (form.profile === "needle" || form.profile === "clock") {
      const clockLike = form.profile === "clock";
      ctx.strokeStyle = species.bloom;
      ctx.lineWidth = Math.max(0.65, radius * (clockLike ? 0.035 : 0.05));
      for (let ray = 0; ray < dna.petalCount; ray += 1) {
        const angle = Math.PI * 2 * ray / dna.petalCount;
        const reach = radius * (clockLike ? 1.08 : ray % 2 === 0 ? 1 : 0.76);
        ctx.beginPath();
        ctx.moveTo(
          Math.cos(angle) * radius * 0.18,
          Math.sin(angle) * radius * 0.18
        );
        ctx.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
        ctx.stroke();
        ctx.fillStyle = ray % 3 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * reach,
          Math.sin(angle) * reach,
          radius * (clockLike ? 0.045 : 0.07),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (form.profile === "puff") {
      const puffs = Math.max(7, dna.petalCount + 2);
      for (let puff = 0; puff < puffs; puff += 1) {
        const angle = Math.PI * 2 * puff / puffs;
        const orbit = radius * (puff % 2 === 0 ? 0.52 : 0.72);
        ctx.globalAlpha = puff % 2 === 0 ? 0.88 : 0.68;
        ctx.fillStyle = puff % 3 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * orbit,
          Math.sin(angle) * orbit,
          radius * (puff % 2 === 0 ? 0.34 : 0.28),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (form.profile === "star") {
      ctx.fillStyle = species.bloom;
      ctx.globalAlpha = 0.9;
      traceStar(radius, radius * 0.38, dna.petalCount);
      ctx.fill();
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(0.8, radius * 0.05);
      ctx.stroke();
    } else if (form.profile === "ribbon") {
      ctx.lineCap = "round";
      for (let ribbon = 0; ribbon < dna.petalCount; ribbon += 1) {
        const angle = Math.PI * 2 * ribbon / dna.petalCount;
        ctx.save();
        ctx.rotate(angle);
        ctx.strokeStyle = ribbon % 2 === 0 ? species.bloom : species.accent;
        ctx.globalAlpha = 0.82;
        ctx.lineWidth = Math.max(1, radius * 0.09);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          radius * 0.26,
          -radius * 0.42,
          radius * 0.72,
          radius * 0.42,
          radius,
          0
        );
        ctx.stroke();
        ctx.restore();
      }
    } else if (form.profile === "honey") {
      drawHexCell(0, 0, radius * 0.28, species.accent, 0.94);
      for (let cell = 0; cell < 6; cell += 1) {
        const angle = Math.PI * 2 * cell / 6;
        drawHexCell(
          Math.cos(angle) * radius * 0.55,
          Math.sin(angle) * radius * 0.55,
          radius * 0.27,
          cell % 2 === 0 ? species.bloom : species.accent
        );
      }
    } else if (form.profile === "comet") {
      ctx.fillStyle = species.bloom;
      traceStar(radius * 0.68, radius * 0.28, 5);
      ctx.fill();
      ctx.strokeStyle = species.accent;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.9, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.28, radius * 0.22);
      ctx.bezierCurveTo(
        -radius * 0.82,
        radius * 0.32,
        -radius * 0.84,
        radius * 0.82,
        -radius * 1.08,
        radius
      );
      ctx.stroke();
    } else if (form.profile === "chime") {
      ctx.strokeStyle = species.stem;
      ctx.lineWidth = Math.max(0.75, radius * 0.055);
      ctx.beginPath();
      ctx.arc(0, -radius * 0.5, radius * 0.72, Math.PI, 0);
      ctx.stroke();
      [-0.5, 0, 0.5].forEach((offset, index) => {
        const lineTop = -radius * (0.48 - Math.abs(offset) * 0.18);
        const lineBottom = radius * (0.32 + index % 2 * 0.22);
        ctx.beginPath();
        ctx.moveTo(offset * radius, lineTop);
        ctx.lineTo(offset * radius, lineBottom);
        ctx.stroke();
        ctx.fillStyle = index === 1 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.arc(offset * radius, lineBottom, radius * 0.18, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (form.profile === "fan") {
      ctx.strokeStyle = species.bloom;
      ctx.lineWidth = Math.max(0.75, radius * 0.045);
      for (let ray = 0; ray < dna.petalCount; ray += 1) {
        const angle =
          Math.PI + Math.PI * ray / Math.max(1, dna.petalCount - 1);
        ctx.beginPath();
        ctx.moveTo(0, radius * 0.4);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
      }
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(1, radius * 0.09);
      ctx.beginPath();
      ctx.arc(0, radius * 0.4, radius, Math.PI, 0);
      ctx.stroke();
    } else if (form.profile === "feather") {
      ctx.strokeStyle = species.stem;
      ctx.lineWidth = Math.max(0.8, radius * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.8);
      ctx.quadraticCurveTo(radius * 0.08, 0, 0, -radius);
      ctx.stroke();
      for (let barb = 0; barb < 4; barb += 1) {
        const y = radius * 0.48 - barb * radius * 0.34;
        const reach = radius * (0.68 - barb * 0.08);
        [-1, 1].forEach((side) => {
          ctx.strokeStyle = barb % 2 === 0 ? species.bloom : species.accent;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.quadraticCurveTo(
            side * reach * 0.54,
            y - radius * 0.2,
            side * reach,
            y - radius * 0.34
          );
          ctx.stroke();
        });
      }
    } else if (form.profile === "prism") {
      for (let face = 0; face < dna.petalCount; face += 1) {
        const angle = Math.PI * 2 * face / dna.petalCount;
        ctx.save();
        ctx.rotate(angle);
        ctx.globalAlpha = face % 2 === 0 ? 0.86 : 0.62;
        ctx.fillStyle = face % 3 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.moveTo(radius * 0.12, 0);
        ctx.lineTo(radius, -radius * 0.17);
        ctx.lineTo(radius * 0.72, radius * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (form.profile === "spiral") {
      ctx.strokeStyle = species.bloom;
      ctx.lineWidth = Math.max(0.9, radius * 0.065);
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let step = 0; step <= 40; step += 1) {
        const angle = step / 40 * Math.PI * 4;
        const reach = radius * 0.08 + radius * 0.82 * step / 40;
        const x = Math.cos(angle) * reach;
        const y = Math.sin(angle) * reach;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let bead = 0; bead < 5; bead += 1) {
        const angle = bead * Math.PI * 0.78;
        const reach = radius * (0.25 + bead * 0.14);
        ctx.fillStyle = bead % 2 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * reach,
          Math.sin(angle) * reach,
          radius * 0.075,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (form.profile === "bubble") {
      const bubbles = Math.max(6, dna.petalCount);
      for (let bubble = 0; bubble < bubbles; bubble += 1) {
        const angle = Math.PI * 2 * bubble / bubbles;
        const orbit = radius * (0.38 + (bubble % 3) * 0.16);
        const bubbleRadius = radius * (0.13 + (bubble % 3) * 0.045);
        ctx.strokeStyle = bubble % 2 === 0 ? species.bloom : species.accent;
        ctx.globalAlpha = 0.76;
        ctx.lineWidth = Math.max(0.65, radius * 0.04);
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * orbit,
          Math.sin(angle) * orbit,
          bubbleRadius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    } else if (form.profile === "lace") {
      const loops = Math.max(6, dna.petalCount);
      ctx.strokeStyle = species.bloom;
      ctx.lineWidth = Math.max(0.7, radius * 0.045);
      for (let loop = 0; loop < loops; loop += 1) {
        const angle = Math.PI * 2 * loop / loops;
        ctx.save();
        ctx.rotate(angle);
        ctx.globalAlpha = loop % 2 === 0 ? 0.88 : 0.58;
        ctx.beginPath();
        ctx.ellipse(
          radius * 0.62,
          0,
          radius * 0.38,
          radius * 0.15,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }
    } else if (form.profile === "rose") {
      [1, 0.68, 0.4].forEach((ringScale, ring) => {
        const ringPetals = Math.max(4, dna.petalCount - ring * 3);
        for (let petal = 0; petal < ringPetals; petal += 1) {
          drawPetal(
            radius * ringScale,
            radius * dna.petalWidth * (1 - ring * 0.12),
            ring % 2 === 0 ? species.bloom : species.accent,
            ring * 0.35 + Math.PI * 2 * petal / ringPetals,
            0.7 + ring * 0.1
          );
        }
      });
    } else if (form.profile === "lotus") {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        const position = petal / Math.max(1, dna.petalCount - 1);
        const angle = -Math.PI * 0.95 + position * Math.PI * 0.9;
        const reach = radius * (0.7 + Math.sin(position * Math.PI) * 0.3);
        drawPetal(
          reach,
          radius * dna.petalWidth,
          petal % 2 === 0 ? species.bloom : species.accent,
          angle,
          0.84
        );
      }
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(0.9, radius * 0.07);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.82, radius * 0.28);
      ctx.quadraticCurveTo(0, radius * 0.62, radius * 0.82, radius * 0.28);
      ctx.stroke();
    } else if (form.profile === "mushroom") {
      ctx.fillStyle = species.bloom;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(-radius, radius * 0.05);
      ctx.quadraticCurveTo(0, -radius * 1.12, radius, radius * 0.05);
      ctx.quadraticCurveTo(0, radius * 0.3, -radius, radius * 0.05);
      ctx.fill();
      ctx.fillStyle = species.stem;
      ctx.fillRect(-radius * 0.18, radius * 0.02, radius * 0.36, radius * 0.78);
      for (let spot = 0; spot < 5; spot += 1) {
        const angle = Math.PI * (0.15 + spot * 0.17);
        ctx.fillStyle = species.accent;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * radius * 0.62,
          -Math.sin(angle) * radius * 0.52,
          radius * (spot % 2 === 0 ? 0.09 : 0.06),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (form.profile === "cactus") {
      ctx.fillStyle = species.leaf;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.34, radius, 0, 0, Math.PI * 2);
      ctx.fill();
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.ellipse(
          side * radius * 0.48,
          radius * 0.12,
          radius * 0.23,
          radius * 0.5,
          side * 0.38,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(0.6, radius * 0.035);
      for (let spine = -2; spine <= 2; spine += 1) {
        const y = spine * radius * 0.3;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.24, y);
        ctx.lineTo(radius * 0.24, y);
        ctx.stroke();
      }
      ctx.fillStyle = species.bloom;
      ctx.beginPath();
      ctx.arc(0, -radius * 0.92, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (form.profile === "willow") {
      ctx.strokeStyle = species.stem;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.8, radius * 0.055);
      for (let branch = -2; branch <= 2; branch += 1) {
        const x = branch * radius * 0.27;
        const drop = radius * (0.66 + Math.abs(branch) * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.62);
        ctx.quadraticCurveTo(x, -radius * 0.08, x, drop);
        ctx.stroke();
        ctx.fillStyle = branch % 2 === 0 ? species.bloom : species.accent;
        ctx.beginPath();
        ctx.arc(x, drop, radius * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (form.profile === "phoenix") {
      ctx.lineCap = "round";
      for (let plume = -3; plume <= 3; plume += 1) {
        const angle = -Math.PI / 2 + plume * 0.19;
        const reach = radius * (1 - Math.abs(plume) * 0.07);
        ctx.strokeStyle = plume % 2 === 0 ? species.bloom : species.accent;
        ctx.lineWidth = Math.max(1, radius * (0.1 - Math.abs(plume) * 0.008));
        ctx.beginPath();
        ctx.moveTo(0, radius * 0.62);
        ctx.quadraticCurveTo(
          Math.sin(angle) * reach * 0.32,
          -radius * 0.08,
          Math.cos(angle) * reach,
          Math.sin(angle) * reach
        );
        ctx.stroke();
      }
      ctx.fillStyle = species.accent;
      traceStar(radius * 0.26, radius * 0.1, 5);
      ctx.fill();
    } else if (form.profile === "constellation") {
      const nodes = [
        [-0.76, 0.28],
        [-0.4, -0.52],
        [0, -0.18],
        [0.38, -0.72],
        [0.76, 0.12],
        [0.28, 0.62],
        [-0.28, 0.72],
      ];
      ctx.strokeStyle = species.bloom;
      ctx.globalAlpha = 0.62;
      ctx.lineWidth = Math.max(0.65, radius * 0.035);
      ctx.beginPath();
      nodes.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x * radius, y * radius);
        else ctx.lineTo(x * radius, y * radius);
      });
      ctx.stroke();
      nodes.forEach(([x, y], index) => {
        ctx.fillStyle = index % 3 === 0 ? species.accent : species.bloom;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(x * radius, y * radius, radius * (index % 2 === 0 ? 0.11 : 0.07), 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (form.profile === "labyrinth") {
      ctx.strokeStyle = species.bloom;
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";
      for (let ring = 0; ring < 4; ring += 1) {
        const size = radius * (1 - ring * 0.22);
        ctx.globalAlpha = 0.92 - ring * 0.13;
        ctx.lineWidth = Math.max(0.75, radius * 0.05);
        ctx.setLineDash([size * 0.55, size * 0.18]);
        ctx.lineDashOffset = ring % 2 === 0 ? 0 : size * 0.2;
        ctx.strokeRect(-size, -size, size * 2, size * 2);
      }
      ctx.setLineDash([]);
    } else if (form.profile === "trumpet") {
      ctx.fillStyle = species.bloom;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.22, radius * 0.72);
      ctx.quadraticCurveTo(-radius * 0.28, 0, -radius, -radius * 0.54);
      ctx.quadraticCurveTo(0, -radius * 0.96, radius, -radius * 0.54);
      ctx.quadraticCurveTo(radius * 0.28, 0, radius * 0.22, radius * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(-radius, -radius * 0.54);
      ctx.quadraticCurveTo(0, -radius * 0.84, radius, -radius * 0.54);
      ctx.stroke();
    } else if (form.profile === "dahlia") {
      for (let ring = 0; ring < 3; ring += 1) {
        const ringPetals = Math.max(5, dna.petalCount - ring * 3);
        for (let petal = 0; petal < ringPetals; petal += 1) {
          drawPetal(
            radius * (1 - ring * 0.24),
            radius * dna.petalWidth * 0.72,
            ring % 2 === 0 ? species.bloom : species.accent,
            ring * 0.24 + Math.PI * 2 * petal / ringPetals,
            0.64 + ring * 0.14
          );
        }
      }
    } else if (form.profile === "crane") {
      ctx.fillStyle = species.bloom;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(0, -radius * 0.28);
      ctx.lineTo(-radius * 0.18, radius * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = species.accent;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(0, -radius * 0.28);
      ctx.lineTo(radius * 0.18, radius * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = species.stem;
      ctx.lineWidth = Math.max(0.8, radius * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.24);
      ctx.lineTo(radius * 0.48, -radius * 0.82);
      ctx.lineTo(radius * 0.72, -radius * 0.72);
      ctx.moveTo(0, radius * 0.2);
      ctx.lineTo(-radius * 0.38, radius * 0.78);
      ctx.stroke();
    } else if (form.profile === "kaleidoscope") {
      const facets = Math.max(8, dna.petalCount);
      for (let facet = 0; facet < facets; facet += 1) {
        const angle = Math.PI * 2 * facet / facets;
        ctx.save();
        ctx.rotate(angle);
        ctx.globalAlpha = facet % 2 === 0 ? 0.84 : 0.52;
        ctx.fillStyle = facet % 3 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.moveTo(radius * 0.12, 0);
        ctx.lineTo(radius, -radius * 0.28);
        ctx.lineTo(radius * 0.58, radius * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = species.accent;
      ctx.lineWidth = Math.max(0.7, radius * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      for (let petal = 0; petal < dna.petalCount; petal += 1) {
        drawPetal(
          radius,
          radius * dna.petalWidth,
          petal % 2 === 0 ? species.bloom : species.accent,
          Math.PI * 2 * petal / dna.petalCount,
          0.86
        );
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = species.accent;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = species.stem;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSurpriseBloom(radius, species, plant, scale, time, clusterIndex) {
    const hash = hashString(`${plant.seed}:surprise:${clusterIndex}`);
    const seedPhase = (hash % 360) * (Math.PI / 180);
    const armCount = 10 + (hash % 5);
    const drift = reducedMotion ? 0 : time * 0.00011;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(seedPhase + drift);
    if (LIGHTS[currentLightIndex].id === "night") {
      ctx.shadowColor = species.accent;
      ctx.shadowBlur = radius * 1.1;
    }

    for (let arm = 0; arm < armCount; arm += 1) {
      const angle = (Math.PI * 2 * arm) / armCount;
      const reach = radius * (1 + ((hash >>> (arm % 16)) & 3) * 0.06);
      const bend = (arm % 2 === 0 ? 1 : -1) * radius * 0.15;
      ctx.save();
      ctx.rotate(angle);
      ctx.strokeStyle = arm % 3 === 0 ? species.accent : species.bloom;
      ctx.globalAlpha = arm % 2 === 0 ? 0.92 : 0.68;
      ctx.lineWidth = Math.max(0.75, radius * 0.045);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(radius * 0.14, 0);
      ctx.quadraticCurveTo(reach * 0.58, bend, reach, 0);
      ctx.stroke();

      ctx.translate(reach, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = arm % 3 === 0 ? species.bloom : species.accent;
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.095);
      ctx.lineTo(radius * 0.095, 0);
      ctx.lineTo(0, radius * 0.095);
      ctx.lineTo(-radius * 0.095, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    for (let petal = 0; petal < 5; petal += 1) {
      drawPetal(
        radius * 0.58,
        radius * 0.12,
        petal % 2 === 0 ? species.bloom : species.accent,
        -seedPhase + (Math.PI * 2 * petal) / 5,
        0.76
      );
    }

    ctx.fillStyle = species.stem;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = species.accent;
    ctx.globalAlpha = 0.94;
    ctx.lineWidth = Math.max(0.8, radius * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.31, 0, Math.PI * 2);
    ctx.stroke();

    for (let dot = 0; dot < 3; dot += 1) {
      const angle = -seedPhase + (Math.PI * 2 * dot) / 3;
      ctx.fillStyle = dot === 1 ? species.bloom : species.accent;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * radius * 0.43,
        Math.sin(angle) * radius * 0.43,
        radius * 0.055,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBloomCluster(cluster, plant, time, species, visibleShoots, clusterIndex) {
    if (visibleShoots <= cluster.firstIndex) return;
    const clusterProgress = clamp(
      (visibleShoots - cluster.firstIndex) / Math.max(3, cluster.indices.length * 0.72),
      0,
      1
    );
    const scale = 1 - Math.pow(1 - clusterProgress, 3);
    const representative = {
      x: cluster.centerX,
      y: cluster.centerY,
    };
    const point = cellPoint(representative, plant, time);
    const dna = analyzeWord(plant.seed);
    const rainBloomScale =
      1 + clamp(Number(plant.rainGrowth) || 0, 0, 1) * 0.16;
    const radius =
      clamp(Math.sqrt(cluster.size) * cellSize * 0.68, cellSize * 1.45, cellSize * 3.2) *
      dna.bloomScale *
      dna.depthScale *
      0.82 *
      rainBloomScale;

    ctx.save();
    ctx.translate(point.x, point.y);
    if (plant.variant === "surprise") {
      drawSurpriseBloom(radius * 0.92, species, plant, scale, time, clusterIndex);
    } else if (plant.visitor) {
      drawBotanicalFormBloom(radius, species, plant, scale, time, clusterIndex);
    } else if (plant.species === "spark") {
      drawLanternBloom(
        radius * 0.78,
        species,
        scale,
        LIGHTS[currentLightIndex].id === "night"
      );
    } else if (plant.species === "noise") {
      drawSignalBloom(radius * 0.82, species, scale);
    } else if (plant.species === "fonts") {
      drawGlyphBloom(radius * 0.92, species, scale);
    } else {
      drawFlowerBloom(radius, species, plant, scale, time, clusterIndex);
    }
    ctx.restore();
  }

  function drawPollen(geometry, plant, time, species) {
    if (plant.growth < 0.98 || rainActive || reducedMotion) return;
    const dna = analyzeWord(plant.seed);
    geometry.bloomClusters.forEach((cluster, clusterIndex) => {
      const seedPhase = (hashString(`${plant.seed}:pollen:${clusterIndex}`) % 628) / 100;
      const center = cellPoint({ x: cluster.centerX, y: cluster.centerY }, plant, time);
      for (let mote = 0; mote < dna.pollenCount; mote += 1) {
        const driftTime = time * (0.00042 + mote * 0.00007) + seedPhase;
        const x = center.x + Math.sin(driftTime * 2.2 + mote) * cellSize * (2.4 + mote);
        const y = center.y - ((driftTime * 18 + mote * 11) % (cellSize * 7));
        const alpha = 0.16 + (Math.sin(driftTime * 3 + mote) + 1) * 0.16;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = mote % 2 === 0 ? species.accent : species.bloom;
        ctx.beginPath();
        ctx.arc(x, y, mote === 0 ? 1.2 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawOrb(light) {
    const isNight = light.id === "night";
    const orbX = width * (isNight ? 0.78 : 0.82);
    const orbY =
      height * (light.id === "dawn" ? 0.15 : light.id === "dusk" ? 0.14 : 0.13);
    const unit = cellSize;
    const pattern = [
      "0011100",
      "0111110",
      "1111111",
      "1111111",
      "1111111",
      "0111110",
      "0011100",
    ];

    ctx.save();
    if (!reducedMotion) {
      const haloRadius = unit * (isNight ? 5.5 : 6.5);
      const halo = ctx.createRadialGradient(
        orbX,
        orbY,
        unit * 1.8,
        orbX,
        orbY,
        haloRadius
      );
      halo.addColorStop(0, colorWithAlpha(light.orb, isNight ? 0.11 : 0.16));
      halo.addColorStop(0.58, colorWithAlpha(light.orb, isNight ? 0.05 : 0.07));
      halo.addColorStop(1, colorWithAlpha(light.orb, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(orbX, orbY, haloRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = isNight ? 0.72 : 0.8;
    ctx.fillStyle = light.orb;
    pattern.forEach((row, rowIndex) => {
      row.split("").forEach((value, columnIndex) => {
        if (value === "1") {
          if (isNight && columnIndex < 3 && rowIndex > 1 && rowIndex < 6) return;
          ctx.fillRect(
            Math.round(orbX + (columnIndex - 3) * unit),
            Math.round(orbY + (rowIndex - 3) * unit),
            unit - 1,
            unit - 1
          );
        }
      });
    });
    ctx.restore();
  }

  function drawSky(time, light) {
    const gradient = ctx.createLinearGradient(0, 0, 0, groundRow * cellSize);
    gradient.addColorStop(0, light.skyTop);
    gradient.addColorStop(0.72, light.skyBottom);
    gradient.addColorStop(1, light.haze);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, groundRow * cellSize);

    drawOrb(light);

    if (light.starAlpha > 0) {
      scenery.stars.forEach((star) => {
        const twinkle = reducedMotion ? 0.7 : 0.45 + Math.sin(time * 0.0013 + star.phase) * 0.28;
        ctx.globalAlpha = light.starAlpha * twinkle;
        ctx.fillStyle = star.size === 2 ? "#e9ffe9" : "#c9e6c9";
        ctx.fillRect(star.x * cellSize, star.y * cellSize, star.size * 2, star.size * 2);
      });
      ctx.globalAlpha = 1;
    }

    scenery.clouds.forEach((cloud, index) => {
      const travel = reducedMotion ? 0 : (time * cloud.speed) % 1.35;
      const cloudX = ((cloud.x + travel + index * 0.07) % 1.35 - 0.18) * width;
      const cloudY = cloud.y * groundRow * cellSize;
      const cloudWidth = cloud.width * width;
      ctx.globalAlpha = light.id === "night" ? 0.07 : 0.11;
      ctx.fillStyle = "#e9ffe9";
      ctx.fillRect(cloudX, cloudY, cloudWidth, cellSize * 2);
      ctx.fillRect(cloudX + cellSize * 4, cloudY - cellSize * 2, cloudWidth * 0.55, cellSize * 2);
      ctx.fillRect(cloudX + cellSize * 8, cloudY - cellSize * 3, cloudWidth * 0.26, cellSize);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = light.horizon;
    ctx.globalAlpha = 0.22;
    for (let x = 0; x < columns; x += 4) {
      const ridge = Math.sin(x * 0.31) * cellSize * 1.5;
      ctx.fillRect(x * cellSize, groundRow * cellSize - cellSize * 4 - ridge, cellSize * 5, cellSize * 5 + ridge);
    }
    ctx.globalAlpha = 1;
  }

  function drawSoil(light) {
    const groundY = groundRow * cellSize;
    const soilGradient = ctx.createLinearGradient(0, groundY, 0, height);
    soilGradient.addColorStop(0, light.soilTop);
    soilGradient.addColorStop(1, light.soilBottom);
    ctx.fillStyle = soilGradient;
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.fillStyle = "#d9e4c9";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, groundY, width, Math.max(2, cellSize - 2));
    ctx.globalAlpha = 1;

    const tones = ["#31453a", "#22342b", "#536152", "#7d8067"];
    scenery.soil.forEach((speck) => {
      ctx.globalAlpha = 0.24 + speck.tone * 0.04;
      ctx.fillStyle = tones[speck.tone];
      ctx.fillRect(speck.x * cellSize, speck.y * cellSize, Math.max(2, cellSize - 2), Math.max(2, cellSize - 2));
    });
    ctx.globalAlpha = 1;

    if (new Set(plants.map(getPlantTypeId)).size >= 4) {
      ctx.strokeStyle = "rgba(191, 233, 238, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, cellSize * 1.6]);
      ctx.beginPath();
      ctx.moveTo(width * 0.08, groundY + cellSize * 9);
      ctx.bezierCurveTo(width * 0.28, groundY + cellSize * 2, width * 0.42, groundY + cellSize * 18, width * 0.59, groundY + cellSize * 10);
      ctx.bezierCurveTo(width * 0.72, groundY + cellSize * 4, width * 0.83, groundY + cellSize * 17, width * 0.94, groundY + cellSize * 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPlantGrounding(geometry, plant, species) {
    const dna = analyzeWord(plant.seed);
    const baseX = geometry.baseX * cellSize;
    const groundY = groundRow * cellSize + cellSize * 0.6;
    const radius = cellSize * (3.2 + dna.depthScale * 1.8);
    const gradient = ctx.createRadialGradient(baseX, groundY, 0, baseX, groundY, radius);
    gradient.addColorStop(0, colorWithAlpha(species.root, 0.2));
    gradient.addColorStop(0.55, colorWithAlpha(species.root, 0.08));
    gradient.addColorStop(1, colorWithAlpha(species.root, 0));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.scale(1, 0.32);
    ctx.beginPath();
    ctx.arc(baseX, groundY / 0.32, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSelectedPlantHalo(geometry, plant, time, species) {
    if (!selectedPlant || selectedPlant.id !== plant.id) return;
    const dna = analyzeWord(plant.seed);
    const top = Math.max(cellSize * 4, geometry.bounds.top);
    const groundY = groundRow * cellSize;
    const plantHeight = Math.max(cellSize * 8, groundY - top);
    const centerX = geometry.baseX * cellSize;
    const centerY = top + plantHeight * 0.42;
    const radius = clamp(plantHeight * 0.42, cellSize * 5, cellSize * 13);
    const pulse = reducedMotion ? 0.1 : 0.085 + (Math.sin(time * 0.0024) + 1) * 0.016;
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );
    gradient.addColorStop(0, colorWithAlpha(species.bloom, pulse));
    gradient.addColorStop(0.58, colorWithAlpha(species.bloom, pulse * 0.5));
    gradient.addColorStop(1, colorWithAlpha(species.bloom, 0));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.scale(1, 1.08 / dna.depthScale);
    ctx.beginPath();
    ctx.arc(centerX, centerY * dna.depthScale / 1.08, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRareSparks(geometry, plant, time, species) {
    if (!isRarePlant(plant) || plant.growth < 0.86) return;
    const topCluster = geometry.bloomClusters
      .slice()
      .sort((a, b) => a.centerY - b.centerY)[0];
    if (!topCluster) return;
    const center = cellPoint(
      { x: topCluster.centerX, y: topCluster.centerY },
      plant,
      time
    );
    const phase = (hashString(`${plant.seed}:rare-sparks`) % 628) / 100;

    ctx.save();
    for (let index = 0; index < 3; index += 1) {
      const angle =
        phase +
        index * (Math.PI * 2 / 3) +
        (reducedMotion ? 0 : time * 0.00035);
      const orbit = cellSize * (2.4 + index * 0.42);
      const x = center.x + Math.cos(angle) * orbit;
      const y = center.y + Math.sin(angle) * orbit * 0.55 - cellSize * 0.4;
      const glow =
        reducedMotion ? 0.6 : 0.38 + (Math.sin(time * 0.003 + index) + 1) * 0.2;
      ctx.globalAlpha = glow;
      ctx.fillStyle = index === 1 ? species.accent : species.bloom;
      ctx.beginPath();
      ctx.arc(x, y, index === 1 ? 1.5 : 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getGrowthProgresses(plant, growth) {
    if (!plant.visitor) {
      return {
        root: clamp(growth / 0.24, 0, 1),
        shoot: clamp((growth - 0.16) / 0.84, 0, 1),
      };
    }

    const growthStyle = analyzeWord(plant.seed).morphology.growth;
    const rootWindow =
      growthStyle === "spiral"
        ? 0.58
        : growthStyle === "tremble"
          ? 0.48
          : growthStyle === "conceal"
            ? 0.42
            : 0.28;
    const shootDelay =
      growthStyle === "spiral"
        ? 0.03
        : growthStyle === "pop"
          ? 0.3
          : growthStyle === "conceal"
            ? 0.34
            : 0.12;
    const root = clamp(growth / rootWindow, 0, 1);
    const rawShoot = clamp(
      (growth - shootDelay) / (1 - shootDelay),
      0,
      1
    );
    let shoot = rawShoot;

    if (growthStyle === "unfurl") {
      shoot = 1 - Math.pow(1 - rawShoot, 3);
    } else if (growthStyle === "wave") {
      shoot = 0.5 - Math.cos(rawShoot * Math.PI) / 2;
    } else if (growthStyle === "branch") {
      shoot = Math.pow(rawShoot, 1.35);
    } else if (growthStyle === "pulse") {
      const stageCount = 5;
      const staged = rawShoot * stageCount;
      const stage = Math.floor(staged);
      const local = staged - stage;
      shoot = clamp(
        (stage + (1 - Math.pow(1 - local, 3))) / stageCount,
        0,
        1
      );
    } else if (growthStyle === "pop") {
      shoot = Math.pow(rawShoot, 0.48);
    } else if (growthStyle === "mirror") {
      shoot = rawShoot * rawShoot * (3 - 2 * rawShoot);
    } else if (growthStyle === "spiral") {
      shoot = 0.5 - Math.cos(rawShoot * Math.PI) / 2;
    } else if (growthStyle === "tremble") {
      const stageCount = 7;
      const staged = rawShoot * stageCount;
      const stage = Math.floor(staged);
      const local = staged - stage;
      const hesitant =
        local < 0.72
          ? local * 0.38
          : 0.2736 + ((local - 0.72) / 0.28) * 0.7264;
      shoot = clamp((stage + hesitant) / stageCount, 0, 1);
    } else if (growthStyle === "conceal") {
      shoot = Math.pow(rawShoot, 1.72);
    }

    return { root, shoot };
  }

  function drawNightBehavior(geometry, plant, time, species, visibleShoots) {
    if (
      !plant.visitor ||
      LIGHTS[currentLightIndex].id !== "night" ||
      visibleShoots < 2
    ) {
      return;
    }

    const morphology = analyzeWord(plant.seed).morphology;
    const visibleCells = geometry.shootCells.slice(0, visibleShoots);
    const leafCells = visibleCells.filter((cell) => cell.role === "leaf");
    const sourceCells = leafCells.length
      ? leafCells
      : visibleCells.filter((cell) => cell.role === "body");
    if (!sourceCells.length) return;

    const sampleEvery = Math.max(1, Math.ceil(sourceCells.length / 8));
    const points = sourceCells
      .filter((cell, index) => index % sampleEvery === 0)
      .slice(0, 8)
      .map((cell) => cellPoint(cell, plant, time));
    const pulse =
      reducedMotion ? 0.62 : 0.44 + (Math.sin(time * 0.0024 + points.length) + 1) * 0.18;

    ctx.save();
    if (morphology.night === "constellate") {
      ctx.strokeStyle = colorWithAlpha(species.accent, pulse * 0.72);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([1.5, cellSize * 0.8]);
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      points.forEach((point, index) => {
        ctx.fillStyle = index % 2 === 0 ? species.accent : species.bloom;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(point.x, point.y, index % 3 === 0 ? 1.7 : 1.05, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (["glow", "pulse", "frost"].includes(morphology.night)) {
      ctx.shadowColor = morphology.night === "frost" ? "#d8f4ef" : species.accent;
      ctx.shadowBlur = cellSize * (morphology.night === "pulse" ? 1.4 : 0.9);
      points.forEach((point, index) => {
        ctx.fillStyle = morphology.night === "frost" ? "#d8f4ef" : species.accent;
        ctx.globalAlpha = pulse * (index % 2 === 0 ? 1 : 0.58);
        ctx.beginPath();
        ctx.arc(point.x, point.y, index % 3 === 0 ? 1.5 : 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (morphology.night === "spark") {
      const highest = points.slice().sort((pointA, pointB) => pointA.y - pointB.y)[0];
      if (highest) {
        for (let spark = 0; spark < 4; spark += 1) {
          const angle = time * 0.00055 + (Math.PI * 2 * spark) / 4;
          ctx.fillStyle = spark % 2 === 0 ? species.accent : species.bloom;
          ctx.globalAlpha = pulse;
          ctx.fillRect(
            highest.x + Math.cos(angle) * cellSize * 2.8,
            highest.y + Math.sin(angle) * cellSize * 1.7,
            spark % 2 === 0 ? 2 : 1,
            spark % 2 === 0 ? 2 : 1
          );
        }
      }
    } else if (morphology.night === "reveal") {
      ctx.strokeStyle = colorWithAlpha(species.accent, pulse);
      ctx.fillStyle = species.accent;
      ctx.lineWidth = 0.7;
      points.forEach((point, index) => {
        if (index % 2 !== 0) return;
        const size = index % 4 === 0 ? 3 : 2;
        ctx.globalAlpha = pulse;
        ctx.strokeRect(point.x - size, point.y - size, size * 2, size * 2);
        ctx.beginPath();
        ctx.moveTo(point.x + size + 1, point.y);
        ctx.lineTo(point.x + size + cellSize * 0.8, point.y);
        ctx.stroke();
      });
    } else if (morphology.night === "silhouette") {
      ctx.fillStyle = "rgba(6, 15, 13, 0.16)";
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * 0.72, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function drawPlant(plant, time) {
    const geometry = buildGeometry(plant);
    const species = getPlantStyle(plant);
    const growth = clamp(plant.growth, 0, 1);
    const progress = getGrowthProgresses(plant, growth);
    const rootProgress = progress.root;
    const shootProgress = progress.shoot;
    const rootDensity = width < 520 ? 0.68 : 1;
    const visibleRoots = Math.floor(geometry.rootCells.length * rootProgress * rootDensity);
    const visibleShoots = Math.floor(geometry.shootCells.length * shootProgress);

    drawPlantGrounding(geometry, plant, species);
    drawSelectedPlantHalo(geometry, plant, time, species);

    drawNetwork(
      geometry.rootCells,
      geometry.rootSegments,
      visibleRoots,
      plant,
      time,
      species.root,
      true
    );
    drawRootDetails(geometry, visibleRoots, plant, time, species);

    drawNetwork(
      geometry.shootCells,
      geometry.stemSegments,
      visibleShoots,
      plant,
      time,
      species.stem
    );

    geometry.leafAnchors.forEach((anchor, index) => {
      if (anchor.leaf >= visibleShoots || anchor.body >= visibleShoots) return;
      drawLeaf(
        geometry.shootCells[anchor.leaf],
        geometry.shootCells[anchor.body],
        plant,
        time,
        species,
        index
      );
    });

    geometry.bloomClusters.forEach((cluster, index) => {
      drawBloomCluster(cluster, plant, time, species, visibleShoots, index);
    });
    drawPollen(geometry, plant, time, species);
    drawRareSparks(geometry, plant, time, species);
    drawNightBehavior(geometry, plant, time, species, visibleShoots);
  }

  function drawFireflies(time) {
    if (plants.length < 8 || LIGHTS[currentLightIndex].id === "day") return;
    scenery.fireflies.forEach((firefly, index) => {
      const pulse = reducedMotion ? 0.65 : 0.25 + (Math.sin(time * 0.002 + firefly.phase) + 1) * 0.3;
      const driftX = reducedMotion ? 0 : Math.sin(time * 0.0007 + firefly.phase) * firefly.drift;
      const driftY = reducedMotion ? 0 : Math.cos(time * 0.0009 + firefly.phase) * firefly.drift * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = index % 3 === 0 ? "#bfe9ee" : "#f4dd9f";
      ctx.fillRect(
        Math.round(firefly.x * width + driftX),
        Math.round(firefly.y * height + driftY),
        index % 5 === 0 ? 3 : 2,
        index % 5 === 0 ? 3 : 2
      );
    });
    ctx.globalAlpha = 1;
  }

  function drawRain(time) {
    if (!rainActive) return;
    const offset = reducedMotion ? 0 : (time * 0.18) % 40;
    ctx.strokeStyle = "rgba(191, 233, 238, 0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -20; x < width + 40; x += 27) {
      const y = ((x * 7 + offset * 5) % Math.max(80, groundRow * cellSize)) - 20;
      ctx.moveTo(x + offset, y);
      ctx.lineTo(x + offset - 6, y + 16);
    }
    ctx.stroke();
  }

  function drawGarden(time) {
    if (!width || !height || !scenery) return;
    const light = LIGHTS[currentLightIndex];
    drawSky(time, light);
    drawSoil(light);
    plants.forEach((plant) => drawPlant(plant, time));
    drawFireflies(time);
    drawRain(time);
  }

  function animate(time) {
    const delta = Math.min(48, time - lastFrame);
    lastFrame = time;
    let growing = false;
    let rainAdvanced = false;

    visitorPlants.forEach((plant) => {
      if (plant.growth < 1) {
        const growthStyle = analyzeWord(plant.seed).morphology.growth;
        const growthRate =
          {
            rise: 1.08,
            wave: 0.88,
            branch: 0.78,
            unfurl: 0.72,
            mirror: 0.84,
            pulse: 0.68,
            pop: 0.76,
            spiral: 0.64,
            tremble: 0.58,
            conceal: 0.62,
          }[growthStyle] || 1;
        plant.growth = reducedMotion
          ? 1
          : Math.min(
              1,
              plant.growth +
                delta * (rainActive ? 0.00032 : 0.00021) * growthRate
            );
        growing = plant.growth < 1;
      }
    });

    if (rainActive) {
      plants.forEach((plant) => {
        const rainGrowth = clamp(Number(plant.rainGrowth) || 0, 0, 1);
        if (rainGrowth >= 1) return;
        plant.rainGrowth = reducedMotion
          ? 1
          : Math.min(1, rainGrowth + delta * 0.00018);
        rainAdvanced = true;
        growing = plant.rainGrowth < 1 || growing;
      });

      if (rainAdvanced) {
        updateWeatherLabel();
        if (time - lastRainGrowthSave >= 900) {
          saveVisitorPlants();
          geometryCache.clear();
          lastRainGrowthSave = time;
        }
      }
    }

    drawGarden(time);
    if (!growing && reducedMotion) {
      animationFrame = null;
      return;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function ensureAnimation() {
    if (animationFrame !== null) return;
    lastFrame = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  function findOpenPosition(preferredX = null) {
    const candidates = Array.from({ length: 29 }, (_, index) => 0.045 + index * 0.0325);
    const random = seededRandom(`${Date.now()}:${visitorPlants.length}`);
    const occupied = plants.map((plant) => plant.xNorm);
    const preferred = Number.isFinite(preferredX)
      ? clamp(preferredX, 0.045, 0.955)
      : null;

    if (!occupied.length) return preferred ?? 0.5;

    const scored = candidates.map((xNorm) => {
      const clearance = Math.min(
        ...occupied.map((position) => Math.abs(position - xNorm))
      );
      return {
        xNorm,
        clearance,
        score: clearance + random() * 0.008,
      };
    });
    const spacingGoal = 0.09;
    const open = scored.filter((candidate) => candidate.clearance >= spacingGoal);

    if (preferred !== null && open.length) {
      return open.sort(
        (a, b) =>
          Math.abs(a.xNorm - preferred) -
            Math.abs(b.xNorm - preferred) ||
          b.clearance - a.clearance
      )[0].xNorm;
    }

    if (preferred !== null) {
      return scored.sort(
        (a, b) =>
          b.score -
          Math.abs(b.xNorm - preferred) * 0.035 -
          (a.score - Math.abs(a.xNorm - preferred) * 0.035)
      )[0].xNorm;
    }

    return scored.sort((a, b) => b.score - a.score)[0].xNorm;
  }

  function addPlant(seedValue, xNorm = null, options = {}) {
    const seed = sanitizeSeed(seedValue) || pick(RANDOM_SEEDS, Math.random);
    const visitorCapacity = getVisitorCapacity();
    if (visitorPlants.length >= visitorCapacity) {
      if (startersVisible) {
        showToast("Three visitor spaces are full. Clear the lab garden to open eight new spaces.");
        setStatus("The shared lab garden is full.");
      } else {
        showToast("All eight visitor spaces are full. Clear the garden to begin again.");
        setStatus("The visitor-only garden is full.");
      }
      return null;
    }

    const resolvedX = findOpenPosition(Number.isFinite(xNorm) ? xNorm : null);
    const id = `visitor-${Date.now().toString(36)}-${seedCode(seed).slice(0, 3).toLowerCase()}`;
    const plant = {
      id,
      seed,
      species: chooseSpecies(seed),
      xNorm: resolvedX,
      createdAt: Date.now(),
      variant: options.surprise ? "surprise" : "word",
      visitor: true,
      growth: reducedMotion ? 1 : 0,
      rainGrowth: 0,
    };

    visitorPlants.push(plant);
    plants.push(plant);
    geometryCache.clear();
    saveVisitorPlants();
    updateReadings();
    selectPlant(plant);
    const dna = analyzeWord(seed);
    setStatus(`${makePlantName(plant)} is taking root.`);
    if (plant.variant === "surprise") {
      showToast(
        `The garden read “${seed}” as ${dna.semanticCue}, then improvised a ${dna.palette.label} starburst.`
      );
    } else if (dna.semanticSource === "unclassified") {
      showToast(
        `The garden does not know “${seed}” yet, so its letters grew Mystery Seedling ${dna.mysteryVariant.id} without inventing a meaning.`
      );
    } else if (dna.semanticSource === "partial-meaning") {
      showToast(
        `The garden recognized a ${dna.semanticCue}; its letters shaped Mystery Seedling ${dna.mysteryVariant.id}.`
      );
    } else {
      showToast(
        `“${seed}” read as ${dna.semanticCue}: ${dna.form.label} with ${MORPHOLOGY_LABELS.architecture[dna.morphology.architecture]} and ${MORPHOLOGY_LABELS.leaf[dna.morphology.leaf]}.`
      );
    }
    ensureAnimation();
    return plant;
  }

  function updateReadings() {
    const speciesTotal = new Set(plants.map(getPlantTypeId)).size;
    plantCountEl.textContent =
      `${String(plants.length).padStart(2, "0")} / ${String(MAX_VISITORS_WITHOUT_LAB).padStart(2, "0")}`;
    speciesCountEl.textContent = String(speciesTotal).padStart(2, "0");
    const light = LIGHTS[currentLightIndex];
    lightReadingEl.textContent = light.label;
    heroLightEl.textContent = light.hero;
    updateClearButton();
  }

  function getGardenRainGrowth() {
    if (!plants.length) return 0;
    const total = plants.reduce(
      (sum, plant) => sum + clamp(Number(plant.rainGrowth) || 0, 0, 1),
      0
    );
    return total / plants.length;
  }

  function updateWeatherLabel() {
    const visibleGrowth = Math.round(getGardenRainGrowth() * 14);
    const nextLabel = rainActive
      ? visibleGrowth > 0
        ? `growing rain +${visibleGrowth}%`
        : "growing rain"
      : visibleGrowth > 0
        ? `rain-grown +${visibleGrowth}%`
        : "still air";
    if (nextLabel === lastRainLabel) return;
    weatherLabel.textContent = nextLabel;
    lastRainLabel = nextLabel;
  }

  function updateClearButton() {
    const shouldRestore = !startersVisible && plants.length === 0;
    clearBtn.textContent = shouldRestore ? "Restore 5 lab species" : "Clear garden";
    clearBtn.dataset.mode = shouldRestore ? "restore" : "clear";
  }

  function resetSpecimenReader() {
    selectedPlant = null;
    specimenReading.hidden = true;
    specimenEmpty.hidden = false;
  }

  function setStatus(message) {
    gardenStatus.textContent = message;
  }

  function setInitialCapacityStatus() {
    const spacesOpen = Math.max(0, getVisitorCapacity() - visitorPlants.length);
    if (startersVisible) {
      setStatus(
        `Five lab species are rooted. ${spacesOpen} visitor ${spacesOpen === 1 ? "space is" : "spaces are"} open.`
      );
    } else {
      setStatus(
        `Visitor-only garden. ${spacesOpen} of eight ${spacesOpen === 1 ? "space is" : "spaces are"} open.`
      );
    }
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 3200);
  }

  function formatAge(timestamp) {
    const elapsed = Date.now() - timestamp;
    const minutes = Math.max(0, Math.floor(elapsed / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function selectPlant(plant) {
    selectedPlant = plant;
    const species = SPECIES[plant.species];
    const style = getPlantStyle(plant);
    const dna = analyzeWord(plant.seed);
    specimenEmpty.hidden = true;
    specimenReading.hidden = false;
    specimenId.textContent = getSpecimenLabel(plant);
    specimenName.textContent = makePlantName(plant);
    if (plant.variant === "surprise") {
      specimenFamily.textContent = `Garden wildcard · ${species.family}`;
    } else if (plant.visitor) {
      if (dna.mysteryVariant) {
        specimenFamily.textContent =
          `Unclassified seedling · Variant ${dna.mysteryVariant.id} · ${capitalize(MORPHOLOGY_LABELS.organ[dna.morphology.organ])}`;
      } else {
        const formNumber = BOTANICAL_FORMS.findIndex((form) => form.id === dna.form.id) + 1;
        specimenFamily.textContent =
          `Form ${String(formNumber).padStart(2, "0")} / ${BOTANICAL_FORMS.length} · ${capitalize(dna.form.label)} · ${capitalize(MORPHOLOGY_LABELS.organ[dna.morphology.organ])}`;
      }
    } else {
      specimenFamily.textContent = species.family;
    }
    specimenSeed.textContent = seedCode(plant.seed);
    specimenTrait.textContent = getTrait(plant);
    specimenDNA.textContent =
      plant.variant === "surprise"
        ? `surprise starburst on ${MORPHOLOGY_LABELS.architecture[dna.morphology.architecture]} · ${dna.palette.label} · cue: ${dna.semanticCue}`
        : dna.mysteryVariant
          ? `letter-grown variant ${dna.mysteryVariant.id} · ${getMorphologyDescription(dna)} · ${dna.palette.label} colors · meaning: ${dna.semanticCue}`
          : `${getMorphologyDescription(dna)} · ${dna.palette.label} colors · cue: ${dna.semanticCue}`;
    specimenDNA.title = specimenDNA.textContent;
    specimenAge.textContent = formatAge(plant.createdAt);
    specimenSwatch.style.setProperty("--swatch-color", style.stem);
    specimenSwatch.style.setProperty("--swatch-accent", style.bloom);

    if (species.link) {
      specimenLink.hidden = false;
      specimenLink.href = species.link;
      specimenLink.querySelector("span").textContent = species.roomLabel;
    } else {
      specimenLink.hidden = true;
    }

    setStatus(`${makePlantName(plant)} selected. ${capitalize(getTrait(plant))}.`);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function findPlantAt(point) {
    const maturePlants = [...plants].reverse();
    return (
      maturePlants.find((plant) => {
        const geometry = buildGeometry(plant);
        const bounds = geometry.bounds;
        return (
          point.x >= bounds.left &&
          point.x <= bounds.right &&
          point.y >= bounds.top &&
          point.y <= bounds.bottom
        );
      }) || null
    );
  }

  function showTooltip(plant, point) {
    const cardWidth = 190;
    const cardHeight = 86;
    const left = clamp(point.x + 16, 14, width - cardWidth - 14);
    const top = clamp(point.y - cardHeight - 12, 16, height - cardHeight - 16);
    specimenTooltip.style.left = `${left}px`;
    specimenTooltip.style.top = `${top}px`;
    tooltipId.textContent = getSpecimenLabel(plant);
    tooltipName.textContent = makePlantName(plant);
    const dna = analyzeWord(plant.seed);
    tooltipTrait.textContent =
      plant.variant === "surprise"
        ? `surprise starburst · ${dna.semanticCue}`
        : dna.mysteryVariant
          ? `mystery seedling · ${dna.mysteryVariant.id} · ${MORPHOLOGY_LABELS.architecture[dna.morphology.architecture]}`
          : `${dna.form.label} · ${MORPHOLOGY_LABELS.organ[dna.morphology.organ]} · ${MORPHOLOGY_LABELS.architecture[dna.morphology.architecture]}`;
    specimenTooltip.hidden = false;
  }

  function hideTooltip() {
    specimenTooltip.hidden = true;
  }

  function handlePointerMove(event) {
    const point = getCanvasPoint(event);
    const plant = findPlantAt(point);
    hoveredPlant = plant;
    canvas.classList.toggle("is-hovering-plant", Boolean(plant));
    if (plant) showTooltip(plant, point);
    else hideTooltip();
  }

  function handlePointerDown(event) {
    const point = getCanvasPoint(event);
    const plant = findPlantAt(point);
    if (plant) {
      selectPlant(plant);
      return;
    }

    const groundY = groundRow * cellSize;
    if (point.y < groundY - cellSize * 5) {
      setStatus("Plant closer to the soil line. The sky is not accepting seeds today.");
      showToast("Try the dark soil or the bright horizon line.");
      return;
    }

    const seed = sanitizeSeed(seedInput.value) || pick(RANDOM_SEEDS, Math.random);
    addPlant(seed, point.x / width);
    seedInput.value = "";
  }

  function cycleLight() {
    currentLightIndex = (currentLightIndex + 1) % LIGHTS.length;
    const light = LIGHTS[currentLightIndex];
    geometryCache.clear();
    updateReadings();
    setStatus(`The terrarium has shifted to ${light.label}.`);
    showToast(`${capitalize(light.label)} spectrum engaged.`);
    drawGarden(performance.now());
  }

  function toggleRain() {
    rainActive = !rainActive;
    rainBtn.setAttribute("aria-pressed", String(rainActive));
    rainBtn.querySelector("span").textContent = rainActive ? "Stop the rain" : "Call the rain";
    lastRainGrowthSave = 0;
    geometryCache.clear();
    updateWeatherLabel();
    if (rainActive) {
      setStatus("Rain is growing every stem, leaf, root, and bloom.");
      showToast("Keep the rain falling to build lasting growth.");
    } else {
      saveVisitorPlants();
      setStatus("The rain has stopped. Today’s growth remains.");
      showToast("The garden kept its new rain-grown size.");
    }
    ensureAnimation();
  }

  function copySelectedSeed() {
    if (!selectedPlant) {
      showToast("Select a specimen first.");
      return;
    }

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "plot";
    url.searchParams.set("seed", selectedPlant.seed);
    const text = url.toString();

    const finish = () => {
      showToast(`Seed link copied for ${makePlantName(selectedPlant)}.`);
      setStatus("A reproducible seed is ready to share.");
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
    } else {
      fallbackCopy(text, finish);
    }
  }

  function fallbackCopy(text, onSuccess) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      onSuccess();
    } catch (error) {
      showToast("The seed link could not be copied automatically.");
    }
    textarea.remove();
  }

  function saveFieldPrint() {
    const poster = document.createElement("canvas");
    const posterCtx = poster.getContext("2d");
    const posterWidth = 1800;
    const posterHeight = 1220;
    const margin = 90;
    poster.width = posterWidth;
    poster.height = posterHeight;

    posterCtx.fillStyle = "#f6f3e8";
    posterCtx.fillRect(0, 0, posterWidth, posterHeight);
    posterCtx.strokeStyle = "rgba(16, 28, 23, 0.28)";
    posterCtx.lineWidth = 2;
    posterCtx.strokeRect(margin, margin, posterWidth - margin * 2, posterHeight - margin * 2);

    posterCtx.fillStyle = "#101c17";
    posterCtx.font = "600 24px sans-serif";
    posterCtx.letterSpacing = "4px";
    posterCtx.fillText("KELLY LUCAS LAB / LIVING SYSTEM 03", margin + 32, margin + 54);

    posterCtx.font = "400 76px sans-serif";
    posterCtx.fillText("The living lab garden.", margin + 32, margin + 142);

    const imageX = margin + 32;
    const imageY = margin + 190;
    const imageWidth = posterWidth - (margin + 32) * 2;
    const imageHeight = 780;
    posterCtx.drawImage(canvas, imageX, imageY, imageWidth, imageHeight);

    posterCtx.fillStyle = "#101c17";
    posterCtx.font = "500 24px sans-serif";
    posterCtx.fillText(
      `${plants.length} PLANTS  /  ${new Set(plants.map(getPlantTypeId)).size} FORMS  /  ${LIGHTS[currentLightIndex].label.toUpperCase()} LIGHT`,
      margin + 32,
      posterHeight - margin - 54
    );
    posterCtx.textAlign = "right";
    posterCtx.fillStyle = "rgba(16, 28, 23, 0.58)";
    posterCtx.fillText(new Date().toLocaleString(), posterWidth - margin - 32, posterHeight - margin - 54);

    const download = (url) => {
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.download = `living-lab-garden-${date}.png`;
      link.href = url;
      link.click();
    };

    if (poster.toBlob) {
      poster.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        download(url);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } else {
      download(poster.toDataURL("image/png"));
    }

    showToast("Field print prepared.");
    setStatus("A high-resolution garden record is downloading.");
  }

  function clearOrRestoreGarden() {
    if (!startersVisible && plants.length === 0) {
      startersVisible = true;
      saveStarterVisibility();
      rebuildPlantList();
      setStatus("Five lab species have returned. Three visitor spaces are open.");
      showToast("Lab garden restored: five rooted plants and three open spaces.");
      ensureAnimation();
      return;
    }

    visitorPlants = [];
    startersVisible = false;
    hoveredPlant = null;
    resetSpecimenReader();
    hideTooltip();
    saveStarterVisibility();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAB_RAIN_GROWTH_KEY);
    } catch (error) {
      setStatus("The plot is clear, but this browser declined to remember the reset.");
    }
    rebuildPlantList();
    setStatus("The lab plants are cleared. Eight visitor-only spaces are open.");
    showToast("Visitor-only garden ready. Plant up to eight new specimens.");
    ensureAnimation();
  }

  seedForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const seed = sanitizeSeed(seedInput.value) || pick(RANDOM_SEEDS, Math.random);
    addPlant(seed);
    seedInput.value = "";
  });

  surpriseBtn.addEventListener("click", () => {
    const random = seededRandom(`${Date.now()}:surprise`);
    const seed = pick(RANDOM_SEEDS, random);
    seedInput.value = seed;
    addPlant(seed, null, { surprise: true });
    seedInput.value = "";
  });

  lightBtn.addEventListener("click", cycleLight);
  rainBtn.addEventListener("click", toggleRain);
  saveBtn.addEventListener("click", saveFieldPrint);
  clearBtn.addEventListener("click", clearOrRestoreGarden);
  copySeedBtn.addEventListener("click", copySelectedSeed);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerleave", () => {
    hoveredPlant = null;
    canvas.classList.remove("is-hovering-plant");
    hideTooltip();
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addPlant(pick(RANDOM_SEEDS, Math.random));
    }
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeCanvas.timer);
    resizeCanvas.timer = window.setTimeout(resizeCanvas, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    } else if (!document.hidden) {
      ensureAnimation();
    }
  });

  const sharedSeed = sanitizeSeed(new URLSearchParams(window.location.search).get("seed"));
  if (sharedSeed) {
    seedInput.value = sharedSeed;
    window.setTimeout(() => {
      showToast(`A shared seed is waiting: “${sharedSeed}”.`);
      setStatus("Plant the waiting seed to reproduce its botanical DNA.");
    }, 500);
  }

  rebuildPlantList();
  resizeCanvas();
  setInitialCapacityStatus();
  ensureAnimation();
})();
