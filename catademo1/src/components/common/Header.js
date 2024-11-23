import React, { useState } from "react";
import "../../styles/components/header.css";
import logo from "../../assets/images/home/logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const Header = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleProfileClick = () => {
    if (user?.rol === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/perfil");
    }
    setIsNavbarCollapsed(true);
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsNavbarCollapsed(true);
    }
  };

  const toggleNavbar = () => {
    setIsNavbarCollapsed(!isNavbarCollapsed);
  };

  return (
    <header>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div className="container">
          {/* Logo */}
          <Link
            className="navbar-brand d-flex flex-column align-items-center"
            to="/"
          >
            <img src={logo} alt="Logo" className="logo mb-1" />
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            onClick={toggleNavbar}
            aria-controls="navbarNav"
            aria-expanded={!isNavbarCollapsed}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className={`collapse navbar-collapse ${
              isNavbarCollapsed ? "" : "show"
            }`}
            id="navbarNav"
          >
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/" onClick={handleNavLinkClick}>
                  Inicio
                </Link>
              </li>
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn"
                  type="button"
                  id="navbarDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Servicios
                </button>
                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/manicure"
                      onClick={handleNavLinkClick}
                    >
                      Manicure
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/pedicure"
                      onClick={handleNavLinkClick}
                    >
                      Pedicure
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/alisado-permanente"
                      onClick={handleNavLinkClick}
                    >
                      Alisado Permanente
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/botox-capilar"
                      onClick={handleNavLinkClick}
                    >
                      Botox Capilar
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/trabajos-realizados"
                  onClick={handleNavLinkClick}
                >
                  Trabajos Realizados
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/about"
                  onClick={handleNavLinkClick}
                >
                  Sobre Nosotros
                </Link>
              </li>
            </ul>

            <ul className="navbar-nav ms-auto">
              {user ? (
                <>
                  <li className="nav-item">
                    <button
                      className="btn nav-link"
                      onClick={handleProfileClick}
                    >
                      Hola, {user.nombre || "Usuario"}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-link nav-link"
                      onClick={handleLogout}
                    >
                      Cerrar sesión
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/login"
                    onClick={handleNavLinkClick}
                  >
                    Iniciar Sesión
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
