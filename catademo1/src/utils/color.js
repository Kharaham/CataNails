function srgbToLinear(u) {
  const c = u / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToXyz({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  return { X, Y, Z };
}

export function xyzToLab({ X, Y, Z }) {
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  function f(t) {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3)
      ? Math.cbrt(t)
      : t / (3 * delta * delta) + 4 / 29;
  }

  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function rgbToLab(rgb) {
  return xyzToLab(rgbToXyz(rgb));
}

export function rgbToHsv({ r, g, b }) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
  }
  h = Math.round(60 * (h < 0 ? h + 6 : h));
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (v) => v.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function deltaE76(l1, l2) {
  const dL = l1.L - l2.L;
  const da = l1.a - l2.a;
  const db = l1.b - l2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function averageRGBInROI(ctx, x, y, w, h, highlightCut = 0.92) {
  const fallback = { r: 200, g: 160, b: 140 };
  if (!ctx) return fallback;

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h))
    return fallback;

  let rx = Math.floor(x);
  let ry = Math.floor(y);
  let rw = Math.floor(w);
  let rh = Math.floor(h);

  if (rw < 1) rw = 1;
  if (rh < 1) rh = 1;

  if (rx < 0) rx = 0;
  if (ry < 0) ry = 0;
  if (rx + rw > cw) rw = cw - rx;
  if (ry + rh > ch) rh = ch - ry;
  if (rw < 1 || rh < 1) return fallback;

  let imageData;
  try {
    imageData = ctx.getImageData(rx, ry, rw, rh);
  } catch (e) {
    console.error("getImageData failed:", e);
    return fallback;
  }

  const { data } = imageData;
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];
    const A = data[i + 3];
    if (A < 250) continue;
    const V = Math.max(R, G, B) / 255;
    if (V > highlightCut) continue;
    r += R;
    g += G;
    b += B;
    n++;
  }
  if (n === 0) return fallback;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

export function detectUndertone(lab, hsv) {
  const { a, b } = lab;
  const { s } = hsv;

  if (s < 0.18) return "neutro";
  if (b > 12 && a > -5) return "calido";
  if (a > 9 && b < 10) return "frio";
  if (b - a > 8) return "calido";
  if (a - b > 6) return "frio";
  return "neutro";
}

export function detectSkinTone(lab) {
  const L = lab.L; // 0–100
  if (L >= 78) return "clara";
  if (L >= 62) return "media";
  if (L >= 46) return "morena";
  return "oscura";
}

export function detectHairType(hairLab) {
  const { L, b } = hairLab;
  if (L < 38) return "oscuro";
  if (L > 70 && b > 10) return "rubio";
  if (b > 18) return "cobrizo";
  return "medio";
}

