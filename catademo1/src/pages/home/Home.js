import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeViewModel } from "../../viewmodels/HomeViewModel";
import "../../styles/components/home.css";
import profesional from "../../assets/images/home/profesional.jpg";

const Home = () => {
  const [services, setServices] = useState([]);
  const navigate = useNavigate(); // Hook para la navegación
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viewModel = new HomeViewModel();

  useEffect(() => {
    setServices(viewModel.getServices());
  }, [viewModel]);

  // Función para manejar el clic en el botón "Ver Servicios"
  const handleServiceClick = (servicePath) => {
    navigate(servicePath); // Navega a la ruta del servicio
  };

  return (
    <div className="home-container">
      {/* Fondo minimalista */}
      <div className="hero-section">
        <h1 className="hero-title">Bienvenido a CataaNails</h1>
        <p className="hero-subtitle">
          Belleza en manos y pies con un toque de perfección
        </p>
      </div>

      {/* Servicios */}
      <div className="services-section">
        <h2 className="section-title">Nuestros Servicios</h2>
        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <img
                src={service.image}
                alt={service.name}
                className="service-image"
              />
              <h5 className="service-name">{service.name}</h5>
              <p className="service-description">{service.description}</p>
              <button
                className="schedule-button"
                onClick={() => handleServiceClick(service.path)} // Navega al servicio correspondiente
              >
                Ver Servicios
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Información de la Profesional */}
      <div className="professional-section text-center mt-5">
        <h2 className="section-title mb-4">Conoce a Nuestra Profesional</h2>
        <div className="professional-info d-flex flex-column align-items-center">
          <img
            src={profesional}
            alt="Profesional Manicurista"
            className="professional-image rounded-circle shadow-sm mb-3"
          />
          <p className="professional-description">
            María López, con más de 10 años de experiencia en la estética de
            manos y pies, ofrece tratamientos personalizados de alta calidad
            para cada cliente.
          </p>
        </div>
      </div>

      {/* Sucursales */}
      <div className="branches-section mt-5">
        <h2 className="section-title text-center">Ubicación</h2>
        <p className="section-subtitle text-center">
          Visítanos en nuestro Home Studio
        </p>
        <div className="row">
          <div className="col-md-6">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.688992307928!2d-70.64826718480083!3d-33.44052418077992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662c589ac6952a5%3A0x27b456d7626ae623!2sPallachata 1424, 3811616 Chillán, Ñuble!5e0!3m2!1sen!2scl!4v1637020226490!5m2!1sen!2scl"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="Mapa de sucursales"
            ></iframe>
          </div>
          <div className="col-md-6">
            <h3 className="text-center mb-4">Home Studio</h3>
            <div className="gallery">
              <img
                src=""
                alt="Home Studio"
                className="img-fluid gallery-image rounded shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
