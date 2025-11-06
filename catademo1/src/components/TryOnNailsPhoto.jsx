// src/components/TryOnNailsPhoto.jsx
import React, { useEffect, useRef, useState } from "react";
import { fetchSAMMasks } from "../utils/samClient";
import "../styles/components/TryOnNailsPhoto.css";

// ---------- Firebase ----------
import { storage } from "../firebase/firebase"; // <-- cambia a ../firebase/firebaseServicios si corresponde
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ================= Helpers (globales) ================= */

function readEnv(key, fallback) {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env[key] != null
  ) {
    return process.env[key];
  }
  if (
    typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__[key] != null
  ) {
    return window.__ENV__[key];
  }
  return fallback;
}
const SAM_SERVER = readEnv("REACT_APP_SAM_URL", "http://127.0.0.1:8000");

/* ================= Helpers de dibujo ================= */
function bbox(poly) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
function polygonArea(poly) {
  // Área con fórmula de Shoelace (firma +/-, tomamos valor absoluto)
  if (!poly || poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}
function insetPolygon(poly, insetPx = 0) {
  if (!poly?.length || insetPx === 0) return poly;
  let cx = 0,
    cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map(([x, y]) => {
    const vx = x - cx,
      vy = y - cy;
    const len = Math.hypot(vx, vy) || 1;
    return [x - (vx / len) * insetPx, y - (vy / len) * insetPx];
  });
}
function pathFromSmoothPolygon(ctx, poly, roundness = 0.6, insetPx = 1.0) {
  if (!poly || poly.length < 3) return false;
  const P = insetPolygon(poly, insetPx);
  const n = P.length;

  if (roundness <= 0) {
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    return true;
  }

  const q = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[i],
      p1 = P[(i + 1) % n];
    q.push(
      [p0[0] + (p1[0] - p0[0]) * 0.25, p0[1] + (p1[1] - p0[1]) * 0.25],
      [p0[0] + (p1[0] - p0[0]) * 0.75, p0[1] + (p1[1] - p0[1]) * 0.75]
    );
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const blended = q.map((p, i) => mix(P[Math.floor(i / 2) % n], p, roundness));
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  ctx.beginPath();
  let p0 = blended[0],
    p1 = blended[1];
  let m = mid(p0, p1);
  ctx.moveTo(m[0], m[1]);
  for (let i = 1; i < blended.length; i++) {
    const c = blended[i];
    const next = blended[(i + 1) % blended.length];
    const m2 = mid(c, next);
    ctx.quadraticCurveTo(c[0], c[1], m2[0], m2[1]);
  }
  ctx.closePath();
  return true;
}
function filteredCanvasFromImage(img, { contrast = 1, saturate = 1 } = {}) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const tile = document.createElement("canvas");
  tile.width = iw;
  tile.height = ih;
  const t = tile.getContext("2d");
  t.filter = `contrast(${contrast}) saturate(${saturate})`;
  t.drawImage(img, 0, 0);
  t.filter = "none";
  return tile;
}
function makeFilteredPattern(ctx, img, filters) {
  const tile = filteredCanvasFromImage(img, filters);
  return ctx.createPattern(tile, "repeat");
}

