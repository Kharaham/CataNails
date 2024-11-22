import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "../../styles/components/trabajorealizado.css"; // Cambié el nombre del archivo CSS

const TrabajosRealizados = () => {
  const [trabajosRealizados, setTrabajosRealizados] = useState([]); // Cambié el nombre de la variable

  useEffect(() => {
    const fetchTrabajosRealizados = async () => { // Cambié el nombre de la función
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
    <div className="container trabajos-realizados-container"> {/* Cambié el nombre de la clase */}
      <h1 className="text-center mb-4 section-title">Trabajos Realizados</h1>
      <p className="text-center mb-5 section-subtitle">
        Algunos de nuestros trabajos más destacados
      </p>

      <div className="trabajos-realizados-grid"> {/* Cambié el nombre de la clase */}
        {trabajosRealizados.map((trabajo) => (
          <div key={trabajo.id} className="trabajo-realizado-item"> {/* Cambié el nombre de la clase */}
            <img
              src={trabajo.imgSrc}
              alt={trabajo.title}
              className="trabajo-realizado-img" 
            />
            <div className="trabajo-realizado-overlay"> {/* Cambié el nombre de la clase */}
              <h5 className="trabajo-realizado-title">{trabajo.title}</h5> {/* Cambié el nombre de la clase */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrabajosRealizados;
