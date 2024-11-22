import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import firebaseApp from "../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export const useLoginViewModel = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Estado para el nombre
  const [phone, setPhone] = useState(""); // Estado para el teléfono
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate(); // Hook para navegación

  const register = async (rol) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Crear documento en "usuarios" con el UID del usuario
      const docRef = doc(firestore, `usuarios/${userCredential.user.uid}`);
      await setDoc(docRef, {
        correo: email,
        rol,
        nombre: name, // Asegúrate de guardar el nombre
        telefono: phone, // Asegúrate de guardar el teléfono
      });

      setIsAuthenticated(true);
      navigate("/"); // Redirigir al home después del registro
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      setError("Error al registrar el usuario.");
      setIsAuthenticated(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName, // Exponer la función para manejar el nombre
    phone,
    setPhone, // Exponer la función para manejar el teléfono
    error,
    isAuthenticated,
    register,
  };
};
