import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebaseServicios";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; 
import "../../styles/components/Review.css";

const ReviewSection = () => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(0);
  const [author, setAuthor] = useState("");
  const [position, setPosition] = useState("");
  const [photoURL, setPhotoURL] = useState(""); // Estado para la foto de perfil

  // Estado para verificar si el usuario está logueado
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 6;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        await fetchUserDetails(user);
      } else {
        setIsLoggedIn(false);
      }
      fetchReviews();
    });

    return () => unsubscribe(); // Limpiar el listener al desmontar el componente
  }, []);

  const fetchUserDetails = async (user) => {
    const userQuery = query(collection(db, "usuarios"), where("correo", "==", user.email));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      setAuthor(userData.nombre);
      setPhotoURL(userData.profilePic || ""); // Obtiene la foto de perfil desde el campo `profilePic`
    }
  };

  const fetchReviews = async () => {
    const querySnapshot = await getDocs(collection(db, "reviews"));
    const fetchedReviews = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(review => review.isVisible !== false) // Solo muestra reseñas visibles
      .sort((a, b) => b.createdAt - a.createdAt); // Ordenar de más reciente a más antiguo
    setReviews(fetchedReviews);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (newReview.trim() && rating > 0 && rating <= 5) {
      await addDoc(collection(db, "reviews"), {
        text: newReview,
        rating,
        author,
        position,
        photoURL,
        isVisible: true,
        createdAt: new Date() // Agrega la fecha de creación
      });
      setNewReview("");
      setRating(0);
      setPosition("");
      fetchReviews(); // Recargar lista de reseñas
    }
  };

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);

  return (
    <div className="reviews-section">
      <h2 className="section-title text-center">Reseñas de Clientes</h2>
      {isLoggedIn ? (
        <form onSubmit={handleReviewSubmit} className="review-form">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Tu nombre"
            required
            disabled // Desactiva el campo para que no pueda editarse
          />
          <textarea
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Deja tu reseña aquí..."
            required
          />
          <div className="rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= rating ? "filled" : ""}`}
                onClick={() => setRating(star)}
                style={{ cursor: "pointer" }}
              >
                ★
              </span>
            ))}
          </div>
          <button type="submit" className="submit-review-button">
            Enviar Reseña
          </button>
        </form>
      ) : (
        <p>Inicia sesión para dejar una reseña.</p>
      )}
      <div className="reviews-list">
        {currentReviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-info">
              <img 
                src={review.photoURL || "ruta/imagen/por/defecto.jpg"} 
                alt="Foto de perfil"
                className="review-profile-pic"
              />
              <h3 className="review-author">
                {review.author}, {review.position}
              </h3>
              <div className="review-rating">
                {[...Array(5)].map((_, index) => (
                  <span
                    key={index}
                    className={`star ${index < review.rating ? "filled" : ""}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p>{review.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pagination">
        {[...Array(totalPages)].map((_, index) => (
          <button key={index} onClick={() => paginate(index + 1)} className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}>
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
