// src/utils/reco.js
// Motor de recomendaciones por prompt (robusto, ampliado)

// Import mínimo (tu conversión Lab ya existente)
import { rgbToLab } from "./color";

// --------------------------- Utils de texto ---------------------------
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const splitTokens = (s) =>
  norm(s)
    .split(/[^a-z0-9#]+/g)
    .filter(Boolean);

// ===================== Biblioteca de familias ========================
// (Originales + pack de 10 nuevas cuidadosamente curadas)
const F = [
  // ---- Originales ----
  {
    key: "nude_taupe",
    name: "Nude Taupe",
    swatches: ["#E8DACC", "#D8C8B7", "#C7B6A3", "#B6A492", "#9A8675"],
    vibe: ["oficina", "formal", "minimal", "novia"],
  },
  {
    key: "nude_rosa",
    name: "Nude Rosado",
    swatches: ["#F2E6E6", "#E8CCCC", "#DDB3B3", "#D19999", "#C18080"],
    vibe: ["oficina", "novia", "primavera", "minimal"],
  },
  {
    key: "french",
    name: "Francesa / Leche",
    swatches: ["#FFFFFF", "#F7F2F2", "#F0E8E6", "#E8DFDC"],
    vibe: ["oficina", "novia", "minimal"],
  },
  {
    key: "terracota",
    name: "Terracota",
    swatches: ["#C76E3E", "#B55A2E", "#9D4A25", "#823C1E", "#6A3118"],
    vibe: ["otono", "elegante", "tierra"],
  },
  {
    key: "caramelo",
    name: "Caramelo",
    swatches: ["#C08B65", "#A97657", "#906149", "#7A503D", "#684536"],
    vibe: ["tierra", "otono", "oficina"],
  },
  {
    key: "coral",
    name: "Coral",
    swatches: ["#FF8C69", "#FF7A59", "#F2684A", "#E2583F", "#D14937"],
    vibe: ["verano", "playa", "fiesta"],
  },
  {
    key: "rojo_clasico",
    name: "Rojo Clásico",
    swatches: ["#D7263D", "#BD1E34", "#A5172C", "#8D1124", "#760D1E"],
    vibe: ["fiesta", "impacto", "elegante"],
  },
  {
    key: "burgundy",
    name: "Borgoña / Vino",
    swatches: ["#5A1E2E", "#471826", "#35121C", "#270E14", "#1B090D"],
    vibe: ["elegante", "invierno", "fiesta"],
  },
  {
    key: "fucsia",
    name: "Fucsia / Magenta",
    swatches: ["#E1559C", "#CF3C8A", "#B42C76", "#9A2265", "#811A55"],
    vibe: ["fiesta", "impacto", "verano"],
  },
  {
    key: "mauve",
    name: "Mauve",
    swatches: ["#B289B5", "#A076A4", "#8C6291", "#7A527F", "#68446C"],
    vibe: ["neutro", "oficina", "elegante"],
  },
  {
    key: "jewel_emerald",
    name: "Verde Esmeralda",
    swatches: ["#2F7F6F", "#276A5D", "#20564C", "#19433C", "#12312C"],
    vibe: ["elegante", "invierno", "fiesta"],
  },
  {
    key: "navy",
    name: "Azul Navy",
    swatches: ["#183A64", "#122B4B", "#0D2139", "#08182A"],
    vibe: ["elegante", "invierno", "oficina"],
  },
  {
    key: "pastel_mix",
    name: "Pasteles Mix",
    swatches: ["#F7CFE3", "#E4D5F8", "#CFE7FF", "#D3F5E8", "#FFF1C9"],
    vibe: ["primavera", "novia", "suave"],
  },
  {
    key: "lila",
    name: "Lila / Lavanda",
    swatches: ["#C8A2C8", "#B889B8", "#A070A0", "#8E5E8E", "#7A4E7A"],
    vibe: ["primavera", "suave", "neutro"],
  },
  {
    key: "mint",
    name: "Verde Menta",
    swatches: ["#C8F2DE", "#ABDFC9", "#90CBB4", "#77B8A0", "#5CA58D"],
    vibe: ["primavera", "verano", "suave"],
  },
  {
    key: "neon_pink",
    name: "Neón Rosa",
    swatches: ["#FF5CB3", "#FF47A7", "#FF339B", "#F11E8A", "#D9127A"],
    vibe: ["fiesta", "disco", "impacto"],
  },
  {
    key: "neon_orange",
    name: "Neón Naranja",
    swatches: ["#FF7F11", "#FF6A00", "#FF5400", "#EA4B00", "#D14100"],
    vibe: ["verano", "fiesta", "disco"],
  },
  {
    key: "aqua",
    name: "Aqua / Turquesa",
    swatches: ["#6ED3CF", "#4ABFBA", "#35A9A4", "#2D8D89", "#25716E"],
    vibe: ["playa", "verano", "fiesta"],
  },
  {
    key: "metal_gold",
    name: "Metal Dorado",
    swatches: ["#E3C770", "#D4AF37", "#C39A2D", "#AD8826", "#94731F"],
    vibe: ["elegante", "fiesta", "metalico"],
  },
  {
    key: "metal_silver",
    name: "Metal Plateado",
    swatches: ["#C0C7D1", "#AAB5C3", "#959FB5", "#808AA7", "#6A7498"],
    vibe: ["elegante", "invierno", "metalico"],
  },
  {
    key: "black",
    name: "Negro / Grafito",
    swatches: ["#1A1A1A", "#222222", "#2A2A2A", "#333333", "#3B3B3B"],
    vibe: ["impacto", "minimal", "elegante"],
  },
  {
    key: "white_pearl",
    name: "Blanco Perlado",
    swatches: ["#FFFFFF", "#F7F9FB", "#EFF2F7", "#E8EDF5", "#E1E8F0"],
    vibe: ["novia", "minimal", "francesa"],
  },
  {
    key: "olive",
    name: "Oliva / Musgo",
    swatches: ["#6B7D3A", "#5C6A31", "#4E5829", "#414A22", "#353D1C"],
    vibe: ["otono", "tierra", "elegante"],
  },
  {
    key: "mustard",
    name: "Mostaza",
    swatches: ["#E2B22E", "#C99B24", "#B0871D", "#987315", "#7F5E0F"],
    vibe: ["otono", "retro", "tierra"],
  },

  // ---- Pack de 10 nuevas ----
  {
    key: "greige",
    name: "Greige Neutro",
    swatches: ["#E6E1DC", "#D6D0C9", "#C7C1BA", "#B8B3AD", "#A8A39E"],
    vibe: ["minimal", "oficina", "novia", "neutro"],
  },
  {
    key: "chocolate",
    name: "Chocolate",
    swatches: ["#6B3E2E", "#5C3426", "#4E2B1F", "#412319", "#351C14"],
    vibe: ["otono", "elegante", "tierra"],
  },
  {
    key: "rose_gold",
    name: "Rose Gold",
    swatches: ["#F3C4BD", "#E8A9A1", "#D98F89", "#C77772", "#B5645F"],
    vibe: ["novia", "elegante", "metalico"],
  },
  {
    key: "gunmetal",
    name: "Gunmetal",
    swatches: ["#4A4F57", "#3E434A", "#33383E", "#292E34", "#20252B"],
    vibe: ["elegante", "invierno", "metalico", "impacto"],
  },
  {
    key: "periwinkle",
    name: "Periwinkle",
    swatches: ["#C9D1FF", "#B3BDF8", "#9DA9F0", "#8796E7", "#7182DE"],
    vibe: ["primavera", "suave", "novia"],
  },
  {
    key: "teal",
    name: "Teal Profundo",
    swatches: ["#1F6F70", "#1A5D5E", "#154C4D", "#103C3D", "#0C2E2F"],
    vibe: ["invierno", "elegante", "playa"],
  },
  {
    key: "blush",
    name: "Blush Suave",
    swatches: ["#F7D7D7", "#F0C1C1", "#E7ABAB", "#DD9696", "#D28181"],
    vibe: ["novia", "romantico", "minimal"],
  },
  {
    key: "sky_blue",
    name: "Celeste Cielo",
    swatches: ["#D2ECFF", "#BAE2FF", "#A2D9FF", "#8AD0FF", "#72C6FF"],
    vibe: ["primavera", "verano", "suave"],
  },
  {
    key: "taupe_gray",
    name: "Taupe Grisáceo",
    swatches: ["#D5D0CB", "#C3BDB8", "#B1ABA7", "#9E9894", "#8C8683"],
    vibe: ["oficina", "minimal", "elegante"],
  },
  {
    key: "holographic",
    name: "Holográfico Suave",
    swatches: ["#EDE7FF", "#E0F6FF", "#F9F0FF", "#EAF9F3", "#FFF6E8"],
    vibe: ["fiesta", "glitter", "novia"],
  },
];

// Índice para validar keys y evitar undefined
const F_INDEX = F.reduce((acc, f) => ((acc[f.key] = f), acc), {});

// ====================== Bias por undertone / tono / cabello ======================
const undertoneBias = {
  calido: new Set([
    "terracota",
    "caramelo",
    "coral",
    "metal_gold",
    "mustard",
    "olive",
    "nude_taupe",
    "nude_rosa",
    "french",
    "chocolate",
    "rose_gold",
    "greige",
    "taupe_gray",
    "blush",
  ]),
  frio: new Set([
    "mauve",
    "burgundy",
    "navy",
    "metal_silver",
    "lila",
    "pastel_mix",
    "fucsia",
    "white_pearl",
    "nude_rosa",
    "periwinkle",
    "sky_blue",
    "gunmetal",
    "teal",
    "holographic",
  ]),
  neutro: new Set([
    "mauve",
    "nude_taupe",
    "nude_rosa",
    "french",
    "caramelo",
    "navy",
    "pastel_mix",
    "greige",
    "taupe_gray",
    "blush",
    "rose_gold",
  ]),
};

const toneBoost = {
  clara: new Set([
    "pastel_mix",
    "lila",
    "mint",
    "nude_rosa",
    "french",
    "coral",
    "periwinkle",
    "sky_blue",
    "blush",
    "white_pearl",
    "greige",
    "holographic",
  ]),
  media: new Set([
    "caramelo",
    "terracota",
    "mauve",
    "navy",
    "olive",
    "greige",
    "taupe_gray",
    "rose_gold",
  ]),
  morena: new Set([
    "metal_gold",
    "coral",
    "fucsia",
    "aqua",
    "terracota",
    "mustard",
    "chocolate",
    "teal",
    "jewel_emerald",
    "rojo_clasico",
  ]),
  oscura: new Set([
    "metal_gold",
    "burgundy",
    "rojo_clasico",
    "neon_pink",
    "neon_orange",
    "aqua",
    "gunmetal",
    "black",
    "teal",
  ]),
};

const hairBoost = {
  oscuro: new Set([
    "metal_gold",
    "coral",
    "aqua",
    "neon_pink",
    "white_pearl",
    "fucsia",
    "rose_gold",
    "blush",
    "greige",
  ]),
  medio: new Set([
    "mauve",
    "caramelo",
    "terracota",
    "navy",
    "nude_taupe",
    "taupe_gray",
    "chocolate",
  ]),
  rubio: new Set([
    "burgundy",
    "navy",
    "fucsia",
    "rojo_clasico",
    "metal_silver",
    "periwinkle",
    "sky_blue",
    "rose_gold",
  ]),
  cobrizo: new Set([
    "aqua",
    "mint",
    "pastel_mix",
    "white_pearl",
    "navy",
    "teal",
    "blush",
  ]),
};

// ====================== Alias / Sinónimos de keywords ======================
const ALIAS = {
  // estilos / vibes
  oficina: [
    "trabajo",
    "laboral",
    "office",
    "executive",
    "corporativo",
    "formalito",
    "daily",
    "diario",
  ],
  formal: [
    "etiqueta",
    "dresscode",
    "coctel",
    "cocktail",
    "gala",
    "sofisticado",
    "smart",
  ],
  elegante: [
    "chic",
    "lujoso",
    "glam",
    "glamoroso",
    "sofisticado",
    "fino",
    "classy",
    "formal",
  ],
  minimal: [
    "minimalista",
    "clean",
    "clean_girl",
    "simple",
    "discreto",
    "sobrio",
    "neutro",
    "basic",
  ],
  novia: [
    "boda",
    "matrimonio",
    "bride",
    "bridal",
    "casamiento",
    "civil",
    "novias",
  ],
  primavera: ["spring", "floral", "flores", "primaveral", "🌸"],
  verano: ["summer", "veraniego", "calor", "playa", "☀️", "🏖️"],
  playa: ["beach", "vacaciones", "mar", "océano", "turquesa", "🏝️"],
  otono: ["otoño", "fall", "autumn", "🍂"],
  invierno: ["winter", "❄️", "frio"],
  fiesta: [
    "party",
    "carrete",
    "noche",
    "nightout",
    "discoteca",
    "club",
    "disco",
    "evento",
    "celebracion",
    "celebración",
    "cumple",
    "graduacion",
    "graduación",
  ],
  impacto: [
    "bold",
    "fuerte",
    "vibrante",
    "intenso",
    "llamativo",
    "statement",
    "🔥",
  ],
  retro: [
    "vintage",
    "setentero",
    "ochentero",
    "noventero",
    "oldschool",
    "nostalgico",
    "nostálgico",
  ],
  glitter: [
    "brillo",
    "escarcha",
    "destellos",
    "sparkle",
    "sparkly",
    "shimmer",
    "✨",
  ],
  metalico: ["metálico", "metal", "cromado", "chrome", "chromado", "mirror"],
  cromado: ["espejo", "mirror", "chrome"],
  geometrico: [
    "geométrico",
    "geo",
    "lineas",
    "líneas",
    "franjas",
    "abstracto",
    "minimal_art",
  ],
  flores: ["florales", "flower", "flowerpower", "daisy", "🌼", "🌺", "🌷"],
  frances: ["francesa", "french", "milk", "leche", "babyboomer", "boomer"],

  // estéticas / tendencias
  romantico: ["romántico", "soft", "suave", "delicado", "femenino", "sweet"],
  euforia: ["euphoria", "festival", "coachella", "editorial", "runway", "y2k"],
  gotico: ["gótico", "goth", "oscuro", "dark", "grunge"],
  barbie: ["barbiecore", "barbie_pink", "rosa_barbie"],
  boho: ["bohemio", "bohemia", "bohemian"],

  // ocasiones
  oficina_dura: [
    "reunión",
    "entrevista",
    "presentación",
    "pitch",
    "mesa_directiva",
  ],

  // colores (alias semánticos)
  rojo: ["red", "carmin", "carmín", "escarlata", "granate", "vino", "tinto"],
  burgundy: ["vino", "granate", "bordo", "burdeos", "maroon", "vino_tinto"],
  fucsia: ["magenta", "hot_pink", "barbie", "barbie_pink"],
  coral: [
    "salmon",
    "salmón",
    "melón",
    "peachy",
    "melocoton",
    "melocotón",
    "durazno",
  ],
  negro: ["negra", "black", "grafito", "grafite", "carbón", "carbon"],
  dorado: ["oro", "gold", "champagne", "champán", "champagne_gold"],
  plateado: ["plata", "silver", "cromo", "cromado", "acero", "acero_inox"],
  azul: ["azul_marino", "marino", "navy", "azul_oscuro", "midnight"],
  verde: [
    "emerald",
    "esmeralda",
    "oliva",
    "musgo",
    "mint",
    "menta",
    "aqua",
    "turquesa",
    "teal",
  ],
  lila: ["lavanda", "violeta", "malva", "morado", "lilac", "lavender"],
  pastel: ["pasteles", "soft_tone", "baby_colors", "candy"],
  neon: ["neón", "neon", "fluor", "fluorescente", "highlighter"],

  // exclusiones “sin …”
  sin: ["no", "evitar", "evita", "without"],
};

// =================== Biblioteca de keywords → familias =====================
const KEYMAP_RAW = {
  // base existentes y ampliados
  oficina: [
    "nude_taupe",
    "nude_rosa",
    "french",
    "navy",
    "mauve",
    "taupe_gray",
    "greige",
  ],
  formal: [
    "nude_taupe",
    "navy",
    "mauve",
    "white_pearl",
    "burgundy",
    "metal_silver",
    "metal_gold",
    "greige",
    "rose_gold",
  ],
  elegante: [
    "burgundy",
    "navy",
    "jewel_emerald",
    "metal_gold",
    "metal_silver",
    "mauve",
    "white_pearl",
    "black",
    "gunmetal",
    "teal",
    "rose_gold",
    "taupe_gray",
  ],
  minimal: [
    "nude_taupe",
    "french",
    "white_pearl",
    "black",
    "mauve",
    "greige",
    "taupe_gray",
    "blush",
  ],
  novia: [
    "french",
    "white_pearl",
    "nude_rosa",
    "pastel_mix",
    "mauve",
    "rose_gold",
    "blush",
    "periwinkle",
    "holographic",
    "greige",
  ],
  primavera: [
    "pastel_mix",
    "lila",
    "mint",
    "nude_rosa",
    "french",
    "periwinkle",
    "sky_blue",
    "blush",
  ],
  verano: [
    "coral",
    "aqua",
    "neon_orange",
    "neon_pink",
    "mint",
    "white_pearl",
    "sky_blue",
  ],
  playa: [
    "aqua",
    "mint",
    "coral",
    "pastel_mix",
    "white_pearl",
    "teal",
    "sky_blue",
  ],
  otono: [
    "terracota",
    "caramelo",
    "mustard",
    "olive",
    "mauve",
    "chocolate",
    "taupe_gray",
    "greige",
  ],
  invierno: [
    "burgundy",
    "navy",
    "metal_silver",
    "black",
    "gunmetal",
    "teal",
    "jewel_emerald",
  ],
  fiesta: [
    "neon_pink",
    "neon_orange",
    "metal_gold",
    "fucsia",
    "rojo_clasico",
    "aqua",
    "burgundy",
    "holographic",
    "gunmetal",
    "rose_gold",
  ],
  impacto: [
    "rojo_clasico",
    "fucsia",
    "black",
    "burgundy",
    "neon_pink",
    "neon_orange",
    "gunmetal",
    "teal",
  ],
  retro: ["mustard", "olive", "mauve", "rojo_clasico", "taupe_gray"],
  glitter: ["metal_gold", "metal_silver", "holographic", "white_pearl"],
  metalico: ["metal_gold", "metal_silver", "rose_gold", "gunmetal"],
  cromado: ["metal_silver", "metal_gold", "gunmetal"],
  geometrico: ["black", "white_pearl", "navy", "mauve", "gunmetal"],
  flores: [
    "pastel_mix",
    "lila",
    "nude_rosa",
    "mint",
    "white_pearl",
    "blush",
    "periwinkle",
  ],
  frances: ["french", "white_pearl", "nude_rosa"],
  romantico: [
    "nude_rosa",
    "pastel_mix",
    "lila",
    "mauve",
    "white_pearl",
    "blush",
    "rose_gold",
  ],
  euforia: [
    "neon_pink",
    "neon_orange",
    "fucsia",
    "aqua",
    "metal_silver",
    "black",
    "holographic",
  ],
  gotico: ["black", "burgundy", "navy", "gunmetal"],
  barbie: ["fucsia", "neon_pink", "nude_rosa", "white_pearl", "blush"],
  boho: ["olive", "mustard", "caramelo", "terracota", "mint", "greige"],

  // ocasiones específicas
  entrevista: [
    "nude_taupe",
    "french",
    "white_pearl",
    "navy",
    "mauve",
    "taupe_gray",
    "greige",
  ],
  graduacion: [
    "burgundy",
    "metal_gold",
    "metal_silver",
    "white_pearl",
    "navy",
    "rose_gold",
  ],
  cumpleaños: [
    "rojo_clasico",
    "fucsia",
    "neon_pink",
    "aqua",
    "metal_gold",
    "holographic",
  ],
  gala: [
    "metal_gold",
    "metal_silver",
    "burgundy",
    "navy",
    "white_pearl",
    "gunmetal",
    "rose_gold",
  ],
  cita: [
    "nude_rosa",
    "mauve",
    "rojo_clasico",
    "burgundy",
    "white_pearl",
    "blush",
    "rose_gold",
  ],
  coctel: [
    "burgundy",
    "navy",
    "metal_gold",
    "mauve",
    "white_pearl",
    "gunmetal",
  ],
  trabajo: ["nude_taupe", "french", "mauve", "navy", "taupe_gray", "greige"],

  // preferencias de acabado/estética
  mate: [
    "nude_taupe",
    "black",
    "mauve",
    "navy",
    "olive",
    "taupe_gray",
    "chocolate",
    "greige",
  ],
  brillo: [
    "white_pearl",
    "metal_gold",
    "metal_silver",
    "fucsia",
    "coral",
    "holographic",
    "rose_gold",
  ],
  shimmer: [
    "white_pearl",
    "metal_gold",
    "metal_silver",
    "holographic",
    "rose_gold",
  ],
  perla: ["white_pearl", "french", "nude_rosa", "holographic"],

  // colores semánticos directos (positivo)
  rojo: ["rojo_clasico", "burgundy"],
  burgundy: ["burgundy"],
  fucsia: ["fucsia"],
  coral: ["coral"],
  negro: ["black", "gunmetal"],
  dorado: ["metal_gold", "rose_gold"],
  plateado: ["metal_silver", "gunmetal"],
  azul: ["navy", "aqua", "sky_blue", "periwinkle", "teal"],
  verde: ["jewel_emerald", "olive", "mint", "aqua", "teal"],
  lila: ["lila", "mauve", "periwinkle"],
  pastel: [
    "pastel_mix",
    "lila",
    "mint",
    "nude_rosa",
    "blush",
    "sky_blue",
    "periwinkle",
  ],
  neon: ["neon_pink", "neon_orange"],

  // emojis (compat: también los detectamos en parser)
  "🌸": ["pastel_mix", "lila", "nude_rosa", "blush"],
  "☀️": ["coral", "mint", "aqua", "neon_orange", "sky_blue"],
  "🍂": [
    "terracota",
    "caramelo",
    "mustard",
    "olive",
    "chocolate",
    "taupe_gray",
  ],
  "❄️": ["burgundy", "navy", "metal_silver", "black", "gunmetal", "teal"],
  "✨": [
    "metal_gold",
    "metal_silver",
    "white_pearl",
    "holographic",
    "rose_gold",
  ],
  "🔥": ["rojo_clasico", "fucsia", "neon_pink", "black", "gunmetal"],
  "🏖️": ["aqua", "mint", "white_pearl", "coral", "sky_blue", "teal"],
};

const KEYMAP = Object.fromEntries(
  Object.entries(KEYMAP_RAW).map(([k, arr]) => [
    k,
    arr.filter((x) => F_INDEX[x]),
  ])
);

// ====================== Exclusiones por color/estética =====================
const COLOR_WORDS = {
  // colores con sinónimos
  rojo: ["rojo_clasico", "burgundy"],
  carmin: ["rojo_clasico", "burgundy"],
  granate: ["burgundy"],
  vino: ["burgundy"],
  bordo: ["burgundy"],
  fucsia: ["fucsia"],
  magenta: ["fucsia"],
  coral: ["coral"],
  salmon: ["coral"],
  melocoton: ["coral"],
  durazno: ["coral"],
  negro: ["black", "gunmetal"],
  grafito: ["black", "gunmetal"],
  dorado: ["metal_gold", "rose_gold"],
  oro: ["metal_gold", "rose_gold"],
  plateado: ["metal_silver", "gunmetal"],
  plata: ["metal_silver", "gunmetal"],
  cromado: ["metal_silver", "metal_gold", "gunmetal", "holographic"],
  azul: ["navy", "aqua", "sky_blue", "periwinkle", "teal"],
  marino: ["navy"],
  verde: ["jewel_emerald", "olive", "mint", "aqua", "teal"],
  esmeralda: ["jewel_emerald"],
  oliva: ["olive"],
  menta: ["mint"],
  turquesa: ["aqua", "teal"],
  lila: ["lila", "mauve", "periwinkle"],
  morado: ["lila", "mauve"],
  pastel: [
    "pastel_mix",
    "lila",
    "mint",
    "nude_rosa",
    "blush",
    "sky_blue",
    "periwinkle",
  ],
  neon: ["neon_pink", "neon_orange"],
  fluorescente: ["neon_pink", "neon_orange"],

  // acabados/estética para excluir
  brillo: [
    "metal_gold",
    "metal_silver",
    "white_pearl",
    "holographic",
    "rose_gold",
  ],
  glitter: ["metal_gold", "metal_silver", "holographic"],
  shimmer: [
    "metal_gold",
    "metal_silver",
    "white_pearl",
    "holographic",
    "rose_gold",
  ],
  perla: ["white_pearl", "french", "holographic"],
  metalico: ["metal_gold", "metal_silver", "rose_gold", "gunmetal"],
  metal: ["metal_gold", "metal_silver", "rose_gold", "gunmetal"],

  // estilos
  geometrico: ["black", "white_pearl", "navy", "mauve", "gunmetal"],
  frances: ["french", "white_pearl", "nude_rosa"],
};

// ===================== Parser mejorado de prompt ======================
function parsePrompt(prompt) {
  const raw = String(prompt || "");
  const text = norm(raw);

  const tokens = splitTokens(raw);
  const wants = new Set();
  const excludes = new Set();
  const hexes = [];

  // #RRGGBB
  const hexFull = raw.match(/#([0-9a-fA-F]{6})/g) || [];
  hexFull.forEach((h) => hexes.push(h.toUpperCase()));
  // #RGB → expandir a #RRGGBB
  const hexShort = raw.match(/#([0-9a-fA-F]{3})(?![0-9a-fA-F])/g) || [];
  hexShort.forEach((h) => {
    const tri = h.replace("#", "");
    const exp =
      `#${tri[0]}${tri[0]}${tri[1]}${tri[1]}${tri[2]}${tri[2]}`.toUpperCase();
    hexes.push(exp);
  });

  // alias → canónico
  const expandAlias = (t) => {
    if (ALIAS[t]) return [t];
    for (const [canon, syns] of Object.entries(ALIAS)) {
      if (syns.includes(t)) return [canon];
    }
    return [t];
  };

  // Exclusiones por frases: “sin X”, “no X”, “evitar X”, “without X”
  const NEG_TRIGGERS = new Set(["sin", "no", "evitar", "without"]);
  const words = text.split(/\s+/g).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (NEG_TRIGGERS.has(w)) {
      const next = words[i + 1] || "";
      expandAlias(next).forEach((cand) => {
        if (COLOR_WORDS[cand])
          COLOR_WORDS[cand].forEach((k) => excludes.add(k));
        if (KEYMAP[cand]) KEYMAP[cand].forEach((k) => excludes.add(k));
        if (F_INDEX[cand]) excludes.add(cand);
      });
    }
  }

  // Emojis → keywords
  const EMOJI_MAP = {
    "🌸": "primavera",
    "☀️": "verano",
    "🍂": "otono",
    "❄️": "invierno",
    "✨": "glitter",
    "🔥": "impacto",
    "🏖️": "playa",
  };
  Object.entries(EMOJI_MAP).forEach(([emoji, kw]) => {
    if (raw.includes(emoji) && KEYMAP[kw])
      KEYMAP[kw].forEach((famKey) => wants.add(famKey));
  });

  // Tokens → alias → wants
  tokens.forEach((t) => {
    expandAlias(t).forEach((canon) => {
      if (KEYMAP[canon]) KEYMAP[canon].forEach((famKey) => wants.add(famKey));
      if (F_INDEX[canon]) wants.add(canon); // permitir pedir familias por nombre
    });
  });

  return { wants, excludes, hexes };
}

// ======================= Scoring y recomendador =======================
function scoreFamily(fam, ctx) {
  let score = 0;
  const { undertone, tone, hairType, wants } = ctx;
  if (wants && wants.has(fam.key)) score += 5;
  if (undertone && undertoneBias[undertone]?.has(fam.key)) score += 2;
  if (tone && toneBoost[tone]?.has(fam.key)) score += 2;
  if (hairType && hairBoost[hairType]?.has(fam.key)) score += 1.5;
  return score;
}

export function generatePromptRecommendations({
  prompt,
  undertone = null,
  tone = null,
  hairType = null,
  skinLab = null,
  hairLab = null,
  refineByContrast = true,
  maxFamilies = 10,
}) {
  try {
    const { wants, excludes, hexes } = parsePrompt(prompt || "");
    const ctx = { undertone, tone, hairType, wants };

    let pool = F.filter((fam) => !excludes.has(fam.key));
    if (!pool.length) pool = F; // nunca vacío

    let candidates = pool
      .map((fam) => ({ fam, score: scoreFamily(fam, ctx) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, maxFamilies))
      .map((x) => x.fam);

    if (!prompt || !prompt.trim()) {
      candidates = F.map((fam) => ({ fam, score: scoreFamily(fam, ctx) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, maxFamilies))
        .map((x) => x.fam);
    }

    const out = candidates.map((fam) => {
      let sw = Array.isArray(fam.swatches) ? fam.swatches : [];
      if (refineByContrast && sw.length && (skinLab || hairLab)) {
        const wSkin = skinLab ? 0.6 : 0;
        const wHair = hairLab ? 0.4 : 0;
        sw = [...sw].sort((c1, c2) => {
          const l1 = rgbToLab(hexToRgb(c1));
          const l2 = rgbToLab(hexToRgb(c2));
          const s1 =
            (wSkin ? dE(l1, skinLab) : 0) + (wHair ? dE(l1, hairLab) : 0);
          const s2 =
            (wSkin ? dE(l2, skinLab) : 0) + (wHair ? dE(l2, hairLab) : 0);
          return s2 - s1;
        });
      }
      return {
        name: fam.name,
        swatches: sw,
        why: buildWhy(fam, { undertone, tone, hairType, wants }),
      };
    });

    if (hexes.length) {
      out.unshift({
        name: "Personalizada (por tu prompt)",
        swatches: hexes.slice(0, 6),
        why: "Tonos incluidos explícitamente en el prompt.",
      });
    }

    return out;
  } catch (err) {
    console.error("[reco] generatePromptRecommendations error:", err);
    // fallback ultra simple para que la UI nunca se caiga
    return [
      {
        name: "Sugerencias básicas",
        swatches: ["#EBD2C2", "#C76E3E", "#E1559C", "#183A64"],
        why: "Fallback por error en el motor de prompt.",
      },
    ];
  }
}

// ============================ Helpers ============================
function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function dE(l1, l2) {
  if (!l1 || !l2) return 0;
  const dL = l1.L - l2.L,
    da = l1.a - l2.a,
    db = l1.b - l2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

function buildWhy(fam, { undertone, tone, hairType, wants }) {
  const bits = [];
  if (undertone) bits.push(`undertone ${undertone}`);
  if (tone) bits.push(`piel ${tone}`);
  if (hairType) bits.push(`cabello ${hairType}`);
  if (wants && wants.size) {
    const wanted = [...wants].slice(0, 3).map((k) => F_INDEX[k]?.name || k);
    bits.push(`preferencias del prompt: ${wanted.join(", ")}`);
  }
  const base = bits.length
    ? `Ajustado a ${bits.join(" • ")}.`
    : "Sugerencias generales basadas en tu estilo.";
  return base;
}

export { F, F_INDEX, KEYMAP, COLOR_WORDS, ALIAS };
