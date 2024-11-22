// src/components/UserList.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
// Importa el archivo CSS

const UserList = () => {
  const [users, setUsers] = useState([]);

  // Cargar los usuarios de Firestore al montar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Función para obtener los usuarios de Firestore
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

  return (
    <div className="user-list-container">
      <h2 className="user-list-title">Gestión de Usuarios</h2>
      <div className="user-table-container">
        <table className="table user-table">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="user-row">
                <td>{user.name}</td>
                <td>{user.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
