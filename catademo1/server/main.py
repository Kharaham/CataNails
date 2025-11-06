# server/main.py
import io, os, base64, logging
from typing import List, Tuple, Optional, Dict

import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2

# =================== Logging ===================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
log = logging.getLogger("nails-server")

# =================== Config por defecto (modificables) ===================
# Alpha matte (borde)
ALPHA_DILATE_PX_DEFAULT  = 1
ALPHA_FEATHER_PX_DEFAULT = 2

# Guided filter (si hay opencv-contrib)
GUIDED_RADIUS_DEFAULT = 5
GUIDED_EPS_DEFAULT    = 1e-6

# Multi-escala (paddings)
FOR_PAD_DEFAULT = [0.25, 0.38]

# GrabCut
GRABCUT_ITERS_DEFAULT = 3

# Prompt grid (densidad)
PROMPT_ALONG_DEFAULT  = (0.18, 0.62, 4)    # start, end, steps (a lo largo)
PROMPT_ACROSS_DEFAULT = (-0.22, 0.22, 3)   # start, end, steps (a lo ancho)

# Salida: además de polígonos, devuelvo PNG RGBA por uña
RETURN_ALPHA_PNG = os.getenv("RETURN_ALPHA_PNG", "true").lower() == "true"

# Límite de tamaño de imagen (para evitar OOM). 3.5 megapíxeles por defecto.
MAX_PIXELS = int(os.getenv("MAX_PIXELS", "3500000"))

# =================== SAM (carga perezosa) =================
SAM_AVAILABLE = False
sam_predictor = None
_sam_device = "cpu"

def _try_load_sam():
    """
    Carga SAM (o SAM-HQ si está sam_hq_vit_b.pth en el mismo dir).
    Usa CUDA si está disponible.
    """
    global SAM_AVAILABLE, sam_predictor, _sam_device
    try:
        from segment_anything import sam_model_registry, SamPredictor  # type: ignore
        here = os.path.dirname(__file__)
        ckpt_hq = os.path.join(here, "sam_hq_vit_b.pth")
        ckpt_b  = os.path.join(here, "sam_vit_b_01ec64.pth")
        use_hq = os.path.isfile(ckpt_hq)
        ckpt = ckpt_hq if use_hq else ckpt_b
        if not os.path.isfile(ckpt):
            log.warning("[SAM] Checkpoint no encontrado: %s", ckpt)
            return
        try:
            import torch
            _sam_device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            _sam_device = "cpu"
        model_key = "vit_b"
        sam = sam_model_registry[model_key](checkpoint=ckpt)
        sam.to(_sam_device)
        predictor = SamPredictor(sam)
        SAM_AVAILABLE = True
        log.info("[SAM] Cargado %sen %s.", "HQ " if use_hq else "", _sam_device)
        globals()["sam_predictor"] = predictor
    except Exception as e:
        log.warning("[SAM] No disponible: %s", e)

_try_load_sam()

# =================== MediaPipe Hands ======================
import mediapipe as mp
mp_hands = mp.solutions.hands

# =================== (Opcional) Firebase Auth =============
FIREBASE_AUTH_REQUIRED = os.getenv("FIREBASE_AUTH_REQUIRED", "false").lower() == "true"
FIREBASE_READY = False
firebase_verify_id_token = None

if FIREBASE_AUTH_REQUIRED:
    try:
        import firebase_admin
        from firebase_admin import auth, credentials

        if not firebase_admin._apps:
            # Usará GOOGLE_APPLICATION_CREDENTIALS en Cloud Run si existe,
            # o credenciales por defecto de GCP.
            try:
                firebase_admin.initialize_app()
            except Exception:
                # Fallback: si montas un service-account.json
                cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                if cred_path and os.path.exists(cred_path):
                    firebase_admin.initialize_app(credentials.Certificate(cred_path))
                else:
                    firebase_admin.initialize_app()

        def _verify(token: str):
            return auth.verify_id_token(token)
        firebase_verify_id_token = _verify
        FIREBASE_READY = True
        log.info("[AUTH] Firebase Admin inicializado.")
    except Exception as e:
        log.error("[AUTH] Firebase Admin NO disponible: %s", e)
        FIREBASE_READY = False

