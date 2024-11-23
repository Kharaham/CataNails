import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Card, Container, Row, Col, Button } from "react-bootstrap";
import { db } from "../../firebase/firebaseServicios";

const Pedicure = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesCollection = collection(db, "pedicure");
      const servicesSnapshot = await getDocs(servicesCollection);
      const servicesList = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(servicesList);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const handleAgendarClick = () => {
    navigate("/agendar-cita");
  };

  return (
    <Container className="service-container mt-5">
      <Row className="text-center mt-4">
        <Col>
          <h2 className="display-4 title">Pedicure</h2>
          <p className="lead text-muted">
            Cuida de tus pies con nuestros servicios especiales. Desde pedicuras
            tradicionales hasta tratamientos completos.
          </p>
        </Col>
      </Row>

      <Row className="justify-content-center mt-4">
        {services.map((service) => (
          <Col
            key={service.id}
            xs={12}
            sm={6}
            md={4}
            lg={3}
            className="mb-4 d-flex justify-content-center"
          >
            <Card className="service-card shadow-sm">
              {service.ImagenUrl && (
                <Card.Img
                  variant="top"
                  src={service.ImagenUrl}
                  alt={service.Nombre}
                  className="service-card-image"
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
        ))}
      </Row>

      <div className="text-center my-4">
        <Button
          variant="custom"
          className="agendar-btn"
          onClick={handleAgendarClick}
        >
          Agendar
        </Button>
      </div>
    </Container>
  );
};

export default Pedicure;
