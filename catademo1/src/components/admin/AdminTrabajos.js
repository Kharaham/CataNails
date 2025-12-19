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

const SECTION_OPTIONS = ["manicure", "pedicure", "alisados"];

const AdminTrabajos = () => {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("");
  const [progress, setProgress] = useState(0);
  const [trabajos, setTrabajos] = useState([]);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [selectedTrabajo, setSelectedTrabajo] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
    if (e.target.files[0]) setImage(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!image || !title || !section) {
      setToastMessage("Selecciona imagen, título y sección.");
      setShowToast(true);
      return;
    }
    const storageRef = ref(storage, `trabajos/${Date.now()}_${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const p = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(p);
      },
      () => {
        setToastMessage("Error al subir la imagen.");
        setShowToast(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          addDoc(collection(db, "trabajos"), {
            title: title,
            imgSrc: url,
            section: section,
          }).then(() => {
            setProgress(0);
            setTitle("");
            setSection("");
            setImage(null);
            fetchTrabajos();
            setToastMessage("Trabajo subido exitosamente!");
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
    setTitle(trabajo.title || "");
    setSection(trabajo.section || "");
    setShowModalUpdate(true);
  };

  const confirmUpdate = async () => {
    if (!image) {
      setToastMessage("Por favor selecciona una nueva imagen.");
      setShowToast(true);
      return;
    }
    const storageRef = ref(storage, `trabajos/${Date.now()}_${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const p = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(p);
      },
      () => {
        setToastMessage("Error al subir la imagen.");
        setShowToast(true);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, "trabajos", selectedTrabajo.id), {
          title: title,
          imgSrc: url,
          section: section || null,
        });
        fetchTrabajos();
        setToastMessage("Trabajo actualizado exitosamente!");
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

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="Tadmin_container">
      <div className="Tadmin_header">
        <h2 className="Tadmin_title">Portafolio – Administrar Trabajos</h2>
        <p className="Tadmin_subtitle">
          Sube, edita o elimina trabajos y asigna su sección.
        </p>
      </div>

      <div className="Tadmin_card">
        <div className="Tadmin_cardHeader">Nuevo trabajo</div>
        <div className="Tadmin_cardBody">
          <Form>
            <Form.Group controlId="formTitle" className="Tadmin_field">
              <Form.Label className="Tadmin_label">Título</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ingresa el título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="Tadmin_input"
              />
            </Form.Group>

            <Form.Group controlId="formSection" className="Tadmin_field">
              <Form.Label className="Tadmin_label">Sección</Form.Label>
              <Form.Select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="Tadmin_select"
              >
                <option value="">Selecciona sección…</option>
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="formFile" className="Tadmin_field">
              <Form.Label className="Tadmin_label">Imagen</Form.Label>
              <Form.Control
                type="file"
                onChange={handleImageChange}
                className="Tadmin_inputFile"
              />
              {image && (
                <div className="Tadmin_preview">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="preview"
                    className="Tadmin_previewImg"
                  />
                </div>
              )}
            </Form.Group>

            <Button
              className="Tadmin_btnPrimary"
              variant="secondary"
              onClick={handleUpload}
              disabled={progress > 0 && progress < 100}
            >
              Subir
            </Button>
            {progress > 0 && (
              <ProgressBar
                now={progress}
                label={`${progress}%`}
                className="Tadmin_progress"
              />
            )}
          </Form>
        </div>
      </div>

      <div className="Tadmin_listHeader">
        <h3 className="Tadmin_listTitle">Trabajos subidos</h3>
      </div>

      <div className="Tadmin_grid">
        {currentTrabajos.map((trabajo) => (
          <div className="Tadmin_item" key={trabajo.id}>
            <div className="Tadmin_thumb">
              <img
                src={trabajo.imgSrc}
                alt={trabajo.title}
                className="Tadmin_img"
              />
            </div>
            <div className="Tadmin_itemBody">
              <div className="Tadmin_itemTitle" title={trabajo.title}>
                {trabajo.title || "Sin título"}
                {trabajo.section ? (
                  <span className="Tadmin_tag">{trabajo.section}</span>
                ) : null}
              </div>
              <div className="Tadmin_actions">
                <Button
                  variant="warning"
                  onClick={() => handleUpdate(trabajo)}
                  className="Tadmin_btnGhost"
                >
                  Actualizar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(trabajo.id, trabajo.imgSrc)}
                  className="Tadmin_btnGhostDanger"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="Tadmin_pagination">
        {Array.from({ length: totalPages }, (_, index) => (
          <Button
            key={index + 1}
            variant={currentPage === index + 1 ? "primary" : "light"}
            onClick={() => handlePageChange(index + 1)}
            className={`Tadmin_pageBtn ${
              currentPage === index + 1 ? "is-active" : ""
            }`}
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
          <Form.Group controlId="formUpdateTitle" className="Tadmin_field">
            <Form.Label className="Tadmin_label">Título</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingresa nuevo título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="Tadmin_input"
            />
          </Form.Group>

          <Form.Group controlId="formUpdateSection" className="Tadmin_field">
            <Form.Label className="Tadmin_label">Sección</Form.Label>
            <Form.Select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="Tadmin_select"
            >
              <option value="">Selecciona sección…</option>
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="formUpdateFile" className="Tadmin_field">
            <Form.Label className="Tadmin_label">Nueva imagen</Form.Label>
            <Form.Control
              type="file"
              onChange={handleImageChange}
              className="Tadmin_inputFile"
            />
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
        className="Tadmin_toast"
      >
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </div>
  );
};

export default AdminTrabajos;
