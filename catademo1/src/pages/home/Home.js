import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeViewModel } from "../../viewmodels/HomeViewModel";
import ReviewSection from "../../components/common/ReviewSection";
import "../../styles/components/home.css";
import profesional from "../../assets/images/home/profesional.jpg";
import homeStudio1 from "../../assets/images/home/home1.WebP";
import homeStudio2 from "../../assets/images/home/home2.WebP";
import homeStudio3 from "../../assets/images/home/home3.WebP";
import homeStudio4 from "../../assets/images/home/home4.WebP";

const Home = () => {
  const [services, setServices] = useState([]);
  const navigate = useNavigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viewModel = new HomeViewModel();

  useEffect(() => {
    setServices(viewModel.getServices());
  }, [viewModel]);

  const handleServiceClick = (servicePath) => {
    navigate(servicePath);
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Bienvenido a CataaNails</h1>
        <p className="hero-subtitle">El arte de cuidar tus uñas.</p>
      </div>

      <div className="services-section">
        <h2 className="section-title text-center">Nuestros Servicios</h2>
        <div className="services-grid text center">
          {services.map((service) => (
            <div key={service.id} className="service-cardHome">
              <img
                src={service.image}
                alt={service.name}
                className="service-image"
              />
              <h5 className="service-name">{service.name}</h5>
              <p className="service-description">{service.description}</p>
              <button
                className="schedule-button"
                onClick={() => handleServiceClick(service.path)}
              >
                Ver Servicios
              </button>
            </div>
          ))}
        </div>
      </div>

      <ReviewSection />

      <div className="professional-section text-center mt-5">
        <h2 className="section-title text-center mb-4 ">Profesional</h2>
        <div className="professional-info d-flex flex-column align-items-center">
          <img
            src={profesional}
            alt="Profesional Manicurista"
            className="professional-image rounded-circle shadow-sm mb-3"
          />
          <p className="professional-description">
            Catalina Castro, con más de 3 años de experiencia en la estética de
            manos y pies, ofrece tratamientos personalizados de alta calidad
            para cada cliente.
          </p>
        </div>
      </div>

      {/* Ubicacion */}
      <div className="branches-section">
        <h2 className="section-title text-center">Ubicación</h2>
        <p className="section-subtitle text-center">
          Visítanos en nuestro Home Studio
        </p>
        <div className="row">
          <div className="location-container">
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
          <div className="branches-section" style={{ marginTop: "5px" }}></div>
          <div className="home-studio-gallery">
            <h3 className="section-title text-center">Home Studio</h3>
            <div className="gallery-home">
              <img
                src={homeStudio2}
                alt="Home Studio 1"
                className="img-fluid gallery-image rounded shadow-sm mb-3"
              />
              <img
                src={homeStudio3}
                alt="Home Studio 2"
                className="img-fluid gallery-image rounded shadow-sm"
              />
              <img
                src={homeStudio4}
                alt="Home Studio 1"
                className="img-fluid gallery-image rounded shadow-sm mb-3"
              />
              <img
                src={homeStudio1}
                alt="Home Studio 2"
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
