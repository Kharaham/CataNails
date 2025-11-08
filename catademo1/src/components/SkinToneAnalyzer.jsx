// src/components/SkinToneAnalyzerPro.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  averageRGBInROI,
  detectUndertone,
  detectSkinTone,
  detectHairType,
  palettesForToneUndertone,
  rgbToHsv,
  rgbToLab,
  rgbToHex,
} from "../utils/color";
import { generatePromptRecommendations } from "../utils/reco";
import { db } from "../firebase/firebaseServicios";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import "../styles/components/SkinToneAnalyzer.css";

const CANVAS_W = 720;
const CANVAS_H = 540;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ===== Helpers visuales y de color ===== */
function deltaE76(lab1, lab2) {
  const dL = (lab1?.L || 0) - (lab2?.L || 0);
  const da = (lab1?.a || 0) - (lab2?.a || 0);
  const db = (lab1?.b || 0) - (lab2?.b || 0);
  return Math.sqrt(dL * dL + da * da + db * db);
}
function hexToRGB(hex) {
  const h = hex.replace("#", "").trim();
  const m =
    h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
        ];
  return { r: m[0] || 0, g: m[1] || 0, b: m[2] || 0 };
}
function itaDegrees(lab) {
  if (!lab) return null;
  const rad = Math.atan2(lab.L - 50, lab.b || 1e-6);
  return rad * (180 / Math.PI);
}
function itaClass(ita) {
  if (ita == null) return "—";
  if (ita > 55) return "Muy clara";
  if (ita > 41) return "Clara";
  if (ita > 28) return "Intermedia";
  if (ita > 10) return "Bronceada";
  if (ita > -30) return "Morena";
  return "Muy oscura";
}
function isSkinRGB(r, g, b) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
  }
  h = 60 * (h < 0 ? h + 6 : h);
  const s = max === 0 ? 0 : d / max,
    v = max;
  const hsvOk = h >= 0 && h <= 50 && s >= 0.15 && s <= 0.68 && v > 0.35;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const yccOk = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y > 35;
  return hsvOk || yccOk;
}
function skinRatioInRect(ctx, rx, ry, rw, rh, step = 4) {
  const { data, width, height } = ctx.getImageData(rx, ry, rw, rh);
  let skin = 0,
    tot = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 210) continue;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      if (isSkinRGB(r, g, b)) skin++;
      tot++;
    }
  }
  return tot ? skin / tot : 0;
}
function varianceLInROI(ctx, rx, ry, rw, rh, step = 4) {
  const { data, width, height } = ctx.getImageData(rx, ry, rw, rh);
  const Ls = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 210) continue;
      const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
      Ls.push(rgbToLab(rgb).L);
    }
  }
  if (!Ls.length) return { varL: 0, meanL: 0 };
  const mean = Ls.reduce((a, b) => a + b, 0) / Ls.length;
  const v = Ls.reduce((a, b) => a + (b - mean) ** 2, 0) / Ls.length;
  return { varL: v, meanL: mean };
}
function drawROI(ctx, x, y, w, h, color = "rgba(255,255,255,0.95)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  const corner = 14;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + corner);
  ctx.lineTo(x, y);
  ctx.lineTo(x + corner, y);
  ctx.moveTo(x + w - corner, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + corner);
  ctx.moveTo(x, y + h - corner);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + corner, y + h);
  ctx.moveTo(x + w - corner, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - corner);
  ctx.stroke();
  ctx.restore();
}
function drawBlockedOverlay(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "600 16px Inter, system-ui, sans-serif";
  const lines = String(text).split("\n");
  const lineH = 22;
  let ty = y + h / 2 - ((lines.length - 1) * lineH) / 2;
  for (const ln of lines) {
    const tw = ctx.measureText(ln).width;
    ctx.fillText(ln, x + (w - tw) / 2, ty);
    ty += lineH;
  }
  ctx.restore();
}

