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

// Imágenes (usa rutas reales)
import homeStudio1 from "../../assets/images/homev2/demo.png";
import homeStudio2 from "../../assets/images/homev2/demo.png";
import homeStudio4 from "../../assets/images/homev2/demo.png";

import polygelImg from "../../assets/images/homev2/fondooo.jpg";
import builderImg from "../../assets/images/homev2/fondooo.jpg";
import try1 from "../../assets/images/homev2/TryonC.jpeg";
import try2 from "../../assets/images/homev2/Try.png";
import try3 from "../../assets/images/homev2/ss.png";

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
          clearTimeout(timerRef.current);
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

/* ------------------- Servicios (compacto) ------------------- */
const ServicesShowcase = memo(function ServicesShowcase() {
  const navigate = useNavigate();
  const items = [
    {
      k: "gelx",
      title: "Soft Gel / Gel-X",
      desc: "Extensiones livianas y resistentes.",
      to: "/servicios#gelx",
      icon: <Sparkles size={18} />,
    },
    {
      k: "polygel",
      title: "Polygel",
      desc: "Moldeo versátil, acabado natural.",
      to: "/servicios#polygel",
      icon: <Droplets size={18} />,
    },
    {
      k: "builder",
      title: "Builder Gels",
      desc: "Refuerzo y nivelación automática.",
      to: "/servicios#builder",
      icon: <ShieldCheck size={18} />,
    },
    {
      k: "spa",
      title: "Spa manos/pies",
      desc: "Exfoliación + masaje + hidratación.",
      to: "/servicios#spa",
      icon: <Sparkle size={18} />,
    },
  ];
  return (
    <section className="servicesX">
      <div className="servicesX-head">
        <h3 className="section-title emph">Nuestros servicios</h3>
        <p>Profesionales, duraderos y pensados en tu cuidado.</p>
      </div>
      <div className="servicesX-grid">
        {items.map((it, idx) => (
          <motion.article
            {...fadeUp(idx * 0.05)}
            key={it.k}
            className="sx-card"
            onClick={() => navigate(it.to)}
          >
            <div className="sx-icon" aria-hidden>
              {it.icon}
            </div>
            <h4>{it.title}</h4>
            <p>{it.desc}</p>
            <button className="sx-btn" aria-label={`Ver más de ${it.title}`}>
              Ver más
            </button>
          </motion.article>
        ))}
      </div>
    </section>
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

/* ------------------- Explainer con fotos ------------------- */
const ExplainerWithPhotos = memo(function ExplainerWithPhotos() {
  const navigate = useNavigate();
  const items = [
    {
      key: "polygel",
      title: "Polygel: versatilidad con acabado natural",
      text: "Moldeo con moldes o sistema dual. Fortalece y corrige arquitectura.",
      img: polygelImg,
      alt: "Tubo de Polygel",
      cta: () => navigate("/servicios#polygel"),
    },
    {
      key: "builder",
      title: "Builder gels: refuerzo y nivelación automática",
      text: "Gel de baja temperatura y consistencia media que se nivela solo.",
      img: builderImg,
      alt: "Potes de builder gel",
      cta: () => navigate("/servicios#builder"),
    },
  ];

  return (
    <section className="ex2-section">
      {items.map((it, idx) => (
        <motion.article
          {...fadeUp(idx * 0.05)}
          className={`ex2 ${idx % 2 ? "reverse" : ""}`}
          key={it.key}
        >
          <figure className="ex2-media">
            <img src={it.img} alt={it.alt} loading="lazy" decoding="async" />
          </figure>
          <div className="ex2-copy">
            <h3 className="ex2-title">{it.title}</h3>
            <p className="ex2-text">{it.text}</p>
            <button className="ex2-btn" onClick={it.cta}>
              Colores disponibles
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

  const slides = useMemo(
    () => [
      {
        src: homeStudio2,
        alt: "Materiales profesionales",
        caption: {
          title: "Bienvenida a CataaNails",
          text: "Atención personalizada para manos y pies.",
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
        caption: {
          title: "Protocolos de higiene",
          text: "Materiales esterilizados y seguridad.",
        },
        badge: "Higiene",
      },
      {
        src: homeStudio1,
        alt: "Área de descanso",
        caption: {
          title: "Promos del mes",
          text: "Descubre descuentos y packs.",
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

      <motion.section className="testimonials" {...fadeUp(0.05)}>
        <h3 className="section-title emph">Lo que dicen nuestras clientas</h3>
        <div className="t-carousel" role="region" aria-label="Testimonios">
          {[
            {
              name: "Valentina",
              txt: "Manicure impecable y el espacio muy limpio. 10/10.",
            },
            {
              name: "Camila",
              txt: "El spa de pies me salvó antes de un evento. Recomendado.",
            },
            { name: "Constanza", txt: "Elegí el tono perfecto con el Try-On." },
          ].map((t, i) => (
            <figure className="t-card" key={i}>
              <blockquote>“{t.txt}”</blockquote>
              <figcaption>— {t.name}</figcaption>
            </figure>
          ))}
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
