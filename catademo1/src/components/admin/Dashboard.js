import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  format,
  parseISO,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import esLocale from "date-fns/locale/es";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faCalendarCheck,
  faClipboardCheck,
  faMoneyBillWave,
  faBan,
  faCheck,
  faSun,
  faMoon,
  faCalendarDay,
  faPercent,
  faChartLine,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";

import "../../styles/adminS/dashboard.css";

const dashC_LOCAL_THEME = "dashC_theme_v1";
const dashC_SLOTS_PER_DAY = 10; // Ajusta si quieres otra capacidad diaria

const DashAdmin = () => {
  // ====== Estado base (prefijo dashC_) ======
  const [dashC_clientes, setDashC_clientes] = useState(0);
  const [dashC_citas, setDashC_citas] = useState([]);
  const [dashC_ingresos, setDashC_ingresos] = useState(0);

  const [dashC_feedback, setDashC_feedback] = useState("");
  const [dashC_filterStatus, setDashC_filterStatus] = useState("all"); // all|pending|completed|canceled
  const [dashC_filterDate, setDashC_filterDate] = useState("");
  const [dashC_loading, setDashC_loading] = useState(true);

  const dashC_calRef = useRef(null);
  const [dashC_eventOpen, setDashC_eventOpen] = useState(false);
  const [dashC_eventSel, setDashC_eventSel] = useState(null);

  // Tema (claro/oscuro)
  const [dashC_theme, setDashC_theme] = useState(
    () => localStorage.getItem(dashC_LOCAL_THEME) || "light"
  );
  useEffect(() => {
    localStorage.setItem(dashC_LOCAL_THEME, dashC_theme);
  }, [dashC_theme]);

  // Pestañas (bottom card)
  const [dashC_tab, setDashC_tab] = useState("calendar"); // 'calendar' | 'list'

  // Abrir modal con el id del evento
  const dashC_openEvent = (id) => {
    const c = dashC_citas.find((x) => x.id === id);
    if (!c) return;
    setDashC_eventSel(c);
    setDashC_eventOpen(true);
  };

  // ====== Carga de datos Firestore ======
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Usuarios
        const uSnap = await getDocs(collection(db, "usuarios"));
        setDashC_clientes(uSnap.size || 0);

        // Ingresos (suma simple)
        const iSnap = await getDocs(collection(db, "ingresos"));
        let totalIngresos = 0;
        iSnap.forEach((d) => {
          const data = d.data() || {};
          const val =
            typeof data.amount === "number"
              ? data.amount
              : parseFloat(data.amount) || 0;
          totalIngresos += val;
        });
        setDashC_ingresos(totalIngresos);

        // Citas
        const cSnap = await getDocs(collection(db, "appointments"));
        let items = cSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        items = items
          .map((c) => {
            const canceled = !!c.canceled;
            const completed = !!c.completed;
            const dateStr = c.date; // "YYYY-MM-DD"
            const hourStr = c.hour || "10:00";
            const start = new Date(`${dateStr}T${hourStr}`);
            return {
              ...c,
              canceled,
              completed,
              start,
              localDate: format(start, "dd/MM/yyyy", { locale: esLocale }),
            };
          })
          .filter((c) => {
            const h = c.start.getHours();
            return h >= 10 && h <= 20; // horario útil (ajústalo a tu lógica)
          })
          .sort((a, b) => a.start - b.start);

        setDashC_citas(items);
      } catch (err) {
        console.error("dashC_error_fetch:", err);
      } finally {
        setDashC_loading(false);
      }
    };
    fetchAll();
  }, []);

  // ====== Derivados ======
  const dashC_counts = useMemo(() => {
    const pending = dashC_citas.filter(
      (c) => !c.completed && !c.canceled
    ).length;
    const completed = dashC_citas.filter((c) => c.completed).length;
    const canceled = dashC_citas.filter((c) => c.canceled).length;
    return { pending, completed, canceled, total: dashC_citas.length };
  }, [dashC_citas]);

  // Citas hoy
  const dashC_todayCount = useMemo(() => {
    const now = new Date();
    return dashC_citas.filter((c) => isSameDay(c.start, now)).length;
  }, [dashC_citas]);

  // Próximos 7 días (citas por día)
  // Próximos 7 días (citas por día)
  const dashC_next7daysData = useMemo(() => {
    const start = new Date();
    const end = addDays(start, 6);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const count = dashC_citas.filter(
        (c) => !c.canceled && isSameDay(c.start, d)
      ).length;
      return { day: format(d, "dd MMM", { locale: esLocale }), citas: count };
    });
  }, [dashC_citas]);

  // Ocupación 7 días
  const dashC_occupancy7d = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, 6));
    const upcoming = dashC_citas.filter(
      (c) => !c.canceled && isWithinInterval(c.start, { start, end })
    ).length;
    const capacity = 7 * dashC_SLOTS_PER_DAY;
    const pct = capacity > 0 ? Math.round((upcoming / capacity) * 100) : 0;
    return { upcoming, capacity, pct };
  }, [dashC_citas]);

  // Tasa cancelación
  const dashC_cancelRate = useMemo(() => {
    const { canceled, total } = dashC_counts;
    return total > 0 ? Math.round((canceled / total) * 100) : 0;
  }, [dashC_counts]);

  // Ticket promedio (ingresos / realizadas)
  const dashC_ticketAvg = useMemo(() => {
    const n = dashC_counts.completed || 0;
    return n > 0 ? Math.round(dashC_ingresos / n) : 0;
  }, [dashC_ingresos, dashC_counts]);

  // Top servicios (Top 5)
  const dashC_topServicios = useMemo(() => {
    const map = new Map();
    dashC_citas.forEach((c) => {
      const key = c.service || "Servicio";
      map.set(key, (map.get(key) || 0) + 1);
    });
    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return arr;
  }, [dashC_citas]);

  // Ingresos (simple)
  const dashC_ingresosData = useMemo(() => {
    return [{ name: "Total", valor: dashC_ingresos }];
  }, [dashC_ingresos]);

  // Filtro listado corto de citas (últimas 6 según filtro)
  const dashC_filteredCitas = useMemo(() => {
    let list = dashC_citas;
    if (dashC_filterStatus === "pending") {
      list = list.filter((c) => !c.completed && !c.canceled);
    } else if (dashC_filterStatus === "completed") {
      list = list.filter((c) => c.completed);
    } else if (dashC_filterStatus === "canceled") {
      list = list.filter((c) => c.canceled);
    }
    if (dashC_filterDate) {
      const iso = parseISO(dashC_filterDate);
      list = list.filter((c) => isSameDay(c.start, iso));
    }
    return list.slice(0, 6);
  }, [dashC_citas, dashC_filterStatus, dashC_filterDate]);

  // Calendario de eventos
  const dashC_calendarEvents = useMemo(() => {
    return dashC_citas.map((c) => {
      let color = "#0ea5e9";
      if (c.completed) color = "#16a34a";
      if (c.canceled) color = "#ef4444";
      return {
        id: c.id,
        title: c.service || "Servicio",
        start: c.start,
        allDay: false,
        color,
        extendedProps: {
          name: c.name,
          mode: c.mode,
          canceled: c.canceled,
          completed: c.completed,
        },
      };
    });
  }, [dashC_citas]);

  // ====== Acciones ======
  const dashC_markAsCompleted = async (id) => {
    try {
      await updateDoc(doc(db, "appointments", id), { completed: true });
      setDashC_citas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, completed: true } : c))
      );
      setDashC_feedback("Cita marcada como realizada.");
      setTimeout(() => setDashC_feedback(""), 2000);
    } catch (err) {
      console.error("dashC_error_update:", err);
      setDashC_feedback("No se pudo actualizar la cita.");
      setTimeout(() => setDashC_feedback(""), 2500);
    }
  };

  // Estilo de item por estado
  const dashC_itemClass = (c) =>
    c.canceled
      ? "dashC_item dashC_isCanceled"
      : c.completed
      ? "dashC_item dashC_isDone"
      : "dashC_item";

  // Tooltip estilizado para Recharts
  const DashCTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dashC_tooltip">
          <div className="dashC_tooltipLabel">{label}</div>
          {payload.map((p, i) => (
            <div key={i} className="dashC_tooltipRow">
              <span className="dashC_dot" style={{ background: p.color }} />
              <span>{p.name || p.dataKey}</span>
              <strong className="dashC_tooltipVal">
                {typeof p.value === "number"
                  ? p.dataKey === "valor"
                    ? `$${p.value.toLocaleString("es-CL")}`
                    : p.value
                  : p.value}
              </strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashC_wrap" data-theme={dashC_theme}>
      <header className="dashC_header">
        <div>
          <h2 className="dashC_title">Panel de Control</h2>
          <p className="dashC_sub">Resumen de negocio y agenda</p>
        </div>
        <div className="dashC_actions">
          <button
            className="dashC_btnGhost dashC_themeBtn"
            onClick={() =>
              setDashC_theme((t) => (t === "light" ? "dark" : "light"))
            }
            title="Cambiar tema"
          >
            <FontAwesomeIcon icon={dashC_theme === "dark" ? faSun : faMoon} />
          </button>

          <a href="/#agenda" className="dashC_btnPrimary">
            Nueva cita
          </a>
          <a href="/admin/reports" className="dashC_btnGhost">
            Ver reportes
          </a>
        </div>
      </header>

      {/* KPIs — 8 tarjetas compactas */}
      <section className="dashC_stats">
        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icBlue">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Clientes</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : dashC_clientes}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icIndigo">
            <FontAwesomeIcon icon={faCalendarCheck} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Citas Totales</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : dashC_counts.total}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icCyan">
            <FontAwesomeIcon icon={faCalendarDay} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Citas Hoy</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : dashC_todayCount}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icGreen">
            <FontAwesomeIcon icon={faClipboardCheck} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Realizadas</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : dashC_counts.completed}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icPink">
            <FontAwesomeIcon icon={faBan} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Canceladas</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : dashC_counts.canceled}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icOrange">
            <FontAwesomeIcon icon={faPercent} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Tasa Cancelación</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : `${dashC_cancelRate}%`}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icPurple">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Ocupación 7d</span>
            <span className="dashC_statValue">
              {dashC_loading ? "—" : `${dashC_occupancy7d.pct}%`}
            </span>
          </div>
        </div>

        <div className="dashC_statCard">
          <div className="dashC_statIcon dashC_icTeal">
            <FontAwesomeIcon icon={faCoins} />
          </div>
          <div className="dashC_statMeta">
            <span className="dashC_statLabel">Ticket Promedio</span>
            <span className="dashC_statValue">
              {dashC_loading
                ? "—"
                : `$${dashC_ticketAvg.toLocaleString("es-CL")}`}
            </span>
          </div>
        </div>
      </section>

      {/* Gráficos (3 en una fila) */}
      <section className="dashC_gridCharts">
        <div className="dashC_card">
          <div className="dashC_cardHead">
            <h3 className="dashC_cardTitle">Citas — Próximos 7 días</h3>
          </div>
          <div className="dashC_chartBox">
            {dashC_loading ? (
              <div className="dashC_skel dashC_skelChart" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashC_next7daysData}
                  margin={{ left: -10, right: 8, top: 6, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashC_grad1"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<DashCTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="citas"
                    name="Citas"
                    stroke="#0ea5e9"
                    fill="url(#dashC_grad1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashC_card">
          <div className="dashC_cardHead">
            <h3 className="dashC_cardTitle">Top servicios</h3>
          </div>
          <div className="dashC_chartBox">
            {dashC_loading ? (
              <div className="dashC_skel dashC_skelChart" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashC_topServicios}
                  margin={{ left: -10, right: 8, top: 6, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<DashCTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="value"
                    name="Citas"
                    fill="#6366f1"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashC_card">
          <div className="dashC_cardHead">
            <h3 className="dashC_cardTitle">Ingresos</h3>
          </div>
          <div className="dashC_chartBox">
            {dashC_loading ? (
              <div className="dashC_skel dashC_skelChart" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashC_ingresosData}
                  margin={{ left: -10, right: 8, top: 6, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<DashCTooltip />} />
                  <Bar
                    dataKey="valor"
                    name="CLP"
                    fill="#22c55e"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Calendario / Lista con pestañas */}
      <section className="dashC_gridBottom">
        <div className="dashC_card">
          <div className="dashC_tabs">
            <button
              className={`dashC_tabBtn ${
                dashC_tab === "calendar" ? "is-active" : ""
              }`}
              onClick={() => setDashC_tab("calendar")}
            >
              Calendario
            </button>
            <button
              className={`dashC_tabBtn ${
                dashC_tab === "list" ? "is-active" : ""
              }`}
              onClick={() => setDashC_tab("list")}
            >
              Citas recientes
            </button>
          </div>

          {/* Calendario */}
          {dashC_tab === "calendar" && (
            <div className="dashC_calendarBox">
              {dashC_loading ? (
                <div className="dashC_skel dashC_skelCal" />
              ) : (
                <FullCalendar
                  ref={dashC_calRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  locale="es"
                  events={dashC_calendarEvents}
                  height={480}
                  eventClick={(info) => dashC_openEvent(info.event.id)}
                  eventClassNames={(arg) => {
                    const s = arg.event.extendedProps;
                    return [
                      "dashC_fcEvent",
                      s?.canceled
                        ? "is-canceled"
                        : s?.completed
                        ? "is-done"
                        : "is-pending",
                    ];
                  }}
                  eventContent={(arg) => {
                    const root = document.createElement("div");
                    root.className = "dashC_event";
                    const dot = document.createElement("span");
                    dot.className = "dashC_eventDot";
                    dot.style.background =
                      arg.backgroundColor || arg.borderColor || "#0ea5e9";
                    const title = document.createElement("span");
                    title.className = "dashC_eventTitle";
                    title.textContent = arg.event.title || "";
                    const time = document.createElement("span");
                    time.className = "dashC_eventSub";
                    try {
                      time.textContent = arg.event.start
                        ? `${format(arg.event.start, "HH:mm")}`
                        : "";
                    } catch (_) {}
                    root.appendChild(dot);
                    root.appendChild(title);
                    root.appendChild(time);
                    return { domNodes: [root] };
                  }}
                />
              )}
            </div>
          )}

          {/* Lista + filtros */}
          {dashC_tab === "list" && (
            <>
              <div className="dashC_cardHead dashC_filters">
                <div className="dashC_filterRow">
                  <div className="dashC_chipGroup">
                    <button
                      className={`dashC_chip ${
                        dashC_filterStatus === "all" ? "is-active" : ""
                      }`}
                      onClick={() => setDashC_filterStatus("all")}
                    >
                      Todas
                    </button>
                    <button
                      className={`dashC_chip ${
                        dashC_filterStatus === "pending" ? "is-active" : ""
                      }`}
                      onClick={() => setDashC_filterStatus("pending")}
                    >
                      Pendientes
                    </button>
                    <button
                      className={`dashC_chip ${
                        dashC_filterStatus === "completed" ? "is-active" : ""
                      }`}
                      onClick={() => setDashC_filterStatus("completed")}
                    >
                      Realizadas
                    </button>
                    <button
                      className={`dashC_chip ${
                        dashC_filterStatus === "canceled" ? "is-active" : ""
                      }`}
                      onClick={() => setDashC_filterStatus("canceled")}
                    >
                      Canceladas
                    </button>
                  </div>

                  <input
                    type="date"
                    className="dashC_date"
                    value={dashC_filterDate}
                    onChange={(e) => setDashC_filterDate(e.target.value)}
                  />
                </div>
              </div>

              {dashC_feedback && (
                <div className="dashC_alert">{dashC_feedback}</div>
              )}

              {dashC_loading ? (
                <ul className="dashC_listWrap">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} className="dashC_item">
                      <div className="dashC_skel dashC_skelLine sm" />
                    </li>
                  ))}
                </ul>
              ) : dashC_filteredCitas.length === 0 ? (
                <p className="dashC_empty">Sin resultados</p>
              ) : (
                <ul className="dashC_listWrap">
                  {dashC_filteredCitas.map((c) => (
                    <li key={c.id} className={dashC_itemClass(c)}>
                      <div className="dashC_itemCol">
                        <span className="dashC_badge">
                          {format(c.start, "dd/MM", { locale: esLocale })}
                        </span>
                        <span className="dashC_muted">
                          {format(c.start, "HH:mm")}
                        </span>
                      </div>
                      <div className="dashC_itemCol dashC_itemMain">
                        <div className="dashC_itemTitle">
                          {c.service || "Servicio"}
                        </div>
                        <div className="dashC_itemSub">
                          {c.name || "Cliente"}
                        </div>
                      </div>
                      <div className="dashC_itemCol dashC_right">
                        {!c.completed && !c.canceled ? (
                          <button
                            className="dashC_btnSmall"
                            onClick={() => dashC_markAsCompleted(c.id)}
                          >
                            <FontAwesomeIcon icon={faCheck} /> Marcar
                          </button>
                        ) : c.completed ? (
                          <span className="dashC_tag dashC_ok">
                            <FontAwesomeIcon icon={faClipboardCheck} />{" "}
                            Realizada
                          </span>
                        ) : (
                          <span className="dashC_tag dashC_err">
                            <FontAwesomeIcon icon={faBan} /> Cancelada
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== Modal Global (fuera de las pestañas) ===== */}
      {dashC_eventOpen && dashC_eventSel && (
        <div className="dashC_modal" onClick={() => setDashC_eventOpen(false)}>
          <div className="dashC_modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="dashC_modalHead">
              <h4 className="dashC_modalTitle">Detalle de cita</h4>
              <button
                className="dashC_modalClose"
                onClick={() => setDashC_eventOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="dashC_modalBody">
              <div className="dashC_modalRow">
                <span>Servicio</span>
                <strong>{dashC_eventSel.service || "—"}</strong>
              </div>
              <div className="dashC_modalRow">
                <span>Cliente</span>
                <strong>{dashC_eventSel.name || "—"}</strong>
              </div>
              <div className="dashC_modalRow">
                <span>Fecha y hora</span>
                <strong>
                  {format(dashC_eventSel.start, "dd/MM/yyyy HH:mm", {
                    locale: esLocale,
                  })}
                </strong>
              </div>
              <div className="dashC_modalRow">
                <span>Modalidad</span>
                <strong>{dashC_eventSel.mode || "—"}</strong>
              </div>
              <div className="dashC_modalRow">
                <span>Estado</span>
                {dashC_eventSel.canceled ? (
                  <span className="dashC_tag dashC_err">Cancelada</span>
                ) : dashC_eventSel.completed ? (
                  <span className="dashC_tag dashC_ok">Realizada</span>
                ) : (
                  <span className="dashC_tag">Pendiente</span>
                )}
              </div>
            </div>

            <div className="dashC_modalFoot">
              {!dashC_eventSel.completed && !dashC_eventSel.canceled && (
                <button
                  className="dashC_btnPrimary"
                  onClick={() => {
                    dashC_markAsCompleted(dashC_eventSel.id);
                    setDashC_eventOpen(false);
                  }}
                >
                  Marcar realizada
                </button>
              )}
              <button
                className="dashC_btnGhost"
                onClick={() => {
                  setDashC_tab("calendar");
                  setDashC_eventOpen(false);
                  if (dashC_calRef.current) {
                    dashC_calRef.current
                      .getApi()
                      .gotoDate(dashC_eventSel.start);
                  }
                }}
              >
                Ver en calendario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashAdmin;
