import React from "react";

const UserForm = ({ usuario }) => {
  return (
    <div className="mb-3">
      <div className="mb-3">
        <label className="form-label">Nombre del Usuario</label>
        <input
          type="text"
          value={usuario ? usuario.nombre : ""}
          readOnly
          className="form-control"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Correo</label>
        <input
          type="text"
          value={usuario ? usuario.correo : ""}
          readOnly
          className="form-control"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Teléfono</label>
        <input
          type="text"
          value={usuario ? usuario.telefono : ""}
          readOnly
          className="form-control"
        />
      </div>
    </div>
  );
};

export default UserForm;
