import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { Header } from '../components/Header';
import { NavBar } from '../components/NavBar';
import { Home } from '../routes/Home';
import { Handover } from '../routes/Handover';
import { TripStart } from '../routes/TripStart';
import { TripEnd } from '../routes/TripEnd';
import { Log } from '../routes/Log';
import { AdminExport } from '../routes/AdminExport';
import './styles.css';

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Header />
        <main style={{ paddingBottom: 80 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/handover" element={<Handover />} />
            <Route path="/trip/start" element={<TripStart />} />
            <Route path="/trip/end" element={<TripEnd />} />
            <Route path="/log" element={<Log />} />
            <Route path="/admin/export" element={<AdminExport />} />
          </Routes>
        </main>
        <NavBar />
      </AppProvider>
    </BrowserRouter>
  );
}
