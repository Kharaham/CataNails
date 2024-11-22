import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebaseServicios";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const AdminReviewList = () => {
  const [reviewsS, setReviewsS] = useState([]);

  useEffect(() => {
    fetchReviewsS();
  }, []);

  const fetchReviewsS = async () => {
    const querySnapshot = await getDocs(collection(db, "reviews"));
    const fetchedReviewsS = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setReviewsS(fetchedReviewsS);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "reviews", id));
    setReviewsS(reviewsS.filter((review) => review.id !== id));
  };

  return (
    <div className="reviews-container">
      <h2 className="reviews-section-title text-center">Gestión de Reseñas</h2>
      <div className="reviews-list">
        {reviewsS.map((reviewS) => (
          <div key={reviewS.id} className="reviews-card">
            <img
              src={reviewS.photoURL || "/default-avatar.png"}
              alt={`${reviewS.author}'s profile`}
              className="reviews-avatar"
            />
            <div className="reviews-info">
              <h3 className="reviews-author">
                {reviewS.author}, {reviewS.position}
              </h3>
              <div className="reviews-rating">
                {[...Array(Math.max(0, Math.min(5, reviewS.rating || 0)))].map(
                  (_, index) => (
                    <span key={index} className="reviews-star filled">
                      ★
                    </span>
                  )
                )}
                {[
                  ...Array(5 - Math.max(0, Math.min(5, reviewS.rating || 0))),
                ].map((_, index) => (
                  <span key={index} className="reviews-star">
                    ★
                  </span>
                ))}
              </div>
              <p>{reviewS.text}</p>
              <button
                onClick={() => handleDelete(reviewS.id)}
                className="reviews-delete-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviewList;
