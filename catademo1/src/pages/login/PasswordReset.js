import React, { useState } from "react";
import firebaseApp from "../../firebase/firebase";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Button, Form } from "react-bootstrap";
import { FaEnvelope, FaPhone } from "react-icons/fa";
import "../../styles/components/login.css";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

function PasswordReset({ onBack }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    try {
      const userRef = doc(firestore, "usuarios", email);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.phone === phone) {
          await sendPasswordResetEmail(auth, email);
          setResetSuccess(
            "Se ha enviado un correo para restablecer la contraseña."
          );
        } else {
          setResetError("El número de teléfono no coincide con el registrado.");
        }
      } else {
        setResetError("No se encontró ningún usuario con ese correo.");
      }
    } catch (error) {
      console.error("Error al enviar el correo de recuperación:", error);
      setResetError(
        "Error al enviar el correo de recuperación. Por favor, intenta de nuevo."
      );
    }
  };

  return (
    <div className="password-reset-wrapper">
      <h1 className="login-title">Recupera tu contraseña</h1>
      <Form onSubmit={handlePasswordReset}>
        <Form.Group
          controlId="formResetEmail"
          className="mb-3 login-input-group"
        >
          <div className="login-input-icon">
            <FaEnvelope />
          </div>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Introduce tu correo"
          />
        </Form.Group>
        <Form.Group
          controlId="formResetPhone"
          className="mb-4 login-input-group"
        >
          <div className="login-input-icon">
            <FaPhone />
          </div>
          <Form.Control
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Introduce tu teléfono"
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="login-button">
          Recuperar contraseña
        </Button>
        <Button
          variant="link"
          onClick={onBack}
          className="login-toggle-register"
        >
          Volver al inicio de sesión
        </Button>
      </Form>
      {resetError && <p className="login-error-message">{resetError}</p>}
      {resetSuccess && <p className="login-success-message">{resetSuccess}</p>}
    </div>
  );
}

export default PasswordReset;
