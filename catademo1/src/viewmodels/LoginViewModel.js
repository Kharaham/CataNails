import { useState } from "react";
import { useNavigate } from "react-router-dom";
import firebaseApp from "../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export const useLoginViewModel = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const register = async (rol) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const docRef = doc(firestore, `usuarios/${userCredential.user.uid}`);
      await setDoc(docRef, {
        correo: email,
        rol,
        nombre: name,
        telefono: phone,
      });

      setIsAuthenticated(true);
      navigate("/");
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
    setName,
    phone,
    setPhone,
    error,
    isAuthenticated,
    register,
  };
};