/* =============== Componente =============== */
export default function TryOnNailsPhoto() {
  // flujo / estado
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("1) Sube una foto de tu mano 🖐️");

  // imagen base
  const [imgURL, setImgURL] = useState("");
  const [img, setImg] = useState(null);

  // máscaras
  const [nails, setNails] = useState([]); // [{id, polygon, enabled, score, area}]

  // estilo básico
  const [color, setColor] = useState("#c81e6e");
  const [opacity, setOpacity] = useState(1);
  const [blend, setBlend] = useState("soft-light");

  // forma
  const [shapeSmooth, setShapeSmooth] = useState(0.65);
  const [shapeInset, setShapeInset] = useState(1.2);

  // avanzado
  const [showMore, setShowMore] = useState(false);
  const [featherPx, setFeatherPx] = useState(1.1);
  const [glossPower, setGlossPower] = useState(0.35);
  const [glossSize, setGlossSize] = useState(0.55);

  // diseño (opcional)
  const [designURL, setDesignURL] = useState("");
  const [designImg, setDesignImg] = useState(null);
  const [designScale, setDesignScale] = useState(1);
  const [designRot, setDesignRot] = useState(0);
  const [designOffsetX, setDesignOffsetX] = useState(0);
  const [designOffsetY, setDesignOffsetY] = useState(0);
  const [designMode, setDesignMode] = useState("tile-per-nail");
  const [designStrength, setDesignStrength] = useState(1.6);
  const [designContrast, setDesignContrast] = useState(1.25);
  const [designSaturation, setDesignSaturation] = useState(1.25);
  const [undercoatAlpha, setUndercoatAlpha] = useState(0.1);

  // canvases
  const baseCanvasRef = useRef(null);
  const paintCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);
  const rafRef = useRef(0);

  /* --------- Carga imagen --------- */
  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgURL(URL.createObjectURL(f));
  };
  useEffect(() => {
    if (!imgURL) return;
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => setStatus("No se pudo cargar la imagen");
    im.src = imgURL;
  }, [imgURL]);

  /* --------- Carga diseño --------- */
  function onPickDesign(e) {
    const f = e.target.files?.[0];
    if (!f) {
      setDesignURL("");
      setDesignImg(null);
      queueRender();
      return;
    }
    setDesignURL(URL.createObjectURL(f));
  }
  useEffect(() => {
    if (!designURL) {
      setDesignImg(null);
      queueRender();
      return;
    }
    const im = new Image();
    im.onload = () => {
      setDesignImg(im);
      queueRender();
    };
    im.onerror = () => {
      setDesignURL("");
      setDesignImg(null);
      queueRender();
    };
    im.src = designURL;
  }, [designURL]);

  /* --------- Canvas base --------- */
  function fitToImage(im) {
    const maxW = 1100;
    const scale = im.width > maxW ? maxW / im.width : 1;
    const w = Math.round(im.width * scale);
    const h = Math.round(im.height * scale);
    [baseCanvasRef, paintCanvasRef, outCanvasRef].forEach((ref) => {
      if (ref.current) {
        ref.current.width = w;
        ref.current.height = h;
      }
    });
    return { w, h };
  }
  function drawBase(im) {
    const base = baseCanvasRef.current;
    const paint = paintCanvasRef.current;
    const out = outCanvasRef.current;
    if (!base || !paint || !out) return;
    const { w, h } = fitToImage(im);
    base.getContext("2d").drawImage(im, 0, 0, w, h);
    [paint, out].forEach((c) => c.getContext("2d").clearRect(0, 0, w, h));
    setStep(2);
    setStatus("2) Presiona Detectar uñas");
    queueRender();
  }
  useEffect(() => {
    if (img) drawBase(img);
  }, [img]);

  /* --------- Pintura / composición --------- */
  function fillPolygon(ctx, polygon, { w, h }) {
    const { x: bx, y: by, w: bw, h: bh } = bbox(polygon);
    const cx = bx + bw / 2,
      cy = by + bh / 2;

    ctx.save();
    if (pathFromSmoothPolygon(ctx, polygon, shapeSmooth, shapeInset)) {
      ctx.clip();

      if (designImg) {
        if (undercoatAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = undercoatAlpha;
          ctx.fillStyle = "#fff";
          ctx.fillRect(-w, -h, w * 3, h * 3);
          ctx.restore();
        }

        if (designMode === "tile-global") {
          let pat = makeFilteredPattern(ctx, designImg, {
            contrast: designContrast,
            saturate: designSaturation,
          });
          if (pat?.setTransform) {
            const m = new DOMMatrix();
            m.translateSelf(designOffsetX, designOffsetY);
            m.rotateSelf(designRot);
            m.scaleSelf(designScale, designScale);
            pat.setTransform(m);
          }
          ctx.fillStyle = pat || "#000";
          ctx.fillRect(-w, -h, w * 3, h * 3);
        } else if (designMode === "tile-per-nail") {
          let pat = makeFilteredPattern(ctx, designImg, {
            contrast: designContrast,
            saturate: designSaturation,
          });
          if (pat?.setTransform) {
            const m = new DOMMatrix();
            m.translateSelf(bx + designOffsetX, by + designOffsetY);
            m.rotateSelf(designRot);
            m.scaleSelf(designScale, designScale);
            pat.setTransform(m);
            ctx.fillStyle = pat;
            ctx.fillRect(bx, by, bw, bh);
          } else {
            const tile = filteredCanvasFromImage(designImg, {
              contrast: designContrast,
              saturate: designSaturation,
            });
            const tmp = document.createElement("canvas");
            tmp.width = Math.max(64, Math.ceil(bw));
            tmp.height = Math.max(64, Math.ceil(bh));
            const t = tmp.getContext("2d");
            t.save();
            t.translate(designOffsetX, designOffsetY);
            t.rotate((designRot * Math.PI) / 180);
            t.scale(designScale, designScale);
            for (let yy = -tmp.height; yy < tmp.height * 2; yy += tile.height) {
              for (let xx = -tmp.width; xx < tmp.width * 2; xx += tile.width) {
                t.drawImage(tile, xx, yy);
              }
            }
            t.restore();
            ctx.drawImage(tmp, bx, by);
          }
        } else {
          const tile = filteredCanvasFromImage(designImg, {
            contrast: designContrast,
            saturate: designSaturation,
          });
          const iw = tile.width,
            ih = tile.height;
          const sContain = Math.min(bw / iw, bh / ih) * (designScale || 1);
          const sCover = Math.max(bw / iw, bh / ih) * (designScale || 1);
          const s = designMode === "fit-cover" ? sCover : sContain;

          ctx.save();
          ctx.translate(cx + (designOffsetX || 0), cy + (designOffsetY || 0));
          ctx.rotate(((designRot || 0) * Math.PI) / 180);
          ctx.scale(s, s);
          ctx.drawImage(tile, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
      }
    }
    ctx.restore();
  }

  function applyFeather(dstCtx, polygon, w, h, feather) {
    if (feather <= 0) return;
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const m = mask.getContext("2d");
    if (pathFromSmoothPolygon(m, polygon, shapeSmooth, shapeInset)) {
      m.fillStyle = "#fff";
      m.fill();
    }
    m.globalCompositeOperation = "source-in";
    m.filter = `blur(${feather}px)`;
    m.drawImage(mask, 0, 0);
    m.filter = "none";
    dstCtx.save();
    dstCtx.globalCompositeOperation = "destination-in";
    dstCtx.drawImage(mask, 0, 0);
    dstCtx.globalCompositeOperation = "source-over";
    dstCtx.restore();
  }

  function paintGloss(ctx, polygon, w, h, power = 0.35, size = 0.55) {
    if (power <= 0) return;
    const { x, y, w: bw, h: bh } = bbox(polygon);
    const cx = x + bw / 2;
    const top = y + bh * (1 - size) * 0.5;
    const bot = y + bh - bh * (1 - size) * 0.5;
    const g = ctx.createLinearGradient(cx, top, cx, bot);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.35, `rgba(255,255,255,${power})`);
    g.addColorStop(0.65, `rgba(255,255,255,${power * 0.5})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    if (pathFromSmoothPolygon(ctx, polygon, shapeSmooth, shapeInset)) {
      ctx.clip();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = g;
      ctx.fillRect(x - 10, y - 10, bw + 20, bh + 20);
    }
    ctx.restore();
  }

  async function paintAll() {
    const base = baseCanvasRef.current;
    const paint = paintCanvasRef.current;
    if (!base || !paint) return;
    const w = base.width,
      h = base.height;

    const p = paint.getContext("2d");
    p.clearRect(0, 0, w, h);

    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const t = tmp.getContext("2d");

    for (const n of nails) {
      if (!n.enabled || !n.polygon?.length) continue;
      t.clearRect(0, 0, w, h);
      fillPolygon(t, n.polygon, { w, h });
      applyFeather(t, n.polygon, w, h, featherPx);
      paintGloss(t, n.polygon, w, h, glossPower, glossSize);
      p.drawImage(tmp, 0, 0);
    }
  }

  function compose() {
    const base = baseCanvasRef.current;
    const paint = paintCanvasRef.current;
    const out = outCanvasRef.current;
    if (!base || !paint || !out) return;
    const w = base.width,
      h = base.height;

    const o = out.getContext("2d");
    o.clearRect(0, 0, w, h);
    o.globalCompositeOperation = "source-over";
    o.globalAlpha = 1;
    o.drawImage(base, 0, 0);

    o.globalCompositeOperation = blend;
    const times = Math.max(1, Math.round(designStrength));
    for (let i = 0; i < times; i++) {
      const remaining = designStrength - i;
      const frac = Math.min(1, opacity * Math.min(1, remaining));
      o.globalAlpha = frac;
      o.drawImage(paint, 0, 0);
    }

    o.globalCompositeOperation = "source-over";
    o.globalAlpha = 1;
  }

  function queueRender() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(async () => {
      await paintAll();
      compose();
    });
  }

  /* --------- Detectar (SAM) --------- */
  async function onDetect() {
    try {
      if (!img) return;
      setStatus("Detectando uñas…");
      const base = baseCanvasRef.current;
      const blob = await new Promise((res) =>
        base.toBlob(res, "image/jpeg", 0.95)
      );
      const { masks } = await fetchSAMMasks({ serverURL: SAM_SERVER, blob });
      const det = (masks || []).map((m, i) => {
        const area = polygonArea(m.polygon || []);
        return {
          id: i + 1,
          polygon: m.polygon,
          score: m.score ?? 1,
          enabled: true,
          area,
        };
      });
      // ordenamos por X de bbox (izq → der) para que quede más natural
      det.sort((a, b) => bbox(a.polygon).x - bbox(b.polygon).x);
      setNails(det);
      setStep(3);
      setStatus(
        det.length ? "3) Elige color o diseño" : "No se detectaron uñas 😕"
      );
      queueRender();
    } catch (e) {
      console.error(e);
      setStatus("Error detectando/segmentando");
    }
  }

  /* --------- Comparar (mantener) --------- */
  function onCompareDown() {
    const out = outCanvasRef.current;
    if (!out) return;
    const base = baseCanvasRef.current;
    const ctx = out.getContext("2d");
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(base, 0, 0);
  }
  function onCompareUp() {
    queueRender();
  }

  /* --------- Reiniciar --------- */
  function resetAll() {
    setImgURL("");
    setImg(null);
    setNails([]);
    setColor("#c81e6e");
    setOpacity(1);
    setBlend("soft-light");
    setShapeSmooth(0.65);
    setShapeInset(1.2);
    setFeatherPx(1.1);
    setGlossPower(0.35);
    setGlossSize(0.55);
    setDesignURL("");
    setDesignImg(null);
    setDesignScale(1);
    setDesignRot(0);
    setDesignOffsetX(0);
    setDesignOffsetY(0);
    setDesignMode("tile-per-nail");
    setDesignStrength(1.6);
    setDesignContrast(1.25);
    setDesignSaturation(1.25);
    setUndercoatAlpha(0.1);
    setStep(1);
    setStatus("1) Sube una foto de tu mano 🖐️");
    [baseCanvasRef, paintCanvasRef, outCanvasRef].forEach((ref) => {
      const c = ref.current;
      if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
    });
  }

  /* --------- Subir a Firebase Storage --------- */
  async function uploadToFirebase() {
    try {
      const out = outCanvasRef.current;
      if (!out) return setStatus("No hay imagen para subir");
      await paintAll();
      compose();

      const blob = await new Promise((res) =>
        out.toBlob(res, "image/png", 0.95)
      );
      if (!blob) return setStatus("No se pudo generar PNG");

      const ts = Date.now();
      const filename = `tryon/${ts}.png`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob, { contentType: "image/png" });
      const url = await getDownloadURL(storageRef);

      setStatus(`Subida OK ✓  URL copiada en consola`);
      console.log("Firebase URL:", url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
      return url;
    } catch (err) {
      console.error(err);
      setStatus("Error subiendo a Firebase");
    }
  }

  /* --------- Repintar al cambiar controles --------- */
  useEffect(() => {
    if (step >= 3) queueRender();
  }, [
    color,
    opacity,
    blend,
    shapeSmooth,
    shapeInset,
    featherPx,
    glossPower,
    glossSize,
    designImg,
    designScale,
    designRot,
    designOffsetX,
    designOffsetY,
    designMode,
    designStrength,
    designContrast,
    designSaturation,
    undercoatAlpha,
    nails,
    step,
  ]);

  /* --------- Handlers lista uñas --------- */
  const enabledCount = nails.filter((n) => n.enabled).length;
  function setAll(val) {
    setNails((prev) => prev.map((n) => ({ ...n, enabled: !!val })));
  }
  function invertAll() {
    setNails((prev) => prev.map((n) => ({ ...n, enabled: !n.enabled })));
  }
  function toggleOne(id) {
    setNails((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  }

  /* ===================== UI ===================== */
  return (
    <div className="RecU_root" aria-live="polite">
      <div className="RecU_container">
        <div className="RecU_header">
          <div className="RecU_brand">
            <div className="RecU_badge">Try-On Uñas</div>
            <div className="RecU_badge">
              Flujo: Subir → Detectar → Estilizar
            </div>
          </div>
          <div className="RecU_kv">
            Estado: <b>{status}</b>
          </div>
        </div>

        <div className="RecU_grid RecU_grid3xl">
          {/* Canvas / Preview */}
          <div className="RecU_card">
            <div className="RecU_section">
              <button
                type="button"
                className="RecU_dropzone"
                onClick={() =>
                  document.getElementById("RecU_file_hand").click()
                }
                aria-label="Subir foto de la mano"
              >
                <input
                  id="RecU_file_hand"
                  className="RecU_hiddenInput"
                  type="file"
                  accept="image/*"
                  onChange={onPickFile}
                />
                <span>
                  📷 <b>Sube tu foto</b>
                </span>
                <span className="RecU_muted">Arrastra o haz clic</span>
              </button>
            </div>

            <div className="RecU_section">
              <div
                className="RecU_canvasWrap RecU_hvh"
                role="img"
                aria-label="Vista previa con esmalte aplicado"
              >
                <canvas ref={baseCanvasRef} className="RecU_hidden" />
                <canvas ref={paintCanvasRef} className="RecU_hidden" />
                <canvas ref={outCanvasRef} className="RecU_canvas" />
                <div className="RecU_floatActions">
                  <button
                    className="RecU_btn RecU_btnGhost"
                    onMouseDown={onCompareDown}
                    onMouseUp={onCompareUp}
                    onMouseLeave={onCompareUp}
                    disabled={!img}
                    title="Mantén para ver la foto original"
                    aria-label="Comparar con foto original"
                  >
                    ◑ Comparar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controles principales */}
          <div className="RecU_card RecU_sticky">
            <div className="RecU_section">
              <div className="RecU_row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button className="RecU_btn" onClick={onDetect} disabled={!img}>
                  🔍 Detectar uñas (SAM)
                </button>
                <button className="RecU_btn RecU_btnGhost" onClick={resetAll}>
                  ↺ Reiniciar
                </button>
         
              </div>
              <div className="RecU_kv" style={{ marginTop: 8 }}>
                Uñas detectadas:{" "}
                <b>
                  {enabledCount}/{nails.length}
                </b>
              </div>
            </div>

            {/* === NUEVO: Lista de uñas con toggles === */}
            {nails.length > 0 && (
              <div className="RecU_section">
                <div className="RecU_h3">Seleccionar uñas</div>

                <div
                  className="RecU_row"
                  style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}
                >
                  <button
                    className="RecU_btn RecU_btnTiny"
                    onClick={() => setAll(true)}
                  >
                    Seleccionar todo
                  </button>
                  <button
                    className="RecU_btn RecU_btnTiny RecU_btnGhost"
                    onClick={() => setAll(false)}
                  >
                    Deseleccionar
                  </button>
                  <button
                    className="RecU_btn RecU_btnTiny RecU_btnGhost"
                    onClick={invertAll}
                  >
                    Invertir
                  </button>
                </div>

                <div className="RecU_list">
                  {nails.map((n) => {
                    const bz = bbox(n.polygon || []);
                    const approx = Math.round(Math.sqrt(n.area || bz.w * bz.h));
                    return (
                      <label
                        key={n.id}
                        className={`RecU_item ${
                          n.enabled ? "is-on" : "is-off"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="RecU_check"
                          checked={!!n.enabled}
                          onChange={() => toggleOne(n.id)}
                          aria-label={`Uña ${n.id}`}
                        />
                        <span className="RecU_itemTitle">Uña #{n.id}</span>
                        <span className="RecU_itemStat">
                          score {(n.score ?? 1).toFixed(2)}
                        </span>
                        <span className="RecU_itemStat">~{approx}px</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modo Color/Diseño */}
            <div className="RecU_section">
              <div className="RecU_row">
                <div className="RecU_badge">Paso 3</div>
                <div className="RecU_kv">
                  Modo: <b>{designImg ? "Diseño" : "Color"}</b>
                </div>
              </div>

              <div className="RecU_row" style={{ marginTop: 10 }}>
                <button
                  className={`RecU_btn ${!designImg ? "" : "RecU_btnGhost"}`}
                  onClick={() => {
                    setDesignURL("");
                    setDesignImg(null);
                  }}
                >
                  🎨 Color
                </button>
                <button
                  type="button"
                  className="RecU_dropzone"
                  style={{
                    padding: "10px 14px",
                    minHeight: 0,
                    flex: "1 1 auto",
                  }}
                  onClick={() =>
                    document.getElementById("RecU_file_design").click()
                  }
                >
                  <input
                    id="RecU_file_design"
                    className="RecU_hiddenInput"
                    type="file"
                    accept="image/png"
                    onChange={onPickDesign}
                  />
                  <span>
                    {designImg ? "Cambiar diseño PNG" : "Subir diseño PNG"}
                  </span>
                </button>
              </div>

              {!designImg ? (
                <div className="RecU_section">
                  <div className="RecU_row">
                    <div
                      className="RecU_swatch"
                      style={{ background: color }}
                    />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label="Selector de color"
                    />
                    <input
                      type="text"
                      className="RecU_textarea"
                      style={{ minHeight: 0, height: 40 }}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#c81e6e"
                      aria-label="Código de color HEX"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="RecU_section">
                    <div className="RecU_row">
                      <span className="RecU_kv">
                        <b>Diseño cargado</b>
                      </span>
                      <span className="RecU_chip RecU_chipOk">PNG</span>
                      <button
                        className="RecU_btnGhost"
                        onClick={() => {
                          setDesignURL("");
                          setDesignImg(null);
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="RecU_section">
                    <div className="RecU_h3">Modo de diseño</div>
                    <div className="RecU_row">
                      <select
                        value={designMode}
                        onChange={(e) => setDesignMode(e.target.value)}
                      >
                        <option value="tile-per-nail">
                          Repetir por uña (recomendado)
                        </option>
                        <option value="fit-contain">Ajustar (contain)</option>
                        <option value="fit-cover">Ajustar (cover)</option>
                        <option value="tile-global">Repetir global</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="RecU_section">
                <div className="RecU_row">
                  <span className="RecU_kv">Opacidad</span>
                  <input
                    className="RecU_full"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  />
                </div>
                <div className="RecU_row">
                  <span className="RecU_kv">Blend</span>
                  <select
                    value={blend}
                    onChange={(e) => setBlend(e.target.value)}
                  >
                    <option value="soft-light">soft-light</option>
                    <option value="multiply">multiply</option>
                    <option value="overlay">overlay</option>
                    <option value="screen">screen</option>
                    <option value="source-over">normal</option>
                  </select>
                </div>
              </div>

              {/* Forma */}
              <div className="RecU_section">
                <div className="RecU_h3">Forma</div>
                <div className="RecU_row">
                  <span className="RecU_kv">Suavizado</span>
                  <input
                    className="RecU_full"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={shapeSmooth}
                    onChange={(e) => setShapeSmooth(parseFloat(e.target.value))}
                  />
                </div>
                <div className="RecU_row">
                  <span className="RecU_kv">Ajuste (inset)</span>
                  <input
                    className="RecU_full"
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={shapeInset}
                    onChange={(e) => setShapeInset(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Avanzado */}
              <div className="RecU_section">
                <button
                  className="RecU_btnGhost"
                  onClick={() => setShowMore((v) => !v)}
                >
                  {showMore
                    ? "▾ Ocultar opciones avanzadas"
                    : "▸ Mostrar opciones avanzadas"}
                </button>

                {showMore && (
                  <div className="RecU_section">
                    <div className="RecU_row">
                      <span className="RecU_kv">Borde suave</span>
                      <input
                        className="RecU_full"
                        type="range"
                        min="0"
                        max="4"
                        step="0.1"
                        value={featherPx}
                        onChange={(e) =>
                          setFeatherPx(parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div className="RecU_row">
                      <span className="RecU_kv">Gloss (poder)</span>
                      <input
                        className="RecU_full"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={glossPower}
                        onChange={(e) =>
                          setGlossPower(parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div className="RecU_row">
                      <span className="RecU_kv">Gloss (tamaño)</span>
                      <input
                        className="RecU_full"
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.01"
                        value={glossSize}
                        onChange={(e) =>
                          setGlossSize(parseFloat(e.target.value))
                        }
                      />
                    </div>

                    {designImg && (
                      <>
                        <div className="RecU_row">
                          <span className="RecU_kv">Escala diseño</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="0.2"
                            max="4"
                            step="0.02"
                            value={designScale}
                            onChange={(e) =>
                              setDesignScale(parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">Rotación</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={designRot}
                            onChange={(e) =>
                              setDesignRot(parseInt(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">Offset X</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="-200"
                            max="200"
                            step="1"
                            value={designOffsetX}
                            onChange={(e) =>
                              setDesignOffsetX(parseInt(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">Offset Y</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="-200"
                            max="200"
                            step="1"
                            value={designOffsetY}
                            onChange={(e) =>
                              setDesignOffsetY(parseInt(e.target.value))
                            }
                          />
                        </div>

                        <div className="RecU_row">
                          <span className="RecU_kv">Intensidad del diseño</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={designStrength}
                            onChange={(e) =>
                              setDesignStrength(parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">Contraste</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="0.8"
                            max="2"
                            step="0.05"
                            value={designContrast}
                            onChange={(e) =>
                              setDesignContrast(parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">Saturación</span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="0.8"
                            max="2"
                            step="0.05"
                            value={designSaturation}
                            onChange={(e) =>
                              setDesignSaturation(parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="RecU_row">
                          <span className="RecU_kv">
                            Base blanca (undercoat)
                          </span>
                          <input
                            className="RecU_full"
                            type="range"
                            min="0"
                            max="0.6"
                            step="0.02"
                            value={undercoatAlpha}
                            onChange={(e) =>
                              setUndercoatAlpha(parseFloat(e.target.value))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="RecU_section">
                <button
                  className="RecU_btnGhost"
                  onClick={() => {
                    const out = outCanvasRef.current;
                    const a = document.createElement("a");
                    a.download = "tryon_esmalte.png";
                    a.href = out.toDataURL("image/png");
                    a.click();
                  }}
                  disabled={!img}
                >
                  ⬇️ Descargar PNG
                </button>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="RecU_card RecU_sticky">
            <div className="RecU_h3">Checklist</div>
            <ul style={{ margin: "8px 0 0 16px", color: "var(--RecU_muted)" }}>
              <li>Sube una foto nítida (uñas completas)</li>
              <li>
                Presiona <b>Detectar uñas</b>
              </li>
              <li>
                Elige <b>Color</b> o sube un <b>Diseño PNG</b>
              </li>
              <li>
                Usa <b>Repetir por uña</b> para que cada uña tenga su propio
                motivo
              </li>
              <li>
                Ajusta <b>Opacidad</b>, <b>Blend</b> e <b>Intensidad</b>
              </li>
              <li>
                En <b>Forma</b>, usa <i>Suavizado</i> e <i>Inset</i> para el
                calce
              </li>
              <li>
                Pulsa <b>↺ Reiniciar</b> para empezar de cero
              </li>
            
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
