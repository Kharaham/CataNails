import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Home from "./pages/home/Home";
import TrabajosRealizados from "./pages/works/TrabajosRealizados.js";

import Manicure from "./pages/service/Manicure";
import Pedicure from "./pages/service/Pedicure";
import AlisadoPermanente from "./pages/service/AlisadoPermanente";
import BotoxCapilar from "./pages/service/BotoxCapilar";
import ScheduleAppointmentView from "./components/agenda/ScheduleAppointmentView";
import Profile from "./components/client/Profile";
import About from "./pages/home/about";
import "./App.css";
import "font-awesome/css/font-awesome.min.css";
import ChatBotify from "react-chatbotify";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Outlet,
} from "react-router-dom";
import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseApp from "./firebase/firebase";
import Login from "./pages/login/Login";
import AdminSidebar from "./components/admin/AdminSidebar";
import UserManagement from "./components/admin/UserManagement";
import ServiceList from "./components/admin/ServiceList";
import CitaList from "./components/admin/CitasList";
import Dashboard from "./components/admin/Dashboard";
import AdminWorkDays from "./components/admin/AdminWorkDays";
import ReviewManagement from "./components/admin/ReviewManagement";
import AdminTrabajos from "./components/admin/AdminTrabajos";
import BankBalance from "./components/admin/BankBalance";
import AdminContactComments from "./components/admin/AdminContactComments";
import ReportsView from "./components/admin/ReportsView";
import BookNow from "./components/agenda/BookNow";
import TryOnNailsPhoto from "./components/TryOnNailsPhoto";
import SkinToneAnalyzer from "./components/SkinToneAnalyzer";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

