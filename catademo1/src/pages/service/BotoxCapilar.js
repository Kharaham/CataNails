import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Para la navegación
import fondobotox from "../../assets/images/services/botox.jpg"; // Ajusta la ruta según sea necesario
import { collection, getDocs } from "firebase/firestore"; // Firebase
import { Table, Card } from "react-bootstrap"; // Para las tablas y estilo
import { db } from "../../firebase/firebaseServicios"; // Firebase configuración

const BotoxCapilar = () => {
  const navigate = useNavigate(); // Inicializa useNavigate para la navegación

  const handleAgendarClick = () => {
    navigate("/agendar-cita"); // Navega al formulario de agendar cita
  };

  const [services, setServices] = useState([]); // Estado para los servicios

  // Función para obtener los servicios desde Firebase
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesCollection = collection(db, "botoxcapilar"); // Colección de Botox Capilar en Firebase
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

  return (
    <div className="container botox-container mt-5">
      {/* Imagen principal */}
      <div className="header-image-container">
        <img
          src={fondobotox}
          alt="Botox Capilar"
          className="img-fluid w-100 header-image rounded shadow-sm"
        />
      </div>

      {/* Título principal */}
      <h2 className="text-center display-4 mt-4 mb-4 title">Botox Capilar</h2>
      <p className="lead text-center text-muted">
        Renueva la vida de tu cabello con nuestros tratamientos de Botox
        Capilar. Recupera el brillo, la suavidad y la vitalidad para un look
        perfecto.
      </p>

      {/* Tabla de servicios dinámicos obtenidos desde Firebase */}
      <Card>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id || service.Nombre}>
                  <td>{service.Nombre}</td>
                  <td>{service.Tipo}</td>
                  <td>{service.Precio}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Botón para agendar una cita */}
      <div className="text-center mt-4 mb-5">
        <button className="btn btn-primary" onClick={handleAgendarClick}>
          Agenda con Nosotros
        </button>
      </div>
    </div>
  );
};

export default BotoxCapilar;
