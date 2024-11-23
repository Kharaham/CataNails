import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const CalendarSelector = ({
  selectedDate,
  setSelectedDate,
  selectedHour,
  setSelectedHour,
}) => {
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockedHours, setBlockedHours] = useState([]);
  const [availableHours] = useState([
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
  ]);
  const [bookedHours, setBookedHours] = useState([]);

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  };

  const loadBlockedDays = async () => {
    const blockedDaysRef = collection(db, "blockedDays");
    const querySnapshot = await getDocs(blockedDaysRef);
    const loadedBlockedDays = [];
    const loadedBlockedHours = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date) {
        loadedBlockedDays.push(data.date);
        if (data.blockedHours) {
          data.blockedHours.forEach((hour) => {
            loadedBlockedHours.push({ date: data.date, hour });
          });
        }
      }
    });

    setBlockedDays(loadedBlockedDays);
    setBlockedHours(loadedBlockedHours);
  };

  const getAvailableHours = async (date) => {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("date", "==", date));
    const querySnapshot = await getDocs(q);
    const booked = querySnapshot.docs.map((doc) => doc.data().hour);
    setBookedHours(booked);
  };

  useEffect(() => {
    loadBlockedDays();
  }, []);

  useEffect(() => {
    if (selectedDate && !blockedDays.includes(selectedDate)) {
      getAvailableHours(selectedDate);
    }
  }, [selectedDate, blockedDays]);

  const filteredHours = availableHours.filter((hour) => {
    const isBlocked = blockedHours.some(
      (blocked) => blocked.date === selectedDate && blocked.hour === hour
    );
    return !bookedHours.includes(hour) && !isBlocked;
  });

  return (
    <div>
      <label htmlFor="date">Fecha:</label>
      <input
        type="date"
        id="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        min={getTodayDate()}
        required
      />
      {selectedDate && blockedDays.includes(selectedDate) && (
        <p style={{ color: "red" }}>CataNails fuera de servicio</p>
      )}

      <label htmlFor="hour">Hora:</label>
      {filteredHours.length > 0 ? (
        <select
          id="hour"
          onChange={(e) => setSelectedHour(e.target.value)}
          required
          disabled={blockedDays.includes(selectedDate)}
        >
          <option value="">Selecciona una hora</option>
          {filteredHours.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
      ) : (
        <p>Horas no disponibles para la fecha seleccionada.</p>
      )}
    </div>
  );
};

export default CalendarSelector;