function App() {
  const formRef = React.useRef({});

  const flow = {
    start: {
      message: "¡Hola! 😊 Bienvenid@ a CataNails. ¿En qué necesitas ayuda hoy?",
      options: [
        "Conoce Nuestros Servicios",
        "Revisa nuestro Portafolio",
        "Aprende sobre Nosotros",
      ],
      chatDisabled: true,
      clearOptions: true,
      path: (params) => {
        const answer = params.userInput;

        if (answer === "Conoce Nuestros Servicios") return "servicios_ver";
        if (answer === "Revisa nuestro Portafolio") return "portafolio_show";
        if (answer === "Aprende sobre Nosotros") return "about_show";

        return "start";
      },
    },

    servicios_ver: {
      message: "¿Qué servicio te interesa hoy?",
      options: ["Manicure", "Pedicure", "Alisado Permanente", "Botox Capilar"],
      chatDisabled: true,
      clearOptions: true,
      path: "service_info",
    },

    service_info: {
      message: (params) => {
        const service = params.userInput;

        const descriptions = {
          Manicure:
            "En nuestro servicio de manicure cuidamos cada detalle de tus manos para que luzcan impecables y saludables. Limpieza de uñas y cutículas, limado y esmaltado con diseños personalizados, más tratamientos que fortalecen tus uñas. Relájate y luce un estilo que refleje tu personalidad.",
          Pedicure:
            "Cuidado y estética para pies suaves y saludables: limpieza profunda, retiro de durezas, cuidado de cutículas y uñas, más esmaltado clásico o con diseño. Tratamientos hidratantes para una experiencia relajante y resultados duraderos.",
          "Alisado Permanente":
            "Tratamiento profesional para un cabello liso, suave y brillante por más tiempo. Reduce volumen y frizz para un look sedoso y fácil de peinar, sin calor constante.",
          "Botox Capilar":
            "Tratamiento intensivo que repara y nutre el cabello, reduce frizz, sella puntas y devuelve brillo y suavidad. Ideal para cabellos dañados por químicos o calor.",
        };

        return `${descriptions[service]}\n\nHaz clic abajo para ver más 👇`;
      },

      component: (params) => {
        const service = params.userInput;

        const links = {
          Manicure: "/manicure",
          Pedicure: "/pedicure",
          "Alisado Permanente": "/alisado-permanente",
          "Botox Capilar": "/botox-capilar",
        };

        return (
          <a
            href={links[service]}
            target="_self"
            style={{
              marginInline: "20px",
              marginTop: "10px",
              padding: "10px 14px",
              backgroundColor: "#e65fa0",
              color: "white",
              borderRadius: "6px",
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            Ir a {service}
          </a>
        );
      },

      options: ["Volver al Inicio"],
      chatDisabled: true,
      clearOptions: true,
      path: "start",
    },

    portafolio_show: {
      message: "¡Perfecto! Aquí puedes ver mis trabajos realizados 👇",
      component: () => (
        <a
          href="/trabajos-realizados"
          target="_self"
          style={{
            marginInline: "20px",
            marginTop: "10px",
            padding: "10px 14px",
            backgroundColor: "#e65fa0",
            color: "white",
            borderRadius: "6px",
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Ver Portafolio
        </a>
      ),
      options: ["Volver al Inicio"],
      chatDisabled: true,
      clearOptions: true,
      path: "start",
    },

    about_show: {
      message:
        "Mi misión es ofrecer servicios profesionales con una experiencia de bienestar memorable, usando productos de alta calidad y técnicas seguras. 💗",

      component: () => (
        <a
          href="/about"
          target="_self"
          style={{
            marginInline: "20px",
            marginTop: "10px",
            padding: "10px 14px",
            backgroundColor: "#e65fa0",
            color: "white",
            borderRadius: "6px",
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Conocer más sobre mí
        </a>
      ),

      options: ["Volver al Inicio"],
      chatDisabled: true,
      clearOptions: true,
      path: "start",
    },
  };
  const [user, setUser] = useState(null);

  async function getUserData(uid) {
    const docuRef = doc(firestore, `usuarios/${uid}`);
    const docuCifrada = await getDoc(docuRef);

    if (docuCifrada.exists()) {
      const data = docuCifrada.data();
      return {
        rol: data.rol,
        nombre: data.nombre,
        correo: data.correo,
      };
    } else {
      console.error("No se encontró el documento del usuario.");
      return null;
    }
  }

  function setUserWithFirebaseAndRole(usuarioFirebase) {
    getUserData(usuarioFirebase.uid).then((userData) => {
      if (userData) {
        const userDataWithRole = {
          uid: usuarioFirebase.uid,
          email: usuarioFirebase.email,
          rol: userData.rol || "user",
          nombre: userData.nombre,
        };
        setUser(userDataWithRole);
      } else {
        setUser(null);
      }
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioFirebase) => {
      if (usuarioFirebase) {
        setUserWithFirebaseAndRole(usuarioFirebase);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <div className="App">
        <Header user={user} />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trabajos-realizados" element={<TrabajosRealizados />} />
          <Route path="/about" element={<About />} />
          <Route path="/manicure" element={<Manicure />} />
          <Route path="/pedicure" element={<Pedicure />} />
          <Route path="/alisado-permanente" element={<AlisadoPermanente />} />
          <Route path="/botox-capilar" element={<BotoxCapilar />} />
          <Route path="/agendar-cita" element={<ScheduleAppointmentView />} />
          <Route path="/perfil" element={<Profile user={user} />} />
          <Route path="/reservar" element={<BookNow />} />

          {user?.rol === "admin" && (
            <Route
              path="/admin"
              element={
                <div className="d-flex">
                  <AdminSidebar />
                  <div className="p-4 w-100">
                    <Outlet />
                  </div>
                </div>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="appointments" element={<CitaList />} />
              <Route path="services" element={<ServiceList />} />
              <Route path="workdays" element={<AdminWorkDays />} />
              <Route path="reviews" element={<ReviewManagement />} />
              <Route path="trabajos-realizados" element={<AdminTrabajos />} />
              <Route path="bank-balance" element={<BankBalance />} />
              <Route path="reports" element={<ReportsView />} />
              <Route path="try-on" element={<TryOnNailsPhoto />} />
              <Route path="skin-analyzer" element={<SkinToneAnalyzer />} />
              <Route
                path="contact-comments"
                element={<AdminContactComments />}
              />

              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          )}

          <Route path="/login" element={<Login />} />

          <Route
            path="*"
            element={
              user?.rol === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>

        <Footer />
        <ChatBotify
          flow={flow}
          settings={{
            tooltip: {
              text: "¿En qué te ayudo?",
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
