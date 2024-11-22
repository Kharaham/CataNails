// hooks/useEvents.js
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseServicios";

const useEvents = () => {
  const [events, setEvents] = useState([]);

  const loadEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "events"));
    const loadedEvents = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start ? new Date(data.start.seconds * 1000) : null,
          end: data.end ? new Date(data.end.seconds * 1000) : null,
          allDay: data.allDay,
        };
      })
      .filter((event) => event.start && event.end); // Filtrar eventos sin fechas

    setEvents(loadedEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return events;
};

export default useEvents;
