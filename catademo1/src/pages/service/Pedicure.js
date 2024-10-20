import "../../styles/components/services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Importa useNavigate
import fondopie from "../../assets/images/services/pies.jpg";
import { collection, getDocs } from "firebase/firestore";
import { Table, Card } from "react-bootstrap";
import { db } from "../../firebase/firebaseServicios";

const Manicure = () => {
  const navigate = useNavigate(); // Inicializa useNavigate

  const handleAgendarClick = () => {
    navigate("/agendar-cita"); // Navega al formulario de agendar cita
  };

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

  return (
<div className="container pedicure-container mt-5">
      {/* Imagen principal */}
      <div className="header-image-container">
        <img 
          src={fondopie} 
          alt="Pies" 
          className="img-fluid w-100 header-image rounded shadow-sm" 
        />
      </div>

      {/* Título principal */}
      <h2 className="text-center display-4 mt-4 mb-4 title">Pies</h2>
      <p className="lead text-center text-muted">
        Cuida de tus pies con nuestros servicios especiales. Desde pedicuras tradicionales hasta tratamientos completos.
      </p>
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

      {/* Botón Agendar */}
      <div className="text-center mt-4 mb-5">
        <button className="btn btn-primary" onClick={handleAgendarClick}>
          Agenda con Nosotros
        </button>
      </div>
    </div>
  );
};

export default Manicure;
