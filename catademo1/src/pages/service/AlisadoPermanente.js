import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import { db } from "../../firebase/firebaseServicios";

const AlisadoPermanente = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, "alisadopermanente");
        const servicesSnapshot = await getDocs(servicesCollection);
        const servicesList = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(servicesList);
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
  const serviceName = service.Nombre || service.name || service.service || "";
  const servicePrice = service.Precio ?? service.price ?? "";

  navigate(
    `/agendar-cita?serviceId=${encodeURIComponent(service.id)}&serviceName=${encodeURIComponent(serviceName)}&servicePrice=${encodeURIComponent(servicePrice)}`,
    {
      state: { service }, // seguimos enviando el objeto completo por state
      replace: false,
    }
  );
};


  const handleSelectService = (service) => {
    setSelectedServiceId(service.id);
    // “Apretar” agendar automáticamente:
    goToForm(service);
  };

  const handleAgendarClick = () => {
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) {
      // si quieres que SIEMPRE navegue con el primero, descomenta:
      // if (services.length) return goToForm(services[0]);
      alert("Selecciona un servicio para continuar 🙌");
      return;
    }
    goToForm(service);
  };

  if (loading) {
    return (
      <Container className="service-container mt-5">
        <p className="text-center text-muted">Cargando servicios…</p>
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
          <h2 className="display-4 title">Alisado Permanente</h2>
          <p className="lead text-muted">
            Consigue un cabello liso, sedoso y brillante con nuestros
            tratamientos de alisado permanente.
          </p>
        </Col>
      </Row>

      <Row className="justify-content-center mt-4">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;
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
                className={`service-card shadow-sm ${
                  isSelected ? "service-card--selected" : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectService(service)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleSelectService(service);
                  }
                }}
              >
                {service.ImagenUrl && (
                  <Card.Img
                    variant="top"
                    src={service.ImagenUrl}
                    alt={service.Nombre}
                    className="service-card-image"
                    // también puedes poner onClick aquí si solo quieres que sea la imagen
                    // onClick={() => handleSelectService(service)}
                  />
                )}
                <Card.Body className="d-flex flex-column justify-content-between">
                  <Card.Title className="text-center">
                    {service.Nombre}
                  </Card.Title>
                  <Card.Subtitle className="mb-2 text-muted text-center">
                    {service.Tipo || "No especificado"}
                  </Card.Subtitle>
                  <Card.Text className="text-center">
                    <strong>Precio:</strong> ${service.Precio}
                  </Card.Text>
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
