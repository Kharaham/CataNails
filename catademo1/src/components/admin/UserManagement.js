import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles/adminS/usuarios.css";
import emailjs from "emailjs-com";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [discountMessage, setDiscountMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, "usuarios");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, "usuarios", userId));
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const sendDiscountEmail = (userEmail) => {
    const templateParams = {
      from_name: "Administrador",
      to_email: userEmail,
      mensaje:
        "¡Felicidades! Has alcanzado 30 puntos de fidelidad y tienes un descuento del 10% en tu próxima compra. Gracias por tu preferencia.",
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
          toast.success("Correo de descuento enviado con éxito.");
        },
        (error) => {
          console.error("Error al enviar el correo:", error);
          toast.error("Hubo un error al enviar el correo de descuento.");
        }
      );
  };

  const incrementPoints = async (userId, currentPoints, userEmail) => {
    const newPoints = (currentPoints || 0) + 5;

    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, { puntosFidelidad: newPoints });
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, puntosFidelidad: newPoints } : user
        )
      );

      if (newPoints >= 30 && currentPoints < 30) {
        setDiscountMessage(
          `¡Felicidades! Has alcanzado 30 puntos y tienes un descuento del 10%!`
        );
        sendDiscountEmail(userEmail);
      } else {
        setDiscountMessage(null);
      }
    } catch (error) {
      console.error("Error incrementing points:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="user-management-container mt-4">
      <ToastContainer />
      <h5 className="user-management-title text-center mb-3">
        Gestión de Usuarios
      </h5>

      {discountMessage && (
        <div className="alert alert-success text-center">{discountMessage}</div>
      )}

      <div className="user-management-table-wrapper">
        <table className="user-management-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Preferencia</th>
              <th>Puntos de Fidelidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nombre}</td>
                <td>{user.correo}</td>
                <td>{user.telefono}</td>
                <td>{user.preferencia}</td>
                <td>{user.puntosFidelidad || 0}</td>
                <td>
                  <button
                    onClick={() =>
                      incrementPoints(
                        user.id,
                        user.puntosFidelidad,
                        user.correo
                      )
                    }
                    className="btn-increment"
                  >
                    +5 Puntos
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="btn-delete"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
