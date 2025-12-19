import React, { useMemo, useState } from "react";

function parseDateTime(dateStr, hourStr) {
  try {
    const [y, m, d] = (dateStr || "").split("-").map((n) => Number(n));
    const [hh, mm] = (hourStr || "00:00").split(":").map((n) => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  } catch {
    return null;
  }
}

function formatDateTime(dateStr, hourStr) {
  const dt = parseDateTime(dateStr, hourStr);
  if (!dt) return `${dateStr || "-"} ${hourStr || ""}`.trim();
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserForm({ usuario, citas = [] }) {
  const [tab, setTab] = useState("datos");

  const { futuras, pasadas } = useMemo(() => {
    const now = new Date();
    const withKey = citas.map((c) => ({
      ...c,
      _dt: parseDateTime(c.date, c.hour),
    }));
    const futuras = withKey
      .filter((c) => c._dt && c._dt.getTime() >= now.getTime())
      .sort((a, b) => (a._dt?.getTime() || 0) - (b._dt?.getTime() || 0));
    const pasadas = withKey
      .filter((c) => !c._dt || c._dt.getTime() < now.getTime())
      .sort((a, b) => (b._dt?.getTime() || 0) - (a._dt?.getTime() || 0));
    return { futuras, pasadas };
  }, [citas]);

  if (!usuario) {
    return (
      <div className="empty-profile text-center text-muted py-4">
        Selecciona un usuario para ver su perfil.
      </div>
    );
  }

  const nombre = usuario.nombre || usuario.name || "Usuario sin nombre";
  const correo = usuario.correo || usuario.email || "-";
  const telefono = usuario.telefono || usuario.phone || "-";
  const puntos = usuario.puntosFidelidad || 0;

  const ptsBadgeClass =
    puntos >= 30
      ? "badge bg-success-subtle text-success"
      : puntos >= 15
      ? "badge bg-warning-subtle text-warning"
      : "badge bg-light text-muted";

  return (
    <div className="user-profile">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h6 className="mb-1">{nombre}</h6>
          <div className="text-muted small">{correo}</div>
          <div className="text-muted small">{telefono}</div>
        </div>
        <div className="text-end">
          <div className={ptsBadgeClass} title="Puntos de fidelidad">
            {puntos} pts
          </div>
        </div>
      </div>

      <div className="user-tabs mb-3">
        <button
          className={`user-tab ${tab === "datos" ? "active" : ""}`}
          onClick={() => setTab("datos")}
        >
          Datos
        </button>
        <button
          className={`user-tab ${tab === "citas" ? "active" : ""}`}
          onClick={() => setTab("citas")}
        >
          Citas ({citas.length})
        </button>
      </div>

      {tab === "datos" && (
        <div className="user-card-grid">
          <div className="user-card">
            <div className="user-card-label">Nombre</div>
            <div className="user-card-value">{nombre}</div>
          </div>
          <div className="user-card">
            <div className="user-card-label">Correo</div>
            <div className="user-card-value">{correo}</div>
          </div>
          <div className="user-card">
            <div className="user-card-label">Teléfono</div>
            <div className="user-card-value">{telefono}</div>
          </div>
          <div className="user-card">
            <div className="user-card-label">Puntos</div>
            <div className="user-card-value">{puntos}</div>
          </div>
        </div>
      )}

      {tab === "citas" && (
        <div className="user-appointments">
          <div className="mb-2">
            <span className="badge bg-primary-subtle text-primary">
              Próximas: {futuras.length}
            </span>{" "}
            <span className="badge bg-secondary-subtle text-secondary">
              Pasadas: {pasadas.length}
            </span>
          </div>

          {citas.length === 0 && (
            <div className="text-muted small">
              No hay citas registradas para este usuario.
            </div>
          )}

          {futuras.length > 0 && (
            <>
              <h6 className="mt-3 mb-2">Próximas</h6>
              <ul className="list-group user-appointments-list">
                {futuras.map((c) => (
                  <li key={c.id} className="list-group-item appt-item upcoming">
                    <div className="appt-line">
                      <span className="appt-title">
                        {c.service || c.servicio || "Cita"}
                      </span>
                      <span className="appt-when">
                        {formatDateTime(c.date, c.hour)}
                      </span>
                    </div>
                    <div className="appt-sub">
                      {c.status ? (
                        <span className="badge bg-info-subtle text-info">
                          {c.status}
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success">
                          Próxima
                        </span>
                      )}
                      {c.notes && (
                        <span className="appt-notes"> • {c.notes}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {pasadas.length > 0 && (
            <>
              <h6 className="mt-4 mb-2">Historial</h6>
              <ul className="list-group user-appointments-list">
                {pasadas.map((c) => (
                  <li key={c.id} className="list-group-item appt-item past">
                    <div className="appt-line">
                      <span className="appt-title">
                        {c.service || c.servicio || "Cita"}
                      </span>
                      <span className="appt-when">
                        {formatDateTime(c.date, c.hour)}
                      </span>
                    </div>
                    <div className="appt-sub">
                      <span className="badge bg-light text-muted">Pasada</span>
                      {c.notes && (
                        <span className="appt-notes"> • {c.notes}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