def _require_firebase_auth(auth_header: Optional[str]):
    if not FIREBASE_AUTH_REQUIRED:
        return None
    if not FIREBASE_READY or firebase_verify_id_token is None:
        raise HTTPException(status_code=500, detail="Auth requerido pero no disponible en el servidor")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta Bearer token")
    token = auth_header.split(" ", 1)[1].strip()
    try:
        return firebase_verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

# =================== FastAPI ==============================
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
if not allowed_origins:
    # Si usas proxy de Firebase Hosting (rewrite /api/**) no necesitas CORS.
    allowed_origins = ["*"]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"ok": True, "sam": SAM_AVAILABLE, "device": _sam_device}

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# =================== Utilidades genéricas =================
def _pil_to_cv2(img_pil: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGBA2BGR if img_pil.mode=="RGBA" else cv2.COLOR_RGB2BGR)

def _norm_to_px(x: float, y: float, w: int, h: int) -> Tuple[int,int]:
    return int(round(x*w)), int(round(y*h))

def _clip_box(x1, y1, x2, y2, w, h):
    x1 = max(0, min(x1, w-1)); x2 = max(0, min(x2, w-1))
    y1 = max(0, min(y1, h-1)); y2 = max(0, min(y2, h-1))
    if x2 < x1: x1, x2 = x2, x1
    if y2 < y1: y1, y2 = y2, y1
    return x1, y1, x2, y2

def _rect_from_two_points(p1: np.ndarray, p2: np.ndarray,
                          width_scale: float=0.70, length_scale: float=0.60):
    v = p2 - p1
    L = np.linalg.norm(v) + 1e-6
    u = v / L
    n = np.array([-u[1], u[0]])
    center = p1 + u * (L * 0.90)       # distal
    half_w = L * width_scale * 0.5
    half_l = L * length_scale
    pA = center - u*half_l - n*half_w
    pB = center - u*half_l + n*half_w
    pC = center + u*half_l + n*half_w
    pD = center + u*half_l - n*half_w
    return np.stack([pA, pB, pC, pD], axis=0)

def _poly_to_bbox(poly: np.ndarray, pad: float=0.22, w: int=0, h: int=0) -> Tuple[int,int,int,int]:
    x = poly[:,0]; y = poly[:,1]
    xmin, xmax = np.min(x), np.max(x)
    ymin, ymax = np.min(y), np.max(y)
    bx = xmax - xmin; by = ymax - ymin
    pad_x = int(round(pad * max(12, bx)))
    pad_y = int(round(pad * max(12, by)))
    x1, y1 = int(xmin - pad_x), int(ymin - pad_y)
    x2, y2 = int(xmax + pad_x), int(ymax + pad_y)
    if w and h:
        x1, y1, x2, y2 = _clip_box(x1, y1, x2, y2, w, h)
    return x1, y1, x2, y2

def _approx_contour_to_polygon(cnt: np.ndarray, eps_ratio: float=0.01, max_points:int=72) -> List[List[int]]:
    peri = cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, eps_ratio*peri, True)
    pts = approx.reshape(-1,2)
    if len(pts) > max_points:
        idx = np.linspace(0, len(pts)-1, max_points).astype(int)
        pts = pts[idx]
    return pts.astype(int).tolist()

def _mask_to_polygon(mask: np.ndarray, min_area: int=70, enforce_convex: bool=True) -> Optional[List[List[int]]]:
    mask_u8 = (mask.astype(np.uint8) * 255)
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    cnt = max(contours, key=cv2.contourArea)
    if cv2.contourArea(cnt) < min_area:
        return None
    if enforce_convex:
        hull = cv2.convexHull(cnt)
        cnt = hull
    return _approx_contour_to_polygon(cnt)
def _edge_density(mask: np.ndarray) -> float:
    edges = cv2.Canny((mask.astype(np.uint8)*255), 0, 1)
    return float(edges.sum()) / (mask.size*255.0 + 1e-6)