/* ===== Componente ===== */
export default function SkinToneAnalyzerPro() {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const colARef = useRef(null);
  const colBRef = useRef(null);
  const colCRef = useRef(null);
  const [mobileTab, setMobileTab] = useState("a");

  const [imgURL, setImgURL] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);

  const [draw, setDraw] = useState({
    dx: 0,
    dy: 0,
    dw: CANVAS_W,
    dh: CANVAS_H,
  });
  const [mode, setMode] = useState("hand"); // "hand" | "hair"
  const [blocked, setBlocked] = useState(false);

  // Piel
  const [skinROI, setSkinROI] = useState({ x: 0.35, y: 0.4, w: 0.3, h: 0.3 });
  const [skinSize, setSkinSize] = useState(30);
  const [skinRGB, setSkinRGB] = useState(null);
  const [skinHex, setSkinHex] = useState("#CCCCCC");
  const [skinLabState, setSkinLabState] = useState(null);
  const [undertone, setUndertone] = useState(null);
  const [tone, setTone] = useState(null);

  // Cabello
  const [hairROI, setHairROI] = useState({ x: 0.35, y: 0.12, w: 0.3, h: 0.2 });
  const [hairSize, setHairSize] = useState(24);
  const [hairRGB, setHairRGB] = useState(null);
  const [hairHex, setHairHex] = useState("#333333");
  const [hairType, setHairType] = useState(null);
  const [hairLabState, setHairLabState] = useState(null);

  // Métricas
  const [quality, setQuality] = useState({ skinRatio: 0, varL: 0, score: 0 });
  const [ita, setIta] = useState(null);
  const itaLabel = useMemo(() => itaClass(ita), [ita]);

  // WB (solo indicador visual; no se aplica corrección para mantener simple y estable)
  const [wbEnabled, setWbEnabled] = useState(true);

  // Recos
  const [autoPalettes, setAutoPalettes] = useState([]);
  const [promptText, setPromptText] = useState("");
  const [promptRecs, setPromptRecs] = useState([]);
  const [refineByContrast, setRefineByContrast] = useState(true);
  const [autoGen, setAutoGen] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalKind, setModalKind] = useState("auto");

  // Historial mínimo
  const [history, setHistory] = useState([]);

  /* ===== Renderizado + cálculo ===== */
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const iw = img.naturalWidth,
      ih = img.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.min(CANVAS_W / iw, CANVAS_H / ih);
    const dw = Math.floor(iw * scale),
      dh = Math.floor(ih * scale);
    const dx = Math.floor((CANVAS_W - dw) / 2),
      dy = Math.floor((CANVAS_H - dh) / 2);
    setDraw({ dx, dy, dw, dh });

    ctx.drawImage(img, dx, dy, dw, dh);

    if (mode === "hand") {
      const globalSkin = skinRatioInRect(ctx, dx, dy, dw, dh, 6);
      if (globalSkin < 0.03) {
        setBlocked(true);
        setAutoPalettes([]);
        drawBlockedOverlay(
          ctx,
          dx,
          dy,
          dw,
          dh,
          "No parece haber piel suficiente.\nSube otra foto o usa Modo Cabello."
        );
        setSkinRGB(null);
        setSkinHex("#CCCCCC");
        setSkinLabState(null);
        setUndertone(null);
        setTone(null);
        setIta(null);
        setQuality({ skinRatio: 0, varL: 0, score: 0 });
        return;
      } else setBlocked(false);

      // ROI piel
      const srx = dx + skinROI.x * dw,
        sry = dy + skinROI.y * dh;
      const srw = skinROI.w * dw,
        srh = skinROI.h * dh;

      const avgSkin = averageRGBInROI(ctx, srx, sry, srw, srh);
      setSkinRGB(avgSkin);
      const hex = rgbToHex(avgSkin);
      setSkinHex(hex);
      const lab = rgbToLab(avgSkin);
      setSkinLabState(lab);
      const hsv = rgbToHsv(avgSkin);
      const u = detectUndertone(lab, hsv);
      setUndertone(u);
      const t = detectSkinTone(lab);
      setTone(t);
      setAutoPalettes(palettesForToneUndertone(u, t));

      const roiSkin = skinRatioInRect(ctx, srx, sry, srw, srh, 4);
      const { varL } = varianceLInROI(ctx, srx, sry, srw, srh, 4);
      const score = Math.round(
        clamp(
          (roiSkin * 0.75 + (1 - clamp(varL / 150, 0, 1)) * 0.25) * 100,
          0,
          100
        )
      );
      setQuality({ skinRatio: roiSkin, varL, score });

      setIta(itaDegrees(lab));
      drawROI(ctx, srx, sry, srw, srh, "rgba(255,255,255,0.95)");

      // limpiar cabello
      setHairRGB(null);
      setHairHex("#333333");
      setHairType(null);
      setHairLabState(null);
    } else {
      const hrx = dx + hairROI.x * dw,
        hry = dy + hairROI.y * dh;
      const hrw = hairROI.w * dw,
        hrh = hairROI.h * dh;

      const avgHair = averageRGBInROI(ctx, hrx, hry, hrw, hrh, 0.98);
      setHairRGB(avgHair);
      const hex = rgbToHex(avgHair);
      setHairHex(hex);
      const hairLab = rgbToLab(avgHair);
      setHairLabState(hairLab);
      setHairType(detectHairType(hairLab));
      drawROI(ctx, hrx, hry, hrw, hrh, "rgba(124,92,255,0.95)");

      // limpiar piel
      setSkinRGB(null);
      setSkinHex("#CCCCCC");
      setSkinLabState(null);
      setUndertone(null);
      setTone(null);
      setIta(null);
      setQuality({ skinRatio: 0, varL: 0, score: 0 });
      setAutoPalettes([]);
    }
  }, [imgLoaded, mode, skinROI, hairROI]);

  // Sliders
  useEffect(() => {
    if (mode !== "hand") return;
    const s = clamp(Number(skinSize), 15, 50) / 100;
    setSkinROI((r) => {
      const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2;
      const w = s,
        h = s;
      return {
        x: clamp(cx - w / 2, 0, 1 - w),
        y: clamp(cy - h / 2, 0, 1 - h),
        w,
        h,
      };
    });
  }, [skinSize, mode]);

  useEffect(() => {
    if (mode !== "hair") return;
    const s = clamp(Number(hairSize), 10, 50) / 100;
    setHairROI((r) => {
      const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2;
      const w = s,
        h = s * 0.66;
      return {
        x: clamp(cx - w / 2, 0, 1 - w),
        y: clamp(cy - h / 2, 0, 1 - h),
        w,
        h,
      };
    });
  }, [hairSize, mode]);

  /* ===== Handlers ===== */
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgLoaded(false);
    setImgURL(url);
  }
  function onDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const f = ev.dataTransfer.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgLoaded(false);
    setImgURL(url);
  }
  function onDragOver(ev) {
    ev.preventDefault();
  }
  function onDragLeave(ev) {
    ev.preventDefault();
  }

  // Drag & pinch
  const [drag, setDrag] = useState({
    active: false,
    which: null,
    ox: 0,
    oy: 0,
    id: null,
  });
  const pointers = useRef(new Map());
  const pinch = useRef({
    active: false,
    startDist: 0,
    startCenter: { nx: 0, ny: 0 },
    startROI: null,
  });

  function normFromEvent(ev) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const sx = CANVAS_W / rect.width,
      sy = CANVAS_H / rect.height;
    const px = (ev.clientX - rect.left) * sx,
      py = (ev.clientY - rect.top) * sy;
    const { dx, dy, dw, dh } = draw;
    const ix = px - dx,
      iy = py - dy;
    const inside = ix >= 0 && ix <= dw && iy >= 0 && iy <= dh;
    const nx = clamp(ix / dw, 0, 1),
      ny = clamp(iy / dh, 0, 1);
    return { nx, ny, inside };
  }
  function dist2(a, b) {
    const dx = a.nx - b.nx,
      dy = a.ny - b.ny;
    return Math.hypot(dx, dy);
  }

  function startDrag(ev) {
    if (!imgLoaded || blocked) return;
    ev.preventDefault();
    const pos = normFromEvent(ev);
    if (!pos.inside) return;
    pointers.current.set(ev.pointerId, pos);

    if (pointers.current.size === 2) {
      const which = mode === "hair" ? "hair" : "skin";
      const r = which === "hair" ? hairROI : skinROI;
      const [p1, p2] = Array.from(pointers.current.values());
      pinch.current = {
        active: true,
        startDist: dist2(p1, p2),
        startCenter: { nx: (p1.nx + p2.nx) / 2, ny: (p1.ny + p2.ny) / 2 },
        startROI: { ...r },
      };
      setDrag({ active: false, which: null, ox: 0, oy: 0, id: ev.pointerId });
      ev.currentTarget.setPointerCapture?.(ev.pointerId);
      return;
    }

    const which = mode === "hair" ? "hair" : "skin";
    const r = which === "hair" ? hairROI : skinROI;
    setDrag({
      active: true,
      which,
      ox: r.w / 2,
      oy: r.h / 2,
      id: ev.pointerId,
    });
    ev.currentTarget.setPointerCapture?.(ev.pointerId);

    const x = clamp(pos.nx - r.w / 2, 0, 1 - r.w);
    const y = clamp(pos.ny - r.h / 2, 0, 1 - r.h);
    if (which === "skin") setSkinROI((_) => ({ ..._, x, y }));
    else setHairROI((_) => ({ ..._, x, y }));
  }

  function moveDrag(ev) {
    const pos = normFromEvent(ev);
    if (pointers.current.has(ev.pointerId))
      pointers.current.set(ev.pointerId, pos);

    if (pinch.current.active && pointers.current.size >= 2) {
      const which = mode === "hair" ? "hair" : "skin";
      const aspect = which === "hair" ? 0.66 : 1.0;
      const [p1, p2] = Array.from(pointers.current.values());
      const d = Math.max(0.02, dist2(p1, p2));
      const scale = clamp(d / pinch.current.startDist, 0.5, 2.0);
      const start = pinch.current.startROI;
      let w = clamp(start.w * scale, 0.1, 0.5);
      let h = which === "hair" ? w * aspect : w;
      const cx = pinch.current.startCenter.nx,
        cy = pinch.current.startCenter.ny;
      let x = clamp(cx - w / 2, 0, 1 - w),
        y = clamp(cy - h / 2, 0, 1 - h);
      if (which === "skin") setSkinROI((r) => ({ ...r, x, y, w, h }));
      else setHairROI((r) => ({ ...r, x, y, w, h }));
      return;
    }

    if (!drag.active) return;
    if (drag.which === "skin") {
      const { w, h } = skinROI;
      const x = clamp(pos.nx - drag.ox, 0, 1 - w);
      const y = clamp(pos.ny - drag.oy, 0, 1 - h);
      setSkinROI((r) => ({ ...r, x, y }));
    } else if (drag.which === "hair") {
      const { w, h } = hairROI;
      const x = clamp(pos.nx - drag.ox, 0, 1 - w);
      const y = clamp(pos.ny - drag.oy, 0, 1 - h);
      setHairROI((r) => ({ ...r, x, y }));
    }
  }
  function endDrag(ev) {
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size < 2 && pinch.current.active)
      pinch.current.active = false;
    if (drag.id != null) ev.currentTarget.releasePointerCapture?.(drag.id);
    setDrag({ active: false, which: null, ox: 0, oy: 0, id: null });
  }

  // Click = eyedropper (reubica ROI)
  function onCanvasClick(e) {
    if (blocked || !imgLoaded || mode !== "hand") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = CANVAS_W / rect.width,
      sy = CANVAS_H / rect.height;
    const px = (e.clientX - rect.left) * sx,
      py = (e.clientY - rect.top) * sy;
    const { dx, dy, dw, dh } = draw;
    const nx = clamp((px - dx) / dw, 0, 1),
      ny = clamp((py - dy) / dh, 0, 1);
    const w = skinROI.w,
      h = skinROI.h;
    setSkinROI((r) => ({
      ...r,
      x: clamp(nx - w / 2, 0, 1 - w),
      y: clamp(ny - h / 2, 0, 1 - h),
    }));
  }

  /* ===== Guardar + historial ===== */
  async function saveResult() {
    try {
      const payload = {
        createdAt: serverTimestamp(),
        mode,
        wbEnabled,
        skinHex,
        skinRGB,
        skinLab: skinLabState,
        undertone,
        tone,
        ita,
        itaClass: itaLabel,
        quality,
      };
      if (mode === "hair") {
        payload.hairHex = hairHex;
        payload.hairRGB = hairRGB;
        payload.hairType = hairType;
      }
      await addDoc(collection(db, "skinToneAnalyses"), payload);
      setHistory((h) =>
        [
          {
            t: Date.now(),
            skinHex,
            undertone,
            tone,
            ita,
            itaLabel,
            score: quality?.score || 0,
            wbEnabled,
          },
          ...h,
        ].slice(0, 8)
      );
    } catch (e) {
      console.error(e);
    }
  }

  /* ===== Prompt + contraste ΔE ===== */
  function runPrompt() {
    try {
      const recs =
        generatePromptRecommendations({
          prompt: promptText,
          undertone: undertone || null,
          tone: tone || null,
          hairType: hairType || null,
          skinLab: refineByContrast ? skinLabState : null,
          hairLab: refineByContrast ? hairLabState : null,
          refineByContrast,
          maxFamilies: 12,
        }) || [];

      const withDE = !skinLabState
        ? recs
        : recs.map((block) => {
            const annotated = (block?.swatches || [])
              .map((hex) => {
                const lab = rgbToLab(hexToRGB(hex));
                const DE = deltaE76(skinLabState, lab);
                return { hex, DE };
              })
              .sort((a, b) => b.DE - a.DE);
            const tags = [];
            if (annotated[0]?.DE >= 35) tags.push("Alto contraste");
            if (annotated[annotated.length - 1]?.DE <= 12)
              tags.push("Armónica");
            return {
              ...block,
              swatches: annotated.map((o) => o.hex),
              _contrast: {
                max: annotated[0]?.DE ?? null,
                min: annotated.at(-1)?.DE ?? null,
                tags,
              },
            };
          });

      setPromptRecs(withDE);
    } catch {
      setPromptRecs([
        {
          name: "Sugerencias básicas",
          swatches: ["#EBD2C2", "#C76E3E", "#E1559C", "#183A64"],
          why: "Fallback por error.",
        },
      ]);
    }
  }
  useEffect(() => {
    if (!autoGen) return;
    const id = setTimeout(() => runPrompt(), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText, refineByContrast, undertone, tone, hairType, skinLabState]);

  const showPromptQuick =
    promptText.trim().length > 0 && (promptRecs?.length || 0) > 0;
  const quickPrompt = (promptRecs || []).slice(0, 4);
  const showAutoQuick =
    !showPromptQuick &&
    mode === "hand" &&
    !blocked &&
    (autoPalettes?.length || 0) > 0;
  const quickAuto = (autoPalettes || []).slice(0, 3);

  const scrollTo = (ref) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="Rec_root">
      {/* Tabs móvil */}
      <div className="Rec_mobile-tabs">
        <button
          className={`Rec_tab ${mobileTab === "a" ? "Rec_active" : ""}`}
          onClick={() => {
            setMobileTab("a");
            scrollTo(colARef);
          }}
        >
          Analizar
        </button>
        <button
          className={`Rec_tab ${mobileTab === "b" ? "Rec_active" : ""}`}
          onClick={() => {
            setMobileTab("b");
            scrollTo(colBRef);
          }}
        >
          Resultado
        </button>
        <button
          className={`Rec_tab ${mobileTab === "c" ? "Rec_active" : ""}`}
          onClick={() => {
            setMobileTab("c");
            scrollTo(colCRef);
          }}
        >
          Asistente
        </button>
      </div>

      <div className="Rec_app-grid Rec_grid-3xl">
        {/* Col A: Canvas */}
        <section
          ref={colARef}
          className={`Rec_col Rec_card Rec_card-tight Rec_sticky-col Rec_mobile-pane ${
            mobileTab === "a" ? "Rec_is-active" : ""
          }`}
        >
          <div
            className="Rec_row"
            style={{ justifyContent: "space-between", gap: 8 }}
          >
            <div className="Rec_row" style={{ gap: 8 }}>
              <button
                className={`Rec_btn ${mode === "hand" ? "" : "Rec_btn-ghost"}`}
                onClick={() => setMode("hand")}
              >
                Modo Mano/Piel
              </button>
              <button
                className={`Rec_btn ${mode === "hair" ? "" : "Rec_btn-ghost"}`}
                onClick={() => setMode("hair")}
              >
                Modo Cabello
              </button>
            </div>
            <div className="Rec_row" style={{ gap: 8 }}>
              <label className="Rec_kv Rec_row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={wbEnabled}
                  onChange={(e) => setWbEnabled(e.target.checked)}
                />
                Balance de blancos
              </label>
              <button
                className="Rec_btn Rec_btn-ghost"
                onClick={() => {
                  setSkinROI({ x: 0.35, y: 0.4, w: 0.3, h: 0.3 });
                  setHairROI({ x: 0.35, y: 0.12, w: 0.3, h: 0.2 });
                }}
              >
                Reset ROI
              </button>
            </div>
          </div>

          {!imgURL ? (
            <label
              className="Rec_dropzone Rec_hvh"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                className="Rec_hidden-input"
                type="file"
                accept="image/*"
                onChange={onFileChange}
              />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0l-3.5 3.5M12 4l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M20 16.5v2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              <div>
                <div>
                  <b>Sube una foto</b> o arrástrala aquí
                </div>
                <div className="Rec_muted">
                  {mode === "hand"
                    ? "Toca en una zona de piel para mover el recuadro. Usa el slider para ajustar el tamaño."
                    : "Coloca el recuadro violeta sobre el cabello."}
                </div>
              </div>
            </label>
          ) : (
            <div
              className="Rec_canvas-wrap Rec_hvh"
              style={{ position: "relative" }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="Rec_canvas"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerLeave={endDrag}
                onClick={onCanvasClick}
              />
              <img
                ref={imgRef}
                src={imgURL}
                alt="preview"
                style={{ display: "none" }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(false)}
                draggable={false}
              />
              {mode === "hand" && !blocked && (
                <ResizeHandles
                  roi={skinROI}
                  draw={draw}
                  onResize={(roi) => setSkinROI(roi)}
                  aspect={1.0}
                />
              )}
              {mode === "hair" && (
                <ResizeHandles
                  roi={hairROI}
                  draw={draw}
                  onResize={(roi) => setHairROI(roi)}
                  aspect={0.66}
                />
              )}

              <div className="Rec_floating-actions">
                <label className="Rec_btn Rec_btn-ghost">
                  Cambiar foto
                  <input
                    className="Rec_hidden-input"
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                </label>
                <button
                  className="Rec_btn Rec_btn-ghost"
                  onClick={() => {
                    setImgURL("");
                    setImgLoaded(false);
                  }}
                >
                  Quitar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Col B: Resultado */}
        <section
          ref={colBRef}
          className={`Rec_col Rec_card Rec_sticky-col Rec_mobile-pane ${
            mobileTab === "b" ? "Rec_is-active" : ""
          }`}
        >
          <div className="Rec_card Rec_section">
            {mode === "hand" ? (
              <div className="Rec_row">
                <div
                  className="Rec_swatch"
                  style={{ background: skinHex, opacity: blocked ? 0.4 : 1 }}
                />
                <div>
                  <div className="Rec_kv">
                    <b>Piel:</b> {blocked ? "—" : skinHex}
                  </div>
                  <div className="Rec_row" style={{ gap: 8, marginTop: 6 }}>
                    {!blocked && undertone && (
                      <span
                        className={`Rec_chip ${
                          undertone === "calido" ? "Rec_ok" : ""
                        } ${undertone === "frio" ? "Rec_warn" : ""}`}
                      >
                        Undertone: {undertone.toUpperCase()}
                      </span>
                    )}
                    {!blocked && tone && (
                      <span className="Rec_chip">
                        Tono: {tone.toUpperCase()}
                      </span>
                    )}
                    {!blocked && ita != null && (
                      <span className="Rec_chip">
                        ITA: {ita.toFixed(1)}° ({itaLabel})
                      </span>
                    )}
                  </div>

                  {/* Stats: Calidad + WB */}
                  <div className="Rec_stats" style={{ marginTop: 8 }}>
                    {!blocked && (
                      <div className="Rec_stat">
                        Calidad
                        <div className="Rec_meter">
                          <div
                            className="Rec_meter-bar"
                            style={{ "--v": (quality?.score || 0) + "%" }}
                          />
                        </div>
                      </div>
                    )}
                    <span
                      className={`Rec_badge ${
                        wbEnabled ? "Rec_badge--ok" : "Rec_badge--warn"
                      }`}
                    >
                      WB: {wbEnabled ? "ON" : "OFF"}
                    </span>
                  </div>

                  <div className="Rec_help" style={{ marginTop: 6 }}>
                    {blocked
                      ? "Análisis bloqueado: no se detectó piel suficiente."
                      : "Tip: usa zonas homogéneas, evita sombras o brillos fuertes."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="Rec_row">
                <div className="Rec_swatch" style={{ background: hairHex }} />
                <div>
                  <div className="Rec_kv">
                    <b>Cabello:</b> {hairHex}
                  </div>
                  {hairType && (
                    <div style={{ marginTop: 6 }}>
                      <span className="Rec_chip">
                        Tipo: {hairType.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="Rec_help" style={{ marginTop: 6 }}>
                    Ajusta el ROI violeta para cubrir el cabello.
                  </div>
                </div>
              </div>
            )}
          </div>

          {mode === "hand" && !blocked && (
            <div className="Rec_card Rec_section">
              <div className="Rec_kv">
                <b>Tamaño ROI piel</b>
              </div>
              <input
                className="Rec_range Rec_full"
                type="range"
                min="15"
                max="50"
                step="1"
                value={skinSize}
                onChange={(e) => setSkinSize(e.target.value)}
              />
              <div
                className="Rec_row Rec_wrap"
                style={{ gap: 8, marginTop: 8 }}
              >
                <span className="Rec_muted">
                  Piel en ROI: {(quality.skinRatio * 100).toFixed(1)}%
                </span>
                <span className="Rec_muted">
                  Var(L*): {quality.varL.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {mode === "hair" && (
            <div className="Rec_card Rec_section">
              <div className="Rec_kv">
                <b>Tamaño ROI cabello</b>
              </div>
              <input
                className="Rec_range Rec_full"
                type="range"
                min="10"
                max="50"
                step="1"
                value={hairSize}
                onChange={(e) => setHairSize(e.target.value)}
              />
              <span className="Rec_help">
                Arrastra el recuadro violeta hasta el cabello.
              </span>
            </div>
          )}

          <div className="Rec_card Rec_row Rec_between">
            <div className="Rec_footer-note">
              * Orientativo (cosmético), no diagnóstico.
            </div>
            <button
              className="Rec_btn"
              onClick={saveResult}
              disabled={mode === "hand" ? blocked : false}
            >
              Guardar
            </button>
          </div>

          {!!history.length && (
            <div className="Rec_card Rec_section">
              <h3 className="Rec_h3">Historial reciente</h3>
              <div
                className="Rec_palettes Rec_auto-fit"
                style={{ marginTop: 10 }}
              >
                {history.map((h) => (
                  <div key={h.t} className="Rec_palette-card">
                    <div className="Rec_palette-head">
                      <strong>{new Date(h.t).toLocaleString()}</strong>
                    </div>
                    <div className="Rec_swatches" style={{ marginTop: 8 }}>
                      <div className="Rec_row" style={{ gap: 8 }}>
                        <div
                          className="Rec_sw"
                          style={{ background: h.skinHex }}
                        />
                        <code className="Rec_muted">{h.skinHex}</code>
                      </div>
                    </div>
                    <div className="Rec_kv" style={{ marginTop: 6 }}>
                      {h.ita != null
                        ? `ITA ${h.ita.toFixed(1)}° (${h.itaLabel}) • `
                        : ""}
                      Score {h.score}/100 • {h.wbEnabled ? "WB ON" : "WB OFF"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Col C: Asistente */}
        <section
          ref={colCRef}
          className={`Rec_col Rec_card Rec_sticky-col Rec_mobile-pane ${
            mobileTab === "c" ? "Rec_is-active" : ""
          }`}
        >
          <div className="Rec_card Rec_section">
            <h3 className="Rec_h3">Asistente de recomendaciones</h3>
            <div
              className="Rec_row Rec_wrap"
              style={{ gap: 8, marginBottom: 8 }}
            >
              {[
                "oficina minimal",
                "elegante noche",
                "verano playa",
                "otoño terracota",
                "fiesta con glitter",
                "novia natural",
                "impacto sin rojo",
                "pastel primavera",
                "retro mostaza",
              ].map((t) => (
                <button
                  key={t}
                  className="Rec_btn Rec_btn-ghost"
                  onClick={() => setPromptText(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ej: 'evento elegante, sin rojo, metálico' o 'verano playa con aqua y coral'"
              className="Rec_textarea"
            />
            <div className="Rec_row Rec_between" style={{ marginTop: 10 }}>
              <label className="Rec_kv Rec_row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={refineByContrast}
                  onChange={(e) => setRefineByContrast(e.target.checked)}
                />
                Afinar con mi piel/cabello
              </label>
              <div className="Rec_row" style={{ gap: 8 }}>
                <label className="Rec_kv Rec_row" style={{ gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={autoGen}
                    onChange={(e) => setAutoGen(e.target.checked)}
                  />
                  Autogenerar
                </label>
                <button className="Rec_btn" onClick={runPrompt}>
                  Generar
                </button>
              </div>
            </div>
          </div>

          {(showPromptQuick || showAutoQuick) && (
            <div className="Rec_card Rec_section">
              <div className="Rec_row Rec_between">
                <h3 className="Rec_h3" style={{ margin: 0 }}>
                  {showPromptQuick
                    ? "Sugerencias por tu prompt (4)"
                    : "Recomendaciones para tu piel (3)"}
                </h3>
                <button
                  className="Rec_btn Rec_btn-ghost"
                  onClick={() => {
                    setModalKind(showPromptQuick ? "prompt" : "auto");
                    setShowModal(true);
                  }}
                >
                  Ver lista completa
                </button>
              </div>

              <div
                className="Rec_palettes Rec_auto-fit"
                style={{ marginTop: 10 }}
              >
                {(showPromptQuick ? quickPrompt : quickAuto).map((p, idx) => (
                  <div
                    key={`${p?.name ?? "quick"}-${idx}`}
                    className="Rec_palette-card"
                  >
                    <div className="Rec_palette-head">
                      <strong>{p?.name ?? "Sugerencia"}</strong>
                      {p?._contrast?.tags?.length
                        ? p._contrast.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`Rec_tag ${
                                tag === "Alto contraste"
                                  ? "Rec_tag-contrast"
                                  : "Rec_tag-harmony"
                              }`}
                            >
                              {tag}
                            </span>
                          ))
                        : null}
                    </div>
                    {p?.why && (
                      <div className="Rec_kv" style={{ marginTop: 4 }}>
                        {p.why}
                      </div>
                    )}
                    <div className="Rec_swatches" style={{ marginTop: 8 }}>
                      {(p?.swatches || []).slice(0, 3).map((c) => (
                        <div key={c} className="Rec_row" style={{ gap: 8 }}>
                          <div
                            className="Rec_sw"
                            style={{ background: c || "#999" }}
                          />
                          <code className="Rec_muted">{c || "#999999"}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="Rec_modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="Rec_card Rec_modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Rec_row Rec_between" style={{ marginBottom: 8 }}>
              <h3 className="Rec_h3" style={{ margin: 0 }}>
                {modalKind === "prompt"
                  ? "Todas las sugerencias por tu prompt"
                  : modalKind === "mix"
                  ? "Sugerencias mixtas"
                  : "Todas las recomendaciones automáticas"}
              </h3>
              <button
                className="Rec_btn Rec_btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="Rec_palettes Rec_auto-fit">
              {(modalKind === "prompt"
                ? promptRecs || []
                : autoPalettes || []
              ).map((p, idx) => (
                <div
                  key={`${p?.name ?? "rec"}-${idx}`}
                  className="Rec_palette-card"
                >
                  <div className="Rec_palette-head">
                    <strong>{p?.name ?? "Sugerencia"}</strong>
                    {p?._contrast?.tags?.length
                      ? p._contrast.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`Rec_tag ${
                              tag === "Alto contraste"
                                ? "Rec_tag-contrast"
                                : "Rec_tag-harmony"
                            }`}
                          >
                            {tag}
                          </span>
                        ))
                      : null}
                  </div>
                  {p?.why && (
                    <div className="Rec_kv" style={{ marginTop: 4 }}>
                      {p.why}
                    </div>
                  )}
                  <div className="Rec_swatches" style={{ marginTop: 8 }}>
                    {(p?.swatches || []).map((c) => (
                      <div key={c} className="Rec_row" style={{ gap: 8 }}>
                        <div
                          className="Rec_sw"
                          style={{ background: c || "#999" }}
                        />
                        <code className="Rec_muted">{c || "#999999"}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!(modalKind === "prompt" ? promptRecs : autoPalettes)
                ?.length && (
                <div className="Rec_muted">No hay sugerencias por ahora.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Subcomponentes ===== */
function ResizeHandles({ roi, draw, onResize, aspect = 1 }) {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(false);

  function posStyle(nx, ny) {
    const { dx, dy, dw, dh } = draw;
    return {
      left: `${dx + nx * dw}px`,
      top: `${dy + ny * dh}px`,
      position: "absolute",
      pointerEvents: "auto",
    };
  }
  function start(e) {
    e.preventDefault();
    setActive(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }
  function move(e) {
    if (!active) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const sx = CANVAS_W / rect.width,
      sy = CANVAS_H / rect.height;
    const px = (e.clientX - rect.left) * sx,
      py = (e.clientY - rect.top) * sy;
    const { dx, dy, dw, dh } = draw;
    const nx = clamp((px - dx) / dw, 0, 1),
      ny = clamp((py - dy) / dh, 0, 1);
    const cx = roi.x + roi.w / 2,
      cy = roi.y + roi.h / 2;
    const dxn = Math.abs(nx - cx),
      dyn = Math.abs(ny - cy);
    const half = Math.max(dxn, dyn / (aspect || 1));
    let w = clamp(half * 2, 0.1, 0.5);
    let h = aspect === 1 ? w : w * aspect;
    let x = clamp(cx - w / 2, 0, 1 - w),
      y = clamp(cy - h / 2, 0, 1 - h);
    onResize({ ...roi, x, y, w, h });
  }
  function end() {
    setActive(false);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <span
        className="Rec_roi-handle"
        style={posStyle(roi.x, roi.y)}
        onPointerDown={start}
      />
      <span
        className="Rec_roi-handle"
        style={posStyle(roi.x + roi.w, roi.y)}
        onPointerDown={start}
      />
      <span
        className="Rec_roi-handle"
        style={posStyle(roi.x, roi.y + roi.h)}
        onPointerDown={start}
      />
      <span
        className="Rec_roi-handle"
        style={posStyle(roi.x + roi.w, roi.y + roi.h)}
        onPointerDown={start}
      />
    </div>
  );
}
