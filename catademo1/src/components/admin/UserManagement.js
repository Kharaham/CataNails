import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles/adminS/usuarios.css";
import emailjs from "emailjs-com";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import UserList from "./UserList";
import UserForm from "./UserForm";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [discountMessage, setDiscountMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserAppointments, setSelectedUserAppointments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const appointmentsUnsubsRef = useRef([]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersCollection = collection(db, "usuarios");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("No se pudo cargar la lista de usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, "usuarios", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setSelectedUserAppointments([]);
        cleanupAppointmentListeners();
      }
      toast.success("Usuario eliminado.");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("No se pudo eliminar el usuario.");
    }
  };

  const sendDiscountEmail = (userEmail) => {
    if (!userEmail) return;
    const templateParams = {
      from_name: "Administrador",
      to_email: userEmail,
      mensaje:
        "¡Felicidades! Has alcanzado 30 puntos de fidelidad y tienes un descuento del 10% en tu próxima compra. ¡Gracias por tu preferencia!",
    };

    emailjs
      .send(
        "service_d7i4cqe",
        "template_pd2dz5u",
        templateParams,
        "S2X9g3S8OrR0K4J_z"
      )
      .then(
        () => toast.success("Correo de descuento enviado con éxito."),
        (error) => {
          console.error("Error al enviar el correo:", error);
          toast.error("Error al enviar el correo de descuento.");
        }
      );
  };

  const incrementPoints = async (userId, currentPoints, userEmail) => {
    const newPoints = (currentPoints || 0) + 5;
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, { puntosFidelidad: newPoints });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, puntosFidelidad: newPoints } : u
        )
      );
      if (newPoints >= 30 && (currentPoints || 0) < 30) {
        setDiscountMessage(
          `¡Felicidades! Has alcanzado 30 puntos y tienes un 10% de descuento.`
        );
        sendDiscountEmail(userEmail);
      } else {
        setDiscountMessage(null);
      }
      toast.success("+5 puntos añadidos");
    } catch (error) {
      console.error("Error incrementing points:", error);
      toast.error("No se pudieron sumar los puntos.");
    }
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const cleanupAppointmentListeners = () => {
    appointmentsUnsubsRef.current.forEach((fn) => {
      try {
        fn && fn();
      } catch {}
    });
    appointmentsUnsubsRef.current = [];
  };

  useEffect(() => {
    appointmentsUnsubsRef.current.forEach((fn) => {
      try {
        fn && fn();
      } catch {}
    });
    appointmentsUnsubsRef.current = [];
    setSelectedUserAppointments([]);

    if (!selectedUser) return;

    const rawEmail = (selectedUser.correo || selectedUser.email || "").trim();
    if (!rawEmail) return;

    const apptsCol = collection(db, "appointments");

    const sortClient = (arr) => {
      const toKey = (a) => `${a.date || ""} ${a.hour || ""}`.trim();
      return [...arr].sort((a, b) => {
        const ak = toKey(a);
        const bk = toKey(b);

        return ak < bk ? 1 : ak > bk ? -1 : 0;
      });
    };

    (async () => {
      try {
        const qOnce = query(apptsCol, where("email", "==", rawEmail));
        const snap = await getDocs(qOnce);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSelectedUserAppointments(sortClient(list));
      } catch (e) {
        console.error("appointments one-shot fetch error:", e);
      }
    })();

    try {
      const qOrdered = query(
        apptsCol,
        where("email", "==", rawEmail),
        orderBy("date", "desc")
      );
      const unsubOrdered = onSnapshot(
        qOrdered,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSelectedUserAppointments(sortClient(list));
        },
        (err) => {
          console.warn(
            "onSnapshot(appointments ordered) -> fallback sin orderBy:",
            err
          );
          const qPlain = query(apptsCol, where("email", "==", rawEmail));
          const unsubPlain = onSnapshot(
            qPlain,
            (snap2) => {
              const list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
              setSelectedUserAppointments(sortClient(list2));
            },
            (err2) =>
              console.error("onSnapshot(appointments plain) error:", err2)
          );
          appointmentsUnsubsRef.current.push(unsubPlain);
        }
      );
      appointmentsUnsubsRef.current.push(unsubOrdered);
    } catch (e) {
      console.warn("crear snapshot ordered falló, usando plain:", e);
      try {
        const qPlain = query(apptsCol, where("email", "==", rawEmail));
        const unsubPlain = onSnapshot(
          qPlain,
          (snap2) => {
            const list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
            setSelectedUserAppointments(sortClient(list2));
          },
          (err2) => console.error("onSnapshot(appointments plain) error:", err2)
        );
        appointmentsUnsubsRef.current.push(unsubPlain);
      } catch (ee) {
        console.error("appointments snapshot total failure:", ee);
      }
    }

    return () => cleanupAppointmentListeners();
  }, [selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, []);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAskDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    await deleteUser(userToDelete.id);
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  return (
    <div className="user-management-container container-fluid py-3">
      <ToastContainer />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="user-management-title m-0">Gestión de Usuarios</h5>
        <div className="user-management-kpis d-flex gap-2">
          <span className="badge bg-light text-dark">
            Total: <strong>{users.length}</strong>
          </span>
          <span className="badge bg-primary-soft">Activos</span>
        </div>
      </div>

      {discountMessage && (
        <div className="alert alert-success text-center">{discountMessage}</div>
      )}

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="card user-management-card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="m-0">Usuarios</h6>
              <small className="text-muted">Abre “Perfil” para ver citas</small>
            </div>
            <div className="card-body p-0">
              <UserList
                users={users}
                loading={loadingUsers}
                selectedUserId={selectedUserId}
                onSelect={(id) => setSelectedUserId(id)}
                onIncrementPoints={(u) =>
                  incrementPoints(
                    u.id,
                    u.puntosFidelidad,
                    u.correo || u.email || ""
                  )
                }
                onDelete={(u) => handleAskDelete(u)}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card user-management-card profile-card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="m-0">Perfil de Usuario</h6>
              {selectedUserId && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedUserId(null)}
                >
                  Cerrar
                </button>
              )}
            </div>
            <div className="card-body">
              <UserForm
                usuario={selectedUser}
                citas={selectedUserAppointments}
              />
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-custom">
            <h5 className="modal-title">¿Eliminar usuario?</h5>
            <p className="modal-text">
              ¿Estás segura/o que deseas eliminar a{" "}
              <strong>{userToDelete?.nombre}</strong>? Esta acción no se puede
              deshacer.
            </p>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>

              <button className="btn btn-danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
