import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Para la navegación
import fondoalisado from "../../assets/images/services/alisado.jpg"; // Ajusta la ruta según sea necesario
import { collection, getDocs } from "firebase/firestore"; // Firebase
import { Table, Card } from "react-bootstrap"; // Para las tablas y estilo
import { db } from "../../firebase/firebaseServicios"; // Firebase configuración

const AlisadoPermanente = () => {
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
      const servicesCollection = collection(db, "alisadopermanente"); // Colección de Alisado Permanente en Firebase
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
    <div className="container alisado-container mt-5">
      {/* Imagen principal */}
      <div className="header-image-container">
        <img
          src={fondoalisado}
          alt="Alisado Permanente"
          className="img-fluid w-100 header-image rounded shadow-sm"
        />
      </div>

      {/* Título principal */}
      <h2 className="text-center display-4 mt-4 mb-4 title">Alisado Permanente</h2>
      <p className="lead text-center text-muted">
        Consigue un cabello liso, sedoso y brillante con nuestros tratamientos de alisado permanente. Perfecto para lucir un look impecable sin esfuerzo.
      </p>

      {/* Tabla dinámica con servicios de Firebase */}
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

export default AlisadoPermanente;
