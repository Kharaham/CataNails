import alisado1 from "../../assets/images/trabajosRealizados/alisado1.jpg";
import alisado2 from "../../assets/images/trabajosRealizados/alisado2.jpg";
import alisado3 from "../../assets/images/trabajosRealizados/alisado3.jpg";
import unas1 from "../../assets/images/trabajosRealizados/uñas1.jpg";
import unas2 from "../../assets/images/trabajosRealizados/uñas2.jpg";
import unas3 from "../../assets/images/trabajosRealizados/uñas3.jpg";
import alisado4 from "../../assets/images/trabajosRealizados/alisado4.jpg";
import alisado5 from "../../assets/images/trabajosRealizados/alisado5.jpg";
import alisado6 from "../../assets/images/trabajosRealizados/alisado6.jpg";
import unas4 from "../../assets/images/trabajosRealizados/uñas4.jpg";
import unas5 from "../../assets/images/trabajosRealizados/uñas5.jpg";
import unas6 from "../../assets/images/trabajosRealizados/uñas6.jpg";
// Estilos personalizados
import "../../styles/components/trabajorealizado.css";

const TrabajosRealizados = () => {
  const trabajos = [
    { id: 1, imgSrc: alisado1, title: "Alisado 1" },
    { id: 2, imgSrc: alisado2, title: "Alisado 2" },
    { id: 3, imgSrc: alisado3, title: "Alisado 3" },
    { id: 4, imgSrc: unas1, title: "Uñas 1" },
    { id: 5, imgSrc: unas2, title: "Uñas 2" },
    { id: 6, imgSrc: unas3, title: "Uñas 3" },
    { id: 7, imgSrc: alisado4, title: "Alisado 4" },
    { id: 8, imgSrc: alisado5, title: "Alisado 5" },
    { id: 9, imgSrc: alisado6, title: "Alisado 6" },
    { id: 10, imgSrc: unas4, title: "Uñas 4" },
    { id: 11, imgSrc: unas5, title: "Uñas 5" },
    { id: 12, imgSrc: unas6, title: "Uñas 6" },
  ];

  return (
    <div className="container trabajos-container">
      <h1 className="text-center mb-4 section-title">Trabajos Realizados</h1>
      <p className="text-center mb-5 section-subtitle">
        Algunos de nuestros trabajos más destacados
      </p>

      <div className="trabajos-grid">
        {trabajos.map((trabajo) => (
          <div key={trabajo.id} className="trabajo-item">
            <img
              src={trabajo.imgSrc}
              alt={trabajo.title}
              className="trabajo-img"
            />
            <div className="trabajo-overlay">
              <h5 className="trabajo-title">{trabajo.title}</h5>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrabajosRealizados;
