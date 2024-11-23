import { useState } from "react";

const useScheduleAppointmentViewModel = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const setUserData = (userData) => {
    setName(userData.nombre || "");
    setEmail(userData.correo || "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Cita agendada para:", name, email);
  };

  return {
    name,
    setName,
    email,
    setEmail,
    setUserData,
    handleSubmit,
  };
};

export default useScheduleAppointmentViewModel;
