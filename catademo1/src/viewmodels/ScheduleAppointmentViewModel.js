import { useState } from "react";

const useScheduleAppointmentViewModel = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Método para establecer automáticamente los datos de usuario logueado
  const setUserData = (userData) => {
    setName(userData.nombre || "");
    setEmail(userData.correo || "");
  };

  // Método para manejar el envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría el código para procesar el agendamiento de la cita
    console.log("Cita agendada para:", name, email);
  };

  return {
    name,
    setName,
    email,
    setEmail,
    setUserData, // Retorna la función para establecer datos de usuario
    handleSubmit,
  };
};

export default useScheduleAppointmentViewModel;
