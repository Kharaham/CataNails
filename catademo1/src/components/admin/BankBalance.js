import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDollarSign, faSearch } from "@fortawesome/free-solid-svg-icons";
import { format, toZonedTime } from "date-fns-tz";
import "../../styles/adminS/bankbalance.css";
import { onSnapshot } from "firebase/firestore"; 

const BankBalance = () => {
  const [amount, setAmount] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [annualTotal, setAnnualTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd", { timeZone: "America/Santiago" })
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const CHILE_TZ = "America/Santiago";

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactionsByDate(selectedDate);
  }, [selectedDate, transactions]);

  const fetchTransactions = () => {
    const ingresosRef = collection(db, "ingresos");
  
    // Escuchar en tiempo real cambios en la colección ingresos
    onSnapshot(ingresosRef, (snapshot) => {
      const fetchedTransactions = [];
      let total = 0;
  
      snapshot.forEach((doc) => {
        const data = doc.data();
        const transactionDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        fetchedTransactions.push({ id: doc.id, ...data, date: transactionDate });
        total += data.amount;
      });
  
      fetchedTransactions.sort((a, b) => b.date - a.date);
  
      // Actualizar los estados con las nuevas transacciones y el total
      setTransactions(fetchedTransactions);
      setTotalIncome(total);
      calculateTotals(fetchedTransactions);
    });
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
      date: Timestamp.fromDate(nowInChile),
    });

    setAmount("");
    await fetchTransactions();
  };

  const filterTransactionsByDate = (date) => {
    const filtered = transactions.filter((transaction) => {
      const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
      const formattedDate = format(transactionDate, "yyyy-MM-dd", {
        timeZone: CHILE_TZ,
      });
      return formattedDate === date;
    });

    setFilteredTransactions(filtered);
    calculateDailyTotal(filtered);
  };

  const calculateDailyTotal = (filtered) => {
    const total = filtered.reduce(
      (acc, transaction) => acc + transaction.amount,
      0
    );
    setDailyTotal(total);
  };

  const calculateTotals = (allTransactions) => {
    const daily = allTransactions.reduce((acc, transaction) => {
      const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
      const formattedDate = format(transactionDate, "yyyy-MM-dd", {
        timeZone: CHILE_TZ,
      });
      return formattedDate === selectedDate ? acc + transaction.amount : acc;
    }, 0);

    const monthly = allTransactions.reduce((acc, transaction) => {
      const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
      if (
        transactionDate.getFullYear() === selectedYear &&
        transactionDate.getMonth() === selectedMonth
      ) {
        return acc + transaction.amount;
      }
      return acc;
    }, 0);

    const annual = allTransactions.reduce((acc, transaction) => {
      const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
      return transactionDate.getFullYear() === selectedYear
        ? acc + transaction.amount
        : acc;
    }, 0);

    setDailyTotal(daily);
    setMonthlyTotal(monthly);
    setAnnualTotal(annual);
  };

  const handleSearch = () => {
    filterTransactionsByDate(selectedDate);
    calculateTotals(transactions);
  };

  const currentDateInChile = format(new Date(), "yyyy-MM-dd", {
    timeZone: CHILE_TZ,
  });

  return (
    <div className="bankbalance-container">
      <div className="money-container mt-4">
        <h2 className="money-header">
          <FontAwesomeIcon icon={faDollarSign} className="me-2" /> Ingresos
          Totales (CLP)
        </h2>

        <div className="money-cards-container mt-3 mb-4">
          <div className="money-card daily">
            <h5>Total del Día</h5>
            <p>${dailyTotal.toLocaleString("es-CL")}</p>
          </div>
          <div className="money-card monthly">
            <h5>Total del Mes</h5>
            <p>${monthlyTotal.toLocaleString("es-CL")}</p>
          </div>
          <div className="money-card annual">
            <h5>Total del Año</h5>
            <p>${annualTotal.toLocaleString("es-CL")}</p>
          </div>
          <div className="money-card total">
            <h5>Gran Total</h5>
            <p>${totalIncome.toLocaleString("es-CL")}</p>
          </div>
        </div>

        <div className="money-input-group mb-4">
          <input
            type="number"
            className="money-form-control"
            placeholder="Añadir ingreso (CLP)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={selectedDate !== currentDateInChile}
          />
          <button
            className="money-btn"
            onClick={handleAddIncome}
            disabled={selectedDate !== currentDateInChile}
          >
            Agregar Ingreso
          </button>
        </div>

        <div className="money-filter-section mb-4">
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

        <div className="money-filter-section mb-4">
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
                {new Date(0, index).toLocaleString("es-CL", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <div className="money-filter-section mb-4">
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

        <button className="money-search-btn" onClick={handleSearch}>
          <FontAwesomeIcon icon={faSearch} /> Buscar
        </button>

        <h4 className="mt-4">Historial de Transacciones</h4>
        <ul className="money-transaction-list mt-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.slice(0, 4).map((transaction) => {
              const transactionDate = toZonedTime(transaction.date, CHILE_TZ);
              const formattedDate = format(transactionDate, "dd/MM/yyyy", {
                timeZone: CHILE_TZ,
              });
              const formattedTime = format(transactionDate, "HH:mm:ss", {
                timeZone: CHILE_TZ,
              });

              return (
                <li key={transaction.id} className="money-list-group-item">
                  Monto: ${transaction.amount.toLocaleString("es-CL")} - Fecha:{" "}
                  {formattedDate} {formattedTime}
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
