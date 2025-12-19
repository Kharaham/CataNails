import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../hooks/useAuth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import firebaseApp from "../../firebase/firebase";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import CalendarSelector from "./CalendarSelector";
import { FaStar } from "react-icons/fa";
import "../../styles/components/perfil.css";

const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

const Profile = () => {
  const { user, authUser } = useAuth();
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    profilePic: "",
    preferencia: "",
    notiEmail: true,
    notiWhats: false,
  });

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const [citas, setCitas] = useState([]);
  const [selectedCita, setSelectedCita] = useState(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newHour, setNewHour] = useState("");

  const [showDetails, setShowDetails] = useState(false);

  const [confirmData, setConfirmData] = useState({ open: false, citaId: null });

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [toast, setToast] = useState({ show: false, type: "success", msg: "" });

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.email) return;
      const citasRef = collection(firestore, "appointments");
      const q = query(citasRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCitas(fetched);
    };

    if (user) {
      setFormData({
        nombre: user.nombre || "",
        email: user.email || "",
        telefono: user.telefono || "",
        profilePic: user.profilePic || "",
        preferencia: user.preferencia || "",
        notiEmail: user.notiEmail ?? true,
        notiWhats: user.notiWhats ?? false,
      });
      fetchAppointments();
    }
  }, [user]);

  const citasEnProgreso = useMemo(
    () => citas.filter((c) => !c.completed && !c.canceled),
    [citas]
  );
  const historialCitas = useMemo(
    () => citas.filter((c) => c.completed || c.canceled),
    [citas]
  );

  const proximaCita = useMemo(() => {
    const futuras = citasEnProgreso
      .filter((c) => c.date && c.hour)
      .map((c) => ({ ...c, when: new Date(`${c.date}T${c.hour}:00`) }))
      .filter((c) => c.when >= new Date())
      .sort((a, b) => a.when - b.when);
    return futuras[0] || null;
  }, [citasEnProgreso]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setUploadPct(1);
    const imageRef = ref(storage, `profilePics/${user.uid}`);
    const task = uploadBytesResumable(imageRef, file);
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setUploadPct(pct);
      },
      () => {
        setUploadPct(0);
        setToast({ show: true, type: "error", msg: "Error subiendo imagen." });
      },
      async () => {
        const url = await getDownloadURL(imageRef);
        setFormData((p) => ({ ...p, profilePic: url }));
        setUploadPct(0);
        setToast({
          show: true,
          type: "success",
          msg: "Foto de perfil actualizada.",
        });
      }
    );
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const docRef = doc(firestore, `usuarios/${user.uid}`);
      await updateDoc(docRef, {
        nombre: formData.nombre,
        telefono: formData.telefono,
        profilePic: formData.profilePic,
        preferencia: formData.preferencia,
        notiEmail: formData.notiEmail,
        notiWhats: formData.notiWhats,
      });
      setToast({
        show: true,
        type: "success",
        msg: "Perfil actualizado correctamente.",
      });
      setEditMode(false);
    } catch {
      setToast({
        show: true,
        type: "error",
        msg: "No se pudo guardar. Intenta de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  const emailVerified = authUser?.emailVerified ?? false;
  const lastLogin = authUser?.metadata?.lastSignInTime
    ? new Date(authUser.metadata.lastSignInTime).toLocaleString()
    : null;

  const handleRequestChangeHour = (c) => {
    setSelectedCita(c);
    setNewDate(c.date || "");
    setNewHour(c.hour || "");
    setShowCalendar(true);
  };
  const handleConfirmHourChange = async () => {
    if (!selectedCita || !newDate || !newHour) return;
    try {
      const citaRef = doc(firestore, `appointments/${selectedCita.id}`);
      await updateDoc(citaRef, {
        date: newDate,
        hour: newHour,
        changeRequestedBy: user?.uid,
      });
      setCitas((prev) =>
        prev.map((c) =>
          c.id === selectedCita.id ? { ...c, date: newDate, hour: newHour } : c
        )
      );
      setToast({ show: true, type: "success", msg: "Cita reprogramada." });
    } catch {
      setToast({
        show: true,
        type: "error",
        msg: "No se pudo reprogramar la cita.",
      });
    } finally {
      setShowCalendar(false);
      setSelectedCita(null);
    }
  };

  const openDetails = (c) => {
    setSelectedCita(c);

    setRating(c.rating || 0);
    setReview(c.review || "");
    setShowDetails(true);
  };
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedCita(null);
    setRating(0);
    setReview("");
  };

  const askCancel = (citaId) => setConfirmData({ open: true, citaId });
  const closeConfirm = () => setConfirmData({ open: false, citaId: null });
  const confirmCancel = async () => {
    const citaId = confirmData.citaId;
    if (!citaId) return;
    try {
      const citaRef = doc(firestore, `appointments/${citaId}`);
      await updateDoc(citaRef, {
        canceled: true,
        canceledBy: user?.uid,
        canceledAt: serverTimestamp(),
      });
      setCitas((prev) =>
        prev.map((c) => (c.id === citaId ? { ...c, canceled: true } : c))
      );
      setToast({ show: true, type: "success", msg: "Cita cancelada." });
      if (selectedCita?.id === citaId) closeDetails();
    } catch {
      setToast({
        show: true,
        type: "error",
        msg: "No se pudo cancelar la cita.",
      });
    } finally {
      closeConfirm();
    }
  };

  const canReview = !!(
    selectedCita &&
    selectedCita.completed &&
    !selectedCita.canceled
  );
  const handleSubmitReview = async () => {
    if (!selectedCita || !canReview || submittingReview) return;
    setSubmittingReview(true);
    try {
      const citaRef = doc(firestore, `appointments/${selectedCita.id}`);
      await updateDoc(citaRef, {
        rating: rating || 0,
        review: review.trim(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      });
      setCitas((prev) =>
        prev.map((c) =>
          c.id === selectedCita.id
            ? { ...c, rating: rating || 0, review: review.trim() }
            : c
        )
      );
      setToast({ show: true, type: "success", msg: "¡Gracias por tu reseña!" });
      closeDetails();
    } catch {
      setToast({
        show: true,
        type: "error",
        msg: "No se pudo enviar la reseña.",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="profile">
      <div className="profile-cover">
        <div className="profile-cover__inner">
          <div className="avatar">
            <img
              src={
                formData.profilePic ||
                "https://api.dicebear.com/8.x/initials/svg?seed=" +
                  (formData.nombre || formData.email || "CN")
              }
              alt="Foto de perfil"
            />
            {editMode && (
              <label className="avatar-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                Cambiar
              </label>
            )}
            {uploadPct > 0 && (
              <div className="avatar-progress">
                <span style={{ width: `${uploadPct}%` }} />
              </div>
            )}
          </div>

          <div className="identity">
            <h1>{formData.nombre || "Tu nombre"}</h1>
            <div className="badges">
              <span
                className={`badge ${authUser?.emailVerified ? "ok" : "warn"}`}
              >
                {emailVerified ? "Correo verificado" : "Correo no verificado"}
              </span>
              {user?.rol && <span className="badge role">{user.rol}</span>}
            </div>
            <p className="identity__email">{formData.email}</p>
            {lastLogin && (
              <p className="identity__meta">Último acceso: {lastLogin}</p>
            )}
          </div>

          <div className="header-actions">
            {!editMode ? (
              <button className="btn primary" onClick={() => setEditMode(true)}>
                Editar perfil
              </button>
            ) : (
              <div className="btn-row">
                <button
                  className="btn ghost"
                  onClick={() => setEditMode(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn primary"
                  onClick={handleSave}
                  disabled={saving || uploadPct > 0}
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="profile-stats">
        <div className="stat">
          <span className="stat__label">Próxima cita</span>
          <span className="stat__value">
            {proximaCita
              ? `${proximaCita.date} · ${proximaCita.hour} (${
                  proximaCita.service || "-"
                })`
              : "Sin próximas citas"}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Completadas</span>
          <span className="stat__value">
            {historialCitas.filter((c) => c.completed).length}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Canceladas</span>
          <span className="stat__value">
            {historialCitas.filter((c) => c.canceled).length}
          </span>
        </div>
      </section>

      <div className="profile-grid">
        <section className="card">
          <h2>Datos personales</h2>
          <div className="form-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                disabled={!editMode}
              />
            </label>
            <label className="field">
              <span>Correo</span>
              <input type="email" value={formData.email} disabled />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                disabled={!editMode}
              />
            </label>
            <label className="field">
              <span>Servicio favorito</span>
              <select
                name="preferencia"
                value={formData.preferencia}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="">Selecciona…</option>
                <option value="Manicure">Manicure</option>
                <option value="Pedicure">Pedicure</option>
                <option value="Botox Capilar">Bótox capilar</option>
                <option value="Alisado Permanente">Alisado permanente</option>
              </select>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                name="notiEmail"
                checked={formData.notiEmail}
                onChange={handleChange}
                disabled={!editMode}
              />
              <span>Recibir recordatorios por correo</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                name="notiWhats"
                checked={formData.notiWhats}
                onChange={handleChange}
                disabled={!editMode}
              />
              <span>Recibir recordatorios por WhatsApp</span>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Citas en progreso</h2>
            <span className="chip">{citasEnProgreso.length}</span>
          </div>
          {citasEnProgreso.length === 0 ? (
            <p className="muted">No tienes citas programadas actualmente.</p>
          ) : (
            <ul className="appointments">
              {citasEnProgreso.map((c) => (
                <li key={c.id} className="appt">
                  <button
                    className="appt__main appt-click"
                    onClick={() => openDetails(c)}
                  >
                    <strong>{c.service || "Servicio"}</strong>
                    <span>
                      {c.date || "—"} · {c.hour || "—"} · {c.mode || "—"}
                    </span>
                    {c.address && <small className="muted">{c.address}</small>}
                  </button>
                  <div className="appt__actions">
                    <button
                      className="btn ghost"
                      onClick={() => handleRequestChangeHour(c)}
                      disabled={c.completed}
                    >
                      Cambiar hora
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => askCancel(c.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Historial de citas</h2>
            <span className="chip">{historialCitas.length}</span>
          </div>
          {historialCitas.length === 0 ? (
            <p className="muted">Aún no tienes historial.</p>
          ) : (
            <ul className="appointments history">
              {historialCitas.map((c) => (
                <li
                  key={c.id}
                  className={`appt ${c.canceled ? "is-canceled" : "is-done"}`}
                >
                  <button
                    className="appt__main appt-click"
                    onClick={() => openDetails(c)}
                  >
                    <strong>{c.service || "Servicio"}</strong>
                    <span>
                      {c.date || "—"} · {c.hour || "—"} · {c.mode || "—"}
                    </span>
                    {!!c.rating && (
                      <small className="muted">
                        Tu calificación: {"★".repeat(c.rating)}
                        {"☆".repeat(5 - c.rating)}
                      </small>
                    )}
                  </button>
                  <div className="appt__status">
                    {c.canceled ? (
                      <span className="badge warn">Cancelada</span>
                    ) : (
                      <span className="badge ok">Completada</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showCalendar && (
        <div className="calendar-modal-overlay" role="dialog" aria-modal="true">
          <div className="calendar-modal">
            <h3 className="modal-title">Cambiar fecha y hora</h3>
            <CalendarSelector
              selectedDate={newDate}
              setSelectedDate={setNewDate}
              selectedHour={newHour}
              setSelectedHour={setNewHour}
            />
            <div className="modal-buttons">
              <button onClick={handleConfirmHourChange} className="btn primary">
                Confirmar
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="btn ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedCita && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) =>
            e.target.classList.contains("dialog-overlay") && closeDetails()
          }
        >
          <div className="dialog">
            <div className="dialog-header">
              <h3>Detalle de la cita</h3>
              <button
                className="dialog-close"
                onClick={closeDetails}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="dialog-body">
              <div className="detail-grid">
                <div>
                  <span className="label">Servicio</span>
                  <strong>{selectedCita.service || "-"}</strong>
                </div>
                <div>
                  <span className="label">Modalidad</span>
                  <span>{selectedCita.mode || "-"}</span>
                </div>
                <div>
                  <span className="label">Fecha</span>
                  <span>{selectedCita.date || "-"}</span>
                </div>
                <div>
                  <span className="label">Hora</span>
                  <span>{selectedCita.hour || "-"}</span>
                </div>
                {selectedCita.duration && (
                  <div>
                    <span className="label">Duración</span>
                    <span>{selectedCita.duration} min</span>
                  </div>
                )}
                {selectedCita.price && (
                  <div>
                    <span className="label">Precio</span>
                    <span>${selectedCita.price}</span>
                  </div>
                )}
                {selectedCita.address && (
                  <div className="col-span">
                    <span className="label">Dirección</span>
                    <span>{selectedCita.address}</span>
                  </div>
                )}
                {selectedCita.notes && (
                  <div className="col-span">
                    <span className="label">Notas</span>
                    <span>{selectedCita.notes}</span>
                  </div>
                )}
              </div>

              {selectedCita.completed && !selectedCita.canceled && (
                <div className="review">
                  <h4>Tu reseña</h4>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={
                          (hoverRating || rating) >= n ? "star on" : "star"
                        }
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        aria-label={`Calificar ${n} estrellas`}
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="review-text"
                    rows={4}
                    placeholder="¿Cómo fue tu experiencia?"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />
                  <div className="review-actions">
                    <button
                      className="btn primary"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                    >
                      {submittingReview ? "Enviando…" : "Enviar reseña"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="dialog-footer">
              {!selectedCita.canceled && !selectedCita.completed && (
                <button
                  className="btn danger"
                  onClick={() => askCancel(selectedCita.id)}
                >
                  Cancelar cita
                </button>
              )}
              {!selectedCita.canceled && !selectedCita.completed && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    setShowDetails(false);
                    handleRequestChangeHour(selectedCita);
                  }}
                >
                  Reprogramar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmData.open && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) =>
            e.target.classList.contains("confirm-overlay") && closeConfirm()
          }
        >
          <div className="confirm">
            <h3>¿Cancelar cita?</h3>
            <p className="muted">Esta acción no se puede deshacer.</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={closeConfirm}>
                No, volver
              </button>
              <button className="btn danger" onClick={confirmCancel}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div
          className={`toast ${toast.type}`}
          onAnimationEnd={() => setToast((t) => ({ ...t, show: false }))}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Profile;
