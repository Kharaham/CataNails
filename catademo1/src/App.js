import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import Header from './components/common/Header';
import Footer from './components/common/Footer'; 
import Home from './pages/home/Home';
import TrabajosRealizados from './pages/works/TrabajosRealizados';
import Manicure from './pages/service/Manicure';
import Pedicure from './pages/service/Pedicure';
import AlisadoPermanente from './pages/service/AlisadoPermanente';
import BotoxCapilar from './pages/service/BotoxCapilar';
import ScheduleAppointmentView from './components/agenda/ScheduleAppointmentView'; // Importa el componente de agendar citas
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes> 
          <Route path="/" element={<Home />} />
          <Route path="/trabajos-realizados" element={<TrabajosRealizados />} />
          <Route path="/manicure" element={<Manicure />} />
          <Route path="/pedicure" element={<Pedicure />} />
          <Route path="/alisado-permanente" element={<AlisadoPermanente />} />
          <Route path="/botox-capilar" element={<BotoxCapilar />} />
          {/* Nueva ruta para agendar citas */}
          <Route path="/agendar-cita" element={<ScheduleAppointmentView />} /> 

        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

