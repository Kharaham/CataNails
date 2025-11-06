import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  addDoc,
  collection,
  query as fsQuery,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import manos1 from "../../assets/images/services/manos1.jpg";
import pies from "../../assets/images/services/pies.jpg";
import bo1 from "../../assets/images/home/bo1.WebP";

import "../../styles/components/about.css";

const MAX_MSG = 600;

const About = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    botField: "",
  });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  // Prefill desde Firestore si el usuario está logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u?.email) return;
      try {
        const userRef = collection(db, "usuarios");
        const q = fsQuery(userRef, where("correo", "==", u.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setFormData((p) => ({
            ...p,
            name: data.nombre || p.name,
            email: data.correo || p.email,
          }));
        } else {
          setFormData((p) => ({ ...p, email: u.email }));
        }
      } catch {
        /* silencioso */
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MAX_MSG) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    // honeypot
    if (formData.botField) return;

    // validación simple
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setStatus({ type: "error", text: "Completa todos los campos." });
      return;
    }
    const emailOk = /\S+@\S+\.\S+/.test(formData.email);
    if (!emailOk) {
      setStatus({ type: "error", text: "Ingresa un correo válido." });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "contactos"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
        timestamp: serverTimestamp(),
        source: "about",
      });
      setStatus({
        type: "success",
        text: "¡Mensaje enviado! Te responderemos pronto.",
      });
      setFormData((p) => ({ ...p, message: "", botField: "" })); // mantenemos name/email
    } catch (err) {
      console.error("Error guardando el mensaje en Firestore:", err);
      setStatus({
        type: "error",
        text: "Error al enviar el mensaje. Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="about">
      {/* HERO */}
      <div className="about-hero">
        <div className="container">
          <p className="eyebrow">CataaNails</p>
          <h1>Calidad, detalle y bienestar en cada servicio</h1>
          <p className="subtitle">
            Manicure, pedicure, bótox capilar y alisados permanentes. Un home
            studio pensado para realzar tu estilo.
          </p>
          <div className="hero-cta">
            <a href="/trabajos-realizados" className="btn-primary">
              Ver trabajos
            </a>
          </div>
        </div>
        <div className="hero-glow" aria-hidden="true" />
      </div>

      {/* Sección alternada (tarjetas + fotos) */}
      <section className="feature-rows container">
        {/* FILA 1: 2 cards + foto */}
        <div className="feature-row">
          <article className="feature-card tidy feature-card--centered">
            <div className="card-icon">📌</div>
            <h3>Nuestra Misión</h3>
            <p>
              Ofrecer servicios profesionales con una experiencia de bienestar
              memorable, usando productos de alta calidad y técnicas seguras.
            </p>
          </article>

          <article className="feature-card tidy feature-card--centered">
            <div className="card-icon">👁️</div>
            <h3>Nuestra Visión</h3>
            <p>
              Ser el estudio referente en la zona por resultados consistentes,
              atención personalizada e innovación constante.
            </p>
          </article>

          <figure className="feature-photo tidy">
            <img src={manos1} alt="CataaNails estudio" />
            <figcaption>Espacio cómodo y seguro</figcaption>
          </figure>
        </div>

        {/* FILA 2 (invertida): foto + 2 cards */}
        <div className="feature-row inverted">
          <figure className="feature-photo">
            <img src={pies} alt="Materiales profesionales" />
            <figcaption>Materiales de primera</figcaption>
          </figure>

          <article className="feature-card tidy feature-card--centered">
            <div className="card-icon">🤝</div>
            <h3>Valores</h3>
            <ul className="values-list">
              <li>
                <strong>Calidad:</strong> excelencia en cada servicio.
              </li>
              <li>
                <strong>Confianza:</strong> relaciones a largo plazo.
              </li>
              <li>
                <strong>Innovación:</strong> técnicas actuales.
              </li>
              <li>
                <strong>Sostenibilidad:</strong> prácticas responsables.
              </li>
            </ul>
          </article>

          <article className="feature-card tidy">
            <div className="card-icon">💗</div>
            <h3>Conócenos</h3>
            <p>
              Un espacio acogedor donde escuchamos y diseñamos el servicio
              perfecto para ti. ¡Te esperamos!
            </p>
          </article>
        </div>
      </section>

      {/* MÉTRICAS */}
      <div className="container metrics">
        <div className="metric">
          <span className="metric-value">+450</span>
          <span className="metric-label">Clientes felices</span>
        </div>
        <div className="metric">
          <span className="metric-value">4.9★</span>
          <span className="metric-label">Valoración promedio</span>
        </div>
        <div className="metric">
          <span className="metric-value">6 años</span>
          <span className="metric-label">Experiencia</span>
        </div>
      </div>

      <div className="container professional-section">
        <div className="professional-card">
          <div className="professional-photo">
            <img src={bo1} alt="Profesional CataaNails" />
          </div>

          <div className="professional-info">
            <h2>Cataa</h2>
            <p className="role">Fundadora & Especialista en Belleza</p>
            <p className="bio">
              Con más de 6 años de experiencia en estética y cuidado personal,
              Daniela es apasionada por realzar la belleza natural de cada
              cliente. Especialista en manicure, pedicure, tratamientos
              capilares y tendencias modernas.
            </p>

            <ul className="highlights clean">
              <li>
                <span className="hi-icon">✓</span>
                Certificación en Estética Profesional
              </li>
              <li>
                <span className="hi-icon">✓</span>
                Experta en técnicas avanzadas de cuidado de uñas
              </li>
              <li>
                <span className="hi-icon">✓</span>
                Formación en tratamientos capilares de última generación
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container contact">
        <div className="contact-card">
          <h2>Contáctanos</h2>
          <p className="muted">
            Cuéntanos qué necesitas y te responderemos a la brevedad.
          </p>

          {status.text && (
            <div
              className={`alert ${status.type === "success" ? "ok" : "err"}`}
            >
              {status.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form" noValidate>
            {/* Honeypot real para bots */}
            <input
              type="text"
              name="botField"
              value={formData.botField}
              onChange={handleChange}
              className="hp"
              tabIndex="-1"
              autoComplete="off"
            />

            <div className="form-row">
              <input
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <input
                type="email"
                name="email"
                placeholder="tucorreo@dominio.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <textarea
                name="message"
                placeholder="Escribe tu mensaje aquí..."
                rows="4"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? "Enviando…" : "Enviar Mensaje"}
              </button>
              <a
                href="https://wa.me/56912345678"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                WhatsApp
              </a>
            </div>
          </form>
        </div>

        <aside className="contact-aside">
          <div className="mini-card">
            <h4>Ubicación</h4>
            <p className="muted">Ñuble, Chile</p>
          </div>
          <div className="mini-card">
            <h4>Horario</h4>
            <p className="muted">Lun–Sáb: 10:00–19:00</p>
          </div>
          <div className="mini-card">
            <h4>Contacto directo</h4>
            <p className="muted">
              <a href="mailto:danielariassm@gmail.com">
                danielariassm@gmail.com
              </a>
              <br />
              <a href="tel:+56912345678">+56 9 1234 5678</a>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default About;
