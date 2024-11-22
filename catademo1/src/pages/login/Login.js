import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import firebaseApp from "../../firebase/firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { FaEnvelope, FaLock, FaUser, FaPhone, FaGoogle } from "react-icons/fa";
import "../../styles/components/login.css";
import { sendEmailVerification } from "firebase/auth";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

function Login() {
  const [correo, setCorreo] = useState(""); // Cambiado a 'correo'
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState(""); // Cambiado a 'nombre'
  const [telefono, setTelefono] = useState(""); // Cambiado a 'telefono'
  const [formMode, setFormMode] = useState("login"); // 'login', 'register', 'reset'
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        correo, // Cambiado a 'correo'
        password
      );
      const rol = await getRol(userCredential.user.uid);
      navigate(rol === "admin" ? "/admin/dashboard" : "/");
    } catch (error) {
      setErrorMessage(
        "Error al iniciar sesión. Por favor, verifica tus datos."
      );
    }
  };

  // const handleLogin = async (e) => {
  //e.preventDefault();
  //setErrorMessage("");

  // try {
  //const userCredential = await signInWithEmailAndPassword(auth, correo, password);

  //if (!userCredential.user.emailVerified) {
  //setErrorMessage(
  //  "Tu correo electrónico no ha sido verificado. Por favor, revisa tu correo y verifica tu cuenta."
  // );
  //return;
  //}

  //const rol = await getRol(userCredential.user.uid);
  //navigate(rol === "admin" ? "/admin/dashboard" : "/");
  //} catch (error) {
  //setErrorMessage("Error al iniciar sesión. Por favor, verifica tus datos.");
  //}
  //};

  const validarPassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-z]).{8,}$/;
    return regex.test(password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validarPassword(password)) {
      setErrorMessage(
        "La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial."
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        correo,
        password
      );

      await sendEmailVerification(userCredential.user);
      await setDoc(doc(firestore, "usuarios", userCredential.user.uid), {
        nombre,
        correo,
        telefono,

        rol: "user",
      });

      setSuccessMessage(
        "Cuenta creada exitosamente. Revisa tu correo para verificar tu cuenta."
      );
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      setErrorMessage("Error al registrarse. Por favor, intenta de nuevo.");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage(""); // Resetea el mensaje de éxito al comenzar
    try {
      const usersRef = collection(firestore, "usuarios");
      const q = query(
        usersRef,
        where("correo", "==", correo.trim()),
        where("telefono", "==", telefono.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        await sendPasswordResetEmail(auth, correo.trim());
        setSuccessMessage(
          "Hemos enviado un correo para cambiar tu contraseña."
        ); // Mensaje de éxito
        setFormMode("login"); // Cambia al modo de login después de enviar el correo
      } else {
        setErrorMessage("Correo o teléfono no coinciden con los registrados.");
      }
    } catch (error) {
      setErrorMessage(
        `Error al enviar el correo de recuperación: ${error.message}`
      );
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Almacena el usuario en Firestore si no existe
      const userRef = doc(firestore, "usuarios", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          nombre: user.displayName,
          correo: user.email,
          telefono: "", // O deja vacío si no es necesario
          rol: "user",
        });
      }

      const rol = await getRol(user.uid);
      navigate(rol === "admin" ? "/dashboard" : "/");
    } catch (error) {
      setErrorMessage("Error al iniciar sesión con Google: " + error.message);
    }
  };

  const getRol = async (uid) => {
    const docRef = doc(firestore, `usuarios/${uid}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().rol; // Asegúrate de que el campo "rol" existe en Firestore
    } else {
      console.error("No se encontró el documento del usuario.");
      return null;
    }
  };

  return (
    <div className="login-background">
      <Container className="login-container">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <div className="login-form-wrapper">
              {formMode === "login" && (
                <>
                  <h1 className="login-title">Iniciar Sesión</h1>
                  <Button
                    variant="link"
                    onClick={() => setFormMode("reset")}
                    className="login-toggle mb-3"
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                  <Form onSubmit={handleLogin}>
                    <Form.Group
                      controlId="formBasicEmail"
                      className="mb-3 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaEnvelope />
                      </div>
                      <Form.Control
                        type="email"
                        value={correo} // Cambiado a 'correo'
                        onChange={(e) => setCorreo(e.target.value)} // Cambiado a 'correo'
                        required
                        placeholder="Introduce tu correo"
                      />
                    </Form.Group>
                    <Form.Group
                      controlId="formBasicPassword"
                      className="mb-4 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaLock />
                      </div>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Introduce tu contraseña"
                      />
                    </Form.Group>
                    <Button
                      variant="custom"
                      type="submit"
                      className="login-button mb-2"
                    >
                      Iniciar sesión
                    </Button>
                  </Form>
                  <Button
                    variant="custom"
                    onClick={handleGoogleSignIn}
                    className="login-button mb-3"
                  >
                    <FaGoogle /> Iniciar sesión con Google
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => setFormMode("register")}
                    className="login-toggle"
                  >
                    ¿No tienes cuenta? Regístrate
                  </Button>
                  {errorMessage && (
                    <p className="login-error-message">{errorMessage}</p>
                  )}
                </>
              )}

              {formMode === "register" && (
                <>
                  <h1 className="login-title">Regístrate</h1>
                  <Form onSubmit={handleRegister}>
                    <Form.Group
                      controlId="formName"
                      className="mb-3 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaUser />
                      </div>
                      <Form.Control
                        type="text"
                        value={nombre} // Cambiado a 'nombre'
                        onChange={(e) => setNombre(e.target.value)} // Cambiado a 'nombre'
                        required
                        placeholder="Introduce tu nombre"
                      />
                    </Form.Group>
                    <Form.Group
                      controlId="formPhone"
                      className="mb-3 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaPhone />
                      </div>
                      <Form.Control
                        type="text"
                        value={telefono} // Cambiado a 'telefono'
                        onChange={(e) => setTelefono(e.target.value)} // Cambiado a 'telefono'
                        required
                        placeholder="Introduce tu teléfono"
                      />
                    </Form.Group>
                    <Form.Group
                      controlId="formEmail"
                      className="mb-3 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaEnvelope />
                      </div>
                      <Form.Control
                        type="email"
                        value={correo} // Cambiado a 'correo'
                        onChange={(e) => setCorreo(e.target.value)} // Cambiado a 'correo'
                        required
                        placeholder="Introduce tu correo"
                      />
                    </Form.Group>
                    <Form.Group
                      controlId="formPassword"
                      className="mb-4 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaLock />
                      </div>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Introduce tu contraseña"
                      />
                    </Form.Group>
                    <Button
                      variant="custmon"
                      type="submit"
                      className="login-button mb-3"
                    >
                      Registrarse
                    </Button>
                  </Form>
                  <Button
                    variant="link"
                    onClick={() => setFormMode("login")}
                    className="login-toggle"
                  >
                    ¿Ya tienes cuenta? Inicia sesión
                  </Button>
                  {errorMessage && (
                    <p className="login-error-message">{errorMessage}</p>
                  )}
                </>
              )}

              {formMode === "reset" && (
                <>
                  <h1 className="login-title">Recuperar Contraseña</h1>
                  <Form onSubmit={handlePasswordReset}>
                    <Form.Group
                      controlId="formBasicEmail"
                      className="mb-3 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaEnvelope />
                      </div>
                      <Form.Control
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                        placeholder="Introduce tu correo"
                      />
                    </Form.Group>
                    <Form.Group
                      controlId="formBasicPhone"
                      className="mb-4 login-input-group"
                    >
                      <div className="login-input-icon">
                        <FaPhone />
                      </div>
                      <Form.Control
                        type="text"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        required
                        placeholder="Introduce tu teléfono"
                      />
                    </Form.Group>
                    <Button
                      variant="primary"
                      type="submit"
                      className="login-button mb-3"
                    >
                      Enviar correo de recuperación
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => setFormMode("login")}
                      className="login-toggle"
                    >
                      Regresar a inicio de sesión
                    </Button>
                  </Form>
                  {errorMessage && (
                    <p className="login-error-message">{errorMessage}</p>
                  )}
                  {successMessage && (
                    <p className="login-success-message">{successMessage}</p> // Mensaje de éxito
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;