def _distal_brightness(crop_bgr: np.ndarray, mask: np.ndarray) -> float:
    lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB)
    L = lab[:,:,0].astype(np.float32)/255.0
    ys, xs = np.where(mask)
    if len(xs)==0: return 0.0
    ymid = int(np.median(ys))
    distal = (ys < ymid)  # aprox “punta”
    if distal.sum()==0: return 0.0
    return float(L[ys[distal], xs[distal]].mean())


def _poly_to_mask_like(poly: np.ndarray, shape: Tuple[int,int]) -> np.ndarray:
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [poly.astype(np.int32)], 1)
    return m.astype(bool)

def _iou(a: np.ndarray, b: np.ndarray) -> float:
    inter = np.logical_and(a, b).sum()
    union = np.logical_or(a, b).sum()
    return float(inter) / (float(union) + 1e-6)

# =================== Guided Filter helper =================
def _guided_filter_soften(img_bgr: np.ndarray, alpha: np.ndarray, radius: int=5, eps: float=1e-6) -> np.ndarray:
    """
    Suaviza alpha guiado por imagen si está opencv-contrib.
    """
    try:
        gf = cv2.ximgproc.guidedFilter(guide=img_bgr, src=alpha, radius=radius, eps=eps)
        return gf
    except Exception:
        # fallback
        return cv2.GaussianBlur(alpha, (0,0), sigmaX=1.0, sigmaY=1.0)

# =================== Post-proceso de máscara ==============
def _morph_clean(mask: np.ndarray) -> np.ndarray:
    from skimage.morphology import remove_small_holes, remove_small_objects
    m = mask.astype(bool)
    m = remove_small_objects(m, min_size=140)
    m = remove_small_holes(m, area_threshold=140)
    m = m.astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=1)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN,  k, iterations=1)
    return m.astype(bool)

