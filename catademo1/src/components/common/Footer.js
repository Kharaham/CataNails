import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/footer.css";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
};

const Footer = () => {
  const isMobile = useIsMobile();
  const year = new Date().getFullYear();

  const quickLinks = useMemo(
    () => [
      { to: "/", label: "Inicio" },
      { to: "/trabajos-realizados", label: "Trabajos Realizados" },
      { to: "/about", label: "Sobre nosotros" },
    ],
    []
  );

  const social = useMemo(
    () => [
      { href: "https://facebook.com", icon: "facebook-f", label: "Facebook" },
      { href: "https://instagram.com", icon: "instagram", label: "Instagram" },
      {
        href: "https://wa.me/56912345678?text=Hola%20CataaNails,%20quisiera%20reservar%20una%20hora",
        icon: "whatsapp",
        label: "WhatsApp",
      },
      { href: "https://tiktok.com", icon: "tiktok", label: "TikTok" },
    ],
    []
  );

  const [openSection, setOpenSection] = useState(null);
  const toggle = (section) =>
    setOpenSection(openSection === section ? null : section);

  return (
    <footer className="footer v3" role="contentinfo">
      {/* Wave superior */}
      <div className="footer-divider">
        <svg viewBox="0 0 1440 64">
          <path d="M0,32 C240,64 480,0 720,16 C960,32 1200,80 1440,48 L1440,64 L0,64 Z" />
        </svg>
      </div>

      <div className="footer-top container">
        {isMobile && (
          <div className="mobile-footer">
            <div className="footer-accordion">
              <button
                className={`fa-toggle ${openSection === "brand" ? "open" : ""}`}
                onClick={() => toggle("brand")}
              >
                <span>CataaNails</span>
                <i className="fas fa-chevron-down" />
              </button>

              <div
                className={`fa-content ${
                  openSection === "brand" ? "open" : ""
                }`}
              >
                <div className="footer-brand cardish">
                  <Link to="/" className="footer-logo">
                    <span className="logo-dot" />
                    <span className="logo-text">CataaNails</span>
                  </Link>

                  <p className="footer-desc">
                    Manicure, pedicure, alisados y bótox capilar. Técnicas
                    seguras y resultados consistentes.
                  </p>

                  <ul className="trust-list">
                    <li>
                      <i className="fas fa-shield-alt" /> Reserva segura
                    </li>
                    <li>
                      <i className="fas fa-star" /> +100 reseñas
                    </li>
                    <li>
                      <i className="fas fa-spray-can" /> Higiene certificada
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="footer-accordion">
              <button
                className={`fa-toggle ${openSection === "links" ? "open" : ""}`}
                onClick={() => toggle("links")}
              >
                <span>Enlaces</span>
                <i className="fas fa-chevron-down" />
              </button>

              <div
                className={`fa-content ${
                  openSection === "links" ? "open" : ""
                }`}
              >
                <ul className="footer-list">
                  {quickLinks.map((item) => (
                    <li key={item.to}>
                      <Link to={item.to} className="footer-link">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="footer-accordion">
              <button
                className={`fa-toggle ${
                  openSection === "contact" ? "open" : ""
                }`}
                onClick={() => toggle("contact")}
              >
                <span>Contacto</span>
                <i className="fas fa-chevron-down" />
              </button>

              <div
                className={`fa-content ${
                  openSection === "contact" ? "open" : ""
                }`}
              >
                <div className="footer-address">
                  <span>Ñuble, Chile</span>
                  <a href="tel:+56912345678" className="footer-link">
                    +56 9 1234 5678
                  </a>
                  <a
                    href="mailto:danielariassm@gmail.com"
                    className="footer-link"
                  >
                    danielariassm@gmail.com
                  </a>
                </div>

                <div className="footer-hours">
                  <small>Lun–Sáb: 10:00–19:00</small>
                </div>

                <div className="payments">
                  <i className="fab fa-cc-visa" />
                  <i className="fab fa-cc-mastercard" />
                  <i className="fab fa-cc-amex" />
                  <i className="fas fa-money-bill-wave" />
                </div>
              </div>
            </div>

            <div className="footer-accordion">
              <button
                className={`fa-toggle ${
                  openSection === "promos" ? "open" : ""
                }`}
                onClick={() => toggle("promos")}
              >
                <span>Novedades & Promos</span>
                <i className="fas fa-chevron-down" />
              </button>

              <div
                className={`fa-content ${
                  openSection === "promos" ? "open" : ""
                }`}
              >
                <p className="footer-muted">
                  Recibe estilos, tips y promociones exclusivas.
                </p>

                <form className="newsletter">
                  <input type="email" placeholder="tu@email.com" />
                  <button className="btn-rose">Suscribirme</button>
                </form>

                <div className="social-icons">
                  {social.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      className="social-btn"
                      target="_blank"
                    >
                      <i className={`fab fa-${s.icon}`} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isMobile && (
          <div className="row gy-5">
            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="footer-brand cardish">
                <Link to="/" className="footer-logo">
                  <span className="logo-dot" />
                  <span className="logo-text">CataaNails</span>
                </Link>
                <p className="footer-desc">
                  Manicure, pedicure, alisados y bótox capilar. Técnicas
                  seguras, resultados consistentes y un trato cercano.
                </p>

                <ul className="trust-list">
                  <li>
                    <i className="fas fa-shield-alt" /> Reserva segura
                  </li>
                  <li>
                    <i className="fas fa-star" /> +100 reseñas
                  </li>
                  <li>
                    <i className="fas fa-spray-can" /> Protocolos de higiene
                  </li>
                </ul>
              </div>
            </div>

            <nav className="col-xl-2 col-lg-2 col-md-6">
              <h5 className="footer-title">Enlaces</h5>
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

            <div className="col-xl-3 col-lg-3 col-md-6">
              <h5 className="footer-title">Contacto</h5>
              <address className="footer-address">
                <span>Ñuble, Chile</span>
                <a className="footer-link" href="tel:+56912345678">
                  +56 9 1234 5678
                </a>
                <a
                  className="footer-link"
                  href="mailto:danielariassm@gmail.com"
                >
                  danielariassm@gmail.com
                </a>
              </address>

              <div className="footer-hours">
                <span className="d-block">Horarios</span>
                <small>Lun–Sáb: 10:00–19:00</small>
              </div>

              <div className="payments">
                <i className="fab fa-cc-visa" />
                <i className="fab fa-cc-mastercard" />
                <i className="fab fa-cc-amex" />
                <i className="fas fa-money-bill-wave" />
              </div>
            </div>

            <div className="col-xl-3 col-lg-3 col-md-6">
              <h5 className="footer-title">Novedades & Promos</h5>
              <p className="footer-muted">
                Suscríbete para recibir estilos, tips y promos (sin spam).
              </p>

              <form className="newsletter">
                <input type="email" placeholder="tu@email.com" />
                <button className="btn-rose">Suscribirme</button>
              </form>

              <div className="social-block">
                <span className="footer-muted">Síguenos</span>
                <div className="social-icons">
                  {social.map((s) => (
                    <a key={s.label} href={s.href} className="social-btn">
                      <i className={`fab fa-${s.icon}`} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <hr className="footer-separator" />

        <div className="footer-bottom text-center">
          <p className="footer-copy">
            &copy; {year} CataaNails. Todos los derechos reservados.
          </p>

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
              >
                Volver arriba ↑
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-glow" />

      <div className="footer-cta">
        <a
          href="https://wa.me/56912345678?text=Hola"
          className="cta-pill"
          target="_blank"
        >
          <i className="fab fa-whatsapp" />
          Reservar por WhatsApp
        </a>
      </div>
    </footer>
  );
};

export default Footer;
