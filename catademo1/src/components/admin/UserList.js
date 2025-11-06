// src/components/admin/UserList.jsx
import React, { useMemo, useState } from "react";

const SafeText = ({ children }) => (
  <span title={children || ""}>{children || "-"}</span>
);

export default function UserList({
  users = [],
  loading = false,
  selectedUserId,
  onSelect,
  onIncrementPoints,
  onDelete,
}) {
  const [q, setQ] = useState("");
  const [minPts, setMinPts] = useState("");
  const [sort, setSort] = useState("name"); // name | points

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let data = users;

    if (term) {
      data = data.filter((u) => {
        const name = (u.nombre || u.name || "").toLowerCase();
        const email = (u.correo || u.email || "").toLowerCase();
        const phone = (u.telefono || u.phone || "").toLowerCase();
        return (
          name.includes(term) || email.includes(term) || phone.includes(term)
        );
      });
    }

    if (minPts !== "" && !Number.isNaN(Number(minPts))) {
      const min = Number(minPts);
      data = data.filter((u) => (u.puntosFidelidad || 0) >= min);
    }

    if (sort === "name") {
      data = [...data].sort((a, b) =>
        (a.nombre || a.name || "").localeCompare(b.nombre || b.name || "")
      );
    } else if (sort === "points") {
      data = [...data].sort(
        (a, b) => (b.puntosFidelidad || 0) - (a.puntosFidelidad || 0)
      );
    }

    return data;
  }, [users, q, minPts, sort]);

  return (
    <div className="user-list-root">
      {/* Controles */}
      <div className="user-list-controls p-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-sm-6">
            <label className="form-label m-0">Buscar</label>
            <input
              className="form-control"
              placeholder="Nombre, correo o teléfono…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="col-6 col-sm-3">
            <label className="form-label m-0">Mín. puntos</label>
            <input
              type="number"
              min={0}
              className="form-control"
              value={minPts}
              onChange={(e) => setMinPts(e.target.value)}
            />
          </div>
          <div className="col-6 col-sm-3">
            <label className="form-label m-0">Ordenar por</label>
            <select
              className="form-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="name">Nombre</option>
              <option value="points">Puntos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla / Lista */}
      <div className="table-responsive user-management-table-wrapper">
        <table className="table user-management-table mb-0">
          <thead>
            <tr>
              <th style={{ minWidth: 180 }}>Nombre</th>
              <th style={{ minWidth: 200 }}>Correo</th>
              <th style={{ minWidth: 120 }}>Teléfono</th>
              <th style={{ width: 100 }}>Puntos</th>
              <th style={{ minWidth: 240 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="user-skeleton-row">
                    <td>
                      <div className="skl w-75" />
                    </td>
                    <td>
                      <div className="skl w-100" />
                    </td>
                    <td>
                      <div className="skl w-50" />
                    </td>
                    <td>
                      <div className="skl w-50" />
                    </td>
                    <td>
                      <div className="skl w-100" />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {!loading &&
              filtered.map((u) => {
                const isActive = selectedUserId === u.id;
                const pts = u.puntosFidelidad || 0;
                const badgeClass =
                  pts >= 30
                    ? "badge bg-success-subtle text-success"
                    : pts >= 15
                    ? "badge bg-warning-subtle text-warning"
                    : "badge bg-light text-muted";

                return (
                  <tr
                    key={u.id}
                    className={isActive ? "row-active" : undefined}
                  >
                    <td>
                      <SafeText>
                        {u.nombre || u.name || "Usuario sin nombre"}
                      </SafeText>
                    </td>
                    <td>
                      <SafeText>{u.correo || u.email}</SafeText>
                    </td>
                    <td>
                      <SafeText>{u.telefono || u.phone}</SafeText>
                    </td>
                    <td>
                      <span className={badgeClass}>{pts}</span>
                    </td>
                    <td className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onSelect && onSelect(u.id)}
                        aria-pressed={isActive}
                        aria-label={`Abrir perfil de ${u.nombre || u.name || ""}`}
                      >
                        {isActive ? "Viendo perfil" : "Perfil"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => onIncrementPoints && onIncrementPoints(u)}
                      >
                        +5 Puntos
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete && onDelete(u)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No hay usuarios que coincidan con tu búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
