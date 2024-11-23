import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import ServiceForm from "./ServiceForm";

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServices = async () => {
    try {
      const servicesCollection = collection(db, "services");
      const servicesSnapshot = await getDocs(servicesCollection);
      const servicesList = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(servicesList);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (service) => {
    try {
      if (service.id) {
        const serviceDoc = doc(db, "services", service.id);
        await updateDoc(serviceDoc, {
          name: service.name,
          category: service.category,
          price: service.price,
        });
      } else {
        await addDoc(collection(db, "services"), {
          name: service.name,
          category: service.category,
          price: service.price,
        });
      }
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error("Error al guardar servicio:", error);
    }
  };

  const handleEdit = (service) => {
    setSelectedService(service);
  };

  const handleDelete = async (id) => {
    try {
      const serviceDoc = doc(db, "services", id);
      await deleteDoc(serviceDoc);
      fetchServices();
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
    }
  };

  return (
    <div className="service-management-container">
      <h2>Gestión de Servicios</h2>
      <ServiceForm
        service={selectedService}
        onSave={handleSave}
        onCancel={() => setSelectedService(null)}
      />
      <div className="services-list">
        {services.map((service) => (
          <div className="service-card" key={service.id}>
            <h3>{service.name}</h3>
            <p>Categoría: {service.category}</p>
            <p>Precio: ${service.price}</p>
            <div className="action-buttons">
              <button
                className="btn btn-primary me-2"
                onClick={() => handleEdit(service)}
              >
                Editar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(service.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceManagement;
