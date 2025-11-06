import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "../../styles/components/trabajorealizado.css";

const SKELETON_COUNT = 8;

const TrabajosRealizados = () => {
  const [trabajosRealizados, setTrabajosRealizados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros bonitos
  const [selectedSection, setSelectedSection] = useState("todas");
  const [sortMode, setSortMode] = useState("newest"); // newest | oldest | title

  useEffect(() => {
    let isMounted = true;

    const fetchTrabajosRealizados = async () => {
      try {
        const qs = await getDocs(collection(db, "trabajos"));
        if (!isMounted) return;
        const arr = qs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTrabajosRealizados(arr);
      } catch (err) {
        console.error("Error cargando trabajos:", err);
        if (isMounted)
          setError("No pudimos cargar los trabajos. Intenta nuevamente.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrabajosRealizados();
    return () => {
      isMounted = false;
    };
  }, []);

  // Secciones disponibles + conteo
  // Secciones disponibles + conteo (sin "sin sección")
  const { sections, countsBySection } = useMemo(() => {
    const map = new Map();
    for (const t of trabajosRealizados) {
      const key = (t.section || "").toString().trim();
      if (!key) continue; // ignora vacíos
      map.set(key, (map.get(key) || 0) + 1);
    }
    const arr = Array.from(map.keys());
    return {
      sections: ["todas", ...arr],
      countsBySection: Object.fromEntries([
        [
          "todas",
          trabajosRealizados.filter((tt) => (tt.section || "").trim()).length,
        ],
        ...arr.map((k) => [k, map.get(k)]),
      ]),
    };
  }, [trabajosRealizados]);

  // Aplicar filtro y orden (sin "sin sección")
  const filtrados = useMemo(() => {
    // solo trabajos con sección válida
    let data = trabajosRealizados.filter((t) => (t.section || "").trim());
    if (selectedSection !== "todas") {
      data = data.filter((t) => t.section === selectedSection);
    }
    switch (sortMode) {
      case "oldest":
        data.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
        );
        break;
      case "title":
        data.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      default:
        data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
    }
    return data;
  }, [trabajosRealizados, selectedSection, sortMode]);

  // Reveal on-scroll (se mantiene)
  useEffect(() => {
    if (loading) return;
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { root: null, threshold: 0.08, rootMargin: "0px 0px -10% 0px" }
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, filtrados]);

  return (
    <div className="container trabajos-realizados-container">
      {/* Encabezado */}
      <div className="trabajos-header text-center">
        <h1 className="trabajos-title">Portafolio de Belleza</h1>
        <p className="trabajos-subtitle">
          Explora nuestros trabajos por sección y ordénalos como prefieras.
        </p>
        <div className="trabajos-divider" aria-hidden="true" />
      </div>

      {error && <p className="text-center text-danger mb-4">{error}</p>}

      {/* ======== FILTROS BONITOS ======== */}
      <div
        className="filters-bar"
        role="region"
        aria-label="Filtros de portafolio"
      >
        <div className="chips" role="tablist" aria-label="Filtrar por sección">
          {sections.map((sec) => (
            <button
              key={sec}
              type="button"
              role="tab"
              aria-selected={selectedSection === sec}
              className={`chip ${selectedSection === sec ? "active" : ""}`}
              onClick={() => setSelectedSection(sec)}
            >
              <span className="chip-dot" />
              {sec === "todas" ? "Todas" : sec}
              <span className="chip-count">{countsBySection[sec] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="sort-group" role="group" aria-label="Ordenar">
          <button
            type="button"
            className={`seg-btn ${sortMode === "newest" ? "on" : ""}`}
            onClick={() => setSortMode("newest")}
            title="Más recientes"
          >
            <span className="seg-icon" aria-hidden>
              ⬇️
            </span>{" "}
            Recientes
          </button>

          <button
            type="button"
            className={`seg-btn ${sortMode === "title" ? "on" : ""}`}
            onClick={() => setSortMode("title")}
            title="A–Z"
          >
            <span className="seg-icon" aria-hidden>
              🔤
            </span>{" "}
            A–Z
          </button>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="trabajos-realizados-grid" aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="trabajo-realizado-item skeleton-card">
              <div className="skeleton-img shimmer" />
              <div className="skeleton-overlay">
                <div className="skeleton-title shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-center text-muted">
          {selectedSection === "todas"
            ? "Aún no hay trabajos publicados."
            : `No hay trabajos en “${selectedSection}”.`}
        </p>
      ) : (
        <>
          <div className="results-meta">
            Mostrando <strong>{filtrados.length}</strong> trabajo(s)
            {selectedSection !== "todas" && (
              <>
                {" "}
                en <strong>{selectedSection}</strong>
              </>
            )}
          </div>

          <div className="trabajos-realizados-grid">
            {filtrados.map((trabajo, i) => (
              <div
                key={trabajo.id}
                className="trabajo-realizado-item reveal"
                style={{ "--delay": `${(i % 8) * 60}ms` }}
              >
                <img
                  src={trabajo.imgSrc}
                  alt={trabajo.title || "Trabajo realizado"}
                  className="trabajo-realizado-img fade-in"
                  loading="lazy"
                  onLoad={(e) => e.currentTarget.classList.add("loaded")}
                />
                <div className="trabajo-realizado-overlay">
                  <h5 className="trabajo-realizado-title">
                    {trabajo.title || "Sin título"}
                  </h5>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TrabajosRealizados;
