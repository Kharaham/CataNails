import React, { useState } from "react";
import "../../styles/components/header.css";
import logo from "../../assets/images/home/logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const Header = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);

  const handleLogout = () => auth.signOut();

  const handleProfileClick = () => {
    if (user?.rol === "admin") navigate("/admin/dashboard");
    else navigate("/perfil");
    setIsNavbarCollapsed(true);
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768) setIsNavbarCollapsed(true);
  };

  const toggleNavbar = () => setIsNavbarCollapsed(!isNavbarCollapsed);

  return (
    <header className="site-header" role="banner">
      <nav className="navbar navbar-expand-lg header-nav" role="navigation" aria-label="Principal">
        <div className="container">

          {/* Brand */}
          <Link className="navbar-brand brand" to="/" onClick={handleNavLinkClick}>
            <img src={logo} alt="CataaNails" className="brand-logo" />
            <span className="brand-text">CataaNails</span>
          </Link>

          {/* Toggler */}
          <button
            className="navbar-toggler header-toggle"
            type="button"
            onClick={toggleNavbar}
            aria-controls="navbarNav"
            aria-expanded={!isNavbarCollapsed}
            aria-label="Abrir menú"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Menu */}
          <div className={`collapse navbar-collapse ${isNavbarCollapsed ? "" : "show"}`} id="navbarNav">
            <ul className="navbar-nav mx-auto header-links">
              <li className="nav-item">
                <Link className="nav-link uline" to="/" onClick={handleNavLinkClick}>
                  Inicio
                </Link>
              </li>

              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn uline"
                  type="button"
                  id="navbarDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Servicios
                </button>
                <ul className="dropdown-menu menu-card" aria-labelledby="navbarDropdown">
                  <li>
                    <Link className="dropdown-item" to="/manicure" onClick={handleNavLinkClick}>
                      Manicure
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/pedicure" onClick={handleNavLinkClick}>
                      Pedicure
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/alisado-permanente" onClick={handleNavLinkClick}>
                      Alisado Permanente
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/botox-capilar" onClick={handleNavLinkClick}>
                      Botox Capilar
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="nav-item">
                <Link className="nav-link uline" to="/trabajos-realizados" onClick={handleNavLinkClick}>
                  Portafolio
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link uline" to="/about" onClick={handleNavLinkClick}>
                  Sobre mí
                </Link>
              </li>
            </ul>

            {/* CTA + Auth */}
            <div className="d-flex align-items-center gap-2 header-cta">
              <Link to="/reservas" className="btn btn-reserve" onClick={handleNavLinkClick}>
                Reservar
              </Link>

              {user ? (
                <>
                  <button className="btn btn-ghost" onClick={handleProfileClick}>
                    Hola, {user.nombre || "Usuario"}
                  </button>
                  <button className="btn btn-link link-logout" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link className="btn btn-ghost" to="/login" onClick={handleNavLinkClick}>
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
