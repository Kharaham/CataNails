import React from "react";
import "../../styles/components/header.css";
import logo from "../../assets/images/home/logo.jpg";
import { Link } from "react-router-dom"; // Asegúrate de tener el logo aquí

const Header = () => {
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
                    {/* Navbar Toggler (para pantallas pequeñas) */}
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    {/* Navegación */}
                    <div
                        className="collapse navbar-collapse justify-content-center"
                        id="navbarNav"
                    >
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className="nav-link" to="/">
                                    Inicio
                                </Link>
                            </li>

                            {/* Servicios Dropdown */}
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#servicios"
                                    id="navbarDropdown"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Servicios
                                </a>
                                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                                    <li>
                                        <Link className="dropdown-item" to="/manicure">
                                            Manicure
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/pedicure">
                                            Pedicure
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/alisado-permanente">
                                            Alisado Permanente
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/botox-capilar">
                                            Botox Capilar
                                        </Link>
                                    </li>

                                </ul>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/trabajos-realizados">
                                    Trabajos Realizados
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/about">
                                    About
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/login">
                                    Login
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Ícono de búsqueda */}
                    <div className="search-icon">
                        <i className="fas fa-search"></i>{" "}
                        {/* FontAwesome para el ícono de búsqueda */}
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
