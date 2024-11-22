import React, { useState, useEffect } from "react";
import { Card, Form, Button } from "react-bootstrap";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


const ServiceForm = ({ service, onSave, onCancel }) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null); // Nuevo estado para la imagen
  const [imagenUrl, setImagenUrl] = useState(""); // URL de la imagen subida

  useEffect(() => {
    if (service) {
      setNombre(service.Nombre);
      setPrecio(service.Precio);
      setTipo(service.Tipo);
      setCategoria(service.categoria);
      setImagenUrl(service.ImagenUrl || ""); // Obtener la URL de la imagen existente, si hay
    } else {
      setNombre("");
      setPrecio("");
      setTipo("");
      setCategoria("");
      setImagenUrl("");
    }
  }, [service]);

  const handleImageChange = (e) => {
    setImagen(e.target.files[0]); // Obtener la imagen seleccionada
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Subir la imagen a Firebase Storage y obtener la URL
    let imageUrl = imagenUrl; // Usar la URL existente si no se sube una nueva imagen

    if (imagen) {
      const storage = getStorage();
      const imageRef = ref(storage, `images/${Date.now()}_${imagen.name}`);

      // Subir la imagen y obtener su URL
      await uploadBytes(imageRef, imagen);
      imageUrl = await getDownloadURL(imageRef);
    }

    // Pasar los campos con nombres en mayúscula para Firestore, incluyendo la URL de la imagen
    onSave({
      id: service ? service.id : null,
      Nombre: nombre,
      Precio: precio,
      Tipo: tipo,
      categoria,
      ImagenUrl: imageUrl, // Guardar la URL de la imagen
    });
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        {service ? "Editar Servicio" : "Agregar Nuevo Servicio"}
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre del Servicio</Form.Label>
            <Form.Control
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Nombre del servicio"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Precio</Form.Label>
            <Form.Control
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              placeholder="Precio"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
            >
              <option value="">Selecciona el tipo</option>
              <option value="Dip Powder">Dip Powder</option>
              <option value="Manos Permanentes">Manos permanentes</option>
              <option value="Manos Tradicionales">Manos Tradicionales</option>
              <option value="Pedicure permanentes">Pedicure permanentes</option>
              <option value="Pedicure Tradicional">Pedicure Tradicional</option>
              <option value="Servicios Especiales">Servicios Especiales</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Categoría</Form.Label>
            <Form.Select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            >
              <option value="">Selecciona una categoría</option>
              <option value="manicure">Manicure</option>
              <option value="pedicure">Pedicure</option>
              <option value="alisadopermanente">Alisado Permanente</option>
              <option value="botoxcapilar">Botox Capilar</option>
            </Form.Select>
          </Form.Group>

          {/* Campo de subida de imagen */}
          <Form.Group className="mb-3">
            <Form.Label>Imagen del Servicio</Form.Label>
            <Form.Control type="file" onChange={handleImageChange} />
            {imagenUrl && (
              <div className="mt-2">
                <img
                  src={imagenUrl}
                  alt="Imagen del servicio"
                  style={{ width: "100px" }}
                />
              </div>
            )}
          </Form.Group>

          <div className="d-flex justify-content-between">
            <Button variant="success" type="submit">
              {service ? "Actualizar" : "Agregar"}
            </Button>
            <Button variant="outline-secondary" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ServiceForm;
