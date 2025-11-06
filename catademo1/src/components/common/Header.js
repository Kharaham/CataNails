import React, { useState } from "react";
import "../../styles/components/header.css";
import logo from "../../assets/images/home/logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const Header = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();

  // === Estado (prefijo headerC_) ===
  const [headerC_isCollapsed, setHeaderC_isCollapsed] = useState(true);

  // === Handlers (prefijo headerC_) ===
  const headerC_handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (_) {}
  };

  const headerC_goProfile = () => {
    if (user?.rol === "admin") navigate("/admin/dashboard");
    else navigate("/perfil");
    setHeaderC_isCollapsed(true);
  };

  const headerC_onNavClick = () => {
    if (window.innerWidth <= 768) setHeaderC_isCollapsed(true);
  };

  const headerC_toggle = () => setHeaderC_isCollapsed((v) => !v);

  return (
    <header className="headerC_root" role="banner">
      <nav
        className="navbar navbar-expand-lg headerC_nav"
        role="navigation"
        aria-label="Principal"
      >
        <div className="container">
          {/* Brand */}
          <Link
            className="navbar-brand headerC_brand"
            to="/"
            onClick={headerC_onNavClick}
          >
            <img src={logo} alt="CataaNails" className="headerC_brandLogo" />
            <span className="headerC_brandText">CataaNails</span>
          </Link>

          {/* Toggler */}
          <button
            className="navbar-toggler headerC_toggle"
            type="button"
            onClick={headerC_toggle}
            aria-controls="headerC_navbar"
            aria-expanded={!headerC_isCollapsed}
            aria-label="Abrir menú"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Menú */}
          <div
            className={`collapse navbar-collapse ${
              headerC_isCollapsed ? "" : "show"
            }`}
            id="headerC_navbar"
          >
            <ul className="navbar-nav mx-auto headerC_links">
              <li className="nav-item">
                <Link
                  className="nav-link headerC_uline"
                  to="/"
                  onClick={headerC_onNavClick}
                >
                  Inicio
                </Link>
              </li>

              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn headerC_uline headerC_dropdownBtn"
                  type="button"
                  id="headerC_dropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Servicios
                </button>
                <ul
                  className="dropdown-menu headerC_menuCard"
                  aria-labelledby="headerC_dropdown"
                >
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/manicure"
                      onClick={headerC_onNavClick}
                    >
                      Manicure
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/pedicure"
                      onClick={headerC_onNavClick}
                    >
                      Pedicure
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/alisado-permanente"
                      onClick={headerC_onNavClick}
                    >
                      Alisado Permanente
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/botox-capilar"
                      onClick={headerC_onNavClick}
                    >
                      Botox Capilar
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="nav-item">
                <Link
                  className="nav-link headerC_uline"
                  to="/trabajos-realizados"
                  onClick={headerC_onNavClick}
                >
                  Portafolio
                </Link>
              </li>

              <li className="nav-item">
                <Link
                  className="nav-link headerC_uline"
                  to="/about"
                  onClick={headerC_onNavClick}
                >
                  Sobre mí
                </Link>
              </li>
            </ul>

            {/* CTA + Auth */}
            <div className="d-flex align-items-center gap-2 headerC_cta">
              {user ? (
                <>
                  <button
                    className="headerC_btnGhost"
                    onClick={headerC_goProfile}
                  >
                    Hola, {user.nombre || "Usuario"}
                  </button>
                  <button
                    className="headerC_linkLogout"
                    onClick={headerC_handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link
                  className="headerC_btnGhost"
                  to="/login"
                  onClick={headerC_onNavClick}
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
