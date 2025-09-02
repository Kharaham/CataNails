import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDollarSign,
  faSearch,
  faPalette,
} from "@fortawesome/free-solid-svg-icons";
import { format, toZonedTime } from "date-fns-tz";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "../../styles/adminS/bankbalance.css";

const CHILE_TZ = "America/Santiago";
const CATEGORIA_OTRA = "Otros";
const UI_STORE_KEY = "bankbalance_ui_v1";

const DEFAULT_UI = {
  brand: "#e91e63",
  kpi: {
    daily: "#ffcc80",
    monthly: "#81d4fa",
    annual: "#a5d6a7",
    total: "#d1c4e9",
    transfer: "#ffd6e7",
  },
  charts: {
    area: "#e91e63",
    bar: "#8b5cf6",
    pie: ["#e91e63", "#8b5cf6", "#00bcd4", "#ff9800", "#4caf50", "#9c27b0"],
  },
};

const BankBalance = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [totalIncome, setTotalIncome] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [annualTotal, setAnnualTotal] = useState(0);
  const [ui, setUi] = useState(() => {
    try {
      const saved = localStorage.getItem(UI_STORE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_UI;
    } catch {
      return DEFAULT_UI;
    }
  });
  const [showCustomizer, setShowCustomizer] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd", { timeZone: CHILE_TZ })
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Persistir UI
  useEffect(() => {
    localStorage.setItem(UI_STORE_KEY, JSON.stringify(ui));
  }, [ui]);

  // Live fetch con cleanup correcto
  useEffect(() => {
    const ingresosRef = collection(db, "ingresos");
    const unsubscribe = onSnapshot(ingresosRef, (snapshot) => {
      const list = [];
      let total = 0;

      snapshot.forEach((d) => {
        const data = d.data();
        const transactionDate =
          data.date instanceof Timestamp
            ? data.date.toDate()
            : new Date(data.date);
        const amt = Number(data.amount) || 0;
        total += amt;
        list.push({
          id: d.id,
          ...data,
          amount: amt,
          date: transactionDate,
        });
      });

      list.sort((a, b) => b.date - a.date);
      setTransactions(list);
      setTotalIncome(total);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterTransactionsByDate(selectedDate);
  }, [selectedDate, transactions]);

  useEffect(() => {
    calculateTotals(transactions);
  }, [transactions, selectedMonth, selectedYear, selectedDate]);

  const filterTransactionsByDate = (date) => {
    const filtered = transactions.filter((t) => {
      const tzDate = toZonedTime(t.date, CHILE_TZ);
      const onlyDate = format(tzDate, "yyyy-MM-dd", { timeZone: CHILE_TZ });
      return onlyDate === date;
    });
    setFilteredTransactions(filtered);

    const daySum = filtered.reduce((acc, t) => acc + t.amount, 0);
    setDailyTotal(daySum);
  };

  const calculateTotals = (all) => {
    const daily = all.reduce((acc, t) => {
      const tzDate = toZonedTime(t.date, CHILE_TZ);
      const onlyDate = format(tzDate, "yyyy-MM-dd", { timeZone: CHILE_TZ });
      return onlyDate === selectedDate ? acc + t.amount : acc;
    }, 0);

    const monthly = all.reduce((acc, t) => {
      const tzDate = toZonedTime(t.date, CHILE_TZ);
      return tzDate.getFullYear() === selectedYear &&
        tzDate.getMonth() === selectedMonth
        ? acc + t.amount
        : acc;
    }, 0);

    const annual = all.reduce((acc, t) => {
      const tzDate = toZonedTime(t.date, CHILE_TZ);
      return tzDate.getFullYear() === selectedYear ? acc + t.amount : acc;
    }, 0);

    setDailyTotal(daily);
    setMonthlyTotal(monthly);
    setAnnualTotal(annual);
  };

  const handleAddIncome = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Por favor ingresa un monto válido");
      return;
    }
    const amountNum = parseFloat(amount);
    const nowInChile = toZonedTime(new Date(), CHILE_TZ);

    await addDoc(collection(db, "ingresos"), {
      amount: amountNum,
      method, // <-- importante para "Transferencias"
      date: Timestamp.fromDate(nowInChile),
    });
    setAmount("");
    setMethod("Efectivo");
  };

  const handleSearch = () => {
    filterTransactionsByDate(selectedDate);
    calculateTotals(transactions);
  };

  // Reset de filtros a hoy / mes y año actuales
  const handleResetFilters = () => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd", { timeZone: CHILE_TZ });
    setSelectedDate(today);
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    filterTransactionsByDate(today);
    calculateTotals(transactions);
  };

  const currentDateInChile = format(new Date(), "yyyy-MM-dd", {
    timeZone: CHILE_TZ,
  });

  // ====== DATASETS PARA GRÁFICOS ======
  const last14DaysData = useMemo(() => {
    const map = new Map();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = format(toZonedTime(d, CHILE_TZ), "yyyy-MM-dd", {
        timeZone: CHILE_TZ,
      });
      map.set(key, 0);
    }
    transactions.forEach((t) => {
      const key = format(toZonedTime(t.date, CHILE_TZ), "yyyy-MM-dd", {
        timeZone: CHILE_TZ,
      });
      if (map.has(key))
        map.set(key, (map.get(key) || 0) + (Number(t.amount) || 0));
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      day: format(new Date(k + "T00:00:00"), "dd/MM", { timeZone: CHILE_TZ }),
      amount: v,
    }));
  }, [transactions]);

  const monthlyByYear = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, m) => ({
      month: new Date(0, m).toLocaleString("es-CL", { month: "short" }),
      amount: 0,
    }));
    transactions.forEach((t) => {
      const d = toZonedTime(t.date, CHILE_TZ);
      if (d.getFullYear() === selectedYear) {
        arr[d.getMonth()].amount += Number(t.amount) || 0;
      }
    });
    return arr;
  }, [transactions, selectedYear]);

  // Total de transferencias del MES seleccionado
  // Total y contador de transferencias del MES seleccionado
  const { amount: transfersMonthly, count: transfersCountMonthly } =
    useMemo(() => {
      let amount = 0;
      let count = 0;

      transactions.forEach((t) => {
        const d = toZonedTime(t.date, CHILE_TZ);
        const isMonth =
          d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;

        // Detecta transferencias por method/paymentMethod/type/service o flag isTransfer
        const hint = (t.method || t.paymentMethod || t.type || t.service || "")
          .toString()
          .toLowerCase();
        const isTransfer =
          hint.includes("transfer") ||
          hint.includes("banco") ||
          t.isTransfer === true;

        if (isMonth && isTransfer) {
          amount += Number(t.amount) || 0;
          count += 1;
        }
      });

      return { amount, count };
    }, [transactions, selectedYear, selectedMonth]);

  const serviceDistribution = useMemo(() => {
    const acc = new Map();
    transactions.forEach((t) => {
      const key = (t.service || CATEGORIA_OTRA).toString();
      acc.set(key, (acc.get(key) || 0) + (Number(t.amount) || 0));
    });
    return Array.from(acc.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const fmtCLP = (n) =>
    typeof n === "number"
      ? n.toLocaleString("es-CL")
      : Number(n || 0).toLocaleString("es-CL");

  return (
    <div className="bankbalance-container">
      <div className="money-container mt-4">
        <div className="money-header-row">
          <h2 className="money-header">
            <FontAwesomeIcon icon={faDollarSign} className="me-2" /> Ingresos
            Totales (CLP)
          </h2>
          <button
            className="money-customize-btn"
            onClick={() => setShowCustomizer((s) => !s)}
            title="Personalizar interfaz"
          >
            <FontAwesomeIcon icon={faPalette} /> Personalizar
          </button>
        </div>

        {/* Panel de personalización */}
        {showCustomizer && (
          <div className="ui-customizer">
            <div className="ui-grid">
              <div>
                <label>Marca / Área</label>
                <input
                  type="color"
                  value={ui.brand}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      brand: e.target.value,
                      charts: { ...p.charts, area: e.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label>KPI Día</label>
                <input
                  type="color"
                  value={ui.kpi.daily}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      kpi: { ...p.kpi, daily: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label>KPI Mes</label>
                <input
                  type="color"
                  value={ui.kpi.monthly}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      kpi: { ...p.kpi, monthly: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label>KPI Año</label>
                <input
                  type="color"
                  value={ui.kpi.annual}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      kpi: { ...p.kpi, annual: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label>KPI Total</label>
                <input
                  type="color"
                  value={ui.kpi.total}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      kpi: { ...p.kpi, total: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label>KPI Transferencias</label>
                <input
                  type="color"
                  value={ui.kpi.transfer}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      kpi: { ...p.kpi, transfer: e.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label>Bar Chart</label>
                <input
                  type="color"
                  value={ui.charts.bar}
                  onChange={(e) =>
                    setUi((p) => ({
                      ...p,
                      charts: { ...p.charts, bar: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="ui-actions">
              <button
                className="money-reset-btn"
                onClick={() => setUi(DEFAULT_UI)}
              >
                Reset Paleta
              </button>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="money-cards-container mt-3 mb-4">
          <div
            className="money-card daily"
            style={{ backgroundColor: ui.kpi.daily }}
          >
            <h5>Total del Día</h5>
            <p>${fmtCLP(dailyTotal)}</p>
          </div>
          <div
            className="money-card monthly"
            style={{ backgroundColor: ui.kpi.monthly }}
          >
            <h5>Total del Mes</h5>
            <p>${fmtCLP(monthlyTotal)}</p>
          </div>
          <div
            className="money-card annual"
            style={{ backgroundColor: ui.kpi.annual }}
          >
            <h5>Total del Año</h5>
            <p>${fmtCLP(annualTotal)}</p>
          </div>
          <div
            className="money-card total"
            style={{ backgroundColor: ui.kpi.total }}
          >
            <h5>Gran Total</h5>
            <p>${fmtCLP(totalIncome)}</p>
          </div>
          <div
            className="money-card transfer"
            style={{ backgroundColor: ui.kpi.transfer }}
          >
            <h5>Transferencias del Mes</h5>
            <p>${fmtCLP(transfersMonthly)}</p>
            <div className="kpi-counter">
              {transfersCountMonthly}{" "}
              {transfersCountMonthly === 1 ? "transferencia" : "transferencias"}
            </div>
          </div>
        </div>

        {/* Ingreso manual del día */}
        <div className="money-input-group mb-4">
          <input
            type="number"
            className="money-form-control"
            placeholder="Añadir ingreso (CLP)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={selectedDate !== currentDateInChile}
          />
          <select
            className="money-form-select money-method-select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            disabled={selectedDate !== currentDateInChile}
          >
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
            <option>Otro</option>
          </select>
          <button
            className="money-btn"
            onClick={handleAddIncome}
            disabled={selectedDate !== currentDateInChile}
          >
            Agregar Ingreso
          </button>
        </div>

        {/* Filtros */}
        <div className="money-filters-grid">
          <div className="money-filter-section mb-2">
            <label htmlFor="dateFilter" className="money-form-label">
              Filtrar por Fecha
            </label>
            <input
              type="date"
              id="dateFilter"
              className="money-form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="money-filter-section mb-2">
            <label htmlFor="monthFilter" className="money-form-label">
              Seleccionar Mes
            </label>
            <select
              id="monthFilter"
              className="money-form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index} value={index}>
                  {new Date(0, index).toLocaleString("es-CL", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="money-filter-section mb-2">
            <label htmlFor="yearFilter" className="money-form-label">
              Seleccionar Año
            </label>
            <input
              type="number"
              id="yearFilter"
              className="money-form-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            />
          </div>

          <div className="money-filter-actions">
            <button className="money-search-btn" onClick={handleSearch}>
              <FontAwesomeIcon icon={faSearch} /> Buscar
            </button>
            <button className="money-reset-btn" onClick={handleResetFilters}>
              Resetear
            </button>
          </div>
        </div>

        {/* ====== ANALYTICS ====== */}
        <div className="analytics-grid">
          <div className="chart-card">
            <div className="chart-title">Ingresos últimos 14 días</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={last14DaysData}
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={ui.charts.area}
                      stopOpacity={0.7}
                    />
                    <stop
                      offset="95%"
                      stopColor={ui.charts.area}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => `$${fmtCLP(v)}`} />
                <Tooltip
                  formatter={(val) => [`$${fmtCLP(val)}`, "Monto"]}
                  labelFormatter={(l) => `Día: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={ui.charts.area}
                  fill="url(#colorArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Ingresos por mes ({selectedYear})</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyByYear}
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `$${fmtCLP(v)}`} />
                <Tooltip formatter={(val) => `$${fmtCLP(val)}`} />
                <Bar
                  dataKey="amount"
                  fill={ui.charts.bar}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Distribución por servicio</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name} (${fmtCLP(value)})`}
                >
                  {(ui.charts.pie || DEFAULT_UI.charts.pie).map((c, idx) => (
                    <Cell key={`cell-${idx}`} fill={c} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(val, name) => [`$${fmtCLP(val)}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ====== HISTORIAL ====== */}
        <h4 className="mt-4">Historial de Transacciones</h4>
        <ul className="money-transaction-list mt-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.slice(0, 8).map((transaction) => {
              const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
              const formattedDate = format(transactionDate, "dd/MM/yyyy", {
                timeZone: CHILE_TZ,
              });
              const formattedTime = format(transactionDate, "HH:mm:ss", {
                timeZone: CHILE_TZ,
              });

              return (
                <li key={transaction.id} className="money-list-group-item">
                  Monto: ${fmtCLP(transaction.amount)} —{" "}
                  {transaction.method ? `Método: ${transaction.method} — ` : ""}
                  {transaction.service
                    ? `Servicio: ${transaction.service} — `
                    : ""}
                  Fecha: {formattedDate} {formattedTime}
                </li>
              );
            })
          ) : (
            <li>No hay transacciones para mostrar</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BankBalance;
