import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { toZonedTime, format } from "date-fns-tz";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../../styles/adminS/reportes.css";

const REPORTES_CHILE_TZ = "America/Santiago";
const REPORTES_PIE_COLORS = [
  "#e91e63",
  "#8b5cf6",
  "#00bcd4",
  "#ff9800",
  "#4caf50",
  "#9c27b0",
];

const ReportesView = () => {
  const [reportesRegistros, setReportesRegistros] = useState([]);

  const [reportesCitas, setReportesCitas] = useState([]);
  const [reportesUsuarios, setReportesUsuarios] = useState([]);

  const [reportesFechaInicio, setReportesFechaInicio] = useState(() =>
    format(
      new Date(new Date().setDate(new Date().getDate() - 30)),
      "yyyy-MM-dd",
      {
        timeZone: REPORTES_CHILE_TZ,
      }
    )
  );
  const [reportesFechaFin, setReportesFechaFin] = useState(() =>
    format(new Date(), "yyyy-MM-dd", { timeZone: REPORTES_CHILE_TZ })
  );
  const [reportesMetodo, setReportesMetodo] = useState("Todos");

  const [reportesModo, setReportesModo] = useState("resumen");
  const [reportesSecciones, setReportesSecciones] = useState({
    kpis: true,
    ingresos: true,
    citas: true,
    usuarios: true,
  });

  const reportesRefContenedor = useRef(null);

  useEffect(() => {
    const colRef = collection(db, "ingresos");
    const unsub = onSnapshot(colRef, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        const data = d.data();
        const fecha =
          data.date instanceof Timestamp
            ? data.date.toDate()
            : new Date(data.date);
        arr.push({
          id: d.id,
          date: fecha,
          amount: Number(data.amount) || 0,
          method: data.method || data.paymentMethod || "Desconocido",
          service: data.service || "Otros",
        });
      });
      arr.sort((a, b) => a.date - b.date);
      setReportesRegistros(arr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const colRef = collection(db, "appointments");
    const unsub = onSnapshot(colRef, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        const data = d.data();
        let fecha = data.date;
        if (fecha instanceof Timestamp) fecha = fecha.toDate();
        else if (typeof fecha === "string")
          fecha = new Date(fecha + "T00:00:00");
        else fecha = new Date(fecha);
        arr.push({
          id: d.id,
          date: fecha,
          hour: data.hour || "",
          name: data.name || "",
          email: data.email || "",
          service: data.service || "",
          mode: data.mode || "",
          completed: !!data.completed,
          canceled: !!data.canceled,
          amount: typeof data.amount === "number" ? data.amount : null,
        });
      });
      arr.sort((a, b) => a.date - b.date);
      setReportesCitas(arr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const colRef = collection(db, "usuarios");
    const unsub = onSnapshot(colRef, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setReportesUsuarios(arr);
    });
    return () => unsub();
  }, []);

  const reportesEnRango = (d) => {
    const norm = (x) =>
      format(toZonedTime(x, REPORTES_CHILE_TZ), "yyyy-MM-dd", {
        timeZone: REPORTES_CHILE_TZ,
      });
    return norm(d) >= reportesFechaInicio && norm(d) <= reportesFechaFin;
  };
  const reportesFmt = (n) => Number(n || 0).toLocaleString("es-CL");

  const reportesFiltrados = useMemo(() => {
    return reportesRegistros.filter(
      (r) =>
        reportesEnRango(r.date) &&
        (reportesMetodo === "Todos" ||
          (r.method || "").toLowerCase().includes(reportesMetodo.toLowerCase()))
    );
  }, [
    reportesRegistros,
    reportesFechaInicio,
    reportesFechaFin,
    reportesMetodo,
  ]);

  const reportesCitasFiltradas = useMemo(() => {
    return reportesCitas.filter((c) => reportesEnRango(c.date));
  }, [reportesCitas, reportesFechaInicio, reportesFechaFin]);

  const reportesTotal = useMemo(
    () => reportesFiltrados.reduce((acc, r) => acc + (r.amount || 0), 0),
    [reportesFiltrados]
  );
  const reportesTicketPromedio = useMemo(
    () =>
      reportesFiltrados.length ? reportesTotal / reportesFiltrados.length : 0,
    [reportesTotal, reportesFiltrados]
  );
  const reportesIngresoPromedioPorCita = useMemo(() => {
    const vals = reportesCitasFiltradas
      .map((c) => (typeof c.amount === "number" ? c.amount : null))
      .filter((v) => v !== null);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [reportesCitasFiltradas]);

  const reportesUsuariosTotal = reportesUsuarios.length;
  const reportesUsuariosConCita = useMemo(() => {
    const s = new Set(
      reportesCitas.map((c) => (c.email || "").toLowerCase()).filter(Boolean)
    );
    return s.size;
  }, [reportesCitas]);
  const reportesUsuariosConCitaEnRango = useMemo(() => {
    const s = new Set(
      reportesCitasFiltradas
        .map((c) => (c.email || "").toLowerCase())
        .filter(Boolean)
    );
    return s.size;
  }, [reportesCitasFiltradas]);

  const reportesCitasEnRango = reportesCitasFiltradas.length;
  const reportesCitasRealizadas = reportesCitasFiltradas.filter(
    (c) => c.completed
  ).length;
  const reportesCitasCanceladas = reportesCitasFiltradas.filter(
    (c) => c.canceled
  ).length;
  const reportesCitasPendientes =
    reportesCitasEnRango - reportesCitasRealizadas - reportesCitasCanceladas;

  const reportesLineasDiarias = useMemo(() => {
    const map = new Map();
    reportesFiltrados.forEach((r) => {
      const key = format(toZonedTime(r.date, REPORTES_CHILE_TZ), "dd/MM", {
        timeZone: REPORTES_CHILE_TZ,
      });
      map.set(key, (map.get(key) || 0) + r.amount);
    });
    return Array.from(map.entries()).map(([day, amount]) => ({ day, amount }));
  }, [reportesFiltrados]);

  const reportesBarrasApiladasPorMetodo = useMemo(() => {
    const normalize = (m) =>
      ["efectivo", "transferencia", "tarjeta"].includes((m || "").toLowerCase())
        ? m[0].toUpperCase() + m.slice(1).toLowerCase()
        : "Otro";
    const map = new Map();
    reportesFiltrados.forEach((r) => {
      const mes = format(toZonedTime(r.date, REPORTES_CHILE_TZ), "MMM yy", {
        timeZone: REPORTES_CHILE_TZ,
      });
      const meth = normalize((r.method || "Otro").toString());
      if (!map.has(mes))
        map.set(mes, {
          month: mes,
          Efectivo: 0,
          Transferencia: 0,
          Tarjeta: 0,
          Otro: 0,
        });
      map.get(mes)[meth] += r.amount;
    });
    return Array.from(map.values());
  }, [reportesFiltrados]);

  const reportesTortaPorServicio = useMemo(() => {
    const map = new Map();
    reportesFiltrados.forEach((r) => {
      const key = r.service || "Otros";
      map.set(key, (map.get(key) || 0) + r.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [reportesFiltrados]);

  const reportesCitasLineasDiarias = useMemo(() => {
    const map = new Map();
    reportesCitasFiltradas.forEach((c) => {
      const key = format(toZonedTime(c.date, REPORTES_CHILE_TZ), "dd/MM", {
        timeZone: REPORTES_CHILE_TZ,
      });
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
  }, [reportesCitasFiltradas]);

  const reportesCitasPorEstadoData = useMemo(
    () => [
      { name: "Realizadas", value: reportesCitasRealizadas },
      { name: "Canceladas", value: reportesCitasCanceladas },
      { name: "Pendientes", value: reportesCitasPendientes },
    ],
    [reportesCitasRealizadas, reportesCitasCanceladas, reportesCitasPendientes]
  );

  const reportesCitasPorModoData = useMemo(() => {
    const dom = reportesCitasFiltradas.filter(
      (c) => (c.mode || "").toLowerCase() === "domicilio"
    ).length;
    const pre = reportesCitasFiltradas.filter(
      (c) => (c.mode || "").toLowerCase() === "presencial"
    ).length;
    const otros = reportesCitasEnRango - dom - pre;
    return [
      { name: "Domicilio", value: dom },
      { name: "Presencial", value: pre },
      { name: "Otro/No indicado", value: Math.max(0, otros) },
    ];
  }, [reportesCitasFiltradas, reportesCitasEnRango]);

  // ====== EXPORTS ======
  const reportesExportCSV = () => {
    const header = ["Fecha", "Hora", "Monto", "Método", "Servicio"];
    const rows = reportesFiltrados.map((r) => {
      const d = toZonedTime(r.date, REPORTES_CHILE_TZ);
      const date = format(d, "dd/MM/yyyy", { timeZone: REPORTES_CHILE_TZ });
      const time = format(d, "HH:mm", { timeZone: REPORTES_CHILE_TZ });
      return [date, time, r.amount, r.method || "", r.service || ""];
    });
    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_ingresos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reportesExportExcel = () => {
    const ingresosSheet = reportesFiltrados.map((r) => {
      const d = toZonedTime(r.date, REPORTES_CHILE_TZ);
      return {
        Fecha: format(d, "dd/MM/yyyy", { timeZone: REPORTES_CHILE_TZ }),
        Hora: format(d, "HH:mm", { timeZone: REPORTES_CHILE_TZ }),
        Monto: r.amount,
        Método: r.method || "",
        Servicio: r.service || "",
      };
    });
    const wsIngresos = XLSX.utils.json_to_sheet(ingresosSheet);

    const citasSheet = reportesCitasFiltradas.map((c) => {
      const d = toZonedTime(c.date, REPORTES_CHILE_TZ);
      const estado = c.canceled
        ? "Cancelada"
        : c.completed
        ? "Realizada"
        : "Pendiente";
      return {
        Fecha: format(d, "dd/MM/yyyy", { timeZone: REPORTES_CHILE_TZ }),
        Hora: c.hour || "",
        Servicio: c.service || "",
        Modo: c.mode || "",
        Estado: estado,
        Cliente: c.email || c.name || "",
        Monto: typeof c.amount === "number" ? c.amount : "",
      };
    });
    const wsCitas = XLSX.utils.json_to_sheet(citasSheet);

    const usuariosSheet = reportesUsuarios.map((u) => ({
      Nombre: u.nombre || u.name || "",
      Correo: u.correo || u.email || "",
    }));
    const wsUsuarios = XLSX.utils.json_to_sheet(usuariosSheet);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos");
    XLSX.utils.book_append_sheet(wb, wsCitas, "Citas");
    XLSX.utils.book_append_sheet(wb, wsUsuarios, "Usuarios");
    XLSX.writeFile(wb, "reporte_completo.xlsx");
  };

  const reportesExportPDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const M = 14;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const include = (key) =>
      reportesModo === "resumen" ? true : !!reportesSecciones[key];

    const drawHeader = () => {
      pdf.setFillColor(233, 25, 99);
      pdf.circle(M + 5, 12, 4, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(33);
      pdf.setFontSize(16);
      pdf.text("CataaNails", M + 15, 15);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(90);
      pdf.text(
        `Reporte — ${reportesFechaInicio} a ${reportesFechaFin} — Método: ${reportesMetodo}`,
        M,
        22
      );
      pdf.setDrawColor(233, 25, 99);
      pdf.line(M, 24, pageW - M, 24);
    };

    const drawFooter = () => {
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`Página ${i} de ${pageCount}`, pageW - M, pageH - 8, {
          align: "right",
        });
      }
    };

    const sectionTitle = (text, y) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(33);
      pdf.text(text, M, y);
      pdf.setDrawColor(233, 25, 99);
      pdf.line(M, y + 2, pageW - M, y + 2);
    };

    drawHeader();

    let y = 28;
    if (include("kpis")) {
      const kpis = [
        {
          t: "Transacciones",
          v: `${reportesFiltrados.length}`,
          color: [233, 25, 99],
        },
        {
          t: "Total Filtrado",
          v: `$${reportesFmt(reportesTotal)}`,
          color: [139, 92, 246],
        },
        {
          t: "Promedio por Cita",
          v: `$${reportesFmt(reportesIngresoPromedioPorCita)}`,
          color: [76, 175, 80],
        },
        {
          t: "Usuarios con cita (rango)",
          v: `${reportesUsuariosConCitaEnRango}`,
          color: [255, 152, 0],
        },
        {
          t: "Ticket Promedio",
          v: `$${reportesFmt(reportesTicketPromedio)}`,
          color: [2, 132, 199],
        },
        {
          t: "Citas (rango)",
          v: `${reportesCitasEnRango}`,
          color: [158, 158, 158],
        },
      ];

      const cols = 2;
      const gap = 6;
      const cardW = pageW - 2 * M - (cols - 1) * gap;
      const cardH = 20;

      sectionTitle("Resumen", y);
      y += 6;

      kpis.forEach((k, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = M + col * (cardW / cols + gap);
        const yCard = y + row * (cardH + 6);

        pdf.setDrawColor(240);
        pdf.setFillColor(...k.color);
        pdf.roundedRect(x, yCard, cardW / cols, cardH, 2, 2, "F");

        pdf.setTextColor(255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text(k.t, x + 4, yCard + 7);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(k.v, x + 4, yCard + 15);
      });

      const rowsKPIs = Math.ceil(kpis.length / cols);
      y = y + rowsKPIs * (cardH + 6) + 6;
    }

    if (include("ingresos")) {
      if (y > pageH - 70) {
        pdf.addPage();
        drawHeader();
        y = 28;
      }
      sectionTitle("Ingresos", y);
      y += 6;

      const ingresosRows = reportesFiltrados.map((r) => {
        const d = toZonedTime(r.date, REPORTES_CHILE_TZ);
        return [
          format(d, "dd/MM/yyyy", { timeZone: REPORTES_CHILE_TZ }),
          format(d, "HH:mm", { timeZone: REPORTES_CHILE_TZ }),
          `$${reportesFmt(r.amount)}`,
          r.method || "",
          r.service || "",
        ];
      });

      autoTable(pdf, {
        startY: y,
        head: [["Fecha", "Hora", "Monto", "Método", "Servicio"]],
        body: ingresosRows,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [233, 25, 99], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        margin: { left: M, right: M },
        didDrawPage: drawHeader,
        pageBreak: "auto",
      });
      y = pdf.lastAutoTable?.finalY || pageH - 30;
    }

    if (include("citas")) {
      pdf.addPage();
      drawHeader();
      let y2 = 28;
      sectionTitle("Citas", y2);
      y2 += 6;

      const citasRows = reportesCitasFiltradas.map((c) => {
        const d = toZonedTime(c.date, REPORTES_CHILE_TZ);
        const estado = c.canceled
          ? "Cancelada"
          : c.completed
          ? "Realizada"
          : "Pendiente";
        return [
          format(d, "dd/MM/yyyy", { timeZone: REPORTES_CHILE_TZ }),
          c.hour || "",
          c.service || "",
          c.mode || "",
          estado,
          c.email || c.name || "",
          typeof c.amount === "number" ? `$${reportesFmt(c.amount)}` : "-",
        ];
      });

      autoTable(pdf, {
        startY: y2,
        head: [
          ["Fecha", "Hora", "Servicio", "Modo", "Estado", "Cliente", "Monto"],
        ],
        body: citasRows,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        margin: { left: M, right: M },
        didDrawPage: drawHeader,
        pageBreak: "auto",
      });
    }

    if (include("usuarios")) {
      pdf.addPage();
      drawHeader();
      let y3 = 28;
      sectionTitle("Usuarios", y3);
      y3 += 6;

      const usuariosRows = reportesUsuarios.map((u) => [
        u.nombre || u.name || "",
        u.correo || u.email || "",
      ]);

      autoTable(pdf, {
        startY: y3,
        head: [["Nombre", "Correo"]],
        body: usuariosRows,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [2, 132, 199], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        margin: { left: M, right: M },
        didDrawPage: drawHeader,
        pageBreak: "auto",
      });
    }

    drawFooter();
    pdf.save(
      reportesModo === "resumen"
        ? "CataaNails_Reporte_Resumen.pdf"
        : "CataaNails_Reporte_Personalizado.pdf"
    );
  };

  const reportesResetFiltros = () => {
    const now = new Date();
    setReportesFechaInicio(
      format(new Date(now.setDate(now.getDate() - 30)), "yyyy-MM-dd", {
        timeZone: REPORTES_CHILE_TZ,
      })
    );
    setReportesFechaFin(
      format(new Date(), "yyyy-MM-dd", { timeZone: REPORTES_CHILE_TZ })
    );
    setReportesMetodo("Todos");
    setReportesModo("resumen");
    setReportesSecciones({
      kpis: true,
      ingresos: true,
      citas: true,
      usuarios: true,
    });
  };

  const renderPieLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    name,
    value,
    percent,
  }) => {
    if (!value) return null;
    const RAD = Math.PI / 180;
    const r = outerRadius * 1.25;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    const right = x > cx;
    const small = percent < 0.08;
    return (
      <text
        x={x}
        y={y}
        className="recharts-custom-label"
        style={{ fill: "var(--rep-text, #111827)" }}
        fontSize={small ? 11 : 12}
        fontWeight={700}
        textAnchor={right ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${name}: ${value}`}
      </text>
    );
  };

  const renderPieLabelMoney = (args) => {
    const t = renderPieLabel({
      ...args,
      name: args.name,
      value: `$${reportesFmt(args.value)}`,
    });
    return t;
  };

  return (
    <div className="reportes-container">
      {/* Toolbar */}
      <div className="reportes-toolbar">
        <div className="reportes-filtros">
          <div className="reportes-filtro">
            <label>Desde</label>
            <input
              type="date"
              value={reportesFechaInicio}
              onChange={(e) => setReportesFechaInicio(e.target.value)}
            />
          </div>
          <div className="reportes-filtro">
            <label>Hasta</label>
            <input
              type="date"
              value={reportesFechaFin}
              onChange={(e) => setReportesFechaFin(e.target.value)}
            />
          </div>
          <div className="reportes-filtro">
            <label>Método (ingresos)</label>
            <select
              value={reportesMetodo}
              onChange={(e) => setReportesMetodo(e.target.value)}
            >
              <option>Todos</option>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Otro</option>
            </select>
          </div>

          <button className="reportes-btn" onClick={reportesResetFiltros}>
            Resetear
          </button>
        </div>

        <div className="reportes-secciones">
          <div className="reportes-radio-row">
            <label className="reportes-radio">
              <input
                type="radio"
                name="reportes-modo"
                value="resumen"
                checked={reportesModo === "resumen"}
                onChange={(e) => setReportesModo(e.target.value)}
              />
              <span>Resumen (todo)</span>
            </label>
            <label className="reportes-radio">
              <input
                type="radio"
                name="reportes-modo"
                value="custom"
                checked={reportesModo === "custom"}
                onChange={(e) => setReportesModo(e.target.value)}
              />
              <span>Personalizado</span>
            </label>
          </div>

          {reportesModo === "custom" && (
            <div className="reportes-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={reportesSecciones.kpis}
                  onChange={(e) =>
                    setReportesSecciones((s) => ({
                      ...s,
                      kpis: e.target.checked,
                    }))
                  }
                />
                KPIs
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reportesSecciones.ingresos}
                  onChange={(e) =>
                    setReportesSecciones((s) => ({
                      ...s,
                      ingresos: e.target.checked,
                    }))
                  }
                />
                Ingresos
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reportesSecciones.citas}
                  onChange={(e) =>
                    setReportesSecciones((s) => ({
                      ...s,
                      citas: e.target.checked,
                    }))
                  }
                />
                Citas
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reportesSecciones.usuarios}
                  onChange={(e) =>
                    setReportesSecciones((s) => ({
                      ...s,
                      usuarios: e.target.checked,
                    }))
                  }
                />
                Usuarios
              </label>
            </div>
          )}
        </div>

        <div className="reportes-acciones">
          <button
            className="reportes-btn reportes-primary"
            onClick={reportesExportPDF}
          >
            Exportar PDF
          </button>
          <button className="reportes-btn" onClick={reportesExportExcel}>
            Exportar Excel
          </button>
          <button className="reportes-btn" onClick={reportesExportCSV}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="reportes-kpi-grid">
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Transacciones (ingresos)</span>
          <span className="reportes-kpi-value">{reportesFiltrados.length}</span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Total Filtrado</span>
          <span className="reportes-kpi-value">
            ${reportesFmt(reportesTotal)}
          </span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Ticket Promedio</span>
          <span className="reportes-kpi-value">
            ${reportesFmt(reportesTicketPromedio)}
          </span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Ingreso Promedio por Cita</span>
          <span className="reportes-kpi-value">
            ${reportesFmt(reportesIngresoPromedioPorCita)}
          </span>
        </div>
      </div>

      <div className="reportes-kpi-grid">
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Usuarios totales</span>
          <span className="reportes-kpi-value">{reportesUsuariosTotal}</span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">
            Usuarios con cita (histórico)
          </span>
          <span className="reportes-kpi-value">{reportesUsuariosConCita}</span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Usuarios con cita (rango)</span>
          <span className="reportes-kpi-value">
            {reportesUsuariosConCitaEnRango}
          </span>
        </div>
        <div className="reportes-kpi">
          <span className="reportes-kpi-title">Citas (rango)</span>
          <span className="reportes-kpi-value">{reportesCitasEnRango}</span>
        </div>
      </div>

      <div ref={reportesRefContenedor} className="reportes-root">
        <div className="reportes-chart-card">
          <div className="reportes-chart-title">Ingresos por día</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={reportesLineasDiarias}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(v) => `$${reportesFmt(v)}`} />
              <Tooltip
                formatter={(v) => `$${reportesFmt(v)}`}
                labelFormatter={(l) => `Día: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#e91e63"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-chart-card">
          <div className="reportes-chart-title">
            Ingresos por mes (apilado por método)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={reportesBarrasApiladasPorMetodo}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${reportesFmt(v)}`} />
              <Tooltip formatter={(v) => `$${reportesFmt(v)}`} />
              <Legend />
              <Bar dataKey="Efectivo" stackId="m" fill="#4caf50" />
              <Bar dataKey="Transferencia" stackId="m" fill="#2196f3" />
              <Bar dataKey="Tarjeta" stackId="m" fill="#ff9800" />
              <Bar dataKey="Otro" stackId="m" fill="#9c27b0" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-chart-card">
          <div className="reportes-chart-title">
            Distribución por servicio (ingresos)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={reportesTortaPorServicio}
                dataKey="value"
                nameKey="name"
                outerRadius={92}
                paddingAngle={1}
                labelLine={false}
                label={renderPieLabelMoney}
              >
                {reportesTortaPorServicio.map((_, i) => (
                  <Cell
                    key={i}
                    fill={REPORTES_PIE_COLORS[i % REPORTES_PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v) => `$${reportesFmt(v)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-chart-card">
          <div className="reportes-chart-title">Citas por día (conteo)</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={reportesCitasLineasDiarias}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip labelFormatter={(l) => `Día: ${l}`} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2196f3"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-chart-card">
          <div className="reportes-chart-title">Citas por estado (rango)</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={reportesCitasPorEstadoData}
                dataKey="value"
                nameKey="name"
                outerRadius={92}
                paddingAngle={1}
                labelLine={false}
                label={renderPieLabel}
              >
                <Cell fill="#4caf50" />
                <Cell fill="#f44336" />
                <Cell fill="#9e9e9e" />
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-chart-card">
          <div className="reportes-chart-title">
            Citas por modalidad (rango)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={reportesCitasPorModoData}
                dataKey="value"
                nameKey="name"
                outerRadius={92}
                paddingAngle={1}
                labelLine={false}
                label={renderPieLabel}
              >
                <Cell fill="#8bc34a" />
                <Cell fill="#ff9800" />
                <Cell fill="#bdbdbd" />
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="reportes-table-card">
          <div className="reportes-chart-title">Ingresos (primeros 100)</div>
          <div className="reportes-table-wrap">
            <table className="reportes-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Servicio</th>
                </tr>
              </thead>
              <tbody>
                {reportesFiltrados.slice(0, 100).map((r) => {
                  const d = toZonedTime(r.date, REPORTES_CHILE_TZ);
                  return (
                    <tr key={r.id}>
                      <td>
                        {format(d, "dd/MM/yyyy", {
                          timeZone: REPORTES_CHILE_TZ,
                        })}
                      </td>
                      <td>
                        {format(d, "HH:mm", { timeZone: REPORTES_CHILE_TZ })}
                      </td>
                      <td>${reportesFmt(r.amount)}</td>
                      <td>{r.method}</td>
                      <td>{r.service}</td>
                    </tr>
                  );
                })}
                {reportesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="5" className="reportes-empty">
                      Sin ingresos en el rango
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportes-table-card">
          <div className="reportes-chart-title">Citas (primeras 100)</div>
          <div className="reportes-table-wrap">
            <table className="reportes-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Servicio</th>
                  <th>Modo</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {reportesCitasFiltradas.slice(0, 100).map((c) => {
                  const d = toZonedTime(c.date, REPORTES_CHILE_TZ);
                  const estado = c.canceled
                    ? "Cancelada"
                    : c.completed
                    ? "Realizada"
                    : "Pendiente";
                  return (
                    <tr key={c.id}>
                      <td>
                        {format(d, "dd/MM/yyyy", {
                          timeZone: REPORTES_CHILE_TZ,
                        })}
                      </td>
                      <td>{c.hour || ""}</td>
                      <td>{c.service || ""}</td>
                      <td>{c.mode || ""}</td>
                      <td>
                        <span
                          className={`reportes-pill ${
                            estado === "Realizada"
                              ? "ok"
                              : estado === "Cancelada"
                              ? "bad"
                              : "warn"
                          }`}
                        >
                          {estado}
                        </span>
                      </td>
                      <td>{c.email || c.name || ""}</td>
                      <td>
                        {typeof c.amount === "number"
                          ? `$${reportesFmt(c.amount)}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
                {reportesCitasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="7" className="reportes-empty">
                      Sin citas en el rango
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesView;
