import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Home from "./pages/home/Home";
import TrabajosRealizados from "./pages/works/TrabajosRealizados";
import Manicure from "./pages/service/Manicure";
import Pedicure from "./pages/service/Pedicure";
import AlisadoPermanente from "./pages/service/AlisadoPermanente";
import BotoxCapilar from "./pages/service/BotoxCapilar";
import ScheduleAppointmentView from "./components/agenda/ScheduleAppointmentView";
import Profile from "./components/client/Profile";
import About from './pages/home/about';
import "./App.css";
import 'font-awesome/css/font-awesome.min.css';

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




const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

function App() {
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
          {/* Rutas Públicas (disponibles para todos) */}
          <Route path="/" element={<Home />} />
          <Route path="/trabajos-realizados" element={<TrabajosRealizados />} />
          <Route path="/about" element={<About />} />
          <Route path="/manicure" element={<Manicure />} />
          <Route path="/pedicure" element={<Pedicure />} />
          <Route path="/alisado-permanente" element={<AlisadoPermanente />} />
          <Route path="/botox-capilar" element={<BotoxCapilar />} />
          <Route path="/agendar-cita" element={<ScheduleAppointmentView />} />
          <Route path="/perfil" element={<Profile user={user} />} />

          {/* Rutas protegidas para el admin */}
          {user?.rol === "admin" && (
            <Route path="/admin" element={<div className="d-flex"><AdminSidebar /><div className="p-4 w-100"><Outlet /></div></div>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="appointments" element={<CitaList />} />
              <Route path="services" element={<ServiceList />} />
              <Route path="workdays" element={<AdminWorkDays />} />
              <Route path="reviews" element={<ReviewManagement />} />
              <Route path="trabajos-realizados" element={<AdminTrabajos />} />
              <Route path="bank-balance" element={<BankBalance />} />
              <Route path="contact-comments" element={<AdminContactComments />} />

              
            

            </Route>
          )}

          {/* Ruta de Login */}
          <Route path="/login" element={<Login />} />

          {/* Redirección automática para el administrador */}
          <Route path="*" element={user?.rol === "admin" ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
