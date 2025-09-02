import React, { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  faTimes,
  faChevronDown,
  faChevronRight,
  faCog,
  faSignOutAlt,
  faSearch,
  faEllipsisV,
} from "@fortawesome/free-solid-svg-icons";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";

const LOCAL_KEY = "adminSidebarPrefs_v1";

const AdminSidebar = ({
  defaultPosition = "left", // "left" | "right"
  defaultFixed = true,
  defaultWidth = 280, // px
  defaultSidebarBg = "#0f172a",
  defaultSidebarFg = "#e2e8f0",
  defaultAccent = "#ff3b7b",
}) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(
    window.innerWidth > 768
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(3);

  // Personalización
  const [sidebarPosition, setSidebarPosition] = useState(defaultPosition);
  const [isFixed, setIsFixed] = useState(defaultFixed);
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [sidebarBg, setSidebarBg] = useState(defaultSidebarBg);
  const [sidebarFg, setSidebarFg] = useState(defaultSidebarFg);
  const [accentColor, setAccentColor] = useState(defaultAccent);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  const sidebarRef = useRef(null);
  const location = useLocation();

  // Cargar preferencias guardadas
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY));
      if (saved) {
        if (saved.sidebarPosition) setSidebarPosition(saved.sidebarPosition);
        if (typeof saved.isFixed === "boolean") setIsFixed(saved.isFixed);
        if (saved.sidebarWidth) setSidebarWidth(saved.sidebarWidth);
        if (saved.sidebarBg) setSidebarBg(saved.sidebarBg);
        if (saved.sidebarFg) setSidebarFg(saved.sidebarFg);
        if (saved.accentColor) setAccentColor(saved.accentColor);
      }
    } catch (_) {}
  }, []);

  // Guardar preferencias
  useEffect(() => {
    const prefs = {
      sidebarPosition,
      isFixed,
      sidebarWidth,
      sidebarBg,
      sidebarFg,
      accentColor,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  }, [
    sidebarPosition,
    isFixed,
    sidebarWidth,
    sidebarBg,
    sidebarFg,
    accentColor,
  ]);

  // Menú
  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        title: "Panel de Control",
        icon: faTachometerAlt,
        path: "/admin/dashboard",
        badge: null,
        group: "main",
      },
      {
        id: "appointments",
        title: "Gestión de Citas",
        icon: faCalendarCheck,
        path: "/admin/appointments",
        badge: notifications > 0 ? notifications : null,
        group: "booking",
      },
      {
        id: "workdays",
        title: "Calendario",
        icon: faCalendarDay,
        path: "/admin/workdays",
        badge: null,
        group: "booking",
      },
      {
        id: "bank-balance",
        title: "Ingresos Totales",
        icon: faDollarSign,
        path: "/admin/bank-balance",
        badge: null,
        group: "finance",
      },
      {
        id: "services",
        title: "Servicios",
        icon: faBriefcase,
        path: "/admin/services",
        badge: null,
        group: "content",
      },
      {
        id: "gallery",
        title: "Trabajos Realizados",
        icon: faImages,
        path: "/admin/trabajos-realizados",
        badge: null,
        group: "content",
      },
      {
        id: "reviews",
        title: "Reseñas",
        icon: faStar,
        path: "/admin/reviews",
        badge: null,
        group: "feedback",
      },
      {
        id: "comments",
        title: "Comentarios",
        icon: faComments,
        path: "/admin/contact-comments",
        badge: null,
        group: "feedback",
      },
      {
        id: "users",
        title: "Gestión de Usuarios",
        icon: faUsers,
        path: "/admin/users",
        badge: null,
        group: "management",
      },
      {
        id: "reports",
        title: "Reportes",
        icon: faChartBar,
        path: "/admin/reports",
        badge: null,
        group: "reports",
      },
    ],
    [notifications]
  );

  const groups = {
    main: { title: "Principal", icon: faTachometerAlt },
    booking: { title: "Reservas", icon: faCalendarCheck },
    finance: { title: "Finanzas", icon: faDollarSign },
    reports: { title: "Reportes", icon: faChartBar },
    content: { title: "Contenido", icon: faImages },
    feedback: { title: "Feedback", icon: faStar },
    management: { title: "Gestión", icon: faUsers },
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return menuItems;
    return menuItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const grouped = {};
    filteredItems.forEach((item) => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const toggleGroup = (groupId) => {
    const next = new Set(expandedGroups);
    next.has(groupId) ? next.delete(groupId) : next.add(groupId);
    setExpandedGroups(next);
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768) setIsSidebarVisible(false);
  };

  const handleOutsideClick = (event) => {
    if (
      sidebarRef.current &&
      !sidebarRef.current.contains(event.target) &&
      window.innerWidth <= 768 &&
      isSidebarVisible
    ) {
      setIsSidebarVisible(false);
    }
  };

  useEffect(() => {
    if (isSidebarVisible && window.innerWidth <= 768) {
      document.body.classList.add("no-scroll");
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.body.classList.remove("no-scroll");
    };
  }, [isSidebarVisible]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsSidebarVisible(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Expandir grupo del activo
  useEffect(() => {
    const activeItem = menuItems.find(
      (item) => location.pathname === item.path
    );
    if (activeItem && !expandedGroups.has(activeItem.group)) {
      setExpandedGroups((prev) => new Set([...prev, activeItem.group]));
    }
  }, [location.pathname, menuItems, expandedGroups]);

  // Variables CSS dinámicas
  const cssVars = {
    "--sidebar-width": `${sidebarWidth}px`,
    "--sidebar-bg": sidebarBg,
    "--sidebar-fg": sidebarFg,
    "--sidebar-accent": accentColor,
  };

  return (
    <>
      {/* Overlay móvil */}
      {isSidebarVisible && window.innerWidth <= 768 && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* Toggle */}
      <button
        className={`sidebar-toggle-button ${isSidebarVisible ? "active" : ""}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <FontAwesomeIcon icon={isSidebarVisible ? faTimes : faBars} />
      </button>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`admin-sidebar ${isSidebarVisible ? "visible" : "hidden"} ${
          isCollapsed ? "collapsed" : ""
        }`}
        role="navigation"
        aria-label="Admin navigation"
        data-position={sidebarPosition}
        data-fixed={isFixed ? "true" : "false"}
        style={cssVars}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="admin-profile">
            <div className="profile-image-container">
              <img
                src="https://img.freepik.com/vector-premium/ilustracion-manicurista-dibujos-animados-lindo_131817-16.jpg"
                alt="Catalina - Admin"
                className="profile-image"
                loading="lazy"
              />
              <div className="profile-status online" title="En línea"></div>
            </div>
            {!isCollapsed && (
              <div className="profile-info">
                <h5 className="profile-name">Catalina</h5>
                <span className="profile-role">Administradora</span>
              </div>
            )}
          </div>

          <div className="sidebar-controls">
            {/* Personalización */}
            <button
              className="control-btn"
              onClick={() => setShowQuickSettings((s) => !s)}
              title="Personalizar"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </button>

            <button
              className="control-btn"
              onClick={toggleCollapse}
              title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <FontAwesomeIcon
                icon={isCollapsed ? faChevronRight : faChevronDown}
              />
            </button>
          </div>
        </div>

        {/* Panel de personalización */}
        {!isCollapsed && showQuickSettings && (
          <div className="quick-settings">
            <div className="qs-row">
              <label>Fondo</label>
              <input
                type="color"
                value={sidebarBg}
                onChange={(e) => setSidebarBg(e.target.value)}
              />
            </div>
            <div className="qs-row">
              <label>Texto</label>
              <input
                type="color"
                value={sidebarFg}
                onChange={(e) => setSidebarFg(e.target.value)}
              />
            </div>
            <div className="qs-row">
              <label>Acento</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </div>
            <div className="qs-row">
              <label>Ancho</label>
              <input
                type="range"
                min="220"
                max="360"
                value={sidebarWidth}
                onChange={(e) => setSidebarWidth(parseInt(e.target.value, 10))}
              />
              <span className="qs-value">{sidebarWidth}px</span>
            </div>
            <div className="qs-row">
              <label>Posición</label>
              <div className="qs-seg">
                <button
                  className={`seg-btn ${
                    sidebarPosition === "left" ? "active" : ""
                  }`}
                  onClick={() => setSidebarPosition("left")}
                >
                  Izquierda
                </button>
                <button
                  className={`seg-btn ${
                    sidebarPosition === "right" ? "active" : ""
                  }`}
                  onClick={() => setSidebarPosition("right")}
                >
                  Derecha
                </button>
              </div>
            </div>
            <div className="qs-row">
              <label>Fijo</label>
              <label className="qs-switch">
                <input
                  type="checkbox"
                  checked={isFixed}
                  onChange={(e) => setIsFixed(e.target.checked)}
                />
                <span>Siempre visible</span>
              </label>
            </div>
          </div>
        )}

        {/* Búsqueda */}
        {!isCollapsed && (
          <div className="sidebar-search">
            <div className="search-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className="sidebar-nav">
          {Object.entries(groupedItems).map(([groupId, items]) => {
            const group = groups[groupId];
            const isExpanded = expandedGroups.has(groupId) || isCollapsed;

            return (
              <div key={groupId} className="nav-group">
                {!isCollapsed && (
                  <button
                    className={`group-header ${isExpanded ? "expanded" : ""}`}
                    onClick={() => toggleGroup(groupId)}
                    aria-expanded={isExpanded}
                  >
                    <div className="group-info">
                      <FontAwesomeIcon
                        icon={group.icon}
                        className="group-icon"
                      />
                      <span className="group-title">{group.title}</span>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`group-chevron ${isExpanded ? "rotated" : ""}`}
                    />
                  </button>
                )}

                <div
                  className={`nav-items ${
                    isExpanded ? "expanded" : "collapsed"
                  }`}
                >
                  {items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""} ${
                          isCollapsed ? "collapsed-item" : ""
                        }`
                      }
                      onClick={handleNavLinkClick}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <div className="nav-content">
                        <FontAwesomeIcon
                          icon={item.icon}
                          className="nav-icon"
                        />
                        {!isCollapsed && (
                          <>
                            <span className="nav-title">{item.title}</span>
                            {item.badge && (
                              <span
                                className="nav-badge"
                                aria-label={`${item.badge} notificaciones`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {isCollapsed && item.badge && (
                        <span className="collapsed-badge">{item.badge}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <NavLink
            to="/admin/settings"
            className="footer-item"
            title={isCollapsed ? "Configuración" : undefined}
          >
            <FontAwesomeIcon icon={faCog} />
            {!isCollapsed && <span>Configuración</span>}
          </NavLink>

          <button
            className="footer-item logout-btn"
            onClick={() => {
              /* Lógica de logout */
            }}
            title={isCollapsed ? "Cerrar sesión" : undefined}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>

        {/* Estado conexión */}
        <div className="connection-status online">
          <div className="status-dot"></div>
          {!isCollapsed && <span>Conectado</span>}
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
