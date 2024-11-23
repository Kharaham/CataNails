import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "../../styles/components/trabajorealizado.css";

const TrabajosRealizados = () => {
  const [trabajosRealizados, setTrabajosRealizados] = useState([]);

  useEffect(() => {
    const fetchTrabajosRealizados = async () => {
      const querySnapshot = await getDocs(collection(db, "trabajos"));
      const trabajosArray = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrabajosRealizados(trabajosArray);
    };

    fetchTrabajosRealizados();
  }, []);

  return (
    <div className="container trabajos-realizados-container">
      <h1 className="text-center mb-4 section-title">Trabajos Realizados</h1>
      <p className="text-center mb-5 section-subtitle">
        Algunos de nuestros trabajos más destacados
      </p>

      <div className="trabajos-realizados-grid">
        {trabajosRealizados.map((trabajo) => (
          <div key={trabajo.id} className="trabajo-realizado-item">
            <img
              src={trabajo.imgSrc}
              alt={trabajo.title}
              className="trabajo-realizado-img"
            />
            <div className="trabajo-realizado-overlay">
              <h5 className="trabajo-realizado-title">{trabajo.title}</h5>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrabajosRealizados;
