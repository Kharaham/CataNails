import React from "react";
import { Link } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/footer.css";

const Footer = () => {
  const year = new Date().getFullYear();

  const quickLinks = [
    { to: "/", label: "Inicio" },
    { to: "/trabajos-realizados", label: "Trabajos Realizados" },
    { to: "/about", label: "Sobre nosotros" },
    // { to: "/servicios", label: "Servicios" },
    // { to: "/contacto", label: "Contacto" },
  ];

  const social = [
    { href: "https://facebook.com", icon: "facebook-f", label: "Facebook" },
    { href: "https://instagram.com", icon: "instagram", label: "Instagram" },
    { href: "https://wa.me/56912345678?text=Hola%20CataaNails,%20quisiera%20reservar%20una%20hora", icon: "whatsapp", label: "WhatsApp" },
    { href: "https://tiktok.com", icon: "tiktok", label: "TikTok" },
  ];

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-top container">
        <div className="row gy-4">
          {/* Brand / About */}
          <div className="col-xl-4 col-lg-4 col-md-6">
            <div className="footer-brand">
              <Link to="/" className="footer-logo" aria-label="CataaNails - Ir al inicio">
                <span className="logo-dot" aria-hidden="true" />
                <span className="logo-text">CataaNails</span>
              </Link>
              <p className="footer-desc">
                Servicios profesionales de manicura, pedicura, alisados permanentes y bótox capilar.
                Resaltamos tu belleza con técnicas seguras y resultados consistentes.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <nav className="col-xl-2 col-lg-2 col-md-6" aria-labelledby="footer-quicklinks-title">
            <h5 id="footer-quicklinks-title" className="footer-title">Enlaces</h5>
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

          {/* Contact */}
          <div className="col-xl-3 col-lg-3 col-md-6">
            <h5 className="footer-title">Contacto</h5>
            <address className="footer-address">
              <span className="d-block">Ñuble, Chile</span>
              <a className="footer-link" href="tel:+56912345678">+56 9 1234 5678</a>
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
          </div>

          {/* Social */}
          <div className="col-xl-3 col-lg-3 col-md-6">
            <h5 className="footer-title text-md-start text-center">Síguenos</h5>
            <div className="social-icons">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="social-btn"
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className={`fab fa-${s.icon}`} aria-hidden="true" />
                  <span className="visually-hidden">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <hr className="footer-separator" />

        <div className="footer-bottom row align-items-center">
          <div className="col-12 col-md text-center text-md-start">
            <p className="footer-copy mb-0">
              &copy; {year} CataaNails. Todos los derechos reservados.
            </p>
          </div>
          <div className="col-12 col-md-auto text-center text-md-end">
            <ul className="footer-legal">
              <li><Link to="/terminos" className="footer-link">Términos</Link></li>
              <li><Link to="/privacidad" className="footer-link">Privacidad</Link></li>
              <li><Link to="/cookies" className="footer-link">Cookies</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Decorative gradient glow */}
      <div className="footer-glow" aria-hidden="true" />
    </footer>
  );
};

export default Footer;
