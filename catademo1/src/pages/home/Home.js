import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HomeViewModel } from "../../viewmodels/HomeViewModel";

import "../../styles/components/home.css"; // 👉 pega el CSS nuevo al final de ese archivo (debajo dejo el bloque)

// 🔹 Imágenes (ya las tienes en tu proyecto)

import homeStudio1 from "../../assets/images/home/home1.WebP";
import homeStudio2 from "../../assets/images/home/home2.WebP";
import homeStudio3 from "../../assets/images/home/home3.WebP";
import homeStudio4 from "../../assets/images/home/home4.WebP";

/**
 * Carousel accesible, sin dependencias externas
 * - Auto-play (pausa al pasar el mouse o enfocar con teclado)
 * - Swipe en móvil
 * - Navegación con teclado (← →)
 * - Indicadores y flechas
 */
const Carousel = ({ slides = [], autoPlayMs = 4500, height = 440 }) => {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);

  const goTo = useCallback(
    (i) => {
      const n = slides.length;
      if (n === 0) return;
      setIndex(((i % n) + n) % n);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // autoplay
  useEffect(() => {
    if (!autoPlayMs || slides.length <= 1) return;
    if (isHoveredRef.current || isFocusedRef.current) return;

    timerRef.current = setTimeout(() => {
      next();
    }, autoPlayMs);

    return () => clearTimeout(timerRef.current);
  }, [index, autoPlayMs, slides.length, next]);

  // pausa con hover/focus
  const onMouseEnter = () => {
    isHoveredRef.current = true;
    clearTimeout(timerRef.current);
  };
  const onMouseLeave = () => {
    isHoveredRef.current = false;
  };
  const onFocus = () => {
    isFocusedRef.current = true;
    clearTimeout(timerRef.current);
  };
  const onBlur = () => {
    isFocusedRef.current = false;
  };

  // teclado
  useEffect(() => {
    const onKey = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.matches(":focus-within")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // swipe móvil
  useEffect(() => {
    let startX = 0;
    let deltaX = 0;
    const threshold = 40;
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const onTouchMove = (e) => {
      deltaX = e.touches[0].clientX - startX;
    };
    const onTouchEnd = () => {
      if (Math.abs(deltaX) > threshold) deltaX < 0 ? next() : prev();
      startX = 0;
      deltaX = 0;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  return (
    <div
      className="cn-carousel"
      style={{ height }}
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-roledescription="carousel"
    >
      <div
        className="cn-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div className="cn-slide" aria-hidden={i !== index} key={i}>
            <img src={s.src} alt={s.alt} loading="lazy" />
            {s.caption && (
              <div className="cn-caption">
                <h2>{s.caption.title}</h2>
                {s.caption.text && <p>{s.caption.text}</p>}
                {s.caption.cta && (
                  <button className="cn-btn" onClick={s.caption.cta.onClick}>
                    {s.caption.cta.label}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
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
  );
};

const Home = () => {
  const [services, setServices] = useState([]);
  const navigate = useNavigate();
  const viewModel = new HomeViewModel();

  useEffect(() => {
    setServices(viewModel.getServices());
  }, []);

  const handleServiceClick = (servicePath) => navigate(servicePath);

  const slides = [
    {
      src: homeStudio2,
      alt: "Home Studio - Sillón de trabajo y luminaria",
      caption: {
        title: "Bienvenida a CataaNails",
        text: "Agenda tu atención personalizada para manos y pies.",
        cta: { label: "Reservar ahora", onClick: () => navigate("/reservas") },
      },
    },
    {
      src: homeStudio3,
      alt: "Home Studio - Decoración minimalista",
      caption: {
        title: "Uñas sanas y con estilo",
        text: "Tratamientos y esmaltado con foco en el cuidado.",
        cta: { label: "Ver servicios", onClick: () => navigate("/servicios") },
      },
    },
    {
      src: homeStudio4,
      alt: "Home Studio - Mesa de trabajo higienizada",
      caption: {
        title: "Protocolos de higiene",
        text: "Espacio limpio, materiales esterilizados y seguridad.",
      },
    },
    {
      src: homeStudio1,
      alt: "Home Studio - Área de descanso",
      caption: {
        title: "Promos del mes",
        text: "Descubre descuentos y packs.",
        cta: { label: "Ver promociones", onClick: () => navigate("/promos") },
      },
    },
  ];

  return (
    <div className="home-container">
      {/* HERO con carrusel */}
      <section className="hero-section">
        <Carousel slides={slides} autoPlayMs={5000} height={480} />
      </section>

      {/* Destacados: Servicios + IA */}
      <section className="offer-section">
        <div className="offer-head">
          <h2>Servicios Destacados</h2>
          <p>
            Cuida tu belleza con un enfoque moderno, delicado y asistido por IA.
          </p>
        </div>

        <div className="offer-grid">
          <article className="offer-card">
            <div className="offer-img manicure" aria-hidden="true"></div>
            <h3>Manicure</h3>
            <p>Esmaltado, cuidado de cutícula y diseños minimalistas.</p>
            <button
              className="offer-btn"
              onClick={() => navigate("/servicios#manicure")}
            >
              Ver Manicure
            </button>
          </article>

          <article className="offer-card">
            <div className="offer-img hair" aria-hidden="true"></div>
            <h3>Cabello</h3>
            <p>Tratamientos de brillo, botox capilar y peinados suaves.</p>
            <button
              className="offer-btn"
              onClick={() => navigate("/servicios#cabello")}
            >
              Ver Cabello
            </button>
          </article>

          <article className="offer-card">
            <div className="offer-img pedicure" aria-hidden="true"></div>
            <h3>Pedicure</h3>
            <p>Higiene, spa y esmaltado para pies impecables.</p>
            <button
              className="offer-btn"
              onClick={() => navigate("/servicios#pedicure")}
            >
              Ver Pedicure
            </button>
          </article>
        </div>

        {/* Bloque IA */}
        <div className="ai-strip">
          <div className="ai-item">
            <span className="ai-icon">🤖</span>
            <div>
              <h4>Análisis con IA</h4>
              <p>Detección de signos en uñas/piel para sugerir cuidados.</p>
            </div>
          </div>
          <div className="ai-item">
            <span className="ai-icon">🪞</span>
            <div>
              <h4>Virtual Try-On</h4>
              <p>Prueba tonos y estilos antes de decidir.</p>
            </div>
          </div>
          <div className="ai-item">
            <span className="ai-icon">📅</span>
            <div>
              <h4>Agenda inteligente</h4>
              <p>Recordatorios y horarios óptimos según tu historial.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
