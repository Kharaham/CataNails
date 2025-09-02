import React, { useState, useEffect } from "react";
import firebaseApp from "../../firebase/firebase";
import {
  getAuth,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaEnvelope } from "react-icons/fa";
import "../../styles/components/login.css";

const auth = getAuth(firebaseApp);

export default function PasswordReset({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ error: "", success: "" });

  useEffect(() => {
    auth.useDeviceLanguage(); // manda el correo en español
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setMsg({ error: "", success: "" });
    setLoading(true);
    try {
      // (Opcional) verifica que exista algún método para ese correo
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (!methods.length) {
        // Para no revelar si el correo existe o no, podemos mostrar éxito igualmente,
        // pero si prefieres avisar:
        // throw { code: "auth/user-not-found" };
      }

      // (Opcional) continúa en tu sitio después de resetear
      const actionCodeSettings = {
        // Cambia al dominio permitido en Firebase Auth -> Dominios autorizados
        url: "https://tudominio.com/login",
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setMsg({
        error: "",
        success: "Te enviamos un correo para restablecer la contraseña.",
      });
    } catch (err) {
      const map = {
        "auth/invalid-email": "El correo no es válido.",
        "auth/user-not-found":
          "No existe una cuenta con ese correo. Verifica e inténtalo nuevamente.",
        "auth/too-many-requests":
          "Demasiados intentos. Espera unos minutos e inténtalo otra vez.",
      };
      setMsg({ error: map[err.code] || "No se pudo enviar el correo.", success: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-wrapper">
      <h1 className="login-title">Recuperar contraseña</h1>
      <Form onSubmit={handlePasswordReset} className="form-stretch pt-3">
        <Form.Group className="mb-4">
          <Form.Label>Correo</Form.Label>
          <InputGroup>
            <InputGroup.Text><FaEnvelope /></InputGroup.Text>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@dominio.com"
              required
            />
          </InputGroup>
        </Form.Group>

        {/* Botones abajo */}
        <div className="form-actions">
          <Button className="login-button w-100" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar correo de recuperación"}
          </Button>
          <div className="text-center">
            <Button variant="link" onClick={onBack}>
              Volver a iniciar sesión
            </Button>
          </div>
        </div>
      </Form>

      {msg.error && <p className="login-error-message">{msg.error}</p>}
      {msg.success && <p className="login-success-message">{msg.success}</p>}
    </div>
  );
}
