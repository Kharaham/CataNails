import React, { useState, useEffect } from "react";
import { Card, Button, Alert, Modal, Nav, Form } from "react-bootstrap";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "../../styles/adminS/citaslist.css";
import emailjs from "emailjs-com";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../../firebase/firebase";

const CitasList = () => {
  const [citas, setCitas] = useState([]);
  const [completedCitas, setCompletedCitas] = useState([]);
  const [canceledCitas, setCanceledCitas] = useState([]);
  const [activeTab, setActiveTab] = useState("pendientes");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [citaToDelete, setCitaToDelete] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [cancelMessage, setCancelMessage] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fmtCLP = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return "";
    return new Intl.NumberFormat("es-CL").format(n);
  };

  const handleCancelMessageChange = (e) => {
    setCancelMessage(e.target.value);
  };

  const handleCancelCita = async (citaId, email) => {
    if (!cancelMessage) {
      toast.error("Por favor, escribe un mensaje para cancelar la cita.");
      return;
    }

    try {
      const citaRef = doc(db, "appointments", citaId);
      await updateDoc(citaRef, {
        status: "cancelada",
        canceled: true,
        cancelMessage,
      });

      const templateParams = {
        from_name: "Administrador",
        to_email: email,
        mensaje: cancelMessage,
      };

      await emailjs.send(
        "service_d7i4cqe",
        "template_pd2dz5u",
        templateParams,
        "S2X9g3S8OrR0K4J_z"
      );

      setCitas((prevCitas) => prevCitas.filter((c) => c.id !== citaId));
      setCanceledCitas((prevCanceled) => [
        ...prevCanceled,
        {
          ...citas.find((c) => c.id === citaId),
          canceled: true,
          status: "cancelada",
        },
      ]);

      toast.success("Cita cancelada y correo enviado.");
    } catch (error) {
      console.error("Error al cancelar la cita:", error);
      toast.error("Hubo un error al cancelar la cita.");
    }
  };

  const fetchCitas = async () => {
    try {
      const citasCollection = collection(db, "appointments");
      const citasSnapshot = await getDocs(citasCollection);

      const citasList = await Promise.all(
        citasSnapshot.docs.map(async (d) => {
          const data = d.data();

          // Foto (si la guardaste por path):
          let photoURL = data.photoURL || null;
          if (!photoURL && data.photoPath) {
            try {
              photoURL = await getDownloadURL(ref(storage, data.photoPath));
            } catch {
              // ignorar si falla
            }
          }

          // Precio del servicio guardado en la cita (si lo añadiste al crearla)
          const servicePrice = data.servicePrice ?? null;

          return { id: d.id, ...data, photoURL, servicePrice };
        })
      );

      // Orden por fecha desc
      citasList.sort((a, b) => new Date(b.date) - new Date(a.date));

      const pendientes = citasList.filter((c) => !c.completed && !c.canceled);
      const realizadas = citasList.filter((c) => c.completed);
      const canceladas = citasList.filter((c) => c.canceled);

      setCitas(pendientes);
      setCompletedCitas(realizadas);
      setCanceledCitas(canceladas);

      // Prefill amounts: si la cita ya trae servicePrice, úsalo como valor por defecto
      setAmounts((prev) => {
        const next = { ...prev };
        pendientes.forEach((c) => {
          if (next[c.id] === undefined || next[c.id] === "") {
            if (c.servicePrice !== null && c.servicePrice !== undefined) {
              next[c.id] = c.servicePrice;
            }
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Error al obtener citas:", error);
      setFeedbackMessage("Error al obtener las citas.");
    }
  };

  const markAsCompleted = async (citaId) => {
    try {
      // Usa el valor tipeado; si no hay, intenta con el servicePrice de la cita
      const cita = citas.find((c) => c.id === citaId);
      const typedAmount = amounts[citaId];
      const fallbackAmount = cita?.servicePrice;
      const finalAmount =
        typedAmount !== undefined && typedAmount !== ""
          ? Number(typedAmount)
          : fallbackAmount !== undefined && fallbackAmount !== null
          ? Number(fallbackAmount)
          : null;

      if (finalAmount === null || Number.isNaN(finalAmount)) {
        setFeedbackMessage(
          "Por favor, introduce el precio antes de marcar como completada."
        );
        return;
      }

      const citaRef = doc(db, "appointments", citaId);
      await updateDoc(citaRef, {
        completed: true,
        amount: finalAmount, // monto final registrado en la cita
        // opcional: guarda también un timestamp de completado
        completedAt: new Date(),
      });

      // Registrar ingreso
      await addDoc(collection(db, "ingresos"), {
        amount: finalAmount,
        date: new Date(),
        // metadatos útiles
        appointmentId: citaId,
        service: cita?.service || null,
        serviceId: cita?.serviceId || null,
      });

      setCitas((prev) => prev.filter((c) => c.id !== citaId));
      setCompletedCitas((prev) => [
        ...prev,
        { ...cita, completed: true, amount: finalAmount },
      ]);
      setFeedbackMessage(
        "La cita se ha marcado como realizada y el ingreso se ha registrado."
      );
    } catch (error) {
      console.error("Error al marcar la cita como realizada:", error);
      setFeedbackMessage("Error al marcar la cita como realizada.");
    }
  };

  const markAsCanceled = async (citaId, email) => {
    setCitaToDelete({ id: citaId, email });
    setShowConfirmModal(true);
  };

  const deleteCita = async (citaId) => {
    try {
      const citaRef = doc(db, "appointments", citaId);
      await deleteDoc(citaRef);
      fetchCitas();
      setFeedbackMessage("La cita se ha eliminado.");
    } catch (error) {
      console.error("Error al eliminar la cita:", error);
      setFeedbackMessage("Error al eliminar la cita.");
    }
  };

  const handleDeleteClick = (cita) => {
    setCitaToDelete(cita);
    setShowConfirmModal(true);
  };

  const handleConfirmCancel = async () => {
    if (citaToDelete) {
      await handleCancelCita(citaToDelete.id, citaToDelete.email);
      setShowConfirmModal(false);
      setCitaToDelete(null);
      setCancelMessage("");
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setCitaToDelete(null);
    setCancelMessage("");
  };

  const handleAmountChange = (e, citaId) => {
    const { value } = e.target;
    setAmounts((prev) => ({ ...prev, [citaId]: value }));
  };

  useEffect(() => {
    fetchCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderCitasCards = (
    citasArray,
    isPending = false,
    isCanceled = false
  ) => {
    const filteredCitas = filterDate
      ? citasArray.filter(
          (c) => new Date(c.date).toISOString().split("T")[0] === filterDate
        )
      : citasArray;

    return (
      <div className="d-flex flex-wrap justify-content-center">
        {filteredCitas.map((cita) => {
          const visiblePrice =
            amounts[cita.id] !== undefined && amounts[cita.id] !== ""
              ? amounts[cita.id]
              : cita.servicePrice ?? "";

          return (
            <Card
              key={cita.id}
              className={`cita-card mb-4 shadow-sm ${
                cita.photoURL ? "" : "no-image"
              } ${cita.mode === "Domicilio" ? "card-domicilio" : ""}`}
            >
              {cita.photoURL && (
                <div className="image-container">
                  <Card.Img
                    variant="top"
                    src={cita.photoURL}
                    alt={`Foto de ${cita.name}`}
                    className="card-img-top"
                  />
                </div>
              )}
              <Card.Body>
                <Card.Title className="card-title">{cita.name}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {cita.email}
                </Card.Subtitle>

                <Card.Text>
                  <strong>Servicio:</strong> {cita.service} <br />
                  <strong>Fecha:</strong> {cita.date} <br />
                  <strong>Hora:</strong> {cita.hour} <br />
                  <strong>Modo:</strong> {cita.mode} <br />
                  {cita.mode === "Domicilio" && (
                    <>
                      <strong>Dirección:</strong>{" "}
                      {cita.address || "No proporcionada"} <br />
                    </>
                  )}
                  <strong>Comentario:</strong>{" "}
                  {cita.comment || "Sin comentario"} <br />
                  {/* Mostrar precio visible en la tarjeta (si existe) */}
                  {visiblePrice !== "" && (
                    <>
                      <strong>Precio:</strong> ${fmtCLP(visiblePrice)}
                      <br />
                    </>
                  )}
                </Card.Text>

                {isPending && (
                  <>
                    <Form.Group controlId={`amount-${cita.id}`}>
                      <Form.Label>Precio:</Form.Label>
                      <Form.Control
                        type="number"
                        className="ingresar-precio"
                        placeholder="Introduce el precio"
                        value={amounts[cita.id] ?? cita.servicePrice ?? ""}
                        onChange={(e) => handleAmountChange(e, cita.id)}
                      />
                    </Form.Group>

                    <Button
                      variant="outline-success"
                      onClick={() => markAsCompleted(cita.id)}
                      className="btn btn-realizada"
                    >
                      Realizada
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => markAsCanceled(cita.id, cita.email)}
                      className="btn btn-cancelar"
                    >
                      Cancelar
                    </Button>
                  </>
                )}

                <Button
                  variant="danger"
                  onClick={() => deleteCita(cita.id)}
                  className="btn btn-eliminar"
                >
                  Eliminar
                </Button>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="citas-list-container">
      <h2 className="my-4 text-center">Gestión de Citas</h2>

      {feedbackMessage && (
        <Alert
          variant="success"
          onClose={() => setFeedbackMessage("")}
          dismissible
        >
          {feedbackMessage}
        </Alert>
      )}

      <Form className="filtro-agenda">
        <Form.Group controlId="filtro-agenda">
          <Form.Label>Filtrar por Fecha:</Form.Label>
          <Form.Control
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </Form.Group>
        <Button
          variant="primary"
          className="filtro-agenda-boton mt-2"
          onClick={() => setFilterDate("")}
        >
          Limpiar Filtro
        </Button>
      </Form>

      <Nav
        fill
        variant="tabs"
        activeKey={activeTab}
        onSelect={(selectedKey) => setActiveTab(selectedKey)}
      >
        <Nav.Item>
          <Nav.Link eventKey="pendientes">Pendientes</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="completadas">Realizadas</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="canceladas">Canceladas</Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === "pendientes" && renderCitasCards(citas, true)}
      {activeTab === "completadas" && renderCitasCards(completedCitas)}
      {activeTab === "canceladas" &&
        renderCitasCards(canceledCitas, false, true)}

      <Modal show={showConfirmModal} onHide={handleCancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar Cita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de que quieres cancelar esta cita?</p>
          <Form.Group controlId="cancelMessage">
            <Form.Label>Motivo de la cancelación</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelMessage}
              onChange={handleCancelMessageChange}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel}>
            Confirmar Cancelación
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default CitasList;