# ---------------- GrabCut refinamiento final ----------------
def _grabcut_refine(crop_bgr: np.ndarray, init_mask_bool: np.ndarray, iters: int=3) -> np.ndarray:
    h, w = init_mask_bool.shape
    trimap = _color_prior_trimap(crop_bgr, init_mask_bool)  # ← antes creabas uno simple
    bgdModel = np.zeros((1,65), np.float64)
    fgdModel = np.zeros((1,65), np.float64)
    try:
        cv2.grabCut(crop_bgr, trimap, None, bgdModel, fgdModel, iters, cv2.GC_INIT_WITH_MASK)
    except Exception:
        return init_mask_bool
    final = np.where((trimap==cv2.GC_FGD) | (trimap==cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    return final.astype(bool)


# =================== Prompts SAM ==========================
def _place_points_for_prompts(poly_local: np.ndarray,
                              tip_local: Tuple[int,int],
                              along: Tuple[float,float,int],
                              across: Tuple[float,float,int]) -> Dict[str, np.ndarray]:
    """
    Rejilla densa direccionada a distal.
    along: (start, end, steps) a lo largo del eje de la uña
    across: (start, end, steps) transversal
    """
    rect = cv2.minAreaRect(poly_local.astype(np.float32))
    box = cv2.boxPoints(rect).astype(np.float32)
    center = box.mean(axis=0)
    vecs = box - center
    lens = np.linalg.norm(vecs, axis=1)
    long_edge_idx = np.argsort(lens)[-2:]
    v_long = vecs[long_edge_idx[0]]
    v_long = v_long / (np.linalg.norm(v_long) + 1e-6)
    v_orth = np.array([-v_long[1], v_long[0]])

    startA, endA, stepsA = along
    startB, endB, stepsB = across

    pos_pts = []
    for i in np.linspace(startA, endA, stepsA):
        for j in np.linspace(startB, endB, stepsB):
            p = tip_local - v_long * (50*i) + v_orth * (48*j)
            pos_pts.append(p)
    pos_pts = np.array(pos_pts, dtype=np.float32)

    neg_pts = []
    for k in [0.25, 0.45, 0.65, 0.85]:
        q = tip_local + v_long * (62*k)  # proximal/ piel
        neg_pts.append(q)
    for ang in np.linspace(0, 2*np.pi, 8, endpoint=False):
        neg_pts.append(center + 72*np.array([np.cos(ang), np.sin(ang)], dtype=np.float32))
    neg_pts = np.array(neg_pts, dtype=np.float32)

    return {"pos": pos_pts, "neg": neg_pts}

# =================== SAM por crop =========================
def _sam_predict_on_crop(crop_bgr: np.ndarray,
                         poly_local: np.ndarray,
                         tip_local: Tuple[int,int],
                         along: Tuple[float,float,int],
                         across: Tuple[float,float,int]) -> Tuple[Optional[np.ndarray], float]:
    """
    Ejecuta SAM en un crop (una escala) con caja + puntos +/-.
    Devuelve: (mask_bool, value) donde 'value' es métrica compuesta.
    """
    if not SAM_AVAILABLE:
        return (None, -1e9)

    Hc, Wc = crop_bgr.shape[:2]
    # realce leve
    lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l2 = clahe.apply(l)
    crop_enh = cv2.cvtColor(cv2.merge([l2,a,b]), cv2.COLOR_LAB2BGR)

    sam_predictor.set_image(cv2.cvtColor(crop_enh, cv2.COLOR_BGR2RGB))

    prompts = _place_points_for_prompts(poly_local, np.array(tip_local, dtype=np.float32),
                                        along=along, across=across)
    pos = prompts["pos"]; neg = prompts["neg"]

    bx1, by1, bx2, by2 = _poly_to_bbox(poly_local, pad=0.06, w=Wc, h=Hc)
    box = np.array([bx1, by1, bx2, by2], dtype=np.float32)

    try:
        masks, scores, _ = sam_predictor.predict(
            point_coords=np.vstack([pos, neg]) if len(pos) + len(neg) > 0 else None,
            point_labels=np.concatenate([np.ones(len(pos), dtype=np.int32),
                                         np.zeros(len(neg), dtype=np.int32)]) if len(pos)+len(neg)>0 else None,
            box=box[None, :],
            multimask_output=True
        )
    except Exception:
        return (None, -1e9)

    roi_mask = _poly_to_mask_like(poly_local.astype(int), (Hc, Wc))
    best_val, best_mask = -1e9, None
    for m, s in zip(masks, scores):
        m = m.astype(bool)
        m_clean = _morph_clean(m)
        iou = _iou(m_clean, roi_mask)
        box_poly = np.array([[bx1,by1],[bx2,by1],[bx2,by2],[bx1,by2]], dtype=np.int32)
        box_mask = _poly_to_mask_like(box_poly, (Hc, Wc))
        outside = 1.0 - _iou(m_clean, box_mask)
        val = (0.55 * float(s)) + (0.55 * iou) - (0.18 * outside)
        if val > best_val:
            best_val, best_mask = val, m_clean
    return (best_mask, best_val)

# =================== SAM multi-escala + GrabCut ===========
def _refine_with_sam_multiscale(image_bgr: np.ndarray,
                                seed: Tuple[int,int],
                                poly_global: np.ndarray,
                                pads: List[float],
                                along: Tuple[float,float,int],
                                across: Tuple[float,float,int],
                                grab_iters: int) -> Optional[np.ndarray]:
    """
    pads: lista de paddings para multi-escala (ej: [0.25, 0.38])
    """
    if not SAM_AVAILABLE:
        return None

    H, W = image_bgr.shape[:2]
    candidates = []
    for pad in pads:
        x1, y1, x2, y2 = _poly_to_bbox(poly_global, pad=pad, w=W, h=H)
        crop = image_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        tip_local = (seed[0]-x1, seed[1]-y1)
        poly_local = poly_global - np.array([x1, y1], dtype=np.int32)

        mask_local, val = _sam_predict_on_crop(crop, poly_local, tip_local, along, across)
        if mask_local is None:
            continue

        mask_gc = _grabcut_refine(crop, mask_local, iters=grab_iters)
        iou_cons = _iou(mask_gc, mask_local)
        val_total = val + 0.15 * iou_cons
        candidates.append((val_total, (x1,y1,x2,y2), mask_gc))

    if not candidates:
        return None

    candidates.sort(key=lambda t: t[0], reverse=True)
    _, (x1,y1,x2,y2), final_local = candidates[0]

    mask_global = np.zeros((H, W), dtype=bool)
    mask_global[y1:y2, x1:x2] = final_local
    return mask_global

# =================== Helpers de imagen ====================
def _ensure_rgb_and_downscale(raw: bytes) -> np.ndarray:
    """Abre la imagen, asegura RGB y reduce si excede MAX_PIXELS."""
    try:
        img = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    w, h = img.size
    if w * h > MAX_PIXELS:
        scale = (MAX_PIXELS / float(w*h)) ** 0.5
        new_w, new_h = max(1, int(w*scale)), max(1, int(h*scale))
        img = img.resize((new_w, new_h), Image.LANCZOS)
        log.info("Downscale de %dx%d a %dx%d (MAX_PIXELS=%d)", w, h, new_w, new_h, MAX_PIXELS)
    return _pil_to_cv2(img)



# =================== Núcleo del endpoint ==================
def _run_inference(
    img_cv: np.ndarray,
    profile: str,
    padA: Optional[float], padB: Optional[float],
    grab: Optional[int], dilate: Optional[int], feather: Optional[int],
    radius: Optional[int], eps: Optional[float],
    alongStart: Optional[float], alongEnd: Optional[float], alongSteps: Optional[int],
    acrossStart: Optional[float], acrossEnd: Optional[float], acrossSteps: Optional[int],
) -> Dict:
    h, w = img_cv.shape[:2]

    # ---- Perfiles rápidos ----
    pads = FOR_PAD_DEFAULT[:]
    grab_iters = GRABCUT_ITERS_DEFAULT
    alpha_dilate = ALPHA_DILATE_PX_DEFAULT
    alpha_feather = ALPHA_FEATHER_PX_DEFAULT
    g_radius = GUIDED_RADIUS_DEFAULT
    g_eps = GUIDED_EPS_DEFAULT
    along = PROMPT_ALONG_DEFAULT
    across = PROMPT_ACROSS_DEFAULT

    if profile == "wide":      # manos completas / mucha piel
        pads = [0.30, 0.45]
        grab_iters = 4
        alpha_dilate, alpha_feather = 1, 3
        along = (0.18, 0.62, 5)
        across = (-0.26, 0.26, 5)
    elif profile == "closeup":  # close-up uñas
        pads = [0.18, 0.30]
        grab_iters = 5
        alpha_dilate, alpha_feather = 0, 3
        along = (0.15, 0.68, 6)
        across = (-0.30, 0.30, 5)
    elif profile == "noisy":    # fotos con ruido/compresión
        pads = [0.25, 0.40]
        grab_iters = 4
        alpha_dilate, alpha_feather = 2, 4
        along = (0.18, 0.62, 5)
        across = (-0.28, 0.28, 5)
        
    

    # ---- Overrides por query ----
    if padA is not None or padB is not None:
        a = padA if padA is not None else pads[0]
        b = padB if padB is not None else (pads[1] if len(pads)>1 else a)
        pads = [float(a), float(b)]
    if grab is not None:
        grab_iters = max(1, int(grab))
    if dilate is not None:
        alpha_dilate = max(0, int(dilate))
    if feather is not None:
        alpha_feather = max(0, int(feather))
    if radius is not None:
        g_radius = max(1, int(radius))
    if eps is not None:
        try:
            g_eps = float(eps)
        except:
            pass
    if (alongStart is not None) or (alongEnd is not None) or (alongSteps is not None):
        s = alongStart if alongStart is not None else along[0]
        e = alongEnd   if alongEnd   is not None else along[1]
        t = alongSteps if alongSteps is not None else along[2]
        along = (float(s), float(e), int(t))
    if (acrossStart is not None) or (acrossEnd is not None) or (acrossSteps is not None):
        s = acrossStart if acrossStart is not None else across[0]
        e = acrossEnd   if acrossEnd   is not None else across[1]
        t = acrossSteps if acrossSteps is not None else across[2]
        across = (float(s), float(e), int(t))

    # -------------- Detección base (MediaPipe) --------------
    base_polys: List[Dict] = []
    seeds: List[Tuple[int,int]] = []
    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.56,
        min_tracking_confidence=0.52
    ) as hands:
        rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)
        if res.multi_hand_landmarks:
            for hand_landmarks in res.multi_hand_landmarks:
                lm = hand_landmarks.landmark
                pairs = [(7,8),(11,12),(15,16),(19,20),(3,4)]  # index,middle,ring,pinky,thumb
                for a,b in pairs:
                    ax, ay = _norm_to_px(lm[a].x, lm[a].y, w, h)
                    bx, by = _norm_to_px(lm[b].x, lm[b].y, w, h)
                    poly = _rect_from_two_points(
                        np.array([ax,ay], dtype=np.float32),
                        np.array([bx,by], dtype=np.float32),
                        width_scale=0.70, length_scale=0.60
                    ).astype(int)
                    seeds.append((bx, by))
                    base_polys.append({
                        "polygon": poly.tolist(),
                        "score": 0.45,
                        "source": "mediapipe"
                    })

    refined_out = []
    matte_pngs = []

    # -------------- Refinamiento (SAM + GrabCut) ------------
    if SAM_AVAILABLE and seeds:
        for item, seed in zip(base_polys, seeds):
            poly_np = np.array(item["polygon"], dtype=np.int32)
            mask_glob = _refine_with_sam_multiscale(
                img_cv, seed, poly_np,
                pads=pads, along=along, across=across,
                grab_iters=grab_iters
            )
            if mask_glob is None:
                continue
            poly = _mask_to_polygon(mask_glob, min_area=80)
            if poly is None:
                continue
            refined_out.append({
                "polygon": poly,
                "score": 0.88,
                "source": "sam+grabcut"
            })

            if RETURN_ALPHA_PNG:
                # alpha suave guiado
                alpha = (mask_glob.astype(np.uint8) * 255).astype(np.float32) / 255.0
                # dilate/feather
                if alpha_dilate > 0:
                    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (alpha_dilate*2+1, alpha_dilate*2+1))
                    alpha = cv2.dilate((alpha*255).astype(np.uint8), k, iterations=1).astype(np.float32)/255.0
                if alpha_feather > 0:
                    alpha = cv2.GaussianBlur(alpha, (0,0), sigmaX=alpha_feather*0.6, sigmaY=alpha_feather*0.6)
                # guided filter si disponible
                try:
                    alpha = _guided_filter_soften(img_cv, alpha.astype(np.float32), radius=g_radius, eps=g_eps)
                except Exception:
                    pass
                alpha = np.clip(alpha, 0.0, 1.0)

                # Recorte justo a la uña
                x1, y1, x2, y2 = _poly_to_bbox(np.array(poly, dtype=np.int32), pad=0.08, w=w, h=h)
                crop_rgb = img_cv[y1:y2, x1:x2]
                crop_a = alpha[y1:y2, x1:x2]
                rgba = np.dstack([crop_rgb, (crop_a*255).astype(np.uint8)])
                ok, buf = cv2.imencode(".png", cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
                if ok:
                    b64 = base64.b64encode(buf).decode("ascii")
                    matte_pngs.append({
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "png_base64": f"data:image/png;base64,{b64}"
                    })

    masks_out = refined_out if len(refined_out) else base_polys

    out = {
        "ok": True,
        "width": w, "height": h,
        "masks": masks_out,
        "debug": {
            "num_uñas_geom": len(base_polys),
            "sam_used": SAM_AVAILABLE and len(refined_out) > 0,
            "device": _sam_device,
            "profile": profile,
            "pads": pads,
            "grab_iters": grab_iters,
            "alpha_dilate": alpha_dilate,
            "alpha_feather": alpha_feather,
            "guided_radius": g_radius,
            "guided_eps": g_eps,
            "prompt_along": along,
            "prompt_across": across,
        }
    }
    if RETURN_ALPHA_PNG and len(matte_pngs):
        out["mattes"] = matte_pngs
    return out

def _distal_thinness_penalty(mask: np.ndarray) -> float:
    ys, xs = np.where(mask)
    if len(xs)==0: return 0.0
    ymid = np.percentile(ys, 30)  # “punta”
    top = mask[:int(ymid), :]
    bot = mask[int(ymid):, :]
    w_top = top.sum(axis=1).mean() if top.size else 0
    w_bot = bot.sum(axis=1).mean() if bot.size else 1
    return float(np.clip(1.0 - (w_top / (w_bot+1e-6)), 0.0, 1.0))

def _regularize_set(polys: list, shape):
    feats = []
    H,W = shape
    for P in polys:
        P = np.array(P, np.int32)
        x,y,w,h = cv2.boundingRect(P)
        feats.append([w/h, w/max(W,1), h/max(H,1)])
    F = np.array(feats); mu = F.mean(0); sd = F.std(0)+1e-6
    scores = 1.0 - np.clip(np.abs((F-mu)/sd), 0, 3).mean(1)/3.0
    return scores  # 1=perfecto, 0=outlier
# > mejor

# =================== Endpoints públicos ===================
def _validate_image_content_type(content_type: Optional[str]):
    if not content_type or not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Se esperaba image/*")

async def _handle_predict(
    image: UploadFile,
    profile: str,
    padA: Optional[float], padB: Optional[float],
    grab: Optional[int], dilate: Optional[int], feather: Optional[int],
    radius: Optional[int], eps: Optional[float],
    alongStart: Optional[float], alongEnd: Optional[float], alongSteps: Optional[int],
    acrossStart: Optional[float], acrossEnd: Optional[float], acrossSteps: Optional[int],
) -> JSONResponse:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Imagen vacía")
    img_cv = _ensure_rgb_and_downscale(raw)
    result = _run_inference(
        img_cv, profile, padA, padB, grab, dilate, feather,
        radius, eps, alongStart, alongEnd, alongSteps,
        acrossStart, acrossEnd, acrossSteps
    )
    return JSONResponse(result)

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    profile: str = Query("normal", pattern="^(normal|wide|closeup|noisy)$"),
    padA: Optional[float] = Query(None), padB: Optional[float] = Query(None),
    grab: Optional[int]   = Query(None),
    dilate: Optional[int] = Query(None),
    feather: Optional[int]= Query(None),
    radius: Optional[int] = Query(None),
    eps: Optional[float]  = Query(None),
    alongStart: Optional[float] = Query(None),
    alongEnd:   Optional[float] = Query(None),
    alongSteps: Optional[int]   = Query(None),
    acrossStart: Optional[float] = Query(None),
    acrossEnd:   Optional[float] = Query(None),
    acrossSteps: Optional[int]   = Query(None),
    authorization: Optional[str] = Header(default=None, convert_underscores=False),
):
    """
    Perfilar por query params:
      ?profile=wide|closeup|noisy
      ?padA=0.3&padB=0.45&grab=5&dilate=0&feather=3&radius=7&eps=1e-6
      ?alongStart=0.15&alongEnd=0.68&alongSteps=6&acrossStart=-0.30&acrossEnd=0.30&acrossSteps=5
    """
    _require_firebase_auth(authorization)
    _validate_image_content_type(image.content_type)
    return await _handle_predict(
        image, profile, padA, padB, grab, dilate, feather, radius, eps,
        alongStart, alongEnd, alongSteps, acrossStart, acrossEnd, acrossSteps
    )

# Alias sugerido para el front: /segment (compat con tus llamadas)
@app.post("/segment")
async def segment(
    image: UploadFile = File(...),
    profile: str = Query("normal", pattern="^(normal|wide|closeup|noisy)$"),
    padA: Optional[float] = Query(None), padB: Optional[float] = Query(None),
    grab: Optional[int]   = Query(None),
    dilate: Optional[int] = Query(None),
    feather: Optional[int]= Query(None),
    radius: Optional[int] = Query(None),
    eps: Optional[float]  = Query(None),
    alongStart: Optional[float] = Query(None),
    alongEnd:   Optional[float] = Query(None),
    alongSteps: Optional[int]   = Query(None),
    acrossStart: Optional[float] = Query(None),
    acrossEnd:   Optional[float] = Query(None),
    acrossSteps: Optional[int]   = Query(None),
    authorization: Optional[str] = Header(default=None, convert_underscores=False),
):
    _require_firebase_auth(authorization)
    _validate_image_content_type(image.content_type)
    return await _handle_predict(
        image, profile, padA, padB, grab, dilate, feather, radius, eps,
        alongStart, alongEnd, alongSteps, acrossStart, acrossEnd, acrossSteps
    )
