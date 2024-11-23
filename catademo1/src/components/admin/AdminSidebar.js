import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../../styles/adminS/sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faUsers,
  faCalendarCheck,
  faBriefcase,
  faCalendarDay,
  faStar,
  faImages,
  faDollarSign,
  faComments,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

const AdminSidebar = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarVisible(false);
    }
  };

  useEffect(() => {
    if (isSidebarVisible && window.innerWidth <= 768) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [isSidebarVisible]);

  return (
    <div>
      <button
        className="sidebar-toggle-button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
      <div
        className={`admin-sidebar bg-dark text-white p-3 ${
          isSidebarVisible ? "" : "hidden"
        }`}
      >
        <div className="admin-profile mb-4 text-center">
          <img
            src="https://img.freepik.com/vector-premium/ilustracion-manicurista-dibujos-animados-lindo_131817-16.jpg"
            alt="Admin"
            className="img-fluid rounded-circle border border-light"
          />
          <h5 className="mt-2">Catalina</h5>
        </div>

        <ul className="nav flex-column">
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/dashboard"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faTachometerAlt} className="me-2" /> Panel
              de Control
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/appointments"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />{" "}
              Gestión de Citas
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/bank-balance"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faDollarSign} className="me-2" /> Ingresos
              Totales
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/workdays"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faCalendarDay} className="me-2" />{" "}
              Calendario
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/services"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Servicios
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/trabajos-realizados"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faImages} className="me-2" /> Trabajos
              Realizados
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/reviews"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faStar} className="me-2" /> Reseñas
            </NavLink>
          </li>
          <li className="nav-item mb-3">
            <NavLink
              className="nav-link text-white"
              to="/admin/users"
              onClick={handleNavLinkClick}
            >
              <FontAwesomeIcon icon={faUsers} className="me-2" /> Gestión de
              Usuarios
            </NavLink>
          </li>

          <li className="nav-item mb-3" onClick={handleNavLinkClick}>
            <NavLink
              className="nav-link text-white"
              to="/admin/contact-comments"
            >
              <FontAwesomeIcon icon={faComments} className="me-2" /> Comentarios
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSidebar;
