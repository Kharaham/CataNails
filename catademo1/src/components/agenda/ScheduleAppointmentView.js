import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, storage } from "../../firebase/firebase";
import { getAuth } from "firebase/auth";
import { useLocation, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import emailjs from "emailjs-com";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../../styles/components/appointment.css";

/* ========== Utils ========== */
// formateo CLP seguro (devuelve string o null)
const fmtCLP = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat("es-CL").format(n);
};
// fechas 100% locales (evita corrimiento por UTC)
const formatYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseLocalISO = (iso) => {
  const [y, m, d] = (iso || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const todayISO = () => formatYMD(new Date());
const toISO = (d) => formatYMD(d);
const isSameDate = (a, b) => toISO(a) === toISO(b);
// debounce simple
const useDebounced = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};

/* ========== Config ========== */
const SERVICE_COLLECTIONS = [
  "manicure",
  "pedicure",
  "botoxcapilar",
  "alisadopermanente",
];
const WORKING_HOURS = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

/* ========== Autocomplete ========== */
function ServiceAutocomplete({ value, onSelect, services, loading }) {
  const [input, setInput] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(input, 200);
  const filtered = useMemo(() => {
    const t = debounced.trim().toLowerCase();
    return t
      ? services
        .filter((s) => (s.name || "").toLowerCase().includes(t))
        .slice(0, 12)
      : services.slice(0, 12);
  }, [debounced, services]);

  useEffect(() => setInput(value || ""), [value]);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => Math.min(p + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && active >= 0 && filtered[active]) {
      e.preventDefault();
      const s = filtered[active];
      onSelect(s);
      setInput(s.name);
      setOpen(false);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="agenC_acWrap">
      <div className={`agenC_acInput ${open ? "open" : ""}`}>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Busca tu servicio (ej: Manicure Gel)"
          aria-label="Buscar servicio"
          autoComplete="off"
        />
        {loading && <span className="agenC_acSpinner" aria-hidden />}
      </div>

      {open && (
        <div
          className="agenC_acList"
          role="listbox"
          onMouseLeave={() => setOpen(false)}
        >
          {filtered.length === 0 && !loading && (
            <div className="agenC_acEmpty">Sin coincidencias</div>
          )}
          {filtered.map((s, i) => (
            <div
              key={`${s.category}-${s.id}`}
              role="option"
              aria-selected={i === active}
              className={`agenC_acItem ${i === active ? "active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onSelect(s);
                setInput(s.name);
                setOpen(false);
              }}
            >
              <div className="agenC_acLine">
                <span className="agenC_acName">{s.name}</span>
                {Number.isFinite(s.price) && (
                  <span className="agenC_acPrice">${fmtCLP(s.price)}</span>
                )}
              </div>
              <small className="agenC_acMeta">{s.category}</small>
            </div>
          ))}
          {!loading && filtered.length > 0 && (
            <div className="agenC_acHint">
              <span className="agenC_kbd">↑</span>
              <span className="agenC_kbd">↓</span> navegar —{" "}
              <span className="agenC_kbd">Enter</span> seleccionar
            </div>
          )}
        </div>
      )}

      <div className="agenC_quick">
        {["Manicure", "Pedicure", "Alisado Permanente"].map((chip) => (
          <button
            key={chip}
            type="button"
            className="agenC_chip"
            onClick={() => {
              setInput(chip);
              setOpen(true);
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ========== Calendario compacto (sin libs) ========== */
const monthMatrix = (year, month) => {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // lunes=0
  const grid = [];
  let day = new Date(year, month, 1 - startDay);
  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      row.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    grid.push(row);
  }
  return grid;
};

function AgenCCalendar({
  valueISO,
  onChangeISO,
  blockedDaysISO,
  getHasSlotsForISO,
  minISO = todayISO(),
}) {
  const selected = valueISO ? parseLocalISO(valueISO) : null;
  const minDate = parseLocalISO(minISO);
  const [viewYear, setViewYear] = useState((selected || minDate).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected || minDate).getMonth());
  const grid = useMemo(
    () => monthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const goMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    const min = parseLocalISO(minISO);
    if (d < new Date(min.getFullYear(), min.getMonth(), 1)) return;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const isDisabled = (d) => d < minDate || blockedDaysISO.includes(toISO(d));
  const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <div className="agenC_cal">
      <div className="agenC_calHead">
        <button
          type="button"
          className="agenC_calNav"
          onClick={() => goMonth(-1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="agenC_calTitle">
          {monthNames[viewMonth]} {viewYear}
        </div>
        <button
          type="button"
          className="agenC_calNav"
          onClick={() => goMonth(1)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="agenC_calGrid" role="grid" aria-label="Calendario">
        {weekdays.map((w) => (
          <div key={w} className="agenC_calDow" role="columnheader">
            {w}
          </div>
        ))}
        {grid.flat().map((d, i) => {
          const iso = toISO(d);
          const disabled = isDisabled(d);
          const outside = d.getMonth() !== viewMonth;
          const selectedCls = selected && isSameDate(d, selected);
          const hasSlots = !disabled && !outside && getHasSlotsForISO?.(iso);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={[
                "agenC_calDay",
                disabled ? "isDisabled" : "",
                outside ? "isOutside" : "",
                selectedCls ? "isSelected" : "",
                hasSlots ? "hasSlots" : "",
                iso === todayISO() ? "isToday" : "",
              ].join(" ")}
              disabled={disabled || outside}
              onClick={() => onChangeISO(iso)}
            >
              <span className="agenC_calNum">{d.getDate()}</span>
              {hasSlots && <span className="agenC_calDot" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="agenC_calLegend">
        <span className="agenC_legendDot" />
        <small>Hay horas disponibles</small>
      </div>
    </div>
  );
}

/* ========== Vista principal ========== */
const ScheduleAppointmentView = ({ allowPrefill = true }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);



  const [bookedHours, setBookedHours] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]); // ["YYYY-MM-DD"]
  const [blockedHours, setBlockedHours] = useState([]); // [{date, hour}]
  const [selectedDate, setSelectedDate] = useState(""); // "YYYY-MM-DD"

  const [mode, setMode] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [allServices, setAllServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [prefilledService, setPrefilledService] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    date: "",
    hour: "",
    service: "",
    comment: "",
  });

  /* ---- Carga inicial ---- */
  useEffect(() => {
    (async () => {
      const auth = getAuth();
      const userEmail = auth.currentUser ? auth.currentUser.email : null;
      await Promise.all([loadBlockedDays(), loadServices()]);
      if (userEmail) await loadUserData(userEmail);

      if (!allowPrefill) return;
      const svcFromState = location.state?.service;
      if (svcFromState) prefillFromObject(svcFromState);
      else {
        const serviceId = searchParams.get("serviceId");
        const serviceName = searchParams.get("serviceName");
        const servicePrice = searchParams.get("servicePrice");
        if (serviceName)
          applyPrefill({
            id: serviceId || null,
            name: serviceName,
            price: servicePrice ? Number(servicePrice) : null,
            raw: null,
          });
        else if (serviceId) {
          try {
            const snap = await getDoc(doc(db, "alisadopermanente", serviceId));
            if (snap.exists())
              prefillFromObject({ id: snap.id, ...snap.data() });
          } catch (e) {
            console.error("Prefill por ID falló:", e);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, searchParams, allowPrefill]);

  const applyPrefill = (pf) => {
    setPrefilledService(pf);
    setSelectedService(pf);
    setFormData((p) => ({ ...p, service: pf.name }));
  };
  const prefillFromObject = (obj) => {
    const name = obj.Nombre || obj.name || obj.service || "";
    const price = obj.Precio ?? obj.price ?? null;
    if (!name) return;
    applyPrefill({
      id: obj.id || null,
      name,
      price: Number.isFinite(Number(price)) ? Number(price) : null,
      raw: obj,
    });
  };

  /* ---- Firestore ---- */
  const loadBlockedDays = async () => {
    const snap = await getDocs(collection(db, "blockedDays"));
    const days = [],
      hours = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.date) {
        days.push(data.date);
        (data.blockedHours || []).forEach((h) =>
          hours.push({ date: data.date, hour: h })
        );
      }
    });
    setBlockedDays(days);
    setBlockedHours(hours);
  };

  const loadServices = async () => {
    setLoadingServices(true);
    const out = [];
    for (const col of SERVICE_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, col));
        snap.forEach((d) => {
          const data = d.data();
          const name = data.Nombre || data.name || data.service || "";
          const price = data.Precio ?? data.price ?? null;
          if (name)
            out.push({
              id: d.id,
              name,
              price: Number.isFinite(Number(price)) ? Number(price) : null,
              category: col,
              raw: data,
            });
        });
      } catch (e) {
        console.error(`Error cargando ${col}:`, e);
      }
    }
    out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setAllServices(out);
    setLoadingServices(false);
  };

  const loadUserData = async (email) => {
    const qy = query(collection(db, "usuarios"), where("correo", "==", email));
    const qs = await getDocs(qy);
    if (!qs.empty) {
      const u = qs.docs[0].data();
      setFormData((prev) => ({
        ...prev,
        name: u.nombre || "",
        email: u.correo || "",
      }));
    }
  };

  const getAvailableHours = useCallback(async (dateStr) => {
    const qs = await getDocs(
      query(collection(db, "appointments"), where("date", "==", dateStr))
    );
    setBookedHours(qs.docs.map((d) => d.data().hour));
  }, []);

  useEffect(() => {
    if (selectedDate && !blockedDays.includes(selectedDate))
      getAvailableHours(selectedDate);
    else setBookedHours([]);
  }, [selectedDate, blockedDays, getAvailableHours]);

  /* ---- Handlers ---- */
  const onField = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onSelectService = (s) => {
    setSelectedService(s);
    setFormData((p) => ({ ...p, service: s.name }));
  };
  const onSelectDateISO = (iso) => {
    setSelectedDate(iso);
    setFormData((p) => ({ ...p, date: iso, hour: "" }));
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.error("La imagen supera 2 MB.");
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(f);
  };

  /* ---- Disponibilidad ---- */
  const availableHoursForDate = useMemo(() => {
    if (!selectedDate || blockedDays.includes(selectedDate)) return [];
    return WORKING_HOURS.filter((hour) => {
      const blocked = blockedHours.some(
        (b) => b.date === selectedDate && b.hour === hour
      );
      if (selectedDate === todayISO()) {
        const [h, m] = hour.split(":").map(Number);
        const slot = new Date();
        slot.setHours(h, m, 0, 0);
        if (slot <= new Date()) return false;
      }
      return !bookedHours.includes(hour) && !blocked;
    });
  }, [selectedDate, blockedDays, blockedHours, bookedHours]);

  const hasSlotsForISO = useCallback(
    (iso) => {
      if (blockedDays.includes(iso)) return false;
      if (iso === todayISO()) {
        return WORKING_HOURS.some((hour) => {
          const [h, m] = hour.split(":").map(Number);
          const slot = new Date();
          slot.setHours(h, m, 0, 0);
          const notPast = slot > new Date();
          const blocked = blockedHours.some(
            (b) => b.date === iso && b.hour === hour
          );
          return notPast && !blocked && !bookedHours.includes(hour);
        });
      }
      return true;
    },
    [blockedDays, blockedHours, bookedHours]
  );

  /* ---- Email ---- */
  const sendConfirmationEmail = (appointmentData) => {
    const [year, month, day] = appointmentData.date.split("-");
    const formattedDate = `${day}-${month}-${year}`;
    const templateParams = {
      from_name: "CataNails",
      to_email: appointmentData.email,
      user_name: appointmentData.name,
      mensaje: `Hola ${appointmentData.name},

Tu cita ha sido agendada para el día ${formattedDate} a las ${appointmentData.hour}.

Para confirmar tu reserva y evitar cancelaciones, recuerda abonar $5.000 dentro de las próximas 24 horas. Por favor, envía el comprobante de pago exclusivamente al WhatsApp +56 9 5037 2543.

¡Gracias por preferirnos!

CataNails.`,
    };
    return emailjs.send(
      "service_d7i4cqe",
      "template_pd2dz5u",
      templateParams,
      "S2X9g3S8OrR0K4J_z"
    );
  };

  /* ---- Submit ---- */
  const onSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.date ||
      !formData.hour ||
      !formData.service
    )
      return toast.error("Completa los campos requeridos.");
    if (mode === "Domicilio" && !address.trim())
      return toast.error("Ingresa una dirección para servicio a domicilio.");

    setSubmitting(true);
    try {
      let photoURL = null;
      if (imageFile) {
        const storageRef = ref(
          storage,
          `appointment-photos/${encodeURIComponent(
            imageFile.name
          )}-${Date.now()}`
        );
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "appointments"), {
        ...formData,
        mode,
        address: mode === "Domicilio" ? address : "",
        photoURL: photoURL || null,
        serviceId: selectedService?.id || prefilledService?.id || null,
        servicePrice: selectedService?.price ?? prefilledService?.price ?? null,
        createdAt: new Date().toISOString(),
      });

      toast.success("¡Cita agendada con éxito!");
      try {
        await sendConfirmationEmail({ ...formData, mode, address });
        toast.success("Correo de confirmación enviado.");
      } catch {
        toast.warn("Cita creada, pero no se pudo enviar el correo.");
      }

      // reset
      setFormData({
        name: "",
        email: "",
        date: "",
        hour: "",
        service: "",
        comment: "",
      });
      setSelectedService(null);
      setPrefilledService(null);
      setImageFile(null);
      setImagePreview(null);
      setMode("");
      setAddress("");
      setSelectedDate("");
      setBookedHours([]);
    } catch (err) {
      console.error("Error al agendar:", err);
      toast.error("Hubo un error al agendar la cita.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Render ---- */
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [paypalMode, setPaypalMode] = useState("abono");
  const abrirPayPal = (mode) => {
    setPaypalMode(mode);
    setShowPaypalModal(true);
  };
  const priceRef = selectedService?.price ?? prefilledService?.price ?? 0;
  const abono40 = Math.round(priceRef * 0.40);
  /* ---- PayPal Render ---- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!showPaypalModal) return;

    if (!window.paypal) {
      console.error("PayPal SDK no cargado.");
      toast.error("Error cargando PayPal.");
      return;
    }

    // PayPal usa USD, convertimos CLP → USD aprox:

    const montoCLP = paypalMode === "abono" ? abono40 : priceRef;
    const amountUSD = (montoCLP / 1000).toFixed(2);


    window.paypal.Buttons({
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                value: amountUSD,
                currency_code: "USD",     // ⭐ agregado obligatorio
              },
              description:
                paypalMode === "abono"
                  ? `Abono 40% — ${formData.service}`
                  : `Pago Completo — ${formData.service}`,
            },
          ],
        });
      },

      onApprove: async function (data, actions) {
        const details = await actions.order.capture();

        try {
          // 🔥 calcular monto según modo (abono o total)
          const montoCLP = paypalMode === "abono" ? abono40 : priceRef;
          const amountUSD = (montoCLP / 1000).toFixed(2);

          // Guardar cita con estado de pago:
          await addDoc(collection(db, "appointments"), {
            ...formData,
            mode,
            address: mode === "Domicilio" ? address : "",
            serviceId: selectedService?.id || prefilledService?.id || null,
            servicePrice: priceRef,

            // 🔥 monto dinámico
            abonoCLP: montoCLP,
            abonoUSD: amountUSD,

            paypalOrderID: data.orderID,

            // 🔥 estado dinámico por tipo de pago
            paymentStatus: paypalMode === "abono" ? "paid_40" : "paid_full",

            createdAt: new Date().toISOString(),
          });

          toast.success("Pago recibido y cita agendada 🎉");

          setShowPaypalModal(false);

          // Reset form:
          setFormData({
            name: "",
            email: "",
            date: "",
            hour: "",
            service: "",
            comment: "",
          });
          setSelectedService(null);
          setPrefilledService(null);
          setImageFile(null);

          // evitar glitch visual en la imagen
          setTimeout(() => setImagePreview(null), 150);

          setMode("");
          setAddress("");
          setSelectedDate("");
          setBookedHours([]);
        } catch (e) {
          console.error("Error:", e);
          toast.error("No se pudo guardar la cita.");
        }
      },

      onError: function (err) {
        console.error(err);
        toast.error("Hubo un error durante el pago.");
      },
    }).render("#paypal-button-container");
  }, [showPaypalModal, paypalMode]);

  return (
    <div className="agenC_page">
      <div className="agenC_bg" aria-hidden />
      <header className="agenC_toolbar">
        <div className="agenC_brand">
          <span className="agenC_brandDot" aria-hidden />
          <div className="agenC_brandText">
            <strong>CataNails</strong>
            <small>Agenda en 3 pasos</small>
          </div>
        </div>
        <div className="agenC_toolbarPills">
          <span className={`agenC_badge ${formData.service ? "ok" : ""}`}>
            Servicio
          </span>
          <span
            className={`agenC_badge ${formData.date && formData.hour ? "ok" : ""
              }`}
          >
            Fecha & hora
          </span>
          <span
            className={`agenC_badge ${formData.name && formData.email ? "ok" : ""
              }`}
          >
            Datos
          </span>
        </div>
      </header>

      <form
        className="agenC_form agenC_card agenC_formCompact"
        onSubmit={onSubmit}
      >
        <section className="agenC_grid agenC_gridTight">
          <div className="agenC_colMain">
            {/* Servicio */}
            <div className="agenC_field">
              <label>
                Servicio <span className="agenC_req">*</span>
              </label>
              {allowPrefill && prefilledService ? (
                <div className="agenC_pill">
                  {prefilledService.name}
                  {fmtCLP(priceRef) && (
                    <span className="agenC_bold"> — ${fmtCLP(priceRef)}</span>
                  )}
                  <button
                    type="button"
                    className="agenC_pillClear"
                    onClick={() => {
                      setPrefilledService(null);
                      setSelectedService(null);
                      setFormData((p) => ({ ...p, service: "" }));
                    }}
                    aria-label="Cambiar servicio"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <ServiceAutocomplete
                  value={formData.service}
                  services={allServices}
                  onSelect={onSelectService}
                  loading={loadingServices}
                />
              )}
              {!formData.service && (
                <small className="agenC_hint">
                  Busca y selecciona un servicio para continuar.
                </small>
              )}
            </div>

            {/* Calendario + Horas */}
            <div className="agenC_row agenC_rowTight">
              <div className="agenC_field">
                <label>
                  Fecha <span className="agenC_req">*</span>
                </label>
                <AgenCCalendar
                  valueISO={selectedDate}
                  onChangeISO={onSelectDateISO}
                  blockedDaysISO={blockedDays}
                  getHasSlotsForISO={hasSlotsForISO}
                  minISO={todayISO()}
                />
                {selectedDate && blockedDays.includes(selectedDate) && (
                  <p className="agenC_error">
                    CataNails fuera de servicio ese día.
                  </p>
                )}
              </div>

              <div className="agenC_field">
                <label>
                  Hora <span className="agenC_req">*</span>
                </label>
                {selectedDate ? (
                  <div className="agenC_hourGrid agenC_hourGridTight">
                    {availableHoursForDate.length ? (
                      availableHoursForDate.map((h) => (
                        <button
                          key={h}
                          type="button"
                          className={`agenC_hour ${formData.hour === h ? "isActive" : ""
                            }`}
                          onClick={() =>
                            setFormData((p) => ({ ...p, hour: h }))
                          }
                          aria-pressed={formData.hour === h}
                        >
                          {h}
                        </button>
                      ))
                    ) : (
                      <div className="agenC_empty">
                        No hay horas para esa fecha.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="agenC_empty">Primero elige una fecha.</div>
                )}
              </div>
            </div>

            {/* Modalidad */}
            <div className="agenC_row agenC_rowTight">
              <div className="agenC_field">
                <label>
                  Modalidad <span className="agenC_req">*</span>
                </label>
                <div className="agenC_segmented">
                  <button
                    type="button"
                    className={`agenC_seg ${mode === "Presencial" ? "active" : ""
                      }`}
                    onClick={() => setMode("Presencial")}
                  >
                    Presencial
                  </button>
                  <button
                    type="button"
                    className={`agenC_seg ${mode === "Domicilio" ? "active" : ""
                      }`}
                    onClick={() => setMode("Domicilio")}
                  >
                    Domicilio
                  </button>
                </div>
                <input type="hidden" name="mode" value={mode} />
              </div>

              {mode === "Domicilio" ? (
                <div className="agenC_field">
                  <label htmlFor="address">
                    Dirección <span className="agenC_req">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej: Pasaje X #123, Villa Y"
                    required
                  />
                  <small className="agenC_hint">
                    Servicio a Domicilio: tiene un cobro extra (según sector).
                  </small>
                </div>
              ) : (
                <div className="agenC_field">
                  <label>Sede</label>
                  <div className="agenC_mapNote">
                    <span>Debes venir a:</span>{" "}
                    <a
                      href="https://www.google.com/maps/place/Pallachata+1424,+3811616+Chill%C3%A1n,+%C3%91uble"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="agenC_link"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Datos personales */}
            <div className="agenC_row agenC_rowTight">
              <div className="agenC_field">
                <label htmlFor="name">
                  Nombre <span className="agenC_req">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={onField}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className="agenC_field">
                <label htmlFor="email">
                  Email <span className="agenC_req">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={onField}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Foto + comentario */}
            <div className="agenC_row agenC_rowTight">
              <div className="agenC_field">
                <label htmlFor="photo">Foto de referencia (opcional)</label>
                <div className="agenC_upload agenC_uploadCompact">
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    onChange={onFile}
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="agenC_preview"
                    />
                  ) : (
                    <div className="agenC_uploadHint">
                      Arrastra o haz clic para subir (máx. 2 MB)
                    </div>
                  )}
                </div>
              </div>
              <div className="agenC_field">
                <label htmlFor="comment">
                  Servicio solicitado <span className="agenC_req">*</span>
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={onField}
                  placeholder="Describe tu idea (tonos, diseño, largo, etc.)"
                  rows={4}
                  required
                />
                {formData.service && (
                  <small className="agenC_hint">
                    Estimación estándar: ~2 horas por servicio.
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Resumen */}
          <aside className="agenC_colAside">
            <div className="agenC_summary agenC_card agenC_summaryTight">
              <h4>Resumen</h4>
              <ul>
                <li>
                  <span>Servicio</span>
                  <strong className="agenC_clip">
                    {formData.service || "—"}
                  </strong>
                </li>
                <li>
                  <span>Fecha</span>
                  <strong>{formData.date || "—"}</strong>
                </li>
                <li>
                  <span>Hora</span>
                  <strong>{formData.hour || "—"}</strong>
                </li>
                <li>
                  <span>Modalidad</span>
                  <strong>{mode || "—"}</strong>
                </li>
                {mode === "Domicilio" && (
                  <li>
                    <span>Dirección</span>
                    <strong className="agenC_truncate">{address || "—"}</strong>
                  </li>
                )}
                <li className="agenC_div" />
                <li>
                  <span>Precio referencial</span>
                  <strong>
                    {fmtCLP(priceRef) ? <>${fmtCLP(priceRef)}</> : "Consultar"}
                  </strong>
                </li>
              </ul>
              <p className="agenC_note">
                Para confirmar tu reserva, abona $5.000 dentro de 24 h y envía
                el comprobante al WhatsApp +56 9 5037 2543.
              </p>
            </div>
          </aside>
        </section>

        {/* Barra acciones */}
        <div className="agenC_actionBar">
          <div className="agenC_actionBarInfo">
            <span className="agenC_badge tone">
              {formData.service || "Servicio no seleccionado"}
            </span>
            <span className="agenC_divDot" aria-hidden />
            <span className="agenC_muted">
              {formData.date || "Fecha —"}{" "}
              {formData.hour ? `• ${formData.hour}` : ""}
            </span>
            {fmtCLP(priceRef) && (
              <>
                <span className="agenC_divDot" aria-hidden />
                <span className="agenC_priceTag">${fmtCLP(priceRef)}</span>
              </>
            )}
          </div>
          <div className="agenC_actionBarBtns">

            {/* <-- Botón Revisar (igual que antes) --> */}
            <button
              type="button"
              className="agenC_ghost"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Revisar
            </button>

            {/* ⭐ NUEVO BOTÓN — Abonar 40% */}
            <button
              type="button"
              className="agenC_btn"
              onClick={() => abrirPayPal("abono")}   // ⭐ nuevo handler
              disabled={
                !formData.name ||
                !formData.email ||
                !formData.date ||
                !formData.hour ||
                !formData.service
              }
            >
              Abonar 40% y Agendar
            </button>

            {/* ⭐ NUEVO BOTÓN — Pagar Completo */}
            <button
              type="button"
              className="agenC_btn agenC_btnFull"     // ⭐ estilo extra opcional
              onClick={() => abrirPayPal("full")}     // ⭐ nuevo handler
              disabled={
                !formData.name ||
                !formData.email ||
                !formData.date ||
                !formData.hour ||
                !formData.service
              }
            >
              Pagar Completo y Agendar
            </button>

          </div>

        </div>
        {/* ---- Modal PayPal ---- */}
        {showPaypalModal && (
          <div className="paypalModal">
            <div className="paypalModal-content">

              {/* ⭐ TÍTULO DINÁMICO */}
              <h3>
                {paypalMode === "abono"
                  ? "Pagar Abono 40%"
                  : "Pagar Total"}
              </h3>

              <p>Monto a pagar:</p>

              {/* ⭐ MONTO DINÁMICO */}
              <h2>
                {paypalMode === "abono"
                  ? `$${fmtCLP(abono40)}`
                  : `$${fmtCLP(priceRef)}`}
              </h2>

              <div id="paypal-button-container"></div>

              <button
                className="agenC_ghost"
                onClick={() => setShowPaypalModal(false)}
                style={{ marginTop: "12px" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}


        <ToastContainer />
      </form>
    </div>
  );
};

export default ScheduleAppointmentView;
