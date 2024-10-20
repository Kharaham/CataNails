import { useState } from 'react';
import { addAppointment } from '../firebase/firebase'; // Ruta hacia firebase.js

const useScheduleAppointmentViewModel = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [service, setService] = useState('');
  const [mode, setMode] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addAppointment({
        name, email, date, time, service, mode, comment
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setDate('');
      setTime('');
      setService('');
      setMode('');
      setComment('');
    } catch (error) {
      setError('Error al agendar la cita');
    } finally {
      setLoading(false);
    }
  };

  return {
    name, setName,
    email, setEmail,
    date, setDate,
    time, setTime,
    service, setService,
    mode, setMode,
    comment, setComment,
    loading, success, error,
    handleSubmit
  };
};

export default useScheduleAppointmentViewModel;
