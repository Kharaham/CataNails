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
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Typography, Box, Button, Modal, Snackbar } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import "../../styles/adminS/calendario.css";

moment.locale("es");
const localizer = momentLocalizer(moment);

const CalendarAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedDays, setBlockedDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "appointments"));
      const loadedAppointments = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const startDateTime = new Date(`${data.date}T${data.hour}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        return {
          id: doc.id,
          title: `${data.name} - ${data.service}`,
          start: startDateTime,
          end: endDateTime,
          allDay: false,
          details: data,
          mode: `${data.mode}`,
        };
      });
      setAppointments(loadedAppointments);
    } catch (error) {
      console.error("Error al cargar citas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlockedDays = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, "blockedDays"));
    const loadedBlockedDays = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      date: doc.data().date,
    }));
    setBlockedDays(loadedBlockedDays);
  }, []);

  useEffect(() => {
    loadAppointments();
    loadBlockedDays();
  }, [loadAppointments, loadBlockedDays]);

  const handleOpenDayModal = (slotInfo) => {
    setSelectedDay(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleCloseDayModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
  };

  const handleBlockDay = async () => {
    if (!selectedDay) return;
    const formattedDate = moment(selectedDay).format("YYYY-MM-DD");

    if (blockedDays.some((day) => day.date === formattedDate)) return;

    try {
      const newDoc = await addDoc(collection(db, "blockedDays"), {
        date: formattedDate,
      });
      setBlockedDays([...blockedDays, { id: newDoc.id, date: formattedDate }]);
      setSnackbar({ open: true, message: "Día bloqueado correctamente." });
      handleCloseDayModal();
    } catch (error) {
      console.error("Error al bloquear el día:", error);
    }
  };

  const handleUnblockDay = async () => {
    if (!selectedDay) return;
    const formattedDate = moment(selectedDay).format("YYYY-MM-DD");

    const dayToUnblock = blockedDays.find((day) => day.date === formattedDate);
    if (!dayToUnblock) return;

    try {
      await deleteDoc(doc(db, "blockedDays", dayToUnblock.id));
      setBlockedDays(blockedDays.filter((day) => day.id !== dayToUnblock.id));
      setSnackbar({ open: true, message: "Día desbloqueado correctamente." });
      handleCloseDayModal();
    } catch (error) {
      console.error("Error al desbloquear el día:", error);
    }
  };

  const handleSelectAppointment = (appointment) => {
    setSelectedAppointment(appointment.details);
  };

  const handleCloseAppointmentModal = () => {
    setSelectedAppointment(null);
  };

  const dayPropGetter = (date) => {
    const isBlocked = blockedDays.some((day) =>
      moment(day.date).isSame(date, "day")
    );
    if (isBlocked) {
      return {
        style: {
          backgroundColor: "rgba(255, 0, 0, 0.3)",
          color: "white",
          borderRadius: "5px",
        },
      };
    }
    return {};
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Calendario de Citas Agendadas
      </Typography>

      {loading ? (
        <Typography variant="body1" align="center">
          Cargando citas agendadas...
        </Typography>
      ) : (
        <>
          <Typography variant="body1" align="center">
            Citas disponibles: {appointments.length}
          </Typography>
          <BigCalendar
            localizer={localizer}
            events={appointments}
            culture="es"
            style={{
              height: 500,
              backgroundColor: "#f9f9f9",
              borderRadius: "20px",
            }}
            views={["month", "week", "day"]}
            defaultView="month"
            selectable
            onSelectSlot={handleOpenDayModal}
            onSelectEvent={handleSelectAppointment}
            step={60}
            min={new Date(2024, 10, 23, 10, 0)}
            max={new Date(2024, 10, 23, 21, 0)}
            timeslots={2}
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
              showMore: (total) => `+ Ver más (${total})`,
            }}
            dayPropGetter={dayPropGetter}
          />

          <Modal open={isModalOpen} onClose={handleCloseDayModal}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 24,
                p: 4,
              }}
            >
              <Typography variant="h6" align="center" gutterBottom>
                {blockedDays.some(
                  (day) => day.date === moment(selectedDay).format("YYYY-MM-DD")
                )
                  ? "Desbloquear Día"
                  : "Bloquear Día"}
              </Typography>
              <Box display="flex" justifyContent="center" mt={2}>
                {blockedDays.some(
                  (day) => day.date === moment(selectedDay).format("YYYY-MM-DD")
                ) ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleUnblockDay}
                    startIcon={<LockOpenIcon />}
                  >
                    Desbloquear
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleBlockDay}
                    startIcon={<LockIcon />}
                  >
                    Bloquear
                  </Button>
                )}
              </Box>
            </Box>
          </Modal>

          <Modal
            open={!!selectedAppointment}
            onClose={handleCloseAppointmentModal}
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 24,
                p: 4,
              }}
            >
              <Typography variant="h6" align="center" gutterBottom>
                Detalles de la Cita
              </Typography>
              {selectedAppointment && (
                <Box>
                  <Typography variant="body1">
                    Nombre: {selectedAppointment.name}
                  </Typography>
                  <Typography variant="body1">
                    Servicio: {selectedAppointment.service}
                  </Typography>
                  <Typography variant="body1">
                    Modalidad: {selectedAppointment.mode}
                  </Typography>
                  <Typography variant="body1">
                    Fecha:{" "}
                    {moment(selectedAppointment.date).format("DD-MM-YYYY")}
                  </Typography>
                  <Typography variant="body1">
                    Hora: {selectedAppointment.hour}
                  </Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCloseAppointmentModal}
                >
                  Cerrar
                </Button>
              </Box>
            </Box>
          </Modal>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
          />
        </>
      )}
    </Box>
  );
};

export default CalendarAppointments;
