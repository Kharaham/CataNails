// src/pages/Home.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Sparkles,
  Hand,
  Palette,
  Sparkle,
  Droplets,
  BookmarkCheck,
} from "lucide-react";
import "../../styles/components/home.css";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

// Imágenes (usa rutas reales)
import homeStudio1 from "../../assets/images/homev2/banner1.png";
import homeStudio2 from "../../assets/images/homev2/banner2.png";
import homeStudio4 from "../../assets/images/homev2/banner3.png";

import manicureH from "../../assets/images/home/v4.jpg";
import pedicureH from "../../assets/images/home/pedicure.jpg";

import alisadoH from "../../assets/images/home/botox.jpg";
import spaH from "../../assets/images/home/spa.jpg";

import try1 from "../../assets/images/homev2/TryonC.jpeg";
import try2 from "../../assets/images/homev2/Try.png";
import try3 from "../../assets/images/homev2/ss.png";

import miniExpress from "../../assets/images/home/express.jpg";
import miniArt from "../../assets/images/home/acrilica.jpg";
import miniSpa from "../../assets/images/home/detox.jpg";
import miniPedi from "../../assets/images/home/pedicure.jpg";

import port1 from "../../assets/trabajos/trabajo1.jpeg";
import port2 from "../../assets/trabajos/trabajo2.jpeg";
import port3 from "../../assets/trabajos/trabajo3.jpeg";
import port4 from "../../assets/trabajos/trabajo4.jpeg";
import port5 from "../../assets/trabajos/trabajo5.jpeg";
import port6 from "../../assets/trabajos/trabajo6.jpeg";

import tone1 from "../../assets/images/homev2/color1.jpg";
import tone2 from "../../assets/images/homev2/color2.jpg";
import tone3 from "../../assets/images/homev2/color3.jpg";
import tone4 from "../../assets/images/homev2/color5.jpg";
import tone5 from "../../assets/images/homev2/color6.jpg";
import tone6 from "../../assets/images/homev2/color7.jpg";
/* ------------------- Helpers de animación ------------------- */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: "easeOut", delay },
});

