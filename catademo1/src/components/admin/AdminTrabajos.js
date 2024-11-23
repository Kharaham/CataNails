import React, { useState, useEffect } from "react";
import { storage, db } from "../../firebase/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import "../../styles/adminS/trabajosrealizados.css";
import { Button, Form, ProgressBar, Modal, Toast } from "react-bootstrap";

const AdminTrabajos = () => {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [trabajos, setTrabajos] = useState([]);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [selectedTrabajo, setSelectedTrabajo] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const trabajosPorPagina = 12;
  const indexOfLastTrabajo = currentPage * trabajosPorPagina;
  const indexOfFirstTrabajo = indexOfLastTrabajo - trabajosPorPagina;
  const currentTrabajos = trabajos.slice(
    indexOfFirstTrabajo,
    indexOfLastTrabajo
  );
  const totalPages = Math.ceil(trabajos.length / trabajosPorPagina);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!image || !title) {
      setToastMessage("Por favor selecciona una imagen y escribe un título.");
      setShowToast(true);
      return;
    }

    const storageRef = ref(storage, `trabajos/${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(progress);
      },
      (error) => {
        setToastMessage("Error al subir la imagen.");
        setShowToast(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          addDoc(collection(db, "trabajos"), {
            title: title,
            imgSrc: url,
          }).then(() => {
            setProgress(0);
            setTitle("");
            setImage(null);
            fetchTrabajos();
            setToastMessage("Imagen subida exitosamente!");
            setShowToast(true);
          });
        });
      }
    );
  };

  const fetchTrabajos = async () => {
    const trabajosSnapshot = await getDocs(collection(db, "trabajos"));
    const trabajosList = trabajosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTrabajos(trabajosList);
  };

  const handleDelete = (id, imgSrc) => {
    setSelectedTrabajo({ id, imgSrc });
    setShowModalDelete(true);
  };

  const confirmDelete = async () => {
    const { id, imgSrc } = selectedTrabajo;
    const imageRef = ref(storage, imgSrc);
    await deleteObject(imageRef);
    await deleteDoc(doc(db, "trabajos", id));
    fetchTrabajos();
    setToastMessage("Imagen eliminada exitosamente!");
    setShowToast(true);
    setShowModalDelete(false);
    setSelectedTrabajo(null);
  };

  const handleUpdate = (trabajo) => {
    setSelectedTrabajo(trabajo);
    setTitle(trabajo.title);
    setShowModalUpdate(true);
  };

  const confirmUpdate = async () => {
    if (!image) {
      setToastMessage("Por favor selecciona una nueva imagen.");
      setShowToast(true);
      return;
    }

    const storageRef = ref(storage, `trabajos/${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(progress);
      },
      (error) => {
        setToastMessage("Error al subir la imagen.");
        setShowToast(true);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, "trabajos", selectedTrabajo.id), {
          title: title,
          imgSrc: url,
        });
        fetchTrabajos();
        setToastMessage("Imagen actualizada exitosamente!");
        setShowToast(true);
        setShowModalUpdate(false);
        setSelectedTrabajo(null);
        setImage(null);
        setProgress(0);
      }
    );
  };

  useEffect(() => {
    fetchTrabajos();
  }, []);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="admin-trabajos-container">
      <h2 className="text-center">Subir Nuevo Trabajo</h2>
      <div className="upload-section">
        <Form>
          <Form.Group controlId="formTitle">
            <Form.Control
              type="text"
              placeholder="Ingresa el título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="formFile">
            <Form.Control type="file" onChange={handleImageChange} />
          </Form.Group>
          <Button
            className="btn-subir"
            variant="secondary"
            onClick={handleUpload}
            disabled={progress > 0 && progress < 100}
          >
            Subir
          </Button>
          {progress > 0 && (
            <ProgressBar now={progress} label={`${progress}%`} />
          )}
        </Form>
      </div>

      <div className="trabajos-list mt-5">
        <h3 className="text-center">Trabajos Subidos</h3>
        <div className="trabajos-grid">
          {currentTrabajos.map((trabajo) => (
            <div className="trabajo-item" key={trabajo.id}>
              <img
                src={trabajo.imgSrc}
                alt={trabajo.title}
                className="trabajo-img"
              />
              <div className="trabajo-title">{trabajo.title}</div>
              <div className="trabajo-actions">
                <Button variant="warning" onClick={() => handleUpdate(trabajo)}>
                  Actualizar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(trabajo.id, trabajo.imgSrc)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pagination mt-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <Button
            key={index + 1}
            variant={currentPage === index + 1 ? "primary" : "light"}
            onClick={() => handlePageChange(index + 1)}
            className="mx-1"
          >
            {index + 1}
          </Button>
        ))}
      </div>

      <Modal show={showModalDelete} onHide={() => setShowModalDelete(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro de que deseas eliminar esta imagen?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalDelete(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModalUpdate} onHide={() => setShowModalUpdate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Trabajo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="formUpdateTitle">
            <Form.Control
              type="text"
              placeholder="Ingresa nuevo título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="formUpdateFile">
            <Form.Control type="file" onChange={handleImageChange} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalUpdate(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmUpdate}>
            Actualizar
          </Button>
        </Modal.Footer>
      </Modal>

      <Toast
        onClose={() => setShowToast(false)}
        show={showToast}
        delay={3000}
        autohide
      >
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </div>
  );
};

export default AdminTrabajos;
