import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, requiredRole, children }) => {
  if (!user) {
    // Si no está autenticado, redirige al login
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.rol !== requiredRole) {
    // Si no tiene el rol requerido, redirige al Home
    return <Navigate to="/" />;
  }

  // Si está autenticado y tiene el rol adecuado, muestra el contenido
  return children;
};

export default ProtectedRoute;