export function palettesForToneUndertone(undertone, tone) {
  const map = {
    calido: {
      clara: [
        {
          name: "Durazno & Coral suave",
          swatches: ["#F7B199", "#F0977A", "#E57E5D"],
        },
        { name: "Nude cálido", swatches: ["#EBD2C2", "#DAB59D", "#C79B84"] },
        { name: "Dorado sutil", swatches: ["#E3C770", "#D4AF37", "#B58E2B"] },
      ],
      media: [
        { name: "Terracota", swatches: ["#C76E3E", "#B55A2E", "#9D4A25"] },
        { name: "Caramelo", swatches: ["#B88461", "#A36E4E", "#8C5B40"] },
        { name: "Rojo cálido", swatches: ["#E04E39", "#C7442F", "#A83828"] },
      ],
      morena: [
        { name: "Cobre/Bronce", swatches: ["#B86E3C", "#A65C2E", "#8C4B25"] },
        {
          name: "Naranja quemado",
          swatches: ["#D4632A", "#B5511F", "#943F17"],
        },
        { name: "Vino cálido", swatches: ["#7E2C1F", "#6A241A", "#571D15"] },
      ],
      oscura: [
        { name: "Coral vibrante", swatches: ["#FF6B3D", "#FF744A", "#E75A35"] },
        { name: "Oro intenso", swatches: ["#C8972F", "#A67C00", "#8C6A00"] },
        { name: "Oxblood", swatches: ["#5A1E1E", "#471717", "#371211"] },
      ],
    },
    frio: {
      clara: [
        { name: "Rosados fríos", swatches: ["#F6BED6", "#E3A4C1", "#C89ABF"] },
        { name: "Azules suaves", swatches: ["#9DB7E5", "#7FA0D6", "#5E86C6"] },
        { name: "Plateado claro", swatches: ["#D3D7E1", "#BFC6D6", "#A9B6CC"] },
      ],
      media: [
        {
          name: "Fucsia & Magenta",
          swatches: ["#E1559C", "#CF3C8A", "#B42C76"],
        },
        { name: "Ciruela", swatches: ["#6F3C78", "#5B3163", "#47274F"] },
        { name: "Berry", swatches: ["#912D5D", "#7A244D", "#631C3E"] },
      ],
      morena: [
        { name: "Vino", swatches: ["#6B2241", "#5A1C37", "#49162D"] },
        { name: "Zafiro", swatches: ["#2F4F9D", "#233E7E", "#1B315F"] },
        { name: "Rojo frío", swatches: ["#C2185B", "#A5144F", "#8C1044"] },
      ],
      oscura: [
        {
          name: "Violeta intenso",
          swatches: ["#7A28D1", "#651FB0", "#52198F"],
        },
        { name: "Navy", swatches: ["#183A64", "#122B4B", "#0D2139"] },
        { name: "Plateado hielo", swatches: ["#C0C7D1", "#AAB5C3", "#959FB5"] },
      ],
    },
    neutro: {
      clara: [
        { name: "Taupe & Beige", swatches: ["#BFAEA2", "#AFA193", "#9F9386"] },
        { name: "Rosa suave", swatches: ["#D5B7C8", "#C7A5B8", "#B891A7"] },
        { name: "Nude clásico", swatches: ["#E5D6C8", "#D8C2AF", "#CBAA93"] },
      ],
      media: [
        { name: "Mauve", swatches: ["#B289B5", "#A076A4", "#8C6291"] },
        { name: "Caramelo", swatches: ["#B9856E", "#A36F59", "#8C5B47"] },
        { name: "Ladrillo", swatches: ["#B55D4C", "#9F4E3F", "#874132"] },
      ],
      morena: [
        { name: "Mocha", swatches: ["#7D5A4E", "#6A4B41", "#583E35"] },
        { name: "Rosewood", swatches: ["#8C505A", "#7A434D", "#68373F"] },
        { name: "Cobre nude", swatches: ["#A46E58", "#8F5B47", "#7A4A39"] },
      ],
      oscura: [
        { name: "Chocolate", swatches: ["#4D2A1A", "#3D2115", "#2E180F"] },
        { name: "Mauve profundo", swatches: ["#7A496D", "#663B5A", "#512E48"] },
        { name: "Borgoña", swatches: ["#5A1E2E", "#471826", "#35121C"] },
      ],
    },
  };

  const u = map[undertone] || map.neutro;
  return u[tone] || u.media;
}

export function refinePalettesByAppearance(palettes, skinLab, hairLab) {
  const weightSkin = 0.6;
  const weightHair = 0.4;
  return palettes.map((p) => {
    const sorted = [...p.swatches].sort((c1, c2) => {
      const l1 = rgbToLab(hexToRgb(c1));
      const l2 = rgbToLab(hexToRgb(c2));
      const s1 =
        weightSkin * deltaE76(l1, skinLab) + weightHair * deltaE76(l1, hairLab);
      const s2 =
        weightSkin * deltaE76(l2, skinLab) + weightHair * deltaE76(l2, hairLab);
      return s2 - s1;
    });
    return { ...p, swatches: sorted };
  });
}
