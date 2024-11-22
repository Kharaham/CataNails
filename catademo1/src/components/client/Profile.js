// Profile.js

import React, { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseApp from "../../firebase/firebase";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import CalendarSelector from "./CalendarSelector";
import "../../styles/components/perfil.css";

const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    profilePic: "",
    preferencia: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [citas, setCitas] = useState([]);
  const [selectedCita, setSelectedCita] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newHour, setNewHour] = useState("");

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        const citasRef = collection(firestore, "appointments");
        const q = query(citasRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        const fetchedCitas = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date || null,
          };
        });

        setCitas(fetchedCitas);
      }
    };

    if (user) {
      setFormData({
        nombre: user.nombre || "",
        email: user.email || "",
        telefono: user.telefono || "",
        profilePic: user.profilePic || "",
        preferencia: user.preferencia || "",
      });
      fetchAppointments();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const imageRef = ref(storage, `profilePics/${user.uid}`);
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    setFormData({ ...formData, profilePic: downloadURL });
    setUploading(false);
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleSave = async () => {
    const docRef = doc(firestore, `usuarios/${user.uid}`);
    await updateDoc(docRef, {
      nombre: formData.nombre,
      telefono: formData.telefono,
      profilePic: formData.profilePic,
      preferencia: formData.preferencia,
    });
    setEditMode(false);
  };

  const handleRequestChangeHour = (cita) => {
    setSelectedCita(cita);
    setNewDate(cita.date);
    setNewHour(cita.hour);
    setShowCalendar(true);
  };

  const handleConfirmHourChange = async () => {
    if (selectedCita && newDate && newHour) {
      const citaRef = doc(firestore, `appointments/${selectedCita.id}`);
      await updateDoc(citaRef, {
        date: newDate,
        hour: newHour,
      });

      setCitas((prevCitas) =>
        prevCitas.map((cita) =>
          cita.id === selectedCita.id
            ? { ...cita, date: newDate, hour: newHour }
            : cita
        )
      );
      setShowCalendar(false);
      setSelectedCita(null);
    }
  };

  const handleCancelAppointment = async (citaId) => {
    const citaRef = doc(firestore, `appointments/${citaId}`);
    await updateDoc(citaRef, { canceled: true });

    setCitas((prevCitas) =>
      prevCitas.map((cita) =>
        cita.id === citaId ? { ...cita, canceled: true } : cita
      )
    );
  };

  const citasEnProgreso = citas.filter((cita) => !cita.completed && !cita.canceled);
  const historialCitas = citas.filter((cita) => cita.completed || cita.canceled);

  return (
    <div className="profile-container">
      <h1>Mi Perfil</h1>
      <div className="profile-content">
        <div className="profile-info-section">
          <div className="profile-header">
            <div className="profile-image-container">
              <img
                src={formData.profilePic || "https://via.placeholder.com/100"}
                alt="Perfil"
                className="profile-image"
              />
              {editMode && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="profile-upload-input"
                />
              )}
            </div>
          </div>

          <div className="profile-info">
            <div>
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                disabled={!editMode}
                className="profile-input"
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="profile-input"
              />
            </div>
            <div>
              <label>Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                disabled={!editMode}
                className="profile-input"
              />
            </div>
            <div>
              <label>Preferencia de Servicio</label>
              <select
                name="preferencia"
                value={formData.preferencia}
                onChange={handleChange}
                disabled={!editMode}
                className="profile-input"
              >
                <option value="">Seleccione un servicio</option>
                <option value="Manicure">Manicure</option>
                <option value="Pedicure">Pedicure</option>
                <option value="Botox Capilar">Botox Capilar</option>
                <option value="Alisado Permanente">Alisado Permanente</option>
              </select>
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={handleEditToggle} className="profile-button">
              {editMode ? "Cancelar" : "Editar Perfil"}
            </button>
            {editMode && (
              <button
                onClick={handleSave}
                className="profile-button"
                disabled={uploading}
              >
                {uploading ? "Guardando..." : "Guardar Cambios"}
              </button>
            )}
          </div>
        </div>

        <div className="profile-citas-section">
          <h2>Citas en Progreso</h2>
          <ul>
            {citasEnProgreso.map((cita) => (
              <li key={cita.id}>
                {cita.date || "Fecha no disponible"} -{" "}
                {cita.hour || "Hora no disponible"} -{" "}
                {cita.service || "Servicio no especificado"}
                <button
                  className="btn-perfil"
                  onClick={() => handleRequestChangeHour(cita)}
                  disabled={cita.completed}
                >
                  Solicitar Cambio de Hora
                </button>
                <button
                  className="btn-perfil"
                  onClick={() => handleCancelAppointment(cita.id)}
                >
                  Cancelar Cita
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="profile-citas-section">
          <h2>Historial de Citas</h2>
          <ul>
            {historialCitas.map((cita) => (
              <li key={cita.id}>
                {cita.date || "Fecha no disponible"} -{" "}
                {cita.hour || "Hora no disponible"} -{" "}
                {cita.service || "Servicio no especificado"}
                {cita.canceled && <span> (Cancelada)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showCalendar && (
        <div className="calendar-modal-overlay">
          <div className="calendar-modal">
            <h3 className="modal-title">Cambiar Fecha y Hora</h3>
            <CalendarSelector
              selectedDate={newDate}
              setSelectedDate={setNewDate}
              selectedHour={newHour}
              setSelectedHour={setNewHour}
            />
            <div className="modal-buttons">
              <button
                onClick={handleConfirmHourChange}
                className="modal-button confirm-button"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="modal-button cancel-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
