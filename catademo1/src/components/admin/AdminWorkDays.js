import React, { useState, useEffect, useCallback } from "react";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Typography,
  Box,
  Button,
  Modal,
  Snackbar,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import "../../styles/adminS/calendario.css";

moment.locale("es");
const localizer = momentLocalizer(moment);

// Util: ¿rango A solapa con rango B?
const rangesOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && bStart < aEnd;

const CalendarAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]); // NUEVO
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedRange, setSelectedRange] = useState({
    start: null,
    end: null,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tab, setTab] = useState(0); // 0 = día completo, 1 = rango horario
  const [reason, setReason] = useState("");

  // Carga citas
  const loadAppointments = useCallback(async () => {
    const qs = await getDocs(collection(db, "appointments"));
    const loaded = qs.docs.map((d) => {
      const data = d.data();
      const start = new Date(`${data.date}T${data.hour}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: d.id,
        title: `${data.name} - ${data.service}`,
        start,
        end,
        allDay: false,
        details: data,
        type: "appointment",
      };
    });
    return loaded;
  }, []);

  // Carga días bloqueados
  const loadBlockedDays = useCallback(async () => {
    const qs = await getDocs(collection(db, "blockedDays"));
    const loaded = qs.docs.map((d) => ({
      id: d.id,
      date: d.data().date, // "YYYY-MM-DD"
      reason: d.data().reason || "",
    }));
    return loaded;
  }, []);

  // Carga rangos bloqueados (horas)
  const loadBlockedSlots = useCallback(async () => {
    const qs = await getDocs(collection(db, "blockedSlots"));
    const loaded = qs.docs.map((d) => ({
      id: d.id,
      startISO: d.data().startISO,
      endISO: d.data().endISO,
      reason: d.data().reason || "",
    }));
    return loaded;
  }, []);

  // Inicializa
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, d, s] = await Promise.all([
          loadAppointments(),
          loadBlockedDays(),
          loadBlockedSlots(),
        ]);
        setAppointments(a);
        setBlockedDays(d);
        setBlockedSlots(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAppointments, loadBlockedDays, loadBlockedSlots]);

  // Eventos “bloqueados” para que se vean en el calendario
  const blockedEvents = [
    // días completos
    ...blockedDays.map((b) => {
      const dayStart = moment(b.date).startOf("day").toDate();
      const dayEnd = moment(b.date).endOf("day").toDate();
      return {
        id: `bd_${b.id}`,
        title: b.reason ? `Bloqueado: ${b.reason}` : "Bloqueado",
        start: dayStart,
        end: dayEnd,
        allDay: true,
        type: "blockedDay",
        meta: b,
      };
    }),
    // rangos horarios
    ...blockedSlots.map((b) => ({
      id: `bs_${b.id}`,
      title: b.reason ? `Bloqueado: ${b.reason}` : "Bloqueado",
      start: new Date(b.startISO),
      end: new Date(b.endISO),
      allDay: false,
      type: "blockedSlot",
      meta: b,
    })),
  ];

  // Estilos de eventos
  const eventPropGetter = (event) => {
    if (event.type === "blockedDay" || event.type === "blockedSlot") {
      return {
        style: {
          backgroundColor: "rgba(233, 30, 99, 0.15)",
          border: "1px solid rgba(233, 30, 99, 0.6)",
          color: "#c2185b",
          borderRadius: "8px",
        },
      };
    }
    // citas agendadas
    return {
      style: {
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        border: "1px solid rgba(76, 175, 80, 0.6)",
        color: "#2e7d32",
        borderRadius: "8px",
      },
    };
  };

  // Pinta el día completo en vista month si está bloqueado
  const dayPropGetter = (date) => {
    const blocked = blockedDays.some((d) => moment(d.date).isSame(date, "day"));
    if (blocked) {
      return {
        style: {
          backgroundColor: "rgba(233, 30, 99, 0.08)",
          borderRadius: "6px",
        },
      };
    }
    return {};
  };

  // Abrir modal (slot selection puede traer rango)
  const handleOpenModal = (slotInfo) => {
    setSelectedDay(slotInfo.start);
    setSelectedRange({ start: slotInfo.start, end: slotInfo.end });
    setReason("");
    // Si el usuario arrastró un rango, abre en pestaña "rango horario"
    const isSameDay = moment(slotInfo.start).isSame(slotInfo.end, "day");
    setTab(
      isSameDay &&
        slotInfo.action === "select" &&
        slotInfo.end - slotInfo.start > 0
        ? 1
        : 0
    );
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedRange({ start: null, end: null });
    setReason("");
  };

  // === Acciones: bloquear / desbloquear día ===
  const handleBlockDay = async () => {
    if (!selectedDay) return;
    const dateStr = moment(selectedDay).format("YYYY-MM-DD");

    if (blockedDays.some((d) => d.date === dateStr)) {
      setSnackbar({ open: true, message: "Ese día ya está bloqueado." });
      return;
    }

    // Evita si hay citas ese día
    const hasAppt = appointments.some((ev) =>
      moment(ev.start).isSame(dateStr, "day")
    );
    if (hasAppt) {
      setSnackbar({
        open: true,
        message: "No puedes bloquear: ya hay citas ese día.",
      });
      return;
    }

    const newDoc = await addDoc(collection(db, "blockedDays"), {
      date: dateStr,
      reason: reason.trim(),
    });
    setBlockedDays((prev) => [
      ...prev,
      { id: newDoc.id, date: dateStr, reason: reason.trim() },
    ]);
    setSnackbar({ open: true, message: "Día bloqueado correctamente." });
    handleCloseModal();
  };

  const handleUnblockDay = async () => {
    if (!selectedDay) return;
    const dateStr = moment(selectedDay).format("YYYY-MM-DD");
    const day = blockedDays.find((d) => d.date === dateStr);
    if (!day) {
      setSnackbar({ open: true, message: "Ese día no está bloqueado." });
      return;
    }
    await deleteDoc(doc(db, "blockedDays", day.id));
    setBlockedDays((prev) => prev.filter((d) => d.id !== day.id));
    setSnackbar({ open: true, message: "Día desbloqueado correctamente." });
    handleCloseModal();
  };

  // === Acciones: bloquear / desbloquear rango horario ===
  const handleBlockHours = async () => {
    const { start, end } = selectedRange;
    if (!start || !end || end <= start) {
      setSnackbar({ open: true, message: "Selecciona un rango válido." });
      return;
    }

    // Evita solape con citas
    const overlapAppt = appointments.some((ev) =>
      rangesOverlap(start, end, ev.start, ev.end)
    );
    if (overlapAppt) {
      setSnackbar({
        open: true,
        message: "No puedes bloquear: hay citas en ese rango.",
      });
      return;
    }

    // Evita solape con otros bloqueos horarios
    const overlapBlock = blockedSlots.some((b) =>
      rangesOverlap(start, end, new Date(b.startISO), new Date(b.endISO))
    );
    if (overlapBlock) {
      setSnackbar({
        open: true,
        message: "Ese rango ya está cubierto por otro bloqueo.",
      });
      return;
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const newDoc = await addDoc(collection(db, "blockedSlots"), {
      startISO,
      endISO,
      reason: reason.trim(),
    });
    setBlockedSlots((prev) => [
      ...prev,
      { id: newDoc.id, startISO, endISO, reason: reason.trim() },
    ]);
    setSnackbar({ open: true, message: "Horario bloqueado correctamente." });
    handleCloseModal();
  };

  // Si el usuario hace click en un evento “bloqueado”, ofrecer eliminar
  const handleSelectEvent = (event) => {
    if (event.type === "appointment") {
      // si quieres seguir mostrando detalles de cita, puedes dejar tu modal de cita
      setSelectedEvent(event); // opcional
      return;
    }
    setSelectedEvent(event);
  };

  const handleDeleteBlock = async () => {
    if (!selectedEvent) return;

    if (selectedEvent.type === "blockedDay") {
      await deleteDoc(doc(db, "blockedDays", selectedEvent.meta.id));
      setBlockedDays((prev) =>
        prev.filter((d) => d.id !== selectedEvent.meta.id)
      );
    } else if (selectedEvent.type === "blockedSlot") {
      await deleteDoc(doc(db, "blockedSlots", selectedEvent.meta.id));
      setBlockedSlots((prev) =>
        prev.filter((b) => b.id !== selectedEvent.meta.id)
      );
    }
    setSnackbar({ open: true, message: "Bloqueo eliminado." });
    setSelectedEvent(null);
  };

  // Inputs de hora (cuando el usuario no arrastra y quiere fijar horas exactas)
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  useEffect(() => {
    if (selectedRange.start && selectedRange.end) {
      setManualStart(moment(selectedRange.start).format("HH:mm"));
      setManualEnd(moment(selectedRange.end).format("HH:mm"));
    } else {
      setManualStart("");
      setManualEnd("");
    }
  }, [selectedRange.start, selectedRange.end]);

  const applyManualTimes = () => {
    if (!selectedDay || !manualStart || !manualEnd) return;
    const dayStr = moment(selectedDay).format("YYYY-MM-DD");
    const s = new Date(`${dayStr}T${manualStart}:00`);
    const e = new Date(`${dayStr}T${manualEnd}:00`);
    setSelectedRange({ start: s, end: e });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Calendario de Citas Agendadas
      </Typography>

      {loading ? (
        <Typography variant="body1" align="center">
          Cargando…
        </Typography>
      ) : (
        <>
          <Typography variant="body2" align="center" sx={{ mb: 1 }}>
            Citas: {appointments.length} · Bloqueos: {blockedEvents.length}
          </Typography>

          <BigCalendar
            localizer={localizer}
            culture="es"
            style={{ height: 560, background: "#f9f9f9", borderRadius: 20 }}
            views={["month", "week", "day", "agenda"]}
            defaultView="month"
            selectable
            step={30} // precisión 30 min
            timeslots={2}
            min={new Date(2024, 0, 1, 9, 0)}
            max={new Date(2024, 0, 1, 21, 0)}
            events={[...appointments, ...blockedEvents]}
            onSelectSlot={handleOpenModal}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            messages={{
              date: "Fecha",
              time: "Hora",
              event: "Evento",
              allDay: "Todo el día",
              week: "Semana",
              work_week: "Semana laboral",
              day: "Día",
              month: "Mes",
              previous: "Anterior",
              next: "Siguiente",
              yesterday: "Ayer",
              tomorrow: "Mañana",
              today: "Hoy",
              agenda: "Agenda",
              noEventsInRange: "Sin eventos en el rango",
              showMore: (total) => `+${total} más`,
            }}
          />

          {/* Modal crear bloqueo */}
          <Modal open={isModalOpen} onClose={handleCloseModal}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 520,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 24,
                p: 3,
              }}
            >
              <Typography variant="h6" align="center" gutterBottom>
                Bloquear disponibilidad
              </Typography>

              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                centered
                sx={{ mb: 2 }}
              >
                <Tab label="Día completo" />
                <Tab label="Rango por horas" />
              </Tabs>

              {tab === 0 && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Día seleccionado:{" "}
                    <strong>
                      {selectedDay
                        ? moment(selectedDay).format("DD-MM-YYYY")
                        : "-"}
                    </strong>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    label="Motivo (opcional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box display="flex" gap={1} justifyContent="center">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<LockIcon />}
                      onClick={handleBlockDay}
                    >
                      Bloquear día
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<LockOpenIcon />}
                      onClick={handleUnblockDay}
                    >
                      Desbloquear día
                    </Button>
                  </Box>
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Fecha:{" "}
                    <strong>
                      {selectedDay
                        ? moment(selectedDay).format("DD-MM-YYYY")
                        : "-"}
                    </strong>
                  </Typography>

                  <Box
                    display="grid"
                    gridTemplateColumns="1fr 1fr"
                    gap={2}
                    sx={{ mb: 2 }}
                  >
                    <TextField
                      label="Inicio"
                      type="time"
                      size="small"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      inputProps={{ step: 300 }}
                    />
                    <TextField
                      label="Fin"
                      type="time"
                      size="small"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      inputProps={{ step: 300 }}
                    />
                  </Box>

                  <Button
                    variant="text"
                    onClick={applyManualTimes}
                    sx={{ mb: 2 }}
                  >
                    Usar horas ingresadas
                  </Button>

                  <TextField
                    fullWidth
                    size="small"
                    label="Motivo (opcional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                    * También puedes seleccionar un rango arrastrando en la
                    vista “Semana” o “Día”.
                  </Typography>

                  <Box display="flex" justifyContent="center">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleBlockHours}
                      startIcon={<LockIcon />}
                    >
                      Bloquear rango
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Modal>

          {/* Modal ver/eliminar bloqueo o detalles de cita */}
          <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 460,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 24,
                p: 3,
              }}
            >
              {selectedEvent?.type === "appointment" ? (
                <>
                  <Typography variant="h6" align="center" gutterBottom>
                    Detalle de cita
                  </Typography>
                  <Typography>
                    Cliente: {selectedEvent.details?.name}
                  </Typography>
                  <Typography>
                    Servicio: {selectedEvent.details?.service}
                  </Typography>
                  <Typography>
                    Modalidad: {selectedEvent.details?.mode}
                  </Typography>
                  <Typography>
                    Fecha: {moment(selectedEvent.start).format("DD-MM-YYYY")}
                  </Typography>
                  <Typography>
                    Hora: {moment(selectedEvent.start).format("HH:mm")}–
                    {moment(selectedEvent.end).format("HH:mm")}
                  </Typography>
                  <Box textAlign="center" mt={2}>
                    <Button
                      variant="contained"
                      onClick={() => setSelectedEvent(null)}
                    >
                      Cerrar
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h6" align="center" gutterBottom>
                    Bloqueo
                  </Typography>
                  <Typography>
                    {selectedEvent?.allDay
                      ? `Día completo: ${moment(selectedEvent?.start).format(
                          "DD-MM-YYYY"
                        )}`
                      : `Rango: ${moment(selectedEvent?.start).format(
                          "DD-MM-YYYY HH:mm"
                        )} – ${moment(selectedEvent?.end).format("HH:mm")}`}
                  </Typography>
                  {selectedEvent?.meta?.reason && (
                    <Typography>Motivo: {selectedEvent.meta.reason}</Typography>
                  )}
                  <Box display="flex" justifyContent="center" gap={1} mt={2}>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedEvent(null)}
                    >
                      Cerrar
                    </Button>
                    <Button
                      color="error"
                      variant="contained"
                      onClick={handleDeleteBlock}
                    >
                      Eliminar bloqueo
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Modal>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            message={snackbar.message}
          />
        </>
      )}
    </Box>
  );
};

export default CalendarAppointments;
