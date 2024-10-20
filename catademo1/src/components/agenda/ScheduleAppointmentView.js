// src/components/ScheduleAppointmentView.js

import React from "react";
import useScheduleAppointmentViewModel from "../../viewmodels/ScheduleAppointmentViewModel";

import {
  Form,
  Button,
  Alert,
  Spinner,
  Container,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import "../../styles/components/appointment.css"; // Estilos personalizados

const ScheduleAppointmentView = () => {
  const {
    name,
    setName,
    email,
    setEmail,
    date,
    setDate,
    time,
    setTime,
    service,
    setService,
    mode,
    setMode,
    comment,
    setComment,
    loading,
    success,
    error,
    handleSubmit,
  } = useScheduleAppointmentViewModel();

  return (
    <Container className="appointment-form mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="p-4 shadow-lg custom-card">
            <Card.Body>
              <h2 className="text-center mb-4 form-title">Agendar Cita</h2>

              {success && (
                <Alert variant="success">¡Cita agendada con éxito!</Alert>
              )}
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="name" className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ingresa tu nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="custom-input"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="email" className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Ingresa tu email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="custom-input"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group controlId="date" className="mb-3">
                      <Form.Label>Fecha</Form.Label>
                      <Form.Control
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="custom-input"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="time" className="mb-3">
                      <Form.Label>Hora</Form.Label>
                      <Form.Control
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="custom-input"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group controlId="service" className="mb-3">
                      <Form.Label>Servicio</Form.Label>
                      <Form.Control
                        as="select"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="custom-input"
                        required
                      >
                        <option value="">Selecciona un servicio</option>
                        <option value="Manicure">Manicure</option>
                        <option value="Pedicure">Pedicure</option>
                        <option value="Alisados">Alisados</option>
                        <option value="Botox Capilar">Botox Capilar</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="mode" className="mb-3">
                      <Form.Label>Modalidad</Form.Label>
                      <Form.Control
                        as="select"
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="custom-input"
                        required
                      >
                        <option value="">Selecciona la modalidad</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Domicilio">Domicilio</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group controlId="comment" className="mb-3">
                  <Form.Label>Comentario</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Escribe algún comentario para la profesional"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="custom-input"
                  />
                </Form.Group>

                <div className="text-center">
                  <Button
                    variant="primary"
                    type="submit"
                    className="mt-4 custom-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Agendar Cita"
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ScheduleAppointmentView;
