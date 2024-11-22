import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { getAuth } from "firebase/auth";
import "../../styles/components/appointment.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import emailjs from "emailjs-com";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

const ScheduleAppointmentView = () => {
  const [availableHours] = useState([
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
  ]);
  const [bookedHours, setBookedHours] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [mode, setMode] = useState("");
  const [address, setAddress] = useState("");
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockedHours, setBlockedHours] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    date: "",
    hour: "",
    service: "",
    comment: "",
  });

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Asegura que sea la fecha actual sin tiempo
    return today.toISOString().split("T")[0];
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const loadBlockedDays = async () => {
    const blockedDaysRef = collection(db, "blockedDays");
    const querySnapshot = await getDocs(blockedDaysRef);
    const loadedBlockedDays = [];
    const loadedBlockedHours = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date) {
        loadedBlockedDays.push(data.date);
        if (data.blockedHours) {
          data.blockedHours.forEach((hour) => {
            loadedBlockedHours.push({ date: data.date, hour });
          });
        }
      }
    });

    setBlockedDays(loadedBlockedDays);
    setBlockedHours(loadedBlockedHours);
  };

  const getAvailableHours = async (selectedDate) => {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("date", "==", selectedDate));
    const querySnapshot = await getDocs(q);
    const booked = querySnapshot.docs.map((doc) => doc.data().hour);
    setBookedHours(booked);
  };

  const loadUserData = async (email) => {
    const userRef = collection(db, "usuarios");
    const q = query(userRef, where("correo", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      setFormData((prev) => ({
        ...prev,
        name: userData.nombre || "",
        email: userData.correo || "",
      }));
    }
  };

  const sendConfirmationEmail = (appointmentData) => {
    // Reformatear la fecha al formato "día - mes - año"
    const [year, month, day] = appointmentData.date.split("-");
    const formattedDate = `${day}-${month}-${year}`;

    const templateParams = {
      from_name: "CataNails",
      to_email: appointmentData.email,
      user_name: appointmentData.name, // Nombre del cliente
      mensaje: `Hola ${appointmentData.name}, 
  
  Tu cita ha sido agendada para el día ${formattedDate} a las ${appointmentData.hour}. 
  
  Para confirmar tu reserva y evitar cancelaciones, recuerda abonar $5.000 dentro de las próximas 24 horas. Por favor, envía el comprobante de pago exclusivamente al WhatsApp +56 9 5037 2543. 
  
  ¡Gracias por preferirnos!
  
  CataNails.
  `,
    };

    emailjs
      .send(
        "service_d7i4cqe",
        "template_pd2dz5u",
        templateParams,
        "S2X9g3S8OrR0K4J_z"
      )
      .then(
        () => {
          toast.success("Correo de confirmación enviado con éxito.");
        },
        (error) => {
          console.error("Error al enviar el correo:", error);
          toast.error("No se pudo enviar el correo de confirmación.");
        }
      );
  };

  useEffect(() => {
    const auth = getAuth();
    const userEmail = auth.currentUser ? auth.currentUser.email : null;

    loadBlockedDays();
    if (userEmail) {
      loadUserData(userEmail);
    }
  }, []);

  useEffect(() => {
    if (selectedDate && !blockedDays.includes(selectedDate)) {
      getAvailableHours(selectedDate);
    }
  }, [selectedDate, blockedDays]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });

    if (name === "date") {
      setSelectedDate(value);
    }
  };

  const filteredHours = availableHours.filter((hour) => {
    const isBlockedHour = blockedHours.some(
      (blocked) => blocked.date === selectedDate && blocked.hour === hour
    );

    if (selectedDate === getTodayDate()) {
      // Si la fecha es hoy, verifica si la hora ya pasó
      const now = new Date();
      const [hourPart, minutePart] = hour.split(":").map(Number);
      const blockTime = new Date();
      blockTime.setHours(hourPart, minutePart, 0, 0);

      if (blockTime <= now) {
        return false; // La hora ya pasó
      }
    }

    return !bookedHours.includes(hour) && !isBlockedHour;
  });

  // Función para validar el formato de correo electrónico
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validación de correo electrónico
    if (
      !formData.name ||
      !formData.email ||
      !formData.date ||
      !formData.hour ||
      !formData.service
    ) {
      toast.error("Por favor, completa todos los campos requeridos.");
      return;
    }

    try {
      let photoURL = null;

      if (imageFile) {
        try {
          const storageRef = ref(
            storage,
            `appointment-photos/${encodeURIComponent(
              imageFile.name
            )}-${Date.now()}`
          );
          const snapshot = await uploadBytes(storageRef, imageFile);
          photoURL = await getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error("Error al subir la foto: ", error);
          toast.error("Hubo un problema al subir la foto.");
          return; // Detener el proceso si falla la carga
        }
      }

      // Guardar la cita con la URL de la foto en Firestore
      await addDoc(collection(db, "appointments"), {
        ...formData,
        mode,
        address: mode === "Domicilio" ? address : "",
        photoURL: photoURL || null, // Agrega la URL de la foto si existe
      });

      toast.success("¡Cita agendada con éxito!");
      sendConfirmationEmail({ ...formData, mode, address });

      // Reset del formulario
      setFormData({
        name: "",
        email: "",
        date: "",
        hour: "",
        service: "",
        comment: "",
      });
      setImageFile(null);
      setMode("");
      setAddress("");
      setSelectedDate("");
      setBookedHours([]);
    } catch (error) {
      console.error("Error al agendar la cita: ", error);
      toast.error("Hubo un error al agendar la cita.");
    }
  };

  return (
    <div>
      <div className="appointment-background"></div>
      <form className="appointment-form" onSubmit={handleSubmit}>
        <h2>Agendar Cita</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Nombre:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ingresa tu nombre"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Ingresa tu email"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Fecha:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={getTodayDate()}
              required
            />
            {selectedDate && blockedDays.includes(selectedDate) && (
              <p style={{ color: "red" }}>CataNails fuera de servicio</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="hour">Hora:</label>
            {filteredHours.length > 0 ? (
              <select
                id="hour"
                name="hour"
                value={formData.hour}
                onChange={handleInputChange}
                required
                disabled={blockedDays.includes(selectedDate)}
              >
                <option value="">Selecciona una hora</option>
                {filteredHours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            ) : (
              <p>Horas no disponibles para la fecha seleccionada.</p>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="service">Servicio:</label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecciona un servicio</option>
              <option value="Manicure">Manicure</option>
              <option value="Pedicure">Pedicure</option>
              <option value="Alisado">Alisado</option>
              <option value="Botox Capilar">Botox Capilar</option>
            </select>
            {formData.service && (
              <p
                style={{
                  color: "#e91e63",
                  fontSize: "small",
                  marginTop: "5px",
                }}
              >
                Tiempo estimado: 2 horas por servicio.
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="mode">Modalidad:</label>
            <select
              id="mode"
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              required
            >
              <option value="">Selecciona una modalidad</option>
              <option value="Domicilio">Domicilio</option>
              <option value="Presencial">Presencial</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="photo">Foto de Referencia:</label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {mode === "Domicilio" && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address">Dirección:</label>
              <input
                type="text"
                id="address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ingresa tu dirección"
                required
              />
              <p
                style={{
                  color: "#e91e63",
                  fontSize: "small",
                  marginTop: "5px",
                }}
              >
                El Servicio a Domicilio tiene un cobro extra.
              </p>
            </div>
          </div>
        )}

        {mode === "Presencial" && (
          <div className="form-row">
            <div className="form-group">
              <p className="text-info-maps">
                Recuerda que debes venir a nuestro local en la siguiente
                dirección:
              </p>
              <a
                href="https://www.google.com/maps/place/Pallachata+1424,+3811616+Chill%C3%A1n,+%C3%91uble" // Ajusta esta URL según tu dirección en Google Maps
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-google"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="comment">Servicio Solicitado:</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              placeholder="Describe tu Servicio"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-agenda">
          Agendar Cita
        </button>
        <ToastContainer />
      </form>
    </div>
  );
};

export default ScheduleAppointmentView;
