import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Card, Container, Row, Col } from "react-bootstrap";
import { db } from "../../firebase/firebaseServicios";

const currencyCL = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const SafeImg = ({ src, alt }) => {
  const [ok, setOk] = useState(true);
  if (!src || !ok) {
    return <div className="service-card-image placeholder shimmer" aria-hidden="true" />;
  }
  return (
    <Card.Img
      variant="top"
      src={src}
      alt={alt}
      className="service-card-image"
      loading="lazy"
      onError={() => setOk(false)}
    />
  );
};

const Badge = ({ children, tone = "rose" }) => (
  <span className={`pill pill--${tone}`} role="note">{children}</span>
);

const AlisadoPermanente = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, "alisadopermanente");
        const snap = await getDocs(servicesCollection);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setServices(list);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("No pudimos cargar los servicios. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const goToForm = (service) => {
    const serviceName  = service.Nombre || service.name || service.service || "";
    const servicePrice = service.Precio ?? service.price ?? "";
    navigate(
      `/agendar-cita?serviceId=${encodeURIComponent(service.id)}&serviceName=${encodeURIComponent(serviceName)}&servicePrice=${encodeURIComponent(servicePrice)}`,
      { state: { service }, replace: false }
    );
  };

  const handleSelectService = (service) => {
    setSelectedServiceId(service.id);
    goToForm(service); // navegación inmediata
  };

  if (loading) {
    return (
      <Container className="service-container mt-5">
        <Row className="justify-content-center mt-4">
          {[...Array(6)].map((_, i) => (
            <Col key={i} xs={12} sm={6} md={4} lg={3} className="mb-4 d-flex justify-content-center">
              <div className="service-card service-card--loading">
                <div className="service-card-image placeholder shimmer" />
                <div className="card-body">
                  <div className="sk-line w-75" />
                  <div className="sk-pill w-50" />
                  <div className="sk-line w-50" />
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="service-container mt-5">
        <p className="text-center text-danger">{error}</p>
      </Container>
    );
  }

  return (
    <Container className="service-container mt-5">
      <Row className="text-center mt-4">
        <Col>
          <div className="services-header">
            <h1 className="services-title">Alisados Permanentes</h1>
            <p className="services-subtitle">
              Tratamiento profesional para un cabello liso, suave y brillante por más tiempo.
              Reduce volumen y frizz para un look sedoso y fácil de peinar, sin calor constante.
            </p>
            <div className="services-divider" aria-hidden="true" />
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center mt-4">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;
          const name       = service.Nombre || "Servicio";
          const tipo       = service.Tipo || "No especificado";
          const priceNum   = service.Precio ?? service.price ?? null;
          const priceTxt   = priceNum !== null ? currencyCL.format(priceNum) : "—";
          const isPromo    = Boolean(service.Promo || service.promo);
          const isNew      = Boolean(service.Nuevo || service.nuevo);

          return (
            <Col
              key={service.id}
              xs={12}
              sm={6}
              md={4}
              lg={3}
              className="mb-4 d-flex justify-content-center"
            >
              <Card
                className={`service-card ${isSelected ? "service-card--selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectService(service)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectService(service); }}
                aria-pressed={isSelected}
              >
                <div className="ribbon-wrap">
                  {isPromo && <div className="ribbon">Promo</div>}
                </div>

                <SafeImg src={service.ImagenUrl} alt={name} />

                <Card.Body className="d-flex flex-column">
                  <Card.Title className="text-center">{name}</Card.Title>

                  <div className="text-center mb-2">
                    <Badge tone="rose">{tipo}</Badge>
                    {isNew && <Badge tone="violet">Nuevo</Badge>}
                  </div>

                  <div className="service-card-price text-center" aria-label={`Precio ${priceTxt}`}>
                    <span className="price-label">Desde</span>
                    <span className="price-amount">{priceTxt}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default AlisadoPermanente;
