import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Alert, Modal, Nav, Form, Badge } from "react-bootstrap";
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
import { Link } from "react-router-dom";

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

  const handleCancelMessageChange = (e) => setCancelMessage(e.target.value);

  const handleCancelCita = async (citaId, email) => {
    if (!cancelMessage) {
      toast.error("Por favor, escribe un motivo para cancelar la cita.");
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

      setCitas((prev) => prev.filter((c) => c.id !== citaId));
      setCanceledCitas((prev) => [
        ...prev,
        {
          ...allCitas.current.find((c) => c.id === citaId),
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
          let photoURL = data.photoURL || null;
          if (!photoURL && data.photoPath) {
            try {
              photoURL = await getDownloadURL(ref(storage, data.photoPath));
            } catch {
              /* ignore */
            }
          }
          const servicePrice = data.servicePrice ?? null;
          return { id: d.id, ...data, photoURL, servicePrice };
        })
      );

      // Orden por fecha desc (siempre que date sea ISO o parseable)
      citasList.sort((a, b) => new Date(b.date) - new Date(a.date));

      const pendientes = citasList.filter((c) => !c.completed && !c.canceled);
      const realizadas = citasList.filter((c) => c.completed);
      const canceladas = citasList.filter((c) => c.canceled);

      setCitas(pendientes);
      setCompletedCitas(realizadas);
      setCanceledCitas(canceladas);

      // Prefill de montos visibles
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

      allCitas.current = citasList;
    } catch (error) {
      console.error("Error al obtener citas:", error);
      setFeedbackMessage("Error al obtener las citas.");
    }
  };

  // cache de todas (para mover entre tabs con info completa)
  const allCitas = React.useRef([]);

  const markAsCompleted = async (citaId) => {
    try {
      const cita = allCitas.current.find((c) => c.id === citaId);
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
          "Introduce el precio antes de marcar como realizada."
        );
        return;
      }

      const citaRef = doc(db, "appointments", citaId);
      await updateDoc(citaRef, {
        completed: true,
        amount: finalAmount,
        completedAt: new Date(),
      });

      await addDoc(collection(db, "ingresos"), {
        amount: finalAmount,
        date: new Date(),
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
        "Cita marcada como realizada y el ingreso fue registrado."
      );
    } catch (error) {
      console.error("Error al marcar la cita como realizada:", error);
      setFeedbackMessage("Error al marcar la cita como realizada.");
    }
  };

  const askCancelCita = (cita) => {
    setCitaToDelete({ id: cita.id, email: cita.email });
    setShowConfirmModal(true);
  };

  const deleteCita = async (citaId) => {
    try {
      const citaRef = doc(db, "appointments", citaId);
      await deleteDoc(citaRef);
      await fetchCitas();
      setFeedbackMessage("La cita ha sido eliminada.");
    } catch (error) {
      console.error("Error al eliminar la cita:", error);
      setFeedbackMessage("Error al eliminar la cita.");
    }
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

  const filteredByDate = (arr) =>
    filterDate
      ? arr.filter(
          (c) => new Date(c.date).toISOString().split("T")[0] === filterDate
        )
      : arr;

  const stats = useMemo(
    () => ({
      pendientes: citas.length,
      realizadas: completedCitas.length,
      canceladas: canceledCitas.length,
    }),
    [citas.length, completedCitas.length, canceledCitas.length]
  );

  const renderEmpty = (msg) => (
    <div className="citaAd_empty">
      <p>{msg}</p>
    </div>
  );

  const BadgeMode = ({ mode }) => {
    if (!mode) return null;
    const isDom = mode === "Domicilio";
    return (
      <span className={`citaAd_chip ${isDom ? "citaAd_chip--home" : ""}`}>
        {isDom ? "A Domicilio" : "En Local"}
      </span>
    );
  };

  const EstadoRibbon = ({ estado }) => {
    if (!estado) return null;
    return <div className={`citaAd_ribbon citaAd_ribbon--${estado}`} />;
  };

  const CardFooterAcciones = ({ cita, isPending }) => (
    <div className="citaAd_cardActions">
      {isPending && (
        <>
          <div className="citaAd_priceGroup">
            <label htmlFor={`amount-${cita.id}`}>Precio</label>
            <input
              id={`amount-${cita.id}`}
              type="number"
              inputMode="numeric"
              className="citaAd_input"
              placeholder="Ej: 12000"
              value={amounts[cita.id] ?? cita.servicePrice ?? ""}
              onChange={(e) => handleAmountChange(e, cita.id)}
            />
          </div>

        <Link
          to={`/admin/try-on?citaId=${cita.id}`}
          className="btn btn-primary citaAd_btn citaAd_btn--tryon"
        >
          Try-On
        </Link>

          <Button
            variant="success"
            className="citaAd_btn citaAd_btn--ok"
            onClick={() => markAsCompleted(cita.id)}
          >
            Realizada
          </Button>

          <Button
            variant="outline-danger"
            className="citaAd_btn citaAd_btn--cancel"
            onClick={() => askCancelCita(cita)}
          >
            Cancelar
          </Button>
        </>
      )}

      <Button
        variant="danger"
        className="citaAd_btn citaAd_btn--delete"
        onClick={() => deleteCita(cita.id)}
      >
        Eliminar
      </Button>
    </div>
  );

  const CitaCard = ({ cita, estado }) => {
    const visiblePrice =
      amounts[cita.id] !== undefined && amounts[cita.id] !== ""
        ? amounts[cita.id]
        : cita.servicePrice ?? "";

    return (
      <Card
        className={`citaAd_card ${
          cita.mode === "Domicilio" ? "citaAd_card--home" : ""
        }`}
      >
        <EstadoRibbon estado={estado} />

        {cita.photoURL && (
          <div className="citaAd_imgWrap">
            <img src={cita.photoURL} alt={`Foto de ${cita.name}`} />
          </div>
        )}

        <Card.Body className="citaAd_body">
          <div className="citaAd_head">
            <div className="citaAd_titlebox">
              <h5 className="citaAd_title">{cita.name}</h5>
              <div className="citaAd_meta">
                <span className="citaAd_email">{cita.email}</span>
              </div>
            </div>
            <div className="citaAd_tags">
              <BadgeMode mode={cita.mode} />
              {cita.service && (
                <span className="citaAd_chip citaAd_chip--service">
                  {cita.service}
                </span>
              )}
              {visiblePrice !== "" && (
                <span className="citaAd_chip citaAd_chip--price">
                  ${fmtCLP(visiblePrice)}
                </span>
              )}
            </div>
          </div>

          <div className="citaAd_infoGrid">
            <div>
              <span className="citaAd_label">Fecha</span>
              <span className="citaAd_value">{cita.date}</span>
            </div>
            <div>
              <span className="citaAd_label">Hora</span>
              <span className="citaAd_value">{cita.hour}</span>
            </div>
            {cita.mode === "Domicilio" && (
              <div className="citaAd_rowSpan">
                <span className="citaAd_label">Dirección</span>
                <span className="citaAd_value">
                  {cita.address || "No proporcionada"}
                </span>
              </div>
            )}
            <div className="citaAd_rowSpan">
              <span className="citaAd_label">Comentario</span>
              <span className="citaAd_value">
                {cita.comment || "Sin comentario"}
              </span>
            </div>
          </div>

          <CardFooterAcciones cita={cita} isPending={estado === "pendiente"} />
        </Card.Body>
      </Card>
    );
  };

  const renderGrid = (arr, estado) => {
    const list = filteredByDate(arr);
    if (list.length === 0) return renderEmpty("No hay registros para mostrar.");
    return (
      <div className="citaAd_grid">
        {list.map((c) => (
          <CitaCard
            key={c.id}
            cita={c}
            estado={
              estado === "pendiente"
                ? "pendiente"
                : estado === "cancelada"
                ? "cancelada"
                : "realizada"
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="citaAd_container">
      <div className="citaAd_header">
        <h2 className="citaAd_h2">Gestión de Citas</h2>

        <div className="citaAd_stats">
          <div className="citaAd_stat">
            <span className="citaAd_statLabel">Pendientes</span>
            <span className="citaAd_statValue">{stats.pendientes}</span>
          </div>
          <div className="citaAd_stat">
            <span className="citaAd_statLabel">Realizadas</span>
            <span className="citaAd_statValue">{stats.realizadas}</span>
          </div>
          <div className="citaAd_stat">
            <span className="citaAd_statLabel">Canceladas</span>
            <span className="citaAd_statValue">{stats.canceladas}</span>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <Alert
          variant="success"
          className="citaAd_alert"
          onClose={() => setFeedbackMessage("")}
          dismissible
        >
          {feedbackMessage}
        </Alert>
      )}

      <div className="citaAd_toolbar">
        <Form className="citaAd_filter">
          <Form.Group
            controlId="citaAd_filterDate"
            className="citaAd_filterGroup"
          >
            <Form.Label>Filtrar por fecha</Form.Label>
            <Form.Control
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="citaAd_filterInput"
            />
          </Form.Group>
          <Button
            variant="primary"
            className="citaAd_btn citaAd_btn--clear"
            onClick={() => setFilterDate("")}
          >
            Limpiar
          </Button>
        </Form>

        <Nav
          fill
          variant="tabs"
          activeKey={activeTab}
          onSelect={(selectedKey) => setActiveTab(selectedKey)}
          className="citaAd_tabs"
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
      </div>

      {activeTab === "pendientes" && renderGrid(citas, "pendiente")}
      {activeTab === "completadas" && renderGrid(completedCitas, "realizada")}
      {activeTab === "canceladas" && renderGrid(canceledCitas, "cancelada")}

      <Modal show={showConfirmModal} onHide={handleCancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar cita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            ¿Quieres cancelar esta cita? Se notificará por correo a la clienta.
          </p>
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
            Volver
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel}>
            Confirmar cancelación
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default CitasList;
