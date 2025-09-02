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
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
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
  FaEnvelope, FaLock, FaUser, FaPhone, FaGoogle, FaEye, FaEyeSlash
} from "react-icons/fa";
import "../../styles/components/login.css";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const getStrength = (pwd) => {
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

  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [persist, setPersist] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [messages, setMessages] = useState({ error: "", success: "" });

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    // correo de Firebase en español
    auth.useDeviceLanguage?.();
    // foco inicial
    const first = document.querySelector("input[type='email']");
    first && first.focus();
  }, [tab]);

  const mapFirebaseError = (code) => {
    const d = {
      "auth/invalid-email": "El correo no es válido.",
      "auth/user-disabled": "La cuenta está deshabilitada.",
      "auth/user-not-found": "No existe una cuenta con ese correo.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
      "auth/email-already-in-use": "Ese correo ya está registrado.",
      "auth/weak-password": "La contraseña es débil.",
      "auth/popup-closed-by-user": "Se cerró la ventana de Google.",
      "auth/invalid-continue-uri": "URL de retorno no autorizada en Firebase Auth.",
    };
    return d[code] || "Ocurrió un error. Intenta nuevamente.";
  };

  const getRol = async (uid) => {
    const snap = await getDoc(doc(firestore, "usuarios", uid));
    return snap.exists() ? snap.data().rol : null;
  };

  const setAuthPersistence = async (remember) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  };

  // ---- LOGIN ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessages({ error: "", success: "" });
    setLoading(true);
    try {
      await setAuthPersistence(persist);
      const { user } = await signInWithEmailAndPassword(auth, correo.trim(), password);
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setMessages({ error: "Tu correo no está verificado. Te reenviamos el email.", success: "" });
        setLoading(false);
        return;
      }
      const rol = await getRol(user.uid);
      navigate(rol === "admin" ? "/admin/dashboard" : "/");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setMessages({ error: mapFirebaseError(err.code), success: "" });
    } finally {
      setLoading(false);
    }
  };

  // ---- REGISTER ----
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessages({ error: "", success: "" });
    if (getStrength(password) < 4) {
      setMessages({ error: "La contraseña debe incluir 8+ caracteres, mayúsculas, minúsculas y números.", success: "" });
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, correo.trim(), password);
      await sendEmailVerification(user);
      await setDoc(doc(firestore, "usuarios", user.uid), {
        nombre: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        rol: "user",
        createdAt: new Date().toISOString(),
      });
      setMessages({ error: "", success: "Cuenta creada. Revisa tu correo para verificarla." });
      setTab("login");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setMessages({ error: mapFirebaseError(err.code), success: "" });
    } finally {
      setLoading(false);
    }
  };

  // ---- RESET (SOLO CORREO) ----
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setMessages({ error: "", success: "" });
    setLoading(true);
    try {
      // (opcional) validamos que el correo tenga un método registrado para feedback más claro
      const methods = await fetchSignInMethodsForEmail(auth, correo.trim());
      if (!methods.length) {
        // Si prefieres no revelar existencia del correo, comenta la siguiente línea
        throw { code: "auth/user-not-found" };
      }

      // Asegúrate de tener este dominio en Auth > Dominios autorizados
      const continueUrl = `${window.location.origin}/login`;
      const actionCodeSettings = { url: continueUrl, handleCodeInApp: false };

      await sendPasswordResetEmail(auth, correo.trim(), actionCodeSettings);
      setMessages({ error: "", success: "Te enviamos un correo para restablecer la contraseña." });
      setTab("login");
    } catch (err) {
      console.error("RESET ERROR:", err);
      setMessages({ error: mapFirebaseError(err.code), success: "" });
    } finally {
      setLoading(false);
    }
  };

  // ---- GOOGLE ----
  const handleGoogleSignIn = async () => {
    setMessages({ error: "", success: "" });
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const ref = doc(firestore, "usuarios", user.uid);
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
      const rol = await getRol(user.uid);
      navigate(rol === "admin" ? "/admin/dashboard" : "/");
    } catch (err) {
      console.error("GOOGLE ERROR:", err);
      setMessages({ error: mapFirebaseError(err.code), success: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background">
      <Container className="login-container">
        <Row className="justify-content-center">
          <Col xs={12} lg={10}>
            <div className="login-card glass">
              <Row className="g-0">
                {/* Branding */}
                <Col md={5} className="login-side d-none d-md-flex">
                  <div className="brand">
                    <div className="brand-dot" />
                    <h2>CataaNails</h2>
                    <p>Agenda inteligente y segura para tus servicios.</p>
                  </div>
                </Col>

                {/* Formulario */}
                <Col md={7} xs={12} className="login-form-col">
                  <Tabs
                    id="auth-tabs"
                    activeKey={tab}
                    onSelect={(k) => setTab(k || "login")}
                    className="login-tabs"
                    justify
                  >
                    {/* -------- LOGIN -------- */}
                    <Tab eventKey="login" title="Iniciar sesión">
                      <Form onSubmit={handleLogin} className="form-stretch pt-3">
                        <Form.Group className="mb-3">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={correo}
                              onChange={(e) => setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-2">
                          <Form.Label>Contraseña</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaLock /></InputGroup.Text>
                            <Form.Control
                              type={showPwd ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Tu contraseña"
                              required
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => setShowPwd((v) => !v)}
                              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {showPwd ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>
                        </Form.Group>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <Form.Check
                            type="checkbox"
                            id="remember"
                            label="Recordarme"
                            checked={persist}
                            onChange={(e) => setPersist(e.target.checked)}
                          />
                          <Button variant="link" className="p-0" onClick={() => setTab("reset")}>
                            ¿Olvidaste tu contraseña?
                          </Button>
                        </div>

                        {/* Acciones al fondo */}
                        <div className="form-actions">
                          <Button className="login-button w-100" type="submit" disabled={loading}>
                            {loading ? <Spinner size="sm" animation="border" /> : "Ingresar"}
                          </Button>

                          <Button
                            className="login-button login-button--google w-100"
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                          >
                            <FaGoogle /> <span>Continuar con Google</span>
                          </Button>

                          <div className="text-center">
                            <Button variant="link" onClick={() => setTab("register")}>
                              ¿No tienes cuenta? Regístrate
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>

                    {/* -------- REGISTRO -------- */}
                    <Tab eventKey="register" title="Crear cuenta">
                      <Form onSubmit={handleRegister} className="form-stretch pt-3">
                        <Form.Group className="mb-3">
                          <Form.Label>Nombre</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaUser /></InputGroup.Text>
                            <Form.Control
                              type="text"
                              value={nombre}
                              onChange={(e) => setNombre(e.target.value)}
                              placeholder="Tu nombre completo"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Teléfono</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaPhone /></InputGroup.Text>
                            <Form.Control
                              type="tel"
                              value={telefono}
                              onChange={(e) => setTelefono(e.target.value)}
                              placeholder="+56 9 xxxx xxxx"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={correo}
                              onChange={(e) => setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-1">
                          <Form.Label>Contraseña</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaLock /></InputGroup.Text>
                            <Form.Control
                              type={showPwd ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Mínimo 8 caracteres"
                              required
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => setShowPwd((v) => !v)}
                            >
                              {showPwd ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>
                        </Form.Group>

                        <div className="pwd-strength mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < getStrength(password) ? "on" : ""} />
                          ))}
                          <small className="ms-2">
                            {["Muy débil","Débil","Media","Buena","Fuerte"][Math.max(0, getStrength(password)-1)] || ""}
                          </small>
                        </div>

                        <div className="form-actions">
                          <Button className="login-button w-100" type="submit" disabled={loading}>
                            {loading ? <Spinner size="sm" animation="border" /> : "Crear cuenta"}
                          </Button>

                          <div className="text-center">
                            <Button variant="link" onClick={() => setTab("login")}>
                              ¿Ya tienes cuenta? Inicia sesión
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>

                    {/* -------- RECUPERAR (solo correo) -------- */}
                    <Tab eventKey="reset" title="Recuperar">
                      <Form onSubmit={handlePasswordReset} className="form-stretch pt-3">
                        <Form.Group className="mb-4">
                          <Form.Label>Correo</Form.Label>
                          <InputGroup>
                            <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                            <Form.Control
                              type="email"
                              value={correo}
                              onChange={(e) => setCorreo(e.target.value)}
                              placeholder="tucorreo@dominio.com"
                              required
                            />
                          </InputGroup>
                        </Form.Group>

                        <div className="form-actions">
                          <Button className="login-button w-100" type="submit" disabled={loading}>
                            {loading ? <Spinner size="sm" animation="border" /> : "Enviar correo de recuperación"}
                          </Button>

                          <div className="text-center">
                            <Button variant="link" onClick={() => setTab("login")}>
                              Volver a iniciar sesión
                            </Button>
                          </div>
                        </div>
                      </Form>
                    </Tab>
                  </Tabs>

                  {messages.error && <p className="login-error-message">{messages.error}</p>}
                  {messages.success && <p className="login-success-message">{messages.success}</p>}
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
