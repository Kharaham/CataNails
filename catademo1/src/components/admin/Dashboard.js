import React, { useState, useEffect } from "react";
import {
  Alert,
  Card,
  Col,
  Row,
  OverlayTrigger,
  Popover,
} from "react-bootstrap";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faClipboardCheck,
  faCalendarCheck,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/adminS/dashboard.css";

const Dashboard = () => {
  const [clientes, setClientes] = useState(0);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [citasRealizadas, setCitasRealizadas] = useState([]);
  const [citasCanceladas, setCitasCanceladas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [filteredCitas, setFilteredCitas] = useState([]);
  const [filterOption, setFilterOption] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [ingresosTotales, setIngresosTotales] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientesSnapshot = await getDocs(collection(db, "usuarios"));
        setClientes(clientesSnapshot.size);

        const citasSnapshot = await getDocs(collection(db, "appointments"));
        let citas = citasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        citas = citas.map((cita) => {
          const [year, month, day] = cita.date.split("-").map(Number);
          const localDate = new Date(year, month - 1, day);

          return {
            ...cita,
            localDate: localDate.toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            canceled: cita.canceled || false,
          };
        });

        citas = citas.filter((cita) => {
          const hour = parseInt(cita.hour.split(":")[0], 10);
          return hour >= 10 && hour <= 20;
        });

        citas.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.hour}`);
          const dateB = new Date(`${b.date}T${b.hour}`);
          return dateA - dateB;
        });

        setCitasPendientes(citas.filter((cita) => !cita.completed));
        setCitasRealizadas(citas.filter((cita) => cita.completed));
        setCitasCanceladas(citas.filter((cita) => cita.canceled)); //
        setCitas(citas);
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };

    const fetchIngresosTotales = async () => {
      try {
        const ingresosSnapshot = await getDocs(collection(db, "ingresos"));
        let total = 0;

        ingresosSnapshot.forEach((doc) => {
          const data = doc.data();
          total += data.amount;
        });

        setIngresosTotales(total);
      } catch (error) {
        console.error("Error al obtener ingresos totales:", error);
      }
    };

    fetchData();
    fetchIngresosTotales();
  }, []);

  useEffect(() => {
    handleFilterChange(filterOption, selectedDate);
  }, [citas, filterOption, selectedDate]);

  const handleFilterChange = (option, date) => {
    setFilterOption(option);
    setSelectedDate(date);
    let citasFiltradas = [];

    if (option === "all") {
      citasFiltradas = citas;
    } else if (option === "pending") {
      citasFiltradas = citasPendientes.filter((cita) => !cita.canceled);
    } else if (option === "completed") {
      citasFiltradas = citasRealizadas;
    } else if (option === "canceled") {
      citasFiltradas = citas.filter((cita) => cita.canceled);
    }

    if (date) {
      citasFiltradas = citasFiltradas.filter((cita) => cita.date === date);
    }

    citasFiltradas.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.hour}`);
      const dateB = new Date(`${b.date}T${b.hour}`);
      return dateA - dateB;
    });

    setFilteredCitas(citasFiltradas.slice(0, 6));
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const markAsCompleted = async (citaId) => {
    try {
      const citaRef = doc(db, "appointments", citaId);
      await updateDoc(citaRef, { completed: true });
      setCitas((prevCitas) =>
        prevCitas.map((cita) =>
          cita.id === citaId ? { ...cita, completed: true } : cita
        )
      );
      setFeedbackMessage("La cita se ha marcado como realizada correctamente.");
    } catch (error) {
      console.error("Error al marcar la cita como realizada:", error);
      setFeedbackMessage("Error al marcar la cita como realizada.");
    }
  };

  const renderPopover = (citas, title) => (
    <Popover>
      <Popover.Header as="h3" className="popover-header-custom">
        {title}
      </Popover.Header>
      <Popover.Body className="popover-body-custom">
        {citas.length > 0 ? (
          <ul className="citas-list">
            {citas.slice(0, 4).map((cita, index) => (
              <li key={index} className="cita-item">
                <div className="cita-detail">
                  <strong>Cliente:</strong> {cita.name || "Desconocido"}
                </div>
                <div className="cita-detail">
                  <strong>Fecha:</strong> {cita.date || "No disponible"}
                </div>
                <div className="cita-detail">
                  <strong>Hora:</strong> {cita.hour || "No disponible"}
                </div>
                <div className="cita-detail">
                  <strong>Servicio:</strong> {cita.service || "No disponible"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-citas-text">No hay {title.toLowerCase()}</p>
        )}
      </Popover.Body>
    </Popover>
  );

  const renderAppointmentItem = (cita) => {
    const cardClass = cita.completed
      ? "completed"
      : cita.canceled
      ? "canceled"
      : "pending";

    return (
      <li key={cita.id} className={`appointment-item ${cardClass}`}>
        <div>{cita.name || "Cliente desconocido"}</div>
        <div>{cita.localDate || "Fecha no disponible"}</div>
        <div>{cita.hour || "Hora no disponible"}</div>
        <div>{cita.service || "Servicio no disponible"}</div>
        <div>{cita.mode || "Modalidad no disponible"}</div>
        {!cita.completed && !cita.canceled && (
          <button
            onClick={() => markAsCompleted(cita.id)}
            className="btn btn-success"
          >
            Marcar como Realizada
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="dashboard-container">
      <h2 className="text-center my-4">CataaNails</h2>
      <Row className="mb-4">
        <Col className="col-3">
          <Card className="custom-card clientes-card">
            <Card.Body>
              <FontAwesomeIcon icon={faUsers} size="2x" />
              <Card.Title>Total de Clientes</Card.Title>
              <Card.Text>{clientes}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col className="col-3">
          <OverlayTrigger
            trigger="hover"
            placement="right"
            overlay={renderPopover(citasPendientes, "Citas Pendientes")}
          >
            <Card className="custom-card citas-pendientes-card">
              <Card.Body>
                <FontAwesomeIcon icon={faCalendarCheck} size="2x" />
                <Card.Title>Citas Pendientes</Card.Title>
                <Card.Text>{citasPendientes.length}</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>

        <Col className="col-3">
          <OverlayTrigger
            trigger="hover"
            placement="right"
            overlay={renderPopover(citasRealizadas, "Citas Realizadas")}
          >
            <Card className="custom-card citas-realizadas-card">
              <Card.Body>
                <FontAwesomeIcon icon={faClipboardCheck} size="2x" />
                <Card.Title>Citas Realizadas</Card.Title>
                <Card.Text>{citasRealizadas.length}</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
        <Col className="col-3">
          <Card className="custom-card ingresos-card">
            <Card.Body>
              <FontAwesomeIcon icon={faMoneyBillWave} size="2x" />
              <Card.Title>Ingresos Totales</Card.Title>
              <Card.Text>${ingresosTotales.toLocaleString("es-CL")}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <h3 className="text-center">Filtrar Citas</h3>
          <div className="filter-buttons">
            <button
              className={`btn btn-secondary mx-2 ${
                filterOption === "all" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("all", selectedDate)}
            >
              Mostrar Todas
            </button>
            <button
              className={`btn btn-warning mx-2 ${
                filterOption === "pending" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("pending", selectedDate)}
            >
              Pendientes
            </button>
            <button
              className={`btn btn-success mx-2 ${
                filterOption === "completed" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("completed", selectedDate)}
            >
              Realizadas
            </button>
            <button
              className={`btn btn-danger mx-2 ${
                filterOption === "canceled" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("canceled", selectedDate)}
            >
              Canceladas
            </button>
          </div>
          <div className="date-filter mt-3">
            <label htmlFor="date">Fecha:</label>
            <input
              type="date"
              id="date"
              className="form-control"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <h3 className="text-center">Citas Recientes</h3>
          {feedbackMessage && <Alert variant="info">{feedbackMessage}</Alert>}
          {filteredCitas.length > 0 ? (
            <ul className="appointment-list">
              {filteredCitas.map((cita) => renderAppointmentItem(cita))}
            </ul>
          ) : (
            <p className="text-center">No hay citas para mostrar.</p>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
