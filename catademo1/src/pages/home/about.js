import React, { useState, useEffect } from "react";
import { FaBullseye, FaEye, FaHandsHelping, FaHeart } from "react-icons/fa";
import { db, auth } from "../../firebase/firebase";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "../../styles/components/about.css";

const About = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadUserData = async (email) => {
    const userRef = collection(db, "usuarios");
    const q = query(userRef, where("correo", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      setFormData((prev) => ({
        ...prev,
        name: userData.nombre || "",
        email: userData.correo || "",
      }));
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadUserData(user.email);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "contactos"), {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        timestamp: new Date(),
      });
      setSuccess(true);
      setFormData({ name: "", email: "", message: "" });
    } catch (err) {
      setError("Error al enviar el mensaje, intenta nuevamente.");
      console.error("Error guardando el mensaje en Firestore:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  return (
    <section className="about bg-light py-5">
      <div className="container">
        <h2 className="text-center mb-4 section-title">Sobre CataaNails</h2>
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="about-card">
              <FaBullseye className="icon" />
              <h4>Nuestra Misión</h4>
              <p>
                En CataaNails, nos dedicamos a ofrecer servicios de manicura y
                pedicura de la más alta calidad. Nuestra misión es realzar tu
                belleza y proporcionar una experiencia de bienestar inigualable.
                Trabajamos con productos de primera calidad y un equipo
                altamente capacitado para garantizar tu satisfacción.
              </p>
            </div>
          </div>
          <div className="col-lg-6 mb-4">
            <div className="about-card">
              <FaEye className="icon" />
              <h4>Nuestra Visión</h4>
              <p>
                Aspiramos a ser el salón de belleza líder en nuestra comunidad,
                conocido por la calidad de nuestros servicios y la atención
                personalizada a cada cliente. Nos esforzamos por innovar y
                mejorar continuamente para ofrecer las mejores experiencias y
                resultados.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="about-card">
              <FaHandsHelping className="icon" />
              <h4>Valores</h4>
              <ul>
                <li>
                  Calidad: Comprometidos con la excelencia en cada servicio.
                </li>
                <li>
                  Confianza: Construimos relaciones sólidas con nuestros
                  clientes.
                </li>
                <li>
                  Innovación: Siempre en busca de las últimas tendencias y
                  técnicas.
                </li>
                <li>
                  Sostenibilidad: Cuidamos de nuestro entorno a través de
                  prácticas responsables.
                </li>
              </ul>
            </div>
          </div>
          <div className="col-lg-6 mb-4">
            <div className="about-card">
              <FaHeart className="icon" />
              <h4>Conócenos</h4>
              <p>
                Soy una persona apasionada que está aquí para brindarte una
                experiencia única. Te invitamos a visitar nuestro home Studio y
                descubrir todo lo que tenemos para ofrecer. ¡Esperamos verte
                pronto en CataaNails!
              </p>
            </div>
          </div>
        </div>

        <div className="contact-form">
          <h3>Contacto</h3>
          {success && (
            <p className="text-success">¡Mensaje enviado exitosamente!</p>
          )}
          {error && <p className="text-danger">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea
                id="message"
                name="message"
                className="form-control"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn-contacto-about">
              Enviar Mensaje
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default About;
