import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, orderBy, query } from "firebase/firestore";
import firebaseApp from "../../firebase/firebase";
import { ToastContainer, toast } from "react-toastify";
import emailjs from "emailjs-com";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/adminS/comentarios.css";

const db = getFirestore(firebaseApp);

const AdminContactComments = () => {
  const [contactComments, setContactComments] = useState([]);
  const [replyMessages, setReplyMessages] = useState({});

  useEffect(() => {
    const fetchContactComments = async () => {
      try {
        const q = query(collection(db, "contactos"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const commentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContactComments(commentsData);
      } catch (error) {
        console.error("Error fetching contact comments:", error);
      }
    };

    fetchContactComments();
  }, []);

  const copyToClipboard = (email) => {
    navigator.clipboard.writeText(email);
    toast.success("Correo copiado al portapapeles!", {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      style: { fontSize: "14px", color: "#4CAF50" },
    });
  };

  const handleReplyChange = (commentId, message) => {
    setReplyMessages((prevReplies) => ({
      ...prevReplies,
      [commentId]: message,
    }));
  };

  const handleReplySend = (email, commentId) => {
    const message = replyMessages[commentId];
    if (!email || !message) {
      toast.error("Por favor, ingresa un mensaje de respuesta.");
      return;
    }

    const templateParams = {
      from_name: "Administrador",
      to_email: email,
      mensaje: message,
    };

    emailjs
      .send("service_d7i4cqe", "template_pd2dz5u", templateParams, "S2X9g3S8OrR0K4J_z")
      .then(
        () => {
          toast.success("Respuesta enviada con éxito.");
          setReplyMessages((prevReplies) => ({
            ...prevReplies,
            [commentId]: "",
          }));
        },
        (error) => {
          console.error("Error:", error);
          toast.error("Hubo un error al enviar la respuesta, por favor intente de nuevo.");
        }
      );
  };

  return (
    <div className="contact-comments-container">
      <ToastContainer />
      <h2 className="contact-comments-title">Comentarios de Contacto</h2>
      <div className="contact-comments-list">
        {contactComments.map((comment) => (
          <div key={comment.id} className="contact-comment-card">
            <div className="contact-comment-header">
              <h3 className="contact-comment-name">{comment.name}</h3>
              <span className="contact-comment-email">
                {comment.email}{" "}
                <button
                  onClick={() => copyToClipboard(comment.email)}
                  className="copy-email-button"
                  title="Copiar correo"
                >
                  📋
                </button>
              </span>
            </div>
            <p className="contact-comment-message">{comment.message}</p>
            <p className="contact-comment-timestamp">
              {new Date(comment.timestamp?.seconds * 1000).toLocaleString()}
            </p>

            {/* Responder al comentario */}
            <div className="reply-section">
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escribe tu respuesta aquí..."
                value={replyMessages[comment.id] || ""}
                onChange={(e) => handleReplyChange(comment.id, e.target.value)}
              />
              <button
                onClick={() => handleReplySend(comment.email, comment.id)}
                className="btn btn-reply"
              >
                Enviar Respuesta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminContactComments;
