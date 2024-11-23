import React from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/footer.css";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer bg-dark text-white">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-4">
            <h5 className="mb-3">CataaNails</h5>
            <p>
              Servicios profesionales de manicura, pedicura, alisados
              permanentes y botox capilar. Resaltamos tu Belleza, nos apasiona
              lo que hacemos.
            </p>
          </div>
          <div className="col-lg-3 col-md-6 mb-4">
            <h5 className="mb-3">Enlaces Rápidos</h5>
            <ul className="list-unstyled">
              <li>
                <Link to="/" className="footer-link">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/trabajos-realizados" className="footer-link">
                  Trabajos Realizados
                </Link>
              </li>
              <li>
                <Link to="/about" className="footer-link">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-lg-3 col-md-6 mb-4">
            <h5 className="mb-3 text-center">Síguenos</h5>
            <div className="social-icons d-flex justify-content-center">
              <a
                href="https://facebook.com"
                className="text-white me-3"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a
                href="https://instagram.com"
                className="text-white me-3"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="https://wa.me/tu_numero"
                className="text-white me-3"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
              <a
                href="https://tiktok.com"
                className="text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-4">
            <h5 className="mb-3">Contacto</h5>
            <p>
              Teléfono:{" "}
              <a href="tel:+56912345678" className="text-white">
                +56 9 1234 5678
              </a>
            </p>
            <p>
              Correo:{" "}
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=danielariassm@gmail.com"
                className="text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                danielariassm@gmail.com
              </a>
            </p>
          </div>
        </div>
        <div className="row mt-4">
          <div className="col text-center">
            <p className="small">
              &copy; 2024 CataaNails. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
