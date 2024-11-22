import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Card, Button, Alert, Form } from "react-bootstrap";
import ServiceForm from "./ServiceForm";
import "../../styles/adminS/servicios.css";

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentCategory, setCurrentCategory] = useState("manicure");

  useEffect(() => {
    fetchServices(currentCategory);
  }, [currentCategory]);

  const fetchServices = async (category) => {
    try {
      const servicesCollection = collection(db, category);
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

  const handleAddService = async (service) => {
    try {
      await addDoc(collection(db, service.categoria), {
        Nombre: service.Nombre,
        Precio: service.Precio,
        Tipo: service.Tipo,
        ImagenUrl: service.ImagenUrl,
      });
      fetchServices(service.categoria);
      setFeedbackMessage("Servicio agregado exitosamente");
      setShowForm(false);
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleEditService = async (service) => {
    try {
      const serviceRef = doc(db, service.categoria, service.id);
      await updateDoc(serviceRef, {
        Nombre: service.Nombre,
        Precio: service.Precio,
        Tipo: service.Tipo,
        ImagenUrl: service.ImagenUrl,
      });
      fetchServices(service.categoria);
      setEditingService(null);
      setFeedbackMessage("Servicio actualizado exitosamente");
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const serviceDoc = doc(db, currentCategory, id);
      await deleteDoc(serviceDoc);
      fetchServices(currentCategory);
      setFeedbackMessage("Servicio eliminado exitosamente");
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
      setFeedbackMessage(`Error al eliminar servicio: ${error.message}`);
    }
  };

  const handleEditClick = (service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingService(null);
    setShowForm(true);
  };

  return (
    <div className="container-servicios">
      <h2 className="my-4">Gestión de Servicios</h2>

      {feedbackMessage && (
        <Alert
          variant="success"
          onClose={() => setFeedbackMessage("")}
          dismissible
        >
          {feedbackMessage}
        </Alert>
      )}

      <Button
        className="btn-add-service mb-3"
        variant="none"
        onClick={handleAddClick}
      >
        Agregar Servicio
      </Button>

      {showForm && (
        <ServiceForm
          service={editingService}
          onSave={editingService ? handleEditService : handleAddService}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Form.Select
        value={currentCategory}
        onChange={(e) => setCurrentCategory(e.target.value)}
        className="mb-4"
      >
        <option value="manicure">Manicure</option>
        <option value="pedicure">Pedicure</option>
        <option value="botoxcapilar">Botox Capilar</option>
        <option value="alisadopermanente">Alisado Permanente</option>
      </Form.Select>

      <div className="card-container">
  {services.map((service) => (
    <Card className="servicios-card-admin mb-3" key={service.id}>
      <Card.Body>
        <Card.Title>{service.Nombre}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          Precio: ${parseFloat(service.Precio).toFixed(2)}
        </Card.Subtitle>
        <Card.Text>Tipo: {service.Tipo}</Card.Text>
        <div className="image-container">
          {service.ImagenUrl ? (
            <img
              src={service.ImagenUrl}
              alt="Imagen del servicio"
              className="service-img"
            />
          ) : (
            <span>No disponible</span>
          )}
        </div>
        <div className="button-group">
          <Button
            variant="warning"
            className="me-2"
            onClick={() => handleEditClick(service)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDelete(service.id)}
          >
            Eliminar
          </Button>
        </div>
      </Card.Body>
    </Card>
  ))}
</div>

    </div>
  );
};

export default ServiceList;