/* ------------------- Carousel accesible y ligero ------------------- */
const Carousel = memo(function Carousel({
  slides = [],
  autoPlayMs = 4500,
  height = 480,
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const hover = useRef(false);
  const focus = useRef(false);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const goTo = useCallback(
    (i) => {
      const n = slides.length;
      if (!n) return;
      setIndex(((i % n) + n) % n);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      !autoPlayMs ||
      slides.length <= 1 ||
      hover.current ||
      focus.current
    )
      return;
    timerRef.current = setTimeout(next, autoPlayMs);
    return () => clearTimeout(timerRef.current);
  }, [index, autoPlayMs, slides.length, next, prefersReducedMotion]);

  // Teclado
  useEffect(() => {
    const onKey = (e) => {
      const el = containerRef.current;
      if (!el || !el.matches(":focus-within")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Swipe
  useEffect(() => {
    let startX = 0,
      dx = 0;
    const th = 40;
    const el = containerRef.current;
    if (!el) return;
    const ts = (e) => {
      startX = e.touches[0].clientX;
    };
    const tm = (e) => {
      dx = e.touches[0].clientX - startX;
    };
    const te = () => {
      if (Math.abs(dx) > th) dx < 0 ? next() : prev();
      startX = 0;
      dx = 0;
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    el.addEventListener("touchend", te);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, [next, prev]);

  return (
    <div className="cn-wrap" style={{ height }}>
      <div
        className="cn-carousel"
        style={{ height }}
        ref={containerRef}
        onMouseEnter={() => {
          hover.current = true;
          clearTimeout(timerRef.current);
        }}
        onMouseLeave={() => {
          hover.current = false;
        }}
        onFocus={() => {
          focus.current = true;
        }}
        onBlur={() => {
          focus.current = false;
        }}
        aria-roledescription="carousel"
      >
        <div
          className="cn-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => {
            const fit = s.fit === "contain" ? "contain" : "cover";
            return (
              <div
                className={`cn-slide ${
                  fit === "contain" ? "mode-contain" : ""
                }`}
                aria-hidden={i !== index}
                key={i}
              >
                <img
                  className={`cn-img ${fit}`}
                  src={s.src}
                  alt={s.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />

                {s.caption && (
                  <div className="cn-caption">
                    <h2 className="gradient-text">{s.caption.title}</h2>
                    {s.caption.text && <p>{s.caption.text}</p>}
                    {s.caption.cta && (
                      <button
                        className="cn-btn glass-btn"
                        onClick={s.caption.cta.onClick}
                      >
                        {s.caption.cta.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {slides.length > 1 && (
          <>
            <button
              className="cn-arrow cn-prev"
              aria-label="Anterior"
              onClick={prev}
            >
              ‹
            </button>
            <button
              className="cn-arrow cn-next"
              aria-label="Siguiente"
              onClick={next}
            >
              ›
            </button>
            <div
              className="cn-dots"
              role="tablist"
              aria-label="Indicadores del carrusel"
            >
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`cn-dot ${i === index ? "active" : ""}`}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Ir al slide ${i + 1}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Partículas ligeras, desactivadas si reduce motion */}
      {!prefersReducedMotion && <DecorParticles />}
    </div>
  );
});

/* ------------------- Partículas (ligeras) ------------------- */
const DecorParticles = memo(function DecorParticles() {
  return (
    <div aria-hidden className="decor">
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} style={{ "--i": i }} />
      ))}
    </div>
  );
});

/* ------------------- Barra sticky y FAB ------------------- */
const StickyReserve = memo(function StickyReserve({ onReserve }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`sticky-reserve ${show ? "visible" : ""}`}
      role="region"
      aria-label="Reserva rápida"
    >
      <div className="sr-inner">
        <span>¿Lista para tus uñas?</span>
        <button className="sr-btn" onClick={onReserve}>
          Reservar ahora
        </button>
      </div>
    </div>
  );
});

const FabMobile = memo(function FabMobile({ onReserve }) {
  return (
    <div className="fab-mobile" aria-hidden>
      <a
        className="fab-btn"
        href="https://wa.me/56900000000"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        title="Escríbenos por WhatsApp"
      >
        <MessageCircle size={22} />
      </a>
      <button
        className="fab-btn solid"
        onClick={onReserve}
        aria-label="Reservar"
        title="Reservar"
      >
        <CalendarDays size={22} />
      </button>
    </div>
  );
});

/* ------------------- Marquee (ligero) ------------------- */
const BrandMarquee = memo(function BrandMarquee() {
  const loop = useMemo(() => {
    const brands = [
      "DND",
      "Morgan Taylor",
      "L'Oréal Paris",
      "Nivea",
      "Neutrogena",
      "CeraVe",
      "La Roche-Posay",
      "Eucerin",
      "Vichy",
      "Dove",
      "Essence",
    ];
    return [...brands, ...brands];
  }, []);
  return (
    <section className="brandmarquee" aria-label="Marcas que usamos">
      <div className="brandmarquee-viewport">
        <div className="brandmarquee-track" aria-hidden>
          {loop.map((name, i) => (
            <span className="brandchip" key={`${name}-${i}`}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ------------------- Servicios (HOME – versión mejorada) ------------------- */
/* ------------------- Servicios (HOME – versión ULTRA) ------------------- */
const ServicesShowcase = memo(function ServicesShowcase() {
  const navigate = useNavigate();

  const items = [
    {
      k: "express",
      badge: "Nuevo",
      title: "Manicure Express",
      desc: "Perfecta si tienes poco tiempo. Limpio, rápido y elegante.",
      img: miniExpress, // <-- AQUÍ se usa la variable importada
      to: "/manicure",
      icon: <Sparkles size={20} />,
    },
    {
      k: "art",
      badge: "Top elección",
      title: "Manicure Artística",
      desc: "Diseños premium con efectos exclusivos y estilos modernos.",
      img: miniArt,
      to: "/manicure",
      icon: <Palette size={20} />,
    },
    {
      k: "handspa",
      badge: "Popular",
      title: "Spa Detox de Manos",
      desc: "Tratamiento relajante con exfoliación y mascarilla nutritiva.",
      img: miniSpa,
      to: "/manicure",
      icon: <Droplets size={20} />,
    },
    {
      k: "pedideluxe",
      badge: "Nuevo",
      title: "Pedicure Deluxe",
      desc: "Renueva tus pies con sales aromáticas e hidratación profunda.",
      img: miniPedi,
      to: "/pedicure",
      icon: <Hand size={20} />,
    },
  ];

  return (
    <section className="servicesX">
      <div className="servicesX-head">
        <h3 className="section-title emph">Servicios destacados</h3>
        <p>Experiencias pensadas para tu estilo y bienestar.</p>
      </div>

      <div className="servicesX-grid">
        {items.map((it, idx) => (
          <motion.article
            {...fadeUp(idx * 0.05)}
            key={it.k}
            className="sx-card sx-advanced"
            onClick={() => navigate(it.to)}
          >
            <span className="sx-badge">{it.badge}</span>

            <div className="sx-mini-img">
              <img src={it.img} alt={it.title} />
            </div>

            <div className="sx-icon icon-animated">{it.icon}</div>

            <h4>{it.title}</h4>
            <p>{it.desc}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
});

/* ------------------- Mini Portafolio (galería) ------------------- */
/* ------------------- Mini Portafolio (galería + carrusel) ------------------- */
const MiniPortfolio = memo(function MiniPortfolio() {
  const [modalImg, setModalImg] = useState(null);

  const images = [port1, port2, port3, port4, port5, port6];

  return (
    <motion.section className="miniportfolio" {...fadeUp(0.05)}>
      <h3 className="section-title emph">Nuestros últimos trabajos</h3>

      {/* === CARRUSEL SOLO MÓVIL === */}
      <div className="mp-carousel">
        <div className="mp-track">
          {images.map((img, i) => (
            <div key={i} className="mp-slide" onClick={() => setModalImg(img)}>
              <div className="mp-img-wrap">
                <img src={img} alt={`Trabajo ${i + 1}`} loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === GRID ORIGINAL SOLO EN DESKTOP === */}
      <div className="mp-masonry">
        {images.map((img, i) => (
          <div
            key={i}
            className="mp-masonry-item"
            onClick={() => setModalImg(img)}
          >
            <img src={img} alt={`Trabajo ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>

      {/* === MODAL === */}
      {modalImg && (
        <div className="mp-modal" onClick={() => setModalImg(null)}>
          <div className="mp-modal-content">
            <img src={modalImg} alt="Vista ampliada" />
          </div>
        </div>
      )}
    </motion.section>
  );
});

/* ------------------- Colores del mes ------------------- */
const ColorShowcase = memo(function ColorShowcase() {
  const tones = [
    { img: tone1, name: "Rosa Quartz" },
    { img: tone2, name: "Rojo Burdeo" },
    { img: tone3, name: "Verde Esmeralda" },
    { img: tone4, name: "Negro Brillante" },
    { img: tone5, name: "Azul" },
    { img: tone6, name: "Amarrillo Mostaza" },
  ];

  return (
    <motion.section className="colorShowcase" {...fadeUp(0.05)}>
      <h3 className="section-title emph">Colores destacados del mes</h3>
      <p className="csm-sub">Nuevos tonos listos para que los pruebes ✨</p>

      <div className="csm-grid">
        {tones.map((t, i) => (
          <div key={i} className="csm-item">
            <div className="csm-img-wrap">
              <img src={t.img} alt={t.name} loading="lazy" />
            </div>
            <span className="csm-name">{t.name}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
});

/* ------------------- Focus IA (refinado) ------------------- */
const FocusIA = memo(function FocusIA({ onReserve, onServices }) {
  return (
    <motion.section
      className="focusIA v2"
      aria-labelledby="focusIA-title"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <header className="focusIA-head">
        <h2 id="focusIA-title" className="section-title emph">
          Elegimos tu look contigo ✨
        </h2>
        <p className="sub">Asesoría breve + visualización previa en estudio.</p>
      </header>

      <div className="focusIA-body">
        {/* Lado visual */}
        <figure className="focusIA-media no-bg">
          <TryOnMiniCarousel images={[try1, try2, try3]} autoPlayMs={3500} />
        </figure>

        {/* Lado texto */}
        <div className="focusIA-right">
          <ul className="focusIA-list" role="list">
            <li className="fi-item">
              <span className="fi-ico shadow">
                <Hand size={18} />
              </span>
              <div className="fi-copy">
                <strong>Try-On rápido</strong>
                <small>Ves tonos en tu mano antes de aplicar.</small>
              </div>
            </li>

            <li className="fi-item">
              <span className="fi-ico shadow">
                <Palette size={18} />
              </span>
              <div className="fi-copy">
                <strong>Recomendación por tono</strong>
                <small>Paletas que favorecen tu piel.</small>
              </div>
            </li>

            <li className="fi-item">
              <span className="fi-ico shadow">
                <ShieldCheck size={18} />
              </span>
              <div className="fi-copy">
                <strong>Higiene y calma</strong>
                <small>Espacio limpio, decisión simple.</small>
              </div>
            </li>
            <li className="fi-item">
              <span className="fi-ico shadow">
                <BookmarkCheck size={18} />
              </span>
              <div className="fi-copy">
                <strong>Diseños guardados</strong>
                <small>Trae tus ideas o guarda las que probemos.</small>
              </div>
            </li>
          </ul>

          <div className="focusIA-ctas">
            <button className="btn-cta" onClick={onReserve}>
              Reservar
            </button>
            <button className="btn-ghost" onClick={onServices}>
              Ver servicios
            </button>
          </div>

          <div className="focusIA-meta">
            <span className="chip">
              <span className="dot" /> Demo: ~2 min
            </span>
            <span className="sep">•</span>
            <span className="chip">
              <span className="dot" /> Incluido en tu cita
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
});

/* ------------------- Mini carrusel Try-On (ligero) ------------------- */
const TryOnMiniCarousel = memo(function TryOnMiniCarousel({
  images = [],
  autoPlayMs = 0, // 0 = sin autoplay
}) {
  const [index, setIndex] = useState(0);
  const ref = useRef(null);
  const timer = useRef(null);
  const hover = useRef(false);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const goTo = useCallback(
    (i) => {
      const n = images.length;
      if (!n) return;
      setIndex(((i % n) + n) % n);
    },
    [images.length]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Autoplay opcional
  useEffect(() => {
    if (
      !autoPlayMs ||
      prefersReducedMotion ||
      images.length <= 1 ||
      hover.current
    )
      return;
    timer.current = setTimeout(next, autoPlayMs);
    return () => clearTimeout(timer.current);
  }, [index, autoPlayMs, images.length, prefersReducedMotion, next]);

  // Swipe táctil
  useEffect(() => {
    let startX = 0,
      dx = 0;
    const th = 38;
    const el = ref.current;
    if (!el) return;
    const ts = (e) => (startX = e.touches[0].clientX);
    const tm = (e) => (dx = e.touches[0].clientX - startX);
    const te = () => {
      if (Math.abs(dx) > th) dx < 0 ? next() : prev();
      startX = 0;
      dx = 0;
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    el.addEventListener("touchend", te);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, [next, prev]);

  if (!images.length) return null;

  return (
    <div
      className="miniC"
      ref={ref}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      aria-roledescription="carousel"
      aria-label="Vista previa Try-On"
    >
      <div
        className="miniC-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <div className="miniC-slide" key={i} aria-hidden={i !== index}>
            <img
              src={src}
              alt={`Resultado Try-On ${i + 1}`}
              loading={i ? "lazy" : "eager"}
              decoding="async"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            className="miniC-arrow prev"
            aria-label="Anterior"
            onClick={prev}
          >
            ‹
          </button>
          <button
            className="miniC-arrow next"
            aria-label="Siguiente"
            onClick={next}
          >
            ›
          </button>
          <div className="miniC-dots" role="tablist" aria-label="Indicadores">
            {images.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir a imagen ${i + 1}`}
                className={`miniC-dot ${i === index ? "active" : ""}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

/* ------------------- Explainer con fotos V2 (mejorado) ------------------- */
const ExplainerWithPhotos = memo(function ExplainerWithPhotos() {
  const navigate = useNavigate();

  const items = [
    {
      key: "manicure",
      title: "Manicure profesional premium",
      text: "Gel-X, Soft Gel, Polygel y diseños exclusivos hechos a mano. Acabado impecable, ultra resistente y adaptado a tu estilo. Vive uñas elegantes, modernas y listas para cualquier ocasión.",
      img: manicureH,
      alt: "Servicio de manicure profesional",
      ctaLabel: "Abrir catálogo completo",
      cta: () => navigate("/manicure"),
    },
    {
      key: "pedicure",
      title: "Pedicure spa de lujo",
      text: "Relaja tus pies con un spa completo: exfoliación, hidratación profunda, masajes aromáticos y un acabado perfecto que se mantiene por semanas.",
      img: pedicureH,
      alt: "Servicio de pedicure y spa",
      ctaLabel: "Explorar todos los estilos",
      cta: () => navigate("/pedicure"),
    },
    {
      key: "alisado",
      title: "Alisado + Botox capilar profesional",
      text: "Tratamientos certificados que dejan tu cabello suave, brillante y sin frizz desde la primera sesión. Resultados visibles, naturales y con efecto duradero.",
      img: alisadoH,
      alt: "Servicio de alisado capilar",
      ctaLabel: "Ver catálogo",
      cta: () => navigate("/alisado-permanente"),
    },
    {
      key: "spa",
      title: "Spa premium para manos y pies",
      text: "Una experiencia relajante con masajes, mascarillas nutritivas y aromas terapéuticos. Dale a tu piel un reset completo y disfruta un momento de bienestar total.",
      img: spaH,
      alt: "Spa de manos y pies",
      ctaLabel: "Agendar cita",
      cta: () => navigate("/reservar"),
    },
  ];

  return (
    <section className="ex2-section">
      {items.map((item, idx) => (
        <motion.article
          {...fadeUp(idx * 0.05)}
          className={`ex2 ${idx % 2 ? "reverse" : ""}`}
          key={item.key}
        >
          <figure className="ex2-media">
            <img
              src={item.img}
              alt={item.alt}
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="ex2-copy">
            <h3 className="ex2-title">{item.title}</h3>

            <p className="ex2-text">{item.text}</p>

            <button className="ex2-btn" onClick={item.cta}>
              {item.ctaLabel}
            </button>
          </div>
        </motion.article>
      ))}
    </section>
  );
});

const FooterMini = memo(function FooterMini() {
  return <footer className="foot" />;
});

/* ------------------- Home ------------------- */
export default function Home() {
  const navigate = useNavigate();
  const goReserve = useCallback(() => navigate("/reservar"), [navigate]);

  // === REVIEWS ===
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const ref = collection(db, "reviews");
      const snap = await getDocs(ref);

      const list = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((r) => r.isVisible);

      setReviews(list);
    };

    fetchReviews();
  }, []);

  const slides = useMemo(
    () => [
      {
        src: homeStudio2,
        alt: "Materiales profesionales",
        caption: {
          cta: {
            label: "Reservar ahora",
            onClick: goReserve,
          },
        },
        badge: "Studio",
      },

      {
        src: homeStudio4,
        alt: "Estudio higienizado",
        caption: {},
        badge: "Higiene",
      },
      {
        src: homeStudio1,
        alt: "Área de descanso",
        caption: {
          cta: { label: "Ver promociones", onClick: () => navigate("/promos") },
        },
        badge: "Promo",
      },
    ],
    [navigate]
  );

  return (
    <div className="home-container">
      <section className="hero-section">
        <Carousel slides={slides} autoPlayMs={5000} height={520} />
      </section>

      <BrandMarquee />

      <FocusIA
        onReserve={goReserve}
        onServices={() => navigate("/servicios")}
      />

      <ExplainerWithPhotos />

      <ServicesShowcase />
      <MiniPortfolio />
      <ColorShowcase />

      <motion.section className="testimonials" {...fadeUp(0.05)}>
        <h3 className="section-title emph">Lo que dicen nuestras clientas</h3>

        <div className="t-carousel">
          {reviews.length === 0 ? (
            <p className="no-reviews">Aún no hay reseñas disponibles.</p>
          ) : (
            reviews.map((r) => (
              <figure className="t-card" key={r.id}>
                <blockquote>“{r.text}”</blockquote>
                <figcaption>— {r.author}</figcaption>

                <div className="review-stars">
                  {"★".repeat(r.rating)} {"☆".repeat(5 - r.rating)}
                </div>
              </figure>
            ))
          )}
        </div>
      </motion.section>

      <motion.section className="newsletter" {...fadeUp(0.05)}>
        <div className="nl-inner">
          <div>
            <h3 className="section-title emph">Recibe promos y nuevos tonos</h3>
          </div>
          <form
            className="nl-form"
            onSubmit={(e) => {
              e.preventDefault();
              const email = new FormData(e.currentTarget).get("email");
              alert(`¡Gracias! Te avisaremos a ${email}`);
              e.currentTarget.reset();
            }}
          >
            <input name="email" type="email" required placeholder="Tu email" />
            <button type="submit" className="glass-btn">
              Suscribirme
            </button>
          </form>
        </div>
      </motion.section>

      <motion.section className="trust-strip" {...fadeUp(0.05)}>
        <div className="trust-item">
          <ShieldCheck size={18} /> <span>Higiene certificada</span>
        </div>
        <div className="trust-item">
          <Sparkles size={18} /> <span>Productos de calidad</span>
        </div>
        <div className="trust-item">
          <CreditCard size={18} /> <span>Pagos seguros</span>
        </div>
        <div className="trust-item">
          <RefreshCw size={18} /> <span>Garantía 7 días</span>
        </div>
      </motion.section>

      <StickyReserve onReserve={goReserve} />
      <FabMobile onReserve={goReserve} />
      <FooterMini />
    </div>
  );
}
