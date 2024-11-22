import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faTrash,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/adminS/citaslist.css";
const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);

  const reviewsCollectionRef = collection(db, "reviews");

  useEffect(() => {
    const fetchReviews = async () => {
      const data = await getDocs(reviewsCollectionRef);
      setReviews(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    fetchReviews();
  }, [reviewsCollectionRef]);

  const handleAddReview = async () => {
    if (newReview.trim() === "" || author.trim() === "") return;

    const newReviewObj = {
      text: newReview,
      author,
      rating,
      isVisible: true,
    };

    await addDoc(reviewsCollectionRef, newReviewObj);
    setReviews((prevReviews) => [
      ...prevReviews,
      { ...newReviewObj, id: doc.id },
    ]);
    setNewReview("");
    setAuthor("");
    setRating(5);
  };

  const handleDeleteReview = async (id) => {
    const reviewDoc = doc(db, "reviews", id);
    await deleteDoc(reviewDoc);
    setReviews(reviews.filter((review) => review.id !== id));
  };

  const toggleVisibility = async (id, isVisible) => {
    const reviewDoc = doc(db, "reviews", id);
    await updateDoc(reviewDoc, { isVisible: !isVisible });
    setReviews(
      reviews.map((review) =>
        review.id === id ? { ...review, isVisible: !isVisible } : review
      )
    );
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <FontAwesomeIcon
        key={index}
        icon={faStar}
        className={index < rating ? "text-warning" : "text-muted"}
      />
    ));
  };

  return (
    <div className=".reviews-container">
      <h2 className="text-center mb-4">Gestión de Reseñas</h2>

      <div className="mb-4">
        <input
          type="text"
          className="form-control mb-2"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Nombre del autor"
        />
        <input
          type="text"
          className="form-control mb-2"
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          placeholder="Escribe una nueva reseña"
        />
        <select
          className="form-select mb-2"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          <option value={1}>1 Estrella</option>
          <option value={2}>2 Estrellas</option>
          <option value={3}>3 Estrellas</option>
          <option value={4}>4 Estrellas</option>
          <option value={5}>5 Estrellas</option>
        </select>
        <button className="btn btn-secondary mt-2" onClick={handleAddReview}>
          Agregar Reseña
        </button>
      </div>

      <div className="row">
        {reviews.map((review) => (
          <div key={review.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="card-title">Reseña de {review.author}</h5>
                <p className="card-text">{review.text}</p>
                <div className="mb-3">{renderStars(review.rating)}</div>
                <button
                  className="btn btn-warning me-2"
                  onClick={() => toggleVisibility(review.id, review.isVisible)}
                >
                  <FontAwesomeIcon
                    icon={review.isVisible ? faEye : faEyeSlash}
                  />{" "}
                  {review.isVisible ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteReview(review.id)}
                >
                  <FontAwesomeIcon icon={faTrash} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewManagement;
