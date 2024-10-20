import React from "react";
import "../../styles/components/footer.css";

const Footer = () => {
  return (
    <footer className="footer bg-dark text-white">
      <div className="container">
        <div className="row">
          {/* Columna 1: Información de la empresa */}
          <div className="col-lg-4 col-md-6 mb-4">
            <h5 className="mb-3">CataaNails</h5>
            <p>
              Servicios profesionales de manicura, pedicura y estética para
              realzar tu belleza. Nos apasiona lo que hacemos.
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div className="col-lg-4 col-md-6 mb-4">
            <h5 className="mb-3">Enlaces Rápidos</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#inicio" className="text-white">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#trabajos-realizados" className="text-white">
                  Trabajos Realizados
                </a>
              </li>
              <li>
                <a href="#about" className="text-white">
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3: Redes sociales */}
          <div className="col-lg-4 col-md-6 mb-4">
            <h5 className="mb-3">Síguenos</h5>
            <div className="d-flex justify-content-start">
              <a href="#!" className="text-white me-3">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#!" className="text-white me-3">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#!" className="text-white me-3">
                <i className="fab fa-whatsapp"></i>
              </a>
              <a href="#!" className="text-white">
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
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
