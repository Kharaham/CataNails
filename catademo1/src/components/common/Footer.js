import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/footer.css";

const Footer = () => {
  const year = new Date().getFullYear();

  const quickLinks = useMemo(
    () => [
      { to: "/", label: "Inicio" },
      { to: "/trabajos-realizados", label: "Trabajos Realizados" },
      { to: "/about", label: "Sobre nosotros" },
      // { to: "/servicios", label: "Servicios" },
      // { to: "/contacto", label: "Contacto" },
    ],
    []
  );

  const social = useMemo(
    () => [
      { href: "https://facebook.com", icon: "facebook-f", label: "Facebook" },
      { href: "https://instagram.com", icon: "instagram", label: "Instagram" },
      {
        href:
          "https://wa.me/56912345678?text=Hola%20CataaNails,%20quisiera%20reservar%20una%20hora",
        icon: "whatsapp",
        label: "WhatsApp",
      },
      { href: "https://tiktok.com", icon: "tiktok", label: "TikTok" },
    ],
    []
  );

  return (
    <footer className="footer v3" role="contentinfo">
      {/* Wave divider superior */}
      <div className="footer-divider" aria-hidden="true">
        <svg
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          focusable="false"
          aria-hidden="true"
        >
          <path d="M0,32 C240,64 480,0 720,16 C960,32 1200,80 1440,48 L1440,64 L0,64 Z" />
        </svg>
      </div>

      <div className="footer-top container">
        <div className="row gy-5">
          {/* Brand / About */}
          <div className="col-xl-4 col-lg-4 col-md-6">
            <div className="footer-brand cardish">
              <Link
                to="/"
                className="footer-logo"
                aria-label="CataaNails - Ir al inicio"
              >
                <span className="logo-dot" aria-hidden="true" />
                <span className="logo-text">CataaNails</span>
              </Link>
              <p className="footer-desc">
                Manicure, pedicure, alisados y bótox capilar. Técnicas seguras,
                resultados consistentes y un trato cercano.
              </p>

              {/* Badges de confianza */}
              <ul className="trust-list" aria-label="Sellos de confianza">
                <li>
                  <i className="fas fa-shield-alt" aria-hidden="true" />
                  <span>Reserva segura</span>
                </li>
                <li>
                  <i className="fas fa-star" aria-hidden="true" />
                  <span>+100 reseñas</span>
                </li>
                <li>
                  <i className="fas fa-spray-can" aria-hidden="true" />
                  <span>Protocolos de higiene</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <nav
            className="col-xl-2 col-lg-2 col-md-6"
            aria-labelledby="footer-quicklinks-title"
          >
            <h5 id="footer-quicklinks-title" className="footer-title">
              Enlaces
            </h5>
            <ul className="footer-list">
              {quickLinks.map((item) => (
                <li key={item.to}>
                  <Link className="footer-link" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contacto */}
          <div className="col-xl-3 col-lg-3 col-md-6">
            <h5 className="footer-title">Contacto</h5>
            <address className="footer-address">
              <span className="d-block">Ñuble, Chile</span>
              <a className="footer-link" href="tel:+56912345678">
                +56 9 1234 5678
              </a>
              <a className="footer-link" href="mailto:danielariassm@gmail.com">
                danielariassm@gmail.com
              </a>
            </address>
            <div className="footer-hours">
              <span className="d-block">Horarios</span>
              <small>Lun–Sáb: 10:00–19:00</small>
            </div>

            {/* Métodos de pago (iconos) */}
            <div className="payments" aria-label="Métodos de pago">
              <i className="fab fa-cc-visa" aria-hidden="true" title="Visa" />
              <i
                className="fab fa-cc-mastercard"
                aria-hidden="true"
                title="Mastercard"
              />
              <i className="fab fa-cc-amex" aria-hidden="true" title="AmEx" />
              <i
                className="fas fa-money-bill-wave"
                aria-hidden="true"
                title="Efectivo"
              />
            </div>
          </div>

          {/* Newsletter / CTA + Social */}
          <div className="col-xl-3 col-lg-3 col-md-6">
            <h5 className="footer-title text-md-start text-center">
              Novedades & Promos
            </h5>
            <p className="footer-muted">
              Suscríbete para recibir estilos, tips y promos (sin spam).
            </p>
            <form
              className="newsletter"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Formulario de suscripción"
            >
              <label htmlFor="newsletter-email" className="visually-hidden">
                Correo electrónico
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="tu@email.com"
                inputMode="email"
              />
              <button type="submit" className="btn-rose" aria-label="Suscribirse">
                Suscribirme
              </button>
            </form>

            <div className="social-block">
              <span className="footer-muted d-block mb-2">Síguenos</span>
              <div className="social-icons" role="list">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="social-btn"
                    aria-label={s.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="listitem"
                  >
                    <i className={`fab fa-${s.icon}`} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="footer-separator" />

        {/* Bottom row */}
        <div className="footer-bottom row align-items-center">
          <div className="col-12 col-lg text-center text-lg-start">
            <p className="footer-copy mb-0">
              &copy; {year} CataaNails. Todos los derechos reservados.
            </p>
          </div>
          <div className="col-12 col-lg-auto text-center text-lg-end">
            <ul className="footer-legal">
              <li>
                <Link to="/terminos" className="footer-link">
                  Términos
                </Link>
              </li>
              <li>
                <Link to="/privacidad" className="footer-link">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="footer-link">
                  Cookies
                </Link>
              </li>
              <li>
                <button
                  className="link-ghost"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  aria-label="Volver arriba"
                >
                  Volver arriba ↑
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Glow decorativo */}
      <div className="footer-glow" aria-hidden="true" />

      {/* CTA de WhatsApp dentro del footer */}
      <div className="footer-cta">
        <a
          href="https://wa.me/56912345678?text=Hola%20CataaNails,%20quisiera%20reservar%20una%20hora"
          className="cta-pill"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Reservar por WhatsApp"
        >
          <i className="fab fa-whatsapp" aria-hidden="true" />
          <span>Reservar por WhatsApp</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
