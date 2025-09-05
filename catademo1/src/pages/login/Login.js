import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import firebaseApp from "../../firebase/firebase";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import {
  Button,
  Form,
  Container,
  Row,
  Col,
  Tabs,
  Tab,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaPhone,
  FaGoogle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "../../styles/components/login.css"; // puedes mantener la misma ruta

const loginC_auth = getAuth(firebaseApp);
const loginC_firestore = getFirestore(firebaseApp);
const loginC_googleProvider = new GoogleAuthProvider();

const loginC_getStrength = (pwd) => {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};

export default function Login() {
  const navigate = useNavigate();

  const [loginC_tab, loginC_setTab] = useState("login");
  const [loginC_loading, loginC_setLoading] = useState(false);
  const [loginC_persist, loginC_setPersist] = useState(true);
  const [loginC_showPwd, loginC_setShowPwd] = useState(false);
  const [loginC_messages, loginC_setMessages] = useState({
    error: "",
    success: "",
  });

  const [loginC_correo, loginC_setCorreo] = useState("");
  const [loginC_password, loginC_setPassword] = useState("");
  const [loginC_nombre, loginC_setNombre] = useState("");
  const [loginC_telefono, loginC_setTelefono] = useState("");

  useEffect(() => {
    loginC_auth.useDeviceLanguage?.();
    const first = document.querySelector(".loginC-root input[type='email']");
    first && first.focus();
  }, [loginC_tab]);

  // Redirección si ya está logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(loginC_auth, async (user) => {
      if (user) {
        const rol = await loginC_getRol(user.uid);
        navigate(rol === "admin" ? "/admin/dashboard" : "/");
      }
    });
    return () => unsub();
  }, [navigate]);

  const loginC_mapFirebaseError = (code) => {
    const d = {
      "auth/invalid-email": "El correo no es válido.",
      "auth/user-disabled": "La cuenta está deshabilitada.",
      "auth/user-not-found": "No existe una cuenta con ese correo.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
      "auth/email-already-in-use": "Ese correo ya está registrado.",
      "auth/weak-password": "La contraseña es débil.",
      "auth/popup-closed-by-user": "Se cerró la ventana de Google.",
      "auth/invalid-continue-uri":
        "URL de retorno no autorizada en Firebase Auth.",
    };
    return d[code] || "Ocurrió un error. Intenta nuevamente.";
  };

  const loginC_getRol = async (uid) => {
    const snap = await getDoc(doc(loginC_firestore, "usuarios", uid));
    return snap.exists() ? snap.data().rol : null;
  };

  const loginC_setAuthPersistence = async (remember) => {
    await setPersistence(
      loginC_auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
  };

  // ===== LOGIN (sin exigir verificación) =====
  const loginC_handleLogin = async (e) => {
    e.preventDefault();
    loginC_setMessages({ error: "", success: "" });
    loginC_setLoading(true);
    try {
      await loginC_setAuthPersistence(loginC_persist);
      const { user } = await signInWithEmailAndPassword(
        loginC_auth,
        loginC_correo.trim(),
        loginC_password
      );
      const rol = await loginC_getRol(user.uid);
      navigate(rol === "admin" ? "/admin/dashboard" : "/");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      loginC_setMessages({
        error: loginC_mapFirebaseError(err.code),
        success: "",
      });
    } finally {
      loginC_setLoading(false);
    }
  };

  // ===== REGISTER (redirige directo) =====
  const loginC_handleRegister = async (e) => {
    e.preventDefault();
    loginC_setMessages({ error: "", success: "" });
    if (loginC_getStrength(loginC_password) < 4) {
      loginC_setMessages({
        error:
          "La contraseña debe incluir 8+ caracteres, mayúsculas, minúsculas y números.",
        success: "",
      });
      return;
    }
    loginC_setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        loginC_auth,
        loginC_correo.trim(),
        loginC_password
      );
      await setDoc(doc(loginC_firestore, "usuarios", user.uid), {
        nombre: loginC_nombre.trim(),
        correo: loginC_correo.trim(),
        telefono: loginC_telefono.trim(),
        rol: "user",
        createdAt: new Date().toISOString(),
      });
      navigate("/");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      loginC_setMessages({
        error: loginC_mapFirebaseError(err.code),
        success: "",
      });
    } finally {
      loginC_setLoading(false);
    }
  };

  // ===== RESET (siempre intenta enviar) =====
  const loginC_handlePasswordReset = async (e) => {
    e.preventDefault();
    loginC_setMessages({ error: "", success: "" });
    loginC_setLoading(true);
    try {
      const continueUrl = `${window.location.origin}/login`;
      const actionCodeSettings = { url: continueUrl, handleCodeInApp: false };
      await sendPasswordResetEmail(
        loginC_auth,
        loginC_correo.trim(),
        actionCodeSettings
      );
      loginC_setMessages({
        error: "",
        success:
          "Si el correo está registrado, te enviamos instrucciones para restablecer la contraseña.",
      });
      loginC_setTab("login");
    } catch (err) {
      console.error("RESET ERROR:", err);
      loginC_setMessages({
        error: loginC_mapFirebaseError(err.code),
        success: "",
      });
    } finally {
      loginC_setLoading(false);
    }
  };

  // ===== GOOGLE =====
  const loginC_handleGoogleSignIn = async () => {
    loginC_setMessages({ error: "", success: "" });
    loginC_setLoading(true);
    try {
      const { user } = await signInWithPopup(
        loginC_auth,
        loginC_googleProvider
      );
      const ref = doc(loginC_firestore, "usuarios", user.uid);
      const exists = await getDoc(ref);
      if (!exists.exists()) {
        await setDoc(ref, {
          nombre: user.displayName || "",
          correo: user.email || "",
          telefono: "",
          rol: "user",
          createdAt: new Date().toISOString(),
          provider: "google",
        });
      }
      const rol = await loginC_getRol(user.uid);
      navigate(rol === "admin" ? "/admin/dashboard" : "/");
    } catch (err) {
      console.error("GOOGLE ERROR:", err);
      loginC_setMessages({
        error: loginC_mapFirebaseError(err.code),
        success: "",
      });
    } finally {
      loginC_setLoading(false);
    }
  };

  return (
    <div className="loginC-background loginC-root">
      <div className="loginC-blob loginC-blob--1" />
      <div className="loginC-blob loginC-blob--2" />

      <Container className="loginC-container">
        <Row className="justify-content-center">
          <Col xs={12} lg={10}>
            <div className="loginC-card loginC-glass">
              <Row className="g-0">
                {/* Branding */}
                <Col md={5} className="loginC-side d-none d-md-flex">
                  <div className="loginC-brand">
                    <div className="loginC-brand-dot" />
                    <h2 className="loginC-brand-title">CataaNails</h2>
                    <p className="loginC-brand-sub">
                      Agenda inteligente con IA para tu salón
                    </p>
                    <ul className="loginC-brand-bullets">
                      <li>
                        <span className="loginC-bullet" />
                        Reservas sin fricción
                      </li>
                      <li>
                        <span className="loginC-bullet" />
                        Recordatorios automáticos
                      </li>
                      <li>
                        <span className="loginC-bullet" />
                        Reportes y métricas
                      </li>
                    </ul>
                  </div>
                </Col>

                {/* Formulario */}
                <Col md={7} xs={12} className="loginC-form-col">
                  <div className="loginC-header">
                    <h3 className="loginC-title">Bienvenida ✨</h3>
                    <p className="loginC-subtitle">
                      Inicia sesión o crea tu cuenta para continuar.
                    </p>
                  </div>

                  {/* Ocultamos la navegación de Tabs, usamos los links de abajo */}
                  <Tabs>
                    {/* -------- LOGIN -------- */}
                    <Tab eventKey="login" title="Iniciar sesión">
                      <Form
                        onSubmit={loginC_handleLogin}
                        className="loginC-form-stretch pt-3"
                      >
                        <Form.Group className="mb-3">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <FaEnvelope />
                            </InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={loginC_correo}
                              onChange={(e) => loginC_setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Contraseña</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <FaLock />
                            </InputGroup.Text>
                            <Form.Control
                              type={loginC_showPwd ? "text" : "password"}
                              value={loginC_password}
                              onChange={(e) =>
                                loginC_setPassword(e.target.value)
                              }
                              placeholder="Tu contraseña"
                              required
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => loginC_setShowPwd((v) => !v)}
                              aria-label={
                                loginC_showPwd
                                  ? "Ocultar contraseña"
                                  : "Mostrar contraseña"
                              }
                            >
                              {loginC_showPwd ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>

                          {/* Olvidaste debajo del campo */}
                          <div className="d-flex justify-content-end mt-2">
                            <Button
                              variant="link"
                              className="p-0 loginC-link-sm"
                              onClick={() => loginC_setTab("reset")}
                            >
                              ¿Olvidaste tu contraseña?
                            </Button>
                          </div>

                          {/* Recordarme */}
                          <div className="d-flex align-items-center gap-2 mt-2">
                            <Form.Check
                              type="checkbox"
                              id="loginC-remember"
                              label="Recordarme"
                              checked={loginC_persist}
                              onChange={(e) =>
                                loginC_setPersist(e.target.checked)
                              }
                            />
                          </div>
                        </Form.Group>

                        {/* Acciones */}
                        <div className="loginC-form-actions">
                          <Button
                            className="loginC-button w-100"
                            type="submit"
                            disabled={loginC_loading}
                          >
                            {loginC_loading ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              "Ingresar"
                            )}
                          </Button>

                          <div className="loginC-divider">
                            <span>o</span>
                          </div>

                          <Button
                            className="loginC-button loginC-button--alt w-100"
                            type="button"
                            onClick={loginC_handleGoogleSignIn}
                            disabled={loginC_loading}
                          >
                            <FaGoogle /> <span>Continuar con Google</span>
                          </Button>

                          <div className="text-center">
                            <Button
                              variant="link"
                              onClick={() => loginC_setTab("register")}
                            >
                              ¿No tienes cuenta?{" "}
                              <span className="loginC-link-strong">
                                Crear cuenta
                              </span>
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>

                    {/* -------- REGISTRO -------- */}
                    <Tab eventKey="register" title="Crear cuenta">
                      <Form
                        onSubmit={loginC_handleRegister}
                        className="loginC-form-stretch pt-3"
                      >
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Nombre</Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <FaUser />
                                </InputGroup.Text>
                                <Form.Control
                                  type="text"
                                  value={loginC_nombre}
                                  onChange={(e) =>
                                    loginC_setNombre(e.target.value)
                                  }
                                  placeholder="Tu nombre completo"
                                  required
                                />
                              </InputGroup>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Teléfono</Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <FaPhone />
                                </InputGroup.Text>
                                <Form.Control
                                  type="tel"
                                  value={loginC_telefono}
                                  onChange={(e) =>
                                    loginC_setTelefono(e.target.value)
                                  }
                                  placeholder="+56 9 xxxx xxxx"
                                  required
                                />
                              </InputGroup>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <FaEnvelope />
                            </InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={loginC_correo}
                              onChange={(e) => loginC_setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-1">
                          <Form.Label>Contraseña</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <FaLock />
                            </InputGroup.Text>
                            <Form.Control
                              type={loginC_showPwd ? "text" : "password"}
                              value={loginC_password}
                              onChange={(e) =>
                                loginC_setPassword(e.target.value)
                              }
                              placeholder="Mínimo 8 caracteres"
                              required
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => loginC_setShowPwd((v) => !v)}
                            >
                              {loginC_showPwd ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>
                        </Form.Group>

                        <div className="loginC-pwd-strength mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={
                                i < loginC_getStrength(loginC_password)
                                  ? "on"
                                  : ""
                              }
                            />
                          ))}
                          <small className="ms-2">
                            {["Muy débil", "Débil", "Media", "Buena", "Fuerte"][
                              Math.max(
                                0,
                                loginC_getStrength(loginC_password) - 1
                              )
                            ] || ""}
                          </small>
                        </div>
                        <p className="loginC-hint">
                          Usa mayúsculas, minúsculas y números. Mejor si agregas
                          un símbolo.
                        </p>

                        <div className="loginC-form-actions">
                          <Button
                            className="loginC-button w-100"
                            type="submit"
                            disabled={loginC_loading}
                          >
                            {loginC_loading ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              "Crear cuenta"
                            )}
                          </Button>

                          <div className="loginC-divider">
                            <span>o</span>
                          </div>

                          <Button
                            className="loginC-button loginC-button--alt w-100"
                            type="button"
                            onClick={loginC_handleGoogleSignIn}
                            disabled={loginC_loading}
                          >
                            <FaGoogle /> <span>Registrarme con Google</span>
                          </Button>

                          <div className="text-center">
                            <Button
                              variant="link"
                              onClick={() => loginC_setTab("login")}
                            >
                              ¿Ya tienes cuenta?{" "}
                              <span className="loginC-link-strong">
                                Inicia sesión
                              </span>
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>

                    {/* -------- RECUPERAR -------- */}
                    <Tab eventKey="reset" title="Recuperar">
                      <Form
                        onSubmit={loginC_handlePasswordReset}
                        className="loginC-form-stretch pt-3"
                      >
                        <Form.Group className="mb-4">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <FaEnvelope />
                            </InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={loginC_correo}
                              onChange={(e) => loginC_setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                          <p className="loginC-hint mt-2">
                            Te enviaremos un enlace para restablecer tu
                            contraseña.
                          </p>
                        </Form.Group>

                        <div className="loginC-form-actions">
                          <Button
                            className="loginC-button w-100"
                            type="submit"
                            disabled={loginC_loading}
                          >
                            {loginC_loading ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              "Enviar correo de recuperación"
                            )}
                          </Button>

                          <div className="text-center">
                            <Button
                              variant="link"
                              onClick={() => loginC_setTab("login")}
                            >
                              Volver a iniciar sesión
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>
                  </Tabs>

                  {loginC_messages.error && (
                    <p className="loginC-error-message">
                      {loginC_messages.error}
                    </p>
                  )}
                  {loginC_messages.success && (
                    <p className="loginC-success-message">
                      {loginC_messages.success}
                    </p>
                  )}

                  <div className="loginC-footer">
                    <small>
                      Al continuar aceptas nuestros{" "}
                      <a href="#" className="loginC-link-strong">
                        Términos
                      </a>{" "}
                      y{" "}
                      <a href="#" className="loginC-link-strong">
                        Privacidad
                      </a>
                      .
                    </small>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
