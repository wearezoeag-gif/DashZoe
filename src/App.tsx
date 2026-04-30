import { BrowserRouter, Routes, Route } from 'react-router';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import ClientLayout from './components/layout/ClientLayout';

// Auth
import Login from './pages/auth/Login';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/Events';
import AdminEventDetail from './pages/admin/AdminEventDetail';
import AdminGuests from './pages/admin/Guests';
import AdminLeads from './pages/admin/Leads';
import AdminNPS from './pages/admin/NPS';
import AdminFinancial from './pages/admin/Financial';
import AdminSettings from './pages/admin/Settings';

// Client
import ClientEvent from './pages/client/Event';
import ClientFinancial from './pages/client/Financial';
import ClientContracts from './pages/client/Contracts';
import ClientArquivos from './pages/client/Arquivos';
import ClientMessages from './pages/client/Messages';
import ClientMoodboard from './pages/client/Moodboard';
import ClientGuests from './pages/client/Guests';
import ClientFotos from './pages/client/Fotos';
import ClientSettings from './pages/client/Settings';

// Guest
import GuestGallery from './pages/guest/Gallery';
import RSVPPage from './pages/guest/RSVPPage';
import GuestNPS from './pages/guest/GuestNPS';

// 404
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="eventos" element={<AdminEvents />} />
          <Route path="eventos/:id/convidados" element={<AdminGuests />} />
          <Route path="eventos/:id" element={<AdminEventDetail />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="nps" element={<AdminNPS />} />
          <Route path="financeiro" element={<AdminFinancial />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>

        {/* Client */}
        <Route path="/cliente" element={<ClientLayout />}>
          <Route index element={<ClientEvent />} />
          <Route path="financeiro" element={<ClientFinancial />} />
          <Route path="contratos" element={<ClientContracts />} />
          <Route path="Arquivos" element={<ClientArquivos />} />
          <Route path="mensagens" element={<ClientMessages />} />
          <Route path="moodboard" element={<ClientMoodboard />} />
          <Route path="moodboard/:id" element={<ClientMoodboard />} />
          <Route path="convidados" element={<ClientGuests />} />
          <Route path="fotos" element={<ClientFotos />} />
          <Route path="configuracoes" element={<ClientSettings />} />
        </Route>

        {/* Guest */}
        <Route path="/convidado" element={<GuestGallery />} />
        <Route path="/evento/:slug" element={<GuestGallery />} />
        <Route path="/rsvp/:id" element={<RSVPPage />} />
        <Route path="/nps" element={<GuestNPS />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}